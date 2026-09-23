import type { BopConfig } from '../data/types'
import type { Command } from '../state/commands'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { runLocalAssistant } from './local-engine'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Follow-up commands shown as tap-to-run chips. */
  suggestions?: string[]
  /** List lines ("- ...") are runnable examples (the help reply). */
  runnableList?: boolean
}

/** null = not tried yet. A static host (GitHub Pages) has no /api, so this becomes false after one try. */
let serverAvailable: boolean | null = null

interface ServerBody {
  ok: boolean
  text?: string
  commands?: Command[]
  error?: string
  message?: string
}

async function askServer(message: string, history: ChatMessage[], config: BopConfig): Promise<ServerBody | null> {
  if (serverAvailable === false) return null
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-12).map(({ role, content }) => ({ role, content })), config }),
    })
    if (!res.ok && res.status !== 400 && res.status !== 429) {
      serverAvailable = false
      return null
    }
    const body = (await res.json()) as ServerBody
    serverAvailable = true
    return body
  } catch {
    serverAvailable = false
    return null
  }
}

/** Run commands from the assistant without pulling the user away from the chat. */
function runCommands(commands: Command[]): void {
  for (const cmd of commands) dispatch(cmd)
  useViewer.setState({ panelTab: 'assistant' })
}

const HELP = /^(help|\?|commands?|menu)\b/i

export async function ask(message: string, history: ChatMessage[]): Promise<ChatMessage> {
  const state = useViewer.getState()
  const local = () => {
    const reply = runLocalAssistant(state.dataset, message, useViewer.getState().selectedId)
    runCommands(reply.commands)
    return { role: 'assistant' as const, content: reply.text, suggestions: reply.suggestions, runnableList: reply.text.startsWith('Here is what I can do') }
  }
  if (HELP.test(message.trim())) return local()
  const server = await askServer(message, history, state.dataset.config)
  if (!server || !server.ok) return local()
  runCommands(server.commands ?? [])
  return { role: 'assistant', content: server.text ?? '' }
}

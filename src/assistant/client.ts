import type { BopConfig } from '../data/types'
import type { Command } from '../state/commands'
import { dispatch } from '../state/commands'
import { useViewer } from '../state/store'
import { runLocalAssistant } from './local-engine'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  mode?: 'claude' | 'offline'
  removedValues?: string[]
}

let serverAvailable: boolean | null = null

interface ServerBody {
  ok: boolean
  text?: string
  commands?: Command[]
  removedValues?: string[]
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
    if (res.status === 503 || res.status === 404) {
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

export function assistantMode(): 'claude' | 'offline' | 'unknown' {
  return serverAvailable === null ? 'unknown' : serverAvailable ? 'claude' : 'offline'
}

/** Run commands from the assistant without pulling the user away from the chat. */
function runCommands(commands: Command[]): void {
  for (const cmd of commands) dispatch(cmd)
  useViewer.setState({ panelTab: 'assistant' })
}

export async function ask(message: string, history: ChatMessage[]): Promise<ChatMessage> {
  const ds = useViewer.getState().dataset
  const server = await askServer(message, history, ds.config)
  if (server && server.ok) {
    runCommands(server.commands ?? [])
    return { role: 'assistant', content: server.text ?? '', mode: 'claude', removedValues: server.removedValues }
  }
  if (server && !server.ok && server.error !== 'assistant_offline') {
    return { role: 'assistant', content: server.message ?? 'The assistant could not answer.', mode: 'claude' }
  }
  const reply = runLocalAssistant(ds, message)
  runCommands(reply.commands)
  return { role: 'assistant', content: reply.text, mode: 'offline' }
}

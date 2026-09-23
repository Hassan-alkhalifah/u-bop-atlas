import { useEffect, useRef, useState } from 'react'
import { ask, type ChatMessage } from '../assistant/client'
import { NOT_AVAILABLE } from '../data/sources'
import { Icon } from './ui'

const STARTERS = ['help', 'show the operating piston', 'isolate all seals', 'explain how the BOP closes', 'explode the left bonnet', 'recommended spare parts']

/** Renders reply text: "- " lines become a list; in the help reply each example is a tappable command. */
function MessageBody({ m, onRun }: { m: ChatMessage; onRun: (text: string) => void }) {
  const blocks: { kind: 'p' | 'ul'; lines: string[] }[] = []
  for (const line of m.content.split('\n')) {
    const isItem = line.startsWith('- ')
    const last = blocks[blocks.length - 1]
    if (isItem && last?.kind === 'ul') last.lines.push(line.slice(2))
    else if (isItem) blocks.push({ kind: 'ul', lines: [line.slice(2)] })
    else if (line.trim()) blocks.push({ kind: 'p', lines: [line] })
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="msg-p">{b.lines[0]}</p>
        ) : (
          <ul key={i} className="msg-ul">
            {b.lines.map((l, j) => (
              <li key={j}>
                {m.runnableList
                  ? l.split(/\s+\/\s+/).map((cmd) => (
                      <button key={cmd} type="button" className="cmd-pill" onClick={() => onRun(cmd.replace(/\s*\(.*\)$/, ''))}>
                        {cmd}
                      </button>
                    ))
                  : l}
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  )
}

export function AssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const history = messages
    setMessages([...history, { role: 'user', content: q }])
    setInput('')
    setBusy(true)
    try {
      const reply = await ask(q, history)
      setMessages((m) => [...m, reply])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong while answering. Try again.' }])
    } finally {
      setBusy(false)
    }
  }

  const last = messages[messages.length - 1]
  const chips = !busy && last?.role === 'assistant' ? (last.suggestions ?? []) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="scroll chat" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <h2 className="heading" style={{ fontSize: 20, margin: '0 0 6px' }}>Ask about the BOP</h2>
            <p style={{ margin: '0 0 10px' }}>I find parts, explain them from the sourced data and drive the 3D view. When a fact is not documented I say "{NOT_AVAILABLE}"</p>
            <div className="chip-row">
              {STARTERS.map((e) => (
                <button key={e} type="button" className="chip" onClick={() => void send(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
            {m.role === 'user' ? m.content : <MessageBody m={m} onRun={(t) => void send(t)} />}
          </div>
        ))}
        {busy && <div className="msg msg-bot muted">Working...</div>}
        {chips.length > 0 && (
          <div className="chip-row" aria-label="Suggested follow-ups">
            {chips.map((c) => (
              <button key={c} type="button" className="chip" onClick={() => void send(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">Message</label>
        <input
          id="assistant-input"
          className="field chat-input"
          value={input}
          maxLength={2000}
          placeholder='Ask or type "help"'
          enterKeyHint="send"
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary chat-send" disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  )
}

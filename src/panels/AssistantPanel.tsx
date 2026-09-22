import { useEffect, useRef, useState } from 'react'
import { ask, assistantMode, type ChatMessage } from '../assistant/client'
import { NOT_AVAILABLE } from '../data/sources'
import { Icon } from './ui'

const EXAMPLES = ['Show me the operating piston', 'Isolate all seals', 'Explain how the BOP closes', 'Show everything connected to the ram', 'Explode the left bonnet assembly', 'What is the material of the bonnet?']

export function AssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
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

  const mode = assistantMode()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="scroll" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
        {messages.length === 0 && (
          <div>
            <h2 className="heading" style={{ fontSize: 20, margin: '0 0 6px' }}>Ask about the BOP</h2>
            <p style={{ margin: '0 0 10px' }}>The assistant can find parts, explain documented behaviour and drive the viewer. It answers only from the verified component database and says "{NOT_AVAILABLE}" when a fact is missing.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXAMPLES.map((e) => (
                <button key={e} type="button" className="chip" onClick={() => void send(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
            {m.content}
            {m.role === 'assistant' && m.mode && (
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                {m.mode === 'claude' ? 'Answered by Claude from the component database' : 'Answered by the offline assistant (no API key configured)'}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg msg-bot muted">Working...</div>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--rule)' }}
      >
        <label htmlFor="assistant-input" className="sr-only">Message</label>
        <input id="assistant-input" className="field" style={{ flex: 1, height: 38 }} value={input} maxLength={2000} placeholder="Ask or give a command" onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="btn btn-primary" style={{ height: 38 }} disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="send" size={15} />
        </button>
      </form>
      {mode === 'offline' && <div className="muted" style={{ fontSize: 11.5, padding: '0 12px 10px' }}>Offline mode: set ANTHROPIC_API_KEY on the server to use Claude.</div>}
    </div>
  )
}

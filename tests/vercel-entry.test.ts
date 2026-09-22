import { describe, expect, it, vi } from 'vitest'

const seen: string[] = []
vi.mock('../server/assistant-core', () => ({
  handleAssistantRequest: async (_body: string, key: string) => {
    seen.push(key)
    return { status: 200, body: { ok: true } }
  },
}))

const { POST } = await import('../server/vercel-entry')

describe('vercel entry rate-limit key', () => {
  it('prefers the platform header over the spoofable first X-Forwarded-For entry', async () => {
    await POST(new Request('https://x/api/assistant', { method: 'POST', body: '{}', headers: { 'x-forwarded-for': '1.1.1.1, 9.9.9.9', 'x-vercel-forwarded-for': '9.9.9.9' } }))
    await POST(new Request('https://x/api/assistant', { method: 'POST', body: '{}', headers: { 'x-forwarded-for': '6.6.6.6, 9.9.9.9' } }))
    expect(seen).toEqual(['9.9.9.9', '9.9.9.9'])
  })
})

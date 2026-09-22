// Vercel Function entry. Bundled by `npm run build:api` into api/assistant.mjs.
import { handleAssistantRequest } from './assistant-core'

export async function POST(request: Request): Promise<Response> {
  // x-vercel-forwarded-for is set by the platform edge; the first X-Forwarded-For entry is client-controlled.
  const edge = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-real-ip')
  const chain = (request.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const clientKey = edge?.split(',')[0]?.trim() || chain[chain.length - 1] || 'unknown'
  const { status, body } = await handleAssistantRequest(await request.text(), clientKey)
  return Response.json(body, { status })
}

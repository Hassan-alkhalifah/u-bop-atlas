import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Serves the same handler as the Vercel function (api/assistant.ts) during `vite dev`.
function assistantDevApi(): Plugin {
  return {
    name: 'assistant-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/assistant', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const mod = await server.ssrLoadModule('/server/assistant-core.ts')
        const { status, body } = await mod.handleAssistantRequest(Buffer.concat(chunks).toString('utf8'), req.socket.remoteAddress ?? 'local')
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), assistantDevApi()],
})

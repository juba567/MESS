// Minimal static file server for the production build in ./dist
// No host checking (safe to expose via a public tunnel) + SPA fallback.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 4173

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, code, body, type) {
  res.writeHead(code, { 'content-type': type || 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath === '/') urlPath = '/index.html'
    const rel = normalize(urlPath).replace(/^([/\\])+/, '')
    let filePath = join(root, rel)
    if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden')

    try {
      const s = await stat(filePath)
      if (s.isDirectory()) filePath = join(filePath, 'index.html')
    } catch {
      // Unknown path: SPA route -> index.html; real asset miss -> 404
      if (!extname(urlPath)) filePath = join(root, 'index.html')
      else return send(res, 404, 'Not found')
    }

    const data = await readFile(filePath)
    send(res, 200, data, types[extname(filePath).toLowerCase()] || 'application/octet-stream')
  } catch {
    try {
      send(res, 200, await readFile(join(root, 'index.html')), types['.html'])
    } catch {
      send(res, 500, 'Server error')
    }
  }
})

server.listen(PORT, '0.0.0.0', () => console.log('Static dist server running on http://0.0.0.0:' + PORT))

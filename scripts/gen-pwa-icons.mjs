// Rasterize the PWA icon SVGs into the PNGs referenced by the web manifest.
// Run: node scripts/gen-pwa-icons.mjs  (requires devDependency `sharp`)
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const pub = path.resolve(here, '../public')
const anySvg = readFileSync(path.join(here, 'icon-any.svg'))
const maskSvg = readFileSync(path.join(here, 'icon-maskable.svg'))

/** [source svg, output size, filename] */
const jobs = [
  [anySvg, 192, 'pwa-192x192.png'],
  [anySvg, 512, 'pwa-512x512.png'],
  [maskSvg, 192, 'pwa-maskable-192x192.png'],
  [maskSvg, 512, 'pwa-maskable-512x512.png'],
  [maskSvg, 180, 'apple-touch-icon.png'],
]

for (const [svg, size, name] of jobs) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(path.join(pub, name))
  console.log('wrote public/' + name)
}

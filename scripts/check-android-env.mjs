/**
 * Falla el build Android si falta VITE_API_URL (el WebView no tiene proxy Vite).
 * Lee apps/web/.env* en este orden: .env.production.local, .env.local, .env
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const webDir = resolve(root, 'apps/web')
const candidates = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
]

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const out = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const merged = {}
for (const name of candidates) {
  Object.assign(merged, readEnvFile(resolve(webDir, name)))
}
if (process.env.VITE_API_URL != null) {
  merged.VITE_API_URL = process.env.VITE_API_URL
}

const api = String(merged.VITE_API_URL || '').trim()
if (!api) {
  console.error(
    '[build:android] Falta VITE_API_URL.\n' +
      '  Copia apps/web/.env.android.example → apps/web/.env.production.local\n' +
      '  o exporta VITE_API_URL=https://tu-api...'
  )
  process.exit(1)
}

try {
  // eslint-disable-next-line no-new
  new URL(api)
} catch {
  console.error(`[build:android] VITE_API_URL inválida: ${api}`)
  process.exit(1)
}

console.log(`[build:android] VITE_API_URL OK → ${api}`)

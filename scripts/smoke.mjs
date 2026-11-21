/**
 * Smoke mínimo: API health (+ resolve opcional).
 * Uso: API en marcha → `npm run smoke`
 * Env: SMOKE_API_URL (default http://127.0.0.1:8000)
 */
const base = (process.env.SMOKE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function main() {
  const healthUrl = `${base}/api/health`
  const healthRes = await fetch(healthUrl)
  if (!healthRes.ok) {
    throw new Error(`health ${healthRes.status} @ ${healthUrl}`)
  }
  const health = await healthRes.json()
  if (!health?.ok) throw new Error('health payload no ok')
  console.log('OK health', health)

  const resolveUrl = `${base}/api/media/resolve?title=${encodeURIComponent('Despacito')}&artist=${encodeURIComponent('Luis Fonsi')}&limit=1`
  const resolveRes = await fetch(resolveUrl)
  if (resolveRes.status === 429) {
    console.log('OK resolve rate-limited (esperado bajo carga)')
    return
  }
  if (!resolveRes.ok) {
    throw new Error(`resolve ${resolveRes.status}`)
  }
  const resolved = await resolveRes.json()
  if (!resolved?.mediaId) throw new Error('resolve sin mediaId')
  console.log('OK resolve', resolved.mediaId)
}

main().catch((err) => {
  console.error('SMOKE FAIL', err.message || err)
  process.exit(1)
})

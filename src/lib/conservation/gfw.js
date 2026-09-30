// Candidate deforestation alerts from Global Forest Watch, via our own
// /api/gfw-alerts proxy (the key is server-side). Rejects with a `code` of
// 'not_configured' when no key is set, or 'unavailable' for anything else.

export async function fetchCandidates(signal) {
  let response
  try {
    response = await fetch('/api/gfw-alerts', { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw Object.assign(new Error('unreachable'), { code: 'unavailable' })
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !Array.isArray(body.alerts)) {
    throw Object.assign(new Error(body.error ?? 'failed'), { code: body.error === 'not_configured' ? 'not_configured' : 'unavailable' })
  }
  return body
}

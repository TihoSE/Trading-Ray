/**
 * Vercel serverless proxy. The browser calls /api/finnhub; this function adds
 * FINNHUB_SECRET_KEY and forwards only the market endpoints the app uses.
 * The key never goes into the response.
 */
const ENDPOINTS = {
  quote: { path: '/quote', params: ['symbol'] },
  search: { path: '/search', params: ['q'] },
  candle: { path: '/stock/candle', params: ['symbol', 'resolution', 'from', 'to'] },
  holdings: { path: '/etf/holdings', params: ['symbol', 'skip'] },
}

function readKey() {
  return process.env.FINNHUB_SECRET_KEY?.trim() || ''
}

function send(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) {
    if (value) res.setHeader(name, value)
  }
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed.' })
    return
  }

  const requestUrl = new URL(req.url, 'http://localhost')
  const spec = ENDPOINTS[requestUrl.searchParams.get('endpoint')]
  if (!spec) {
    send(res, 400, { error: 'Unknown market data request.' })
    return
  }

  const key = readKey()
  if (!key) {
    send(res, 500, { error: 'Market data key is not configured.' })
    return
  }

  const target = new URL(`https://finnhub.io/api/v1${spec.path}`)
  for (const name of spec.params) {
    const value = requestUrl.searchParams.get(name)
    if (value) target.searchParams.set(name, value)
  }
  target.searchParams.set('token', key)

  try {
    const upstream = await fetch(target)
    const text = await upstream.text()
    let body
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { error: 'Market data response was not valid JSON.' }
    }
    send(res, upstream.status, body, { 'Retry-After': upstream.headers.get('retry-after') })
  } catch {
    send(res, 502, { error: 'Market data request failed.' })
  }
}

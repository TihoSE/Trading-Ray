const QUOTE_URL = 'https://finnhub.io/api/v1/quote'
const SEARCH_URL = 'https://finnhub.io/api/v1/search'

export const POPULAR_SYMBOLS = [
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'NFLX', name: 'Netflix' },
  { symbol: 'COIN', name: 'Coinbase' },
]

export const SYMBOL_DIRECTORY = [
  ...POPULAR_SYMBOLS,
  { symbol: 'INTC', name: 'Intel' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
]

const MOCK_QUOTES = {
  NVDA: { c: 184.27, d: 3.41, dp: 1.88, h: 186.9, l: 179.12, o: 180.4, pc: 180.86 },
  SPY: { c: 582.14, d: -1.22, dp: -0.21, h: 585.6, l: 580.05, o: 583.9, pc: 583.36 },
  AAPL: { c: 231.08, d: 1.15, dp: 0.5, h: 232.4, l: 228.77, o: 229.5, pc: 229.93 },
  MSFT: { c: 418.62, d: -2.84, dp: -0.67, h: 423.1, l: 416.2, o: 421.8, pc: 421.46 },
  TSLA: { c: 249.73, d: 6.08, dp: 2.5, h: 252.3, l: 241.9, o: 243.1, pc: 243.65 },
  AMD: { c: 162.44, d: 4.12, dp: 2.6, h: 164.8, l: 157.1, o: 158.2, pc: 158.32 },
  AMZN: { c: 227.91, d: -1.08, dp: -0.47, h: 230.4, l: 226.05, o: 228.7, pc: 228.99 },
  GOOGL: { c: 178.36, d: 2.24, dp: 1.27, h: 179.9, l: 175.4, o: 176.1, pc: 176.12 },
  META: { c: 612.08, d: 5.41, dp: 0.89, h: 616.2, l: 604.3, o: 607.5, pc: 606.67 },
  NFLX: { c: 891.2, d: -8.14, dp: -0.91, h: 905.0, l: 886.4, o: 898.1, pc: 899.34 },
  COIN: { c: 248.16, d: 7.22, dp: 3.0, h: 252.4, l: 239.8, o: 241.5, pc: 240.94 },
  INTC: { c: 23.48, d: 0.31, dp: 1.34, h: 23.9, l: 22.88, o: 23.05, pc: 23.17 },
  QQQ: { c: 512.66, d: 1.02, dp: 0.2, h: 514.8, l: 509.4, o: 511.2, pc: 511.64 },
}

export class QuoteNotFoundError extends Error {
  constructor(symbol) {
    super(`No quote found for ${symbol}. Check the ticker or try again.`)
    this.name = 'QuoteNotFoundError'
    this.symbol = symbol
  }
}

export function getApiKey() {
  const stored = localStorage.getItem('finnhub_api_key')
  if (stored?.trim()) return stored.trim()
  return import.meta.env.VITE_FINNHUB_API_KEY?.trim() || ''
}

export function lookupName(symbol) {
  const ticker = symbol.trim().toUpperCase()
  return SYMBOL_DIRECTORY.find((item) => item.symbol === ticker)?.name ?? ticker
}

function mockQuote(symbol) {
  const ticker = symbol.trim().toUpperCase()
  const seed = MOCK_QUOTES[ticker]
  if (!seed) return null

  const jitter = Math.sin(Date.now() / 8000 + ticker.length) * 0.35
  const current = +(seed.c + jitter).toFixed(2)
  const change = +(current - seed.pc).toFixed(2)
  const percent = +((change / seed.pc) * 100).toFixed(2)

  return {
    symbol: ticker,
    name: lookupName(ticker),
    current,
    change,
    percent,
    high: seed.h,
    low: seed.l,
    open: seed.o,
    previousClose: seed.pc,
    source: 'mock',
  }
}

function normalizeQuote(symbol, data, name) {
  const ticker = symbol.trim().toUpperCase()
  return {
    symbol: ticker,
    name: name ?? lookupName(ticker),
    current: data.c,
    change: data.d,
    percent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    source: 'live',
  }
}

function isEmptyQuote(data) {
  return typeof data?.c !== 'number' || data.c === 0 || data.d == null
}

export async function fetchQuote(symbol, { fallbackMock = true } = {}) {
  const ticker = symbol.trim().toUpperCase()
  const token = getApiKey()

  if (!token) {
    const mocked = mockQuote(ticker)
    if (mocked) return mocked
    if (fallbackMock) {
      throw new QuoteNotFoundError(ticker)
    }
    throw new QuoteNotFoundError(ticker)
  }

  try {
    const response = await fetch(
      `${QUOTE_URL}?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(token)}`,
    )

    if (!response.ok) {
      throw new Error(`Finnhub responded with ${response.status}`)
    }

    const data = await response.json()
    if (isEmptyQuote(data)) {
      throw new QuoteNotFoundError(ticker)
    }

    return normalizeQuote(ticker, data)
  } catch (error) {
    if (error instanceof QuoteNotFoundError) throw error
    if (fallbackMock) {
      const mocked = mockQuote(ticker)
      if (mocked) return mocked
    }
    throw error instanceof Error ? error : new Error('Unable to fetch quote.')
  }
}

export async function fetchSearchQuote(symbol) {
  return fetchQuote(symbol, { fallbackMock: false })
}

export async function fetchQuotes(symbols) {
  return Promise.all(symbols.map((item) => fetchQuote(item.symbol ?? item)))
}

function localSearch(query) {
  const needle = query.trim().toUpperCase()
  if (!needle) return []

  return SYMBOL_DIRECTORY.filter(
    (item) => item.symbol.includes(needle) || item.name.toUpperCase().includes(needle),
  ).slice(0, 8)
}

export async function searchSymbols(query) {
  const needle = query.trim()
  const local = localSearch(needle)
  const token = getApiKey()

  if (!token) return local

  try {
    const response = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(needle)}&token=${encodeURIComponent(token)}`,
    )
    if (!response.ok) return local

    const data = await response.json()
    const remote = (data.result ?? [])
      .filter((item) => ['Common Stock', 'ETF', 'ADR', 'ETP'].includes(item.type) || !item.type)
      .map((item) => ({
        symbol: item.displaySymbol || item.symbol,
        name: item.description || item.displaySymbol || item.symbol,
      }))

    const merged = [...local]
    for (const item of remote) {
      if (!merged.some((entry) => entry.symbol === item.symbol)) {
        merged.push(item)
      }
    }
    return merged.slice(0, 8)
  } catch {
    return local
  }
}

function symbolSeed(symbol) {
  return [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function simulateHistory(quote, days = 30) {
  const ticker = quote.symbol.toUpperCase()
  const seed = symbolSeed(ticker)
  const end = quote.current
  const direction = quote.change >= 0 ? 1 : -1
  const span = Math.max(Math.abs(quote.change) * days * 0.35, end * 0.04)
  const points = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setHours(16, 0, 0, 0)
    date.setDate(date.getDate() - offset)

    const progress = (days - 1 - offset) / Math.max(days - 1, 1)
    const wave = Math.sin((seed / 12 + offset) * 0.85) * span * 0.35
    const ripple = Math.cos((seed / 7 + offset) * 1.4) * span * 0.18
    let price = end - direction * span * (1 - progress) + wave + ripple
    if (offset === 0) price = end

    points.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: +Math.max(price, 0.01).toFixed(2),
    })
  }

  return points
}

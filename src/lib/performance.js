export const PERFORMANCE_RANGES = ['1D', '1W', '1M', '1Y', 'ALL']

const RANGE_MS = {
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

function bookValue(book, prices) {
  let total = 0
  for (const [ticker, shares] of book) {
    total += shares * (prices.get(ticker) ?? 0)
  }
  return total
}

/**
 * Equity path from stored trades. Cash is anchored so the replay ends on the
 * current balance. Open positions are marked at the latest fill until the
 * final point, which uses today's quotes: equity = cash + current holdings.
 */
export function buildEquityHistory({ trades = [], cash = 0, positions = [], marks = {}, now = Date.now() } = {}) {
  const ordered = [...trades]
    .filter((trade) => trade?.createdAt && Number(trade.amount) > 0 && Number(trade.shares) > 0)
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))

  const liveMarks = new Map()
  for (const [ticker, price] of Object.entries(marks)) {
    if (Number(price) > 0) liveMarks.set(String(ticker).toUpperCase(), Number(price))
  }

  let cashFlow = 0
  for (const trade of ordered) {
    cashFlow += trade.side === 'sell' ? Number(trade.amount) : -Number(trade.amount)
  }

  let runningCash = roundMoney(Number(cash) - cashFlow)
  const book = new Map()
  const lastPrice = new Map()
  const openedAt = ordered.length ? new Date(ordered[0].createdAt).getTime() - 60_000 : now - RANGE_MS['1D']
  const points = [{ time: openedAt, equity: runningCash }]

  for (const trade of ordered) {
    const ticker = String(trade.ticker).toUpperCase()
    const shares = Number(trade.shares)
    const amount = Number(trade.amount)
    const price = Number(trade.price)
    if (price > 0) lastPrice.set(ticker, price)

    if (trade.side === 'sell') {
      runningCash = roundMoney(runningCash + amount)
      const next = (book.get(ticker) ?? 0) - shares
      if (next < 0.00005) book.delete(ticker)
      else book.set(ticker, next)
    } else {
      runningCash = roundMoney(runningCash - amount)
      book.set(ticker, (book.get(ticker) ?? 0) + shares)
    }

    points.push({
      time: new Date(trade.createdAt).getTime(),
      equity: roundMoney(runningCash + bookValue(book, lastPrice)),
    })
  }

  const liveBook = new Map()
  for (const position of positions) {
    const ticker = String(position.ticker).toUpperCase()
    const shares = Number(position.shares)
    if (shares > 0) liveBook.set(ticker, shares)
    const mark = liveMarks.get(ticker)
    if (mark > 0) lastPrice.set(ticker, mark)
    else if (position.avgCost > 0 && !lastPrice.has(ticker)) lastPrice.set(ticker, Number(position.avgCost))
  }

  const liveEquity = roundMoney(Number(cash) + bookValue(liveBook, lastPrice))
  const last = points[points.length - 1]
  if (last && Math.abs(last.time - now) < 1000 && last.equity === liveEquity) {
    last.time = now
    last.equity = liveEquity
  } else {
    points.push({ time: now, equity: liveEquity })
  }

  return points
}

export function sliceEquity(points, range, now = Date.now()) {
  if (!points.length) return []
  const span = RANGE_MS[range]
  const endEquity = points[points.length - 1].equity

  if (!span) {
    const start = points[0]
    if (points.length === 1 || start.time === now) {
      return [
        { time: now - RANGE_MS['1D'], equity: start.equity },
        { time: now, equity: endEquity },
      ]
    }
    return points
  }

  const from = now - span
  let baseline = points[0].equity
  for (const point of points) {
    if (point.time <= from) baseline = point.equity
    else break
  }

  const inside = points.filter((point) => point.time > from && point.time < now)
  return [
    { time: from, equity: baseline },
    ...inside,
    { time: now, equity: endEquity },
  ]
}

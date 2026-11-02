import { useEffect, useState } from 'react'
import { fetchCandleSeries, simulateCandles } from '../services/finnhub'

export function useCandleSeries(quote, timeframe = '1D') {
  const symbol = quote?.symbol
  const current = quote?.current
  const change = quote?.change
  const hasQuote = Boolean(symbol) && typeof current === 'number'
  const requestKey = hasQuote ? `${symbol}:${current}:${change ?? 0}:${timeframe}` : ''
  const [series, setSeries] = useState({ key: '', points: [], source: 'mock', status: 'ready' })

  useEffect(() => {
    if (!hasQuote) return undefined

    let cancelled = false
    const snapshot = { symbol, current, change: change ?? 0 }

    fetchCandleSeries(snapshot, timeframe).then((result) => {
      if (cancelled) return
      setSeries({
        key: `${symbol}:${current}:${change ?? 0}:${timeframe}`,
        points: result.points,
        source: result.source,
        status: 'ready',
      })
    })

    return () => {
      cancelled = true
    }
  }, [hasQuote, symbol, current, change, timeframe])

  if (!hasQuote) {
    return { points: [], source: 'mock', status: 'ready' }
  }

  if (series.key !== requestKey) {
    return {
      points: simulateCandles({ symbol, current, change: change ?? 0 }, timeframe),
      source: 'mock',
      status: 'loading',
    }
  }

  return { points: series.points, source: series.source, status: series.status }
}

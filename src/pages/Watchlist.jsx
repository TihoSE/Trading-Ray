import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StockCard from '../components/StockCard'
import { useMarket } from '../context/MarketContext'
import { useWatchlist } from '../context/WatchlistContext'
import { fetchQuote, lookupName } from '../services/finnhub'

export default function Watchlist() {
  const { openDetail } = useMarket()
  const { watchlist } = useWatchlist()
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState(watchlist.length ? 'loading' : 'ready')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (watchlist.length === 0) {
        setQuotes([])
        setStatus('ready')
        return
      }

      setStatus('loading')
      const data = await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            return await fetchQuote(symbol)
          } catch {
            return {
              symbol,
              name: lookupName(symbol),
              current: 0,
              change: 0,
              percent: 0,
              high: 0,
              low: 0,
              open: 0,
              previousClose: 0,
              source: 'mock',
            }
          }
        }),
      )
      if (!cancelled) {
        setQuotes(data)
        setStatus('ready')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [watchlist])

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Focus list</p>
      <h1 className="mt-1 text-2xl font-semibold">Watchlist</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Star a ticker on the dashboard or in search to pin it here. Your list is saved for this account.
      </p>

      {status === 'loading' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {watchlist.map((symbol) => (
            <div key={symbol} className="h-48 animate-pulse rounded-2xl border border-line bg-panel" />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-panel px-6 py-12 text-center">
          <p className="text-lg font-semibold">No stocks on your watchlist yet</p>
          <p className="mt-2 text-sm text-muted">Star names from the dashboard to build this list.</p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
          >
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quotes.map((quote) => (
            <StockCard
              key={quote.symbol}
              quote={quote}
              name={quote.name ?? lookupName(quote.symbol)}
              onOpen={openDetail}
            />
          ))}
        </div>
      )}
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { useMarket } from '../context/MarketContext'
import { formatEur } from '../lib/money'
import { QuoteNotFoundError, fetchSearchQuote, searchSymbols } from '../services/finnhub'
import WatchButton from './WatchButton'

export default function StockSearch() {
  const navigate = useNavigate()
  const { addToDashboard, openDetail, isOnDashboard } = useMarket()
  const { t } = useLocale()
  useCurrency()
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 1) {
      setSuggestions([])
      return undefined
    }

    // Only client-side throttle for market search: one request per pause, not per key.
    const timer = window.setTimeout(async () => {
      const matches = await searchSymbols(needle)
      setSuggestions(matches)
      setOpen(true)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [query])

  function chooseMatch(needle, matches) {
    const upper = needle.toUpperCase()
    const exact = matches.find((item) => item.symbol.toUpperCase() === upper)
    if (exact) return exact
    if (!/^[A-Za-z0-9.]{1,12}$/.test(needle)) return matches[0] ?? null
    return matches[0] ?? { symbol: upper, name: upper }
  }

  async function loadQuote(symbol) {
    const needle = symbol.trim()
    if (!needle) {
      setError(t('search.empty'))
      setOpen(true)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setOpen(true)

    try {
      const matches = await searchSymbols(needle)
      setSuggestions(matches)
      const chosen = chooseMatch(needle, matches)
      if (!chosen?.symbol) throw new QuoteNotFoundError(needle)

      const quote = await fetchSearchQuote(chosen.symbol)
      const companyName = chosen.name && chosen.name.toUpperCase() !== quote.symbol ? chosen.name : quote.name
      setResult({ ...quote, name: companyName, type: chosen.type || quote.type })
      setQuery(quote.symbol)
    } catch (caught) {
      const message =
        caught instanceof QuoteNotFoundError ? t('search.noMatch') : t('search.failed')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    loadQuote(query)
  }

  function handleAdd(quote) {
    addToDashboard(quote)
    navigate('/')
    setOpen(false)
  }

  function handleDetails(quote) {
    openDetail(quote)
    setOpen(false)
  }

  const showPanel = open && (loading || error || result || suggestions.length > 0)

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <form onSubmit={handleSubmit}>
        <label className="relative flex min-w-0 items-center">
          {loading ? (
            <Loader2 size={16} className="pointer-events-none absolute left-3 animate-spin text-sky-300" />
          ) : (
            <Search size={16} className="pointer-events-none absolute left-3 text-muted" />
          )}
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setResult(null)
              setError('')
            }}
            onFocus={() => setOpen(true)}
            placeholder={t('search.placeholder')}
            className="w-full rounded-xl border border-line bg-panel py-2.5 pr-16 pl-10 text-sm text-ink outline-none placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
            aria-label={t('search.label')}
          />
          <button
            type="submit"
            className="absolute right-1.5 rounded-lg bg-sky-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300"
          >
            {t('search.go')}
          </button>
        </label>
      </form>

      {showPanel ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
              <Loader2 size={16} className="animate-spin text-sky-300" />
              {t('search.looking')}
            </div>
          ) : null}

          {error ? (
            <p className="border-b border-line px-4 py-3 text-sm text-rose-300">{error}</p>
          ) : null}

          {result ? (
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className="text-left" onClick={() => handleDetails(result)}>
                  <p className="text-sm font-semibold">{result.symbol}</p>
                  <p className="text-xs text-muted">{result.name}</p>
                  <p className="mt-1 text-sm">
                    {formatEur(result.current)}{' '}
                    <span className={result.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {result.change >= 0 ? '+' : ''}
                      {result.percent.toFixed(2)}%
                    </span>
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <WatchButton symbol={result.symbol} />
                  <button
                    type="button"
                    onClick={() => handleDetails(result)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-white/5"
                  >
                    {t('search.details')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdd(result)}
                    disabled={isOnDashboard(result.symbol)}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-400 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
                  >
                    <Plus size={12} />
                    {isOnDashboard(result.symbol) ? t('search.onGrid') : t('search.add')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-auto py-1">
              {suggestions.map((item) => (
                <li key={item.symbol} className="flex items-center pr-2 hover:bg-white/5">
                  <button
                    type="button"
                    onClick={() => loadQuote(item.symbol)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2.5 text-left text-sm"
                  >
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted">{item.name}</span>
                  </button>
                  <WatchButton symbol={item.symbol} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

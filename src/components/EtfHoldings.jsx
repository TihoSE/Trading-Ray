import { useEffect, useState } from 'react'
import { fetchEtfHoldings, isEtfQuote } from '../services/finnhub'

function formatWeight(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function formatAsOf(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function EtfHoldings({ quote }) {
  const isEtf = isEtfQuote(quote)
  const [status, setStatus] = useState(isEtf ? 'loading' : 'idle')
  const [holdings, setHoldings] = useState(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!isEtf) return undefined
    let cancelled = false
    setStatus('loading')
    setError('')
    setHoldings(null)
    setShowAll(false)

    fetchEtfHoldings(quote.symbol)
      .then((data) => {
        if (cancelled) return
        setHoldings(data)
        setStatus('ready')
      })
      .catch((caught) => {
        if (cancelled) return
        setError(caught instanceof Error ? caught.message : 'Unable to load holdings.')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [isEtf, quote.symbol])

  if (!isEtf) return null

  const rows = holdings?.holdings ?? []
  const visible = showAll ? rows : rows.slice(0, 10)
  const asOf = formatAsOf(holdings?.atDate)

  return (
    <section className="mt-4 rounded-2xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Holdings</p>
          <p className="text-xs text-muted">
            {status === 'ready'
              ? `${showAll ? rows.length : Math.min(10, rows.length)} of ${rows.length}${asOf ? ` · As of ${asOf}` : ''}`
              : `What ${quote.symbol} holds`}
          </p>
        </div>
        {status === 'ready' && rows.length > 10 ? (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-[#070b14] p-1 text-xs font-semibold">
            <button
              type="button"
              aria-pressed={!showAll}
              onClick={() => setShowAll(false)}
              className={`rounded-lg px-2.5 py-1.5 ${showAll ? 'text-slate-400 hover:bg-white/5' : 'bg-sky-400 text-slate-950'}`}
            >
              Top 10
            </button>
            <button
              type="button"
              aria-pressed={showAll}
              onClick={() => setShowAll(true)}
              className={`rounded-lg px-2.5 py-1.5 ${showAll ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:bg-white/5'}`}
            >
              All
            </button>
          </div>
        ) : null}
      </div>

      {status === 'loading' ? (
        <div className="mt-3 h-28 animate-pulse rounded-xl border border-line bg-[#070b14]" />
      ) : null}

      {status === 'error' ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {status === 'ready' && rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No holdings reported for {quote.symbol}.</p>
      ) : null}

      {status === 'ready' && visible.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#070b14] text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Ticker</th>
                <th className="px-3 py-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((holding, index) => (
                <tr key={`${holding.symbol}-${holding.name}-${index}`} className="border-t border-line">
                  <td className="max-w-[16rem] truncate px-3 py-2">{holding.name}</td>
                  <td className="px-3 py-2 font-medium">{holding.symbol || '—'}</td>
                  <td className="px-3 py-2 text-right">{formatWeight(holding.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

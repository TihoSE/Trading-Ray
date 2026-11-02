import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext'
import { STARTING_CASH, formatEur, formatSignedEur, parseCash } from '../lib/money'
import { fetchQuote, lookupName } from '../services/finnhub'

function formatWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CashEditor() {
  const { cash, ready, setPaperCash } = usePortfolio()
  const [draft, setDraft] = useState(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState('ok')
  const shown = draft ?? (cash == null ? '' : String(cash))

  async function apply(next) {
    setPending(true)
    setMessage('')
    try {
      await setPaperCash(next)
      setDraft(null)
      setTone('ok')
      setMessage('Paper cash updated.')
    } catch (error) {
      setTone('err')
      setMessage(error instanceof Error ? error.message : 'Could not update cash.')
    } finally {
      setPending(false)
    }
  }

  function applyDraft(event) {
    event.preventDefault()
    const next = parseCash(shown)
    if (next == null) {
      setTone('err')
      setMessage('Enter an amount from €0 to €1.000.000.000.')
      return
    }
    void apply(next)
  }

  function addAmount(delta) {
    if (cash == null) return
    const next = Math.round((cash + delta) * 100) / 100
    if (next > 1_000_000_000) {
      setTone('err')
      setMessage('Cash cannot go above €1.000.000.000.')
      return
    }
    void apply(next)
  }

  return (
    <form onSubmit={applyDraft} className="mt-4 rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm font-semibold">Adjust paper cash</p>
      <p className="mt-1 text-sm text-muted">
        Practice money only. Open positions stay in the account, and the equity result ignores deposits and withdrawals.
      </p>
      <label className="mt-4 block text-sm font-medium">
        Balance
        <input
          type="text"
          inputMode="decimal"
          value={shown}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!ready || cash == null || pending}
          className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!ready || cash == null || pending}
          className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Set balance'}
        </button>
        <button
          type="button"
          onClick={() => addAmount(1000)}
          disabled={!ready || cash == null || pending}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          + €1.000
        </button>
        <button
          type="button"
          onClick={() => addAmount(10000)}
          disabled={!ready || cash == null || pending}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          + €10.000
        </button>
        <button
          type="button"
          onClick={() => apply(STARTING_CASH)}
          disabled={!ready || cash == null || pending}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
        >
          Set to €10.000
        </button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${tone === 'err' ? 'text-rose-300' : 'text-emerald-300'}`}>{message}</p>
      ) : null}
    </form>
  )
}

export default function Portfolio() {
  const { cash, funded, positions, trades, ready, error } = usePortfolio()
  const [marks, setMarks] = useState({})
  const tickerKey = positions.map((position) => position.ticker).join(',')

  useEffect(() => {
    let cancelled = false
    const tickers = tickerKey ? tickerKey.split(',') : []

    async function loadMarks() {
      if (tickers.length === 0) {
        setMarks({})
        return
      }

      const entries = await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const quote = await fetchQuote(ticker)
            return [ticker, quote.current]
          } catch {
            return [ticker, null]
          }
        }),
      )

      if (!cancelled) {
        setMarks(Object.fromEntries(entries))
      }
    }

    loadMarks()
    return () => {
      cancelled = true
    }
  }, [tickerKey])

  const rows = positions.map((position) => {
    const live = marks[position.ticker]
    const mark = live == null ? position.avgCost : live
    const marketValue = position.shares * mark
    const costBasis = position.shares * position.avgCost
    return {
      ...position,
      name: lookupName(position.ticker),
      mark,
      marketValue,
      unrealized: marketValue - costBasis,
      priced: live != null,
    }
  })

  const holdingsValue = rows.reduce((sum, row) => sum + row.marketValue, 0)
  const equity = (cash ?? 0) + holdingsValue
  const pnl = equity - funded
  const pnlPercent = funded > 0 ? (pnl / funded) * 100 : null
  const tone = pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Simulation</p>
      <h1 className="mt-1 text-2xl font-semibold">Portfolio</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Virtual account with {formatEur(STARTING_CASH)} starting cash. Buys and sells fill at the quoted price,
        booked 1-for-1 in euros.
      </p>

      {error ? (
        <p className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Cash</p>
          <p className="mt-2 text-2xl font-semibold">{ready && cash != null ? formatEur(cash) : '—'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Holdings</p>
          <p className="mt-2 text-2xl font-semibold">{ready ? formatEur(holdingsValue) : '—'}</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Equity</p>
          <p className="mt-2 text-2xl font-semibold">{ready && cash != null ? formatEur(equity) : '—'}</p>
          {ready && cash != null ? (
            <p className={`mt-2 text-sm font-medium ${tone}`}>
              {formatSignedEur(pnl)}
              {pnlPercent == null ? '' : ` · ${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`}
            </p>
          ) : null}
        </article>
      </div>

      <CashEditor />

      <h2 className="mt-8 text-lg font-semibold">Positions</h2>
      {!ready ? (
        <div className="mt-3 h-28 animate-pulse rounded-2xl border border-line bg-panel" />
      ) : positions.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-panel px-6 py-10 text-center">
          <p className="font-semibold">No open positions</p>
          <p className="mt-2 text-sm text-muted">Open a quote and use Buy to spend paper cash.</p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
          >
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Shares</th>
                <th className="px-4 py-3 font-medium">Avg cost</th>
                <th className="px-4 py-3 font-medium">Mark</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Unrealized</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticker} className="border-t border-line bg-[#070b14]">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.ticker}</p>
                    <p className="text-xs text-muted">{row.name}</p>
                  </td>
                  <td className="px-4 py-3">{row.shares}</td>
                  <td className="px-4 py-3">{formatEur(row.avgCost)}</td>
                  <td className="px-4 py-3">
                    {formatEur(row.mark)}
                    {row.priced ? '' : <span className="ml-2 text-xs text-muted">cost</span>}
                  </td>
                  <td className="px-4 py-3">{formatEur(row.marketValue)}</td>
                  <td className={`px-4 py-3 ${row.unrealized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatSignedEur(row.unrealized)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Recent trades</h2>
      {!ready || trades.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{ready ? 'No trades yet.' : 'Loading trades…'}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {trades.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  <span className={item.side === 'buy' ? 'text-emerald-300' : 'text-rose-300'}>
                    {item.side === 'buy' ? 'Buy' : 'Sell'}
                  </span>{' '}
                  {item.shares} {item.ticker}
                </p>
                <p className="text-xs text-muted">{formatWhen(item.createdAt)}</p>
              </div>
              <div className="text-right">
                <p>{formatEur(item.amount)}</p>
                {item.realizedPnl != null ? (
                  <p className={`text-xs ${item.realizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    Realized {formatSignedEur(item.realizedPnl)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

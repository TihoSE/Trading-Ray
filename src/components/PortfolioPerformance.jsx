import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { buildEquityHistory, PERFORMANCE_RANGES, sliceEquity } from '../lib/performance'
import { formatCurrency, formatSignedCurrency } from '../lib/money'
import { fetchQuote } from '../services/finnhub'
import { supabase } from '../lib/supabase'

const GAIN = '#34d399'
const LOSS = '#f87171'

function formatTick(time, range, locale) {
  const date = new Date(time)
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB'
  if (range === '1D') return date.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' })
  if (range === '1W') return date.toLocaleDateString(tag, { weekday: 'short' })
  if (range === '1Y' || range === 'ALL') return date.toLocaleDateString(tag, { month: 'short', year: '2-digit' })
  return date.toLocaleDateString(tag, { month: 'short', day: 'numeric' })
}

function PerformanceTooltip({ active, payload, locale }) {
  const { currency } = useCurrency()
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const tag = locale === 'nl' ? 'nl-NL' : 'en-GB'

  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">
        {new Date(point.time).toLocaleString(tag, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-sm font-semibold">{formatCurrency(point.equity, currency)}</p>
    </div>
  )
}

export default function PortfolioPerformance() {
  const { user } = useAuth()
  const { cash, positions, trades, ready } = usePortfolio()
  const { locale, t } = useLocale()
  const { currency } = useCurrency()
  const [range, setRange] = useState('1M')
  const [history, setHistory] = useState([])
  const [marks, setMarks] = useState({})
  const [status, setStatus] = useState(user ? 'loading' : 'ready')
  const tickerKey = positions.map((position) => position.ticker).join(',')
  const newestTrade = trades[0]?.id ?? ''

  useEffect(() => {
    if (!user?.id) {
      setHistory([])
      setStatus('ready')
      return undefined
    }

    let cancelled = false
    setStatus('loading')

    supabase
      .from('trades')
      .select('id, ticker, side, shares, price, amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setHistory([])
          setStatus('error')
          return
        }
        setHistory(
          (data ?? []).map((row) => ({
            id: row.id,
            ticker: String(row.ticker).toUpperCase(),
            side: row.side,
            shares: Number(row.shares),
            price: Number(row.price),
            amount: Number(row.amount),
            createdAt: row.created_at,
          })),
        )
        setStatus('ready')
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, newestTrade])

  useEffect(() => {
    if (!user?.id) return undefined
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
      if (!cancelled) setMarks(Object.fromEntries(entries))
    }

    loadMarks()
    return () => {
      cancelled = true
    }
  }, [user?.id, tickerKey])

  const series = useMemo(() => {
    if (!user || cash == null) return []
    const historyPoints = buildEquityHistory({ trades: history, cash, positions, marks })
    return sliceEquity(historyPoints, range)
  }, [user, cash, positions, marks, history, range])

  const start = series[0]?.equity ?? null
  const end = series[series.length - 1]?.equity ?? null
  const change = start == null || end == null ? null : end - start
  const changePct = change == null || !start ? null : (change / start) * 100
  const positive = (change ?? 0) >= 0
  const stroke = positive ? GAIN : LOSS

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('dash.performance')}</p>
          <h2 className="mt-1 text-lg font-semibold">{t('dash.performanceTitle')}</h2>
          {user && change != null ? (
            <p className="mt-1 text-sm font-medium" style={{ color: stroke }}>
              {formatSignedCurrency(change, currency)}
              {changePct == null ? '' : ` · ${change > 0 ? '+' : ''}${changePct.toFixed(2)}%`}
            </p>
          ) : null}
        </div>
      </div>

      {!user ? (
        <p className="mt-3 text-sm text-muted">{t('dash.performanceGuest')}</p>
      ) : !ready || status === 'loading' ? (
        <div className="mt-4 h-44 animate-pulse rounded-xl border border-line bg-[#070b14]" />
      ) : status === 'error' ? (
        <p className="mt-3 text-sm text-rose-300">{t('dash.performanceFailed')}</p>
      ) : end == null ? (
        <p className="mt-3 text-sm text-muted">{t('dash.performanceEmpty')}</p>
      ) : (
        <>
          <div
            role="group"
            aria-label={t('dash.performanceRanges')}
            className="mt-4 grid grid-cols-5 gap-1 rounded-xl border border-line bg-[#070b14] p-1 text-xs font-semibold"
          >
            {PERFORMANCE_RANGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`rounded-lg px-2 py-1.5 ${
                  range === value ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                {value === 'ALL' ? t('dash.performanceAll') : value}
              </button>
            ))}
          </div>
          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolio-performance-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#243044" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(value) => formatTick(value, range, locale)}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => formatCurrency(value, currency, { digits: 0 })}
                />
                <Tooltip content={<PerformanceTooltip locale={locale} />} cursor={{ stroke: '#243044' }} />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke={stroke}
                  strokeWidth={2}
                  fill="url(#portfolio-performance-fill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  )
}

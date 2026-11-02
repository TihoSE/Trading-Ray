import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { formatEur } from '../lib/money'
import { fetchQuote } from '../services/finnhub'

const CASH_COLOR = '#38bdf8'
const POSITION_COLOR = '#22c55e'

function DonutTooltip({ active, payload }) {
  useCurrency()
  if (!active || !payload?.length) return null
  const item = payload[0]

  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">{item.name}</p>
      <p className="text-sm font-semibold">{formatEur(item.value)}</p>
    </div>
  )
}

export default function PortfolioDonut() {
  const { user } = useAuth()
  const { cash, positions, ready } = usePortfolio()
  const { t } = useLocale()
  useCurrency()
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

      if (!cancelled) setMarks(Object.fromEntries(entries))
    }

    loadMarks()
    return () => {
      cancelled = true
    }
  }, [tickerKey])

  const holdingsValue = positions.reduce((sum, position) => {
    const mark = marks[position.ticker]
    const price = mark == null ? position.avgCost : mark
    return sum + position.shares * price
  }, 0)
  const cashValue = Math.max(cash ?? 0, 0)
  const total = cashValue + holdingsValue
  const slices = [
    { key: 'cash', name: t('portfolio.cash'), value: cashValue, fill: CASH_COLOR },
    { key: 'positions', name: t('dash.positions'), value: holdingsValue, fill: POSITION_COLOR },
  ]
  const pieData = slices.filter((slice) => slice.value > 0)

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('dash.allocation')}</p>
      <h2 className="mt-1 text-lg font-semibold">{t('dash.allocationTitle')}</h2>

      {!user ? (
        <p className="mt-3 text-sm text-muted">{t('dash.allocationGuest')}</p>
      ) : !ready ? (
        <div className="mt-4 h-52 animate-pulse rounded-xl border border-line bg-[#070b14]" />
      ) : total <= 0 ? (
        <p className="mt-3 text-sm text-muted">{t('dash.allocationEmpty')}</p>
      ) : (
        <>
          <div className="relative mt-2 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="84%"
                  paddingAngle={pieData.length > 1 ? 3 : 0}
                  stroke="var(--color-panel)"
                  strokeWidth={3}
                  isAnimationActive={false}
                >
                  {pieData.map((slice) => (
                    <Cell key={slice.key} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{t('portfolio.equity')}</p>
                <p className="mt-1 text-sm font-semibold">{formatEur(total)}</p>
              </div>
            </div>
          </div>

          <ul className="mt-2 space-y-2">
            {slices.map((slice) => {
              const share = total > 0 ? (slice.value / total) * 100 : 0
              return (
                <li key={slice.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.fill }} />
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatEur(slice.value)}
                    <span className="ml-2 text-xs text-muted">{share.toFixed(0)}%</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

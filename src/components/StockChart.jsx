import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { useCandleSeries } from '../hooks/useCandleSeries'
import { formatEur, formatMoney } from '../lib/money'
import { CANDLE_TIMEFRAMES, getCandleTimeframe } from '../services/finnhub'

const GAIN = '#22c55e'
const LOSS = '#ef4444'

function ChartTooltip({ active, payload, chartStyle, t }) {
  useCurrency()
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">{point.label}</p>
      {chartStyle === 'candle' ? (
        <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs">
          <div>
            <dt className="text-muted">{t('chart.open')}</dt>
            <dd className="font-semibold">{formatEur(point.open)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('chart.high')}</dt>
            <dd className="font-semibold">{formatEur(point.high)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('chart.low')}</dt>
            <dd className="font-semibold">{formatEur(point.low)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t('chart.close')}</dt>
            <dd className="font-semibold">{formatEur(point.close)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm font-semibold">{formatEur(point.price)}</p>
      )}
    </div>
  )
}

function CandleBar({ x, y, width, height, payload }) {
  if (x == null || y == null || !payload) return null
  const open = Number(payload.open)
  const close = Number(payload.close)
  const high = Number(payload.high)
  const low = Number(payload.low)
  const color = close >= open ? GAIN : LOSS
  const bodyWidth = Math.max(Math.min(width * 0.62, 12), 2)
  const bodyX = x + (width - bodyWidth) / 2
  const mid = x + width / 2
  const span = high - low

  if (!height || span <= 0) {
    return <line x1={bodyX} x2={bodyX + bodyWidth} y1={y} y2={y} stroke={color} strokeWidth={2} />
  }

  const top = Math.max(open, close)
  const bottom = Math.min(open, close)
  const bodyY = y + ((high - top) / span) * height
  const bodyHeight = Math.max(((top - bottom) / span) * height, 1)

  return (
    <g>
      <line x1={mid} x2={mid} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill={color} rx={0.5} />
    </g>
  )
}

export default function StockChart({ quote }) {
  const [timeframe, setTimeframe] = useState('1D')
  const [chartStyle, setChartStyle] = useState('line')
  const { t } = useLocale()
  useCurrency()
  const { points, source, status } = useCandleSeries(quote, timeframe)
  const option = getCandleTimeframe(timeframe)
  const stroke = quote.change >= 0 ? GAIN : LOSS
  const sourceLabel = status === 'loading' ? t('common.loading') : source === 'live' ? t('card.live') : t('card.sample')
  const seriesLabel = chartStyle === 'candle' ? t(`chart.candles${option.id}`) : t(`chart.${option.id}`)
  const candles = points.map((point) => {
    const close = point.close ?? point.price
    const open = point.open ?? close
    const high = point.high ?? Math.max(open, close)
    const low = point.low ?? Math.min(open, close)
    return { ...point, open, close, high, low, range: [low, high] }
  })

  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t('chart.title')}</p>
          <p className="text-xs text-muted">
            {seriesLabel} · {sourceLabel}
          </p>
        </div>
        <div role="group" aria-label={t('chart.style')} className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-[#070b14] p-1 text-xs font-semibold">
          {[
            ['line', 'chart.line'],
            ['candle', 'chart.candles'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={chartStyle === value}
              onClick={() => setChartStyle(value)}
              className={`rounded-lg px-3 py-1.5 ${
                chartStyle === value ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-line bg-[#070b14] p-1 text-xs font-semibold">
        {CANDLE_TIMEFRAMES.map((item) => {
          const active = item.id === timeframe
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeframe(item.id)}
              aria-pressed={active}
              className={`rounded-lg px-2 py-1.5 transition ${
                active
                  ? 'bg-sky-400 text-slate-950 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#243044" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatMoney(value, { digits: 0 })}
            />
            <Tooltip
              content={<ChartTooltip chartStyle={chartStyle} t={t} />}
              cursor={chartStyle === 'candle' ? { fill: 'rgba(148,163,184,0.08)' } : { stroke: '#243044' }}
            />
            {chartStyle === 'candle' ? (
              <Bar dataKey="range" shape={<CandleBar />} isAnimationActive={false} />
            ) : (
              <Line
                type="monotone"
                dataKey="price"
                stroke={stroke}
                strokeWidth={2.5}
                strokeLinecap="round"
                fill="none"
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 5, fill: stroke, stroke: '#070b14', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

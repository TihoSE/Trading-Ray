import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCandleSeries } from '../hooks/useCandleSeries'
import { CANDLE_TIMEFRAMES, getCandleTimeframe } from '../services/finnhub'

const GAIN = '#22c55e'
const LOSS = '#ef4444'

function formatPrice(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload

  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2 shadow-lg">
      <p className="text-xs text-muted">{point.label}</p>
      <p className="text-sm font-semibold">{formatPrice(point.price)}</p>
    </div>
  )
}

export default function StockChart({ quote }) {
  const [timeframe, setTimeframe] = useState('1D')
  const { points, source, status } = useCandleSeries(quote, timeframe)
  const option = getCandleTimeframe(timeframe)
  const stroke = quote.change >= 0 ? GAIN : LOSS
  const sourceLabel = status === 'loading' ? 'Loading' : source === 'live' ? 'Finnhub' : 'Sample'

  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Price trend</p>
          <p className="text-xs text-muted">
            {option.caption} · {sourceLabel}
          </p>
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
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#243044' }} />
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { simulateHistory } from '../services/finnhub'

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
  const [days, setDays] = useState(30)
  const data = useMemo(() => simulateHistory(quote, days), [quote, days])
  const stroke = quote.change >= 0 ? GAIN : LOSS

  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Price trend</p>
          <p className="text-xs text-muted">Simulated {days}-day close</p>
        </div>
        <div className="grid grid-cols-2 rounded-lg border border-line bg-[#070b14] p-0.5 text-xs font-semibold">
          {[7, 30].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`rounded-md px-2.5 py-1 ${
                days === range ? 'bg-sky-400 text-slate-950' : 'text-muted hover:text-ink'
              }`}
            >
              {range}D
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#243044" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
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
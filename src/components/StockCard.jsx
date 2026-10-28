import { TrendingDown, TrendingUp } from 'lucide-react'

function formatPrice(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

export default function StockCard({ quote, name }) {
  const isUp = quote.change >= 0
  const tone = isUp ? 'text-emerald-400' : 'text-rose-400'
  const badge = isUp
    ? 'bg-emerald-400/12 text-emerald-300 ring-emerald-400/25'
    : 'bg-rose-400/12 text-rose-300 ring-rose-400/25'

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:border-sky-400/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-wide">{quote.symbol}</p>
          <p className="text-sm text-muted">{name}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${badge}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? 'Gain' : 'Loss'}
        </span>
      </div>

      <p className="mt-6 text-3xl font-semibold tracking-tight">{formatPrice(quote.current)}</p>

      <div className={`mt-3 flex items-center gap-3 text-sm font-medium ${tone}`}>
        <span>
          {isUp ? '+' : ''}
          {formatPrice(quote.change)}
        </span>
        <span>
          {isUp ? '+' : ''}
          {quote.percent.toFixed(2)}%
        </span>
      </div>

      <p className="mt-4 text-xs text-muted">
        Prev close {formatPrice(quote.previousClose)} · {quote.source === 'live' ? 'Finnhub live' : 'Mock fallback'}
      </p>
    </article>
  )
}

import { Star } from 'lucide-react'
import { POPULAR_SYMBOLS } from '../services/finnhub'

export default function Watchlist() {
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Focus list</p>
      <h1 className="mt-1 text-2xl font-semibold">Watchlist</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Core names on this desk. Quotes refresh from the dashboard; add a Finnhub key in Settings for live prices.
      </p>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {POPULAR_SYMBOLS.map((item) => (
          <li key={item.symbol} className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="font-semibold">{item.symbol}</p>
              <p className="text-sm text-muted">{item.name}</p>
            </div>
            <Star size={18} className="fill-amber-300 text-amber-300" />
          </li>
        ))}
      </ul>
    </section>
  )
}

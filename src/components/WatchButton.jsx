import { Star } from 'lucide-react'
import { useWatchlist } from '../context/WatchlistContext'

export default function WatchButton({ symbol, className = '' }) {
  const { isWatched, toggleWatch } = useWatchlist()
  const watched = isWatched(symbol)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleWatch(symbol)
      }}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      className={`rounded-lg p-1.5 transition hover:bg-white/5 ${className}`}
    >
      <Star
        size={18}
        className={watched ? 'fill-amber-300 text-amber-300' : 'text-slate-400'}
      />
    </button>
  )
}

import { Star } from 'lucide-react'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useWatchlist } from '../context/WatchlistContext'

export default function WatchButton({ symbol, className = '' }) {
  const { user } = useAuth()
  const { t } = useLocale()
  const { openPrompt } = useAccountPrompt()
  const { isWatched, toggleWatch } = useWatchlist()
  const watched = isWatched(symbol)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!user) {
          openPrompt()
          return
        }
        toggleWatch(symbol)
      }}
      aria-pressed={watched}
      aria-label={watched ? t('watch.remove', { symbol }) : t('watch.add', { symbol })}
      className={`rounded-lg p-1.5 transition hover:bg-white/5 ${className}`}
    >
      <Star
        size={18}
        className={watched ? 'fill-amber-300 text-amber-300' : 'text-slate-400'}
      />
    </button>
  )
}

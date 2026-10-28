import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

const WatchlistContext = createContext(null)

function storageKey(email) {
  return `aether_watchlist:${email.toLowerCase()}`
}

function readWatchlist(email) {
  if (!email) return []
  try {
    const raw = localStorage.getItem(storageKey(email))
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((symbol) => String(symbol).toUpperCase()))]
  } catch {
    return []
  }
}

function writeWatchlist(email, watchlist) {
  localStorage.setItem(storageKey(email), JSON.stringify(watchlist))
}

export function WatchlistProvider({ children }) {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState(() => readWatchlist(user?.email))

  useEffect(() => {
    setWatchlist(readWatchlist(user?.email))
  }, [user?.email])

  const value = useMemo(
    () => ({
      watchlist,
      isWatched(symbol) {
        return watchlist.includes(symbol.trim().toUpperCase())
      },
      toggleWatch(symbol) {
        const ticker = symbol.trim().toUpperCase()
        if (!ticker || !user?.email) return

        setWatchlist((current) => {
          const next = current.includes(ticker)
            ? current.filter((item) => item !== ticker)
            : [...current, ticker]
          writeWatchlist(user.email, next)
          return next
        })
      },
    }),
    [watchlist, user?.email],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const WatchlistContext = createContext(null)

export function WatchlistProvider({ children }) {
  const { user } = useAuth()
  const [watchlist, setWatchlist] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setWatchlist([])
        return
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select('symbol')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) {
        console.error('Failed to load watchlist', error.message)
        setWatchlist([])
        return
      }

      setWatchlist([
        ...new Set((data ?? []).map((row) => String(row.symbol).toUpperCase())),
      ])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      watchlist,
      isWatched(symbol) {
        return watchlist.includes(symbol.trim().toUpperCase())
      },
      async toggleWatch(symbol) {
        const ticker = symbol.trim().toUpperCase()
        if (!ticker || !user?.id) return

        const watched = watchlist.includes(ticker)
        setWatchlist((current) =>
          watched ? current.filter((item) => item !== ticker) : [...current, ticker],
        )

        if (watched) {
          const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('symbol', ticker)

          if (error) {
            setWatchlist((current) => [...current, ticker])
            console.error('Failed to remove ticker', error.message)
          }
          return
        }

        const { error } = await supabase.from('watchlist').insert({
          user_id: user.id,
          symbol: ticker,
        })

        if (error) {
          setWatchlist((current) => current.filter((item) => item !== ticker))
          console.error('Failed to add ticker', error.message)
        }
      },
    }),
    [watchlist, user?.id],
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

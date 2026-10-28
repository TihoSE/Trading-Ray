import { createContext, useContext, useMemo, useState } from 'react'
import { POPULAR_SYMBOLS } from '../services/finnhub'

const MarketContext = createContext(null)

export function MarketProvider({ children }) {
  const [extraQuotes, setExtraQuotes] = useState([])
  const [detail, setDetail] = useState(null)

  const value = useMemo(
    () => ({
      extraQuotes,
      detail,
      openDetail: (quote) => setDetail(quote),
      closeDetail: () => setDetail(null),
      isOnDashboard(symbol) {
        const ticker = symbol.toUpperCase()
        return (
          POPULAR_SYMBOLS.some((item) => item.symbol === ticker) ||
          extraQuotes.some((item) => item.symbol === ticker)
        )
      },
      addToDashboard(quote) {
        const ticker = quote.symbol.toUpperCase()
        if (POPULAR_SYMBOLS.some((item) => item.symbol === ticker)) return
        setExtraQuotes((current) => {
          const next = current.filter((item) => item.symbol !== ticker)
          return [{ ...quote, symbol: ticker }, ...next]
        })
      },
    }),
    [extraQuotes, detail],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const context = useContext(MarketContext)
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider')
  }
  return context
}

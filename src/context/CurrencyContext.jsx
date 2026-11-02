import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { setMoneyCurrency } from '../lib/money'

const STORAGE_KEY = 'trading-ray-currency'
const CurrencyContext = createContext(null)

function readStoredCurrency() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'USD' ? 'USD' : 'EUR'
  } catch {
    return 'EUR'
  }
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(readStoredCurrency)
  setMoneyCurrency(currency)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency)
    } catch {
      // The choice still applies for this visit when storage is blocked.
    }
  }, [currency])

  const value = useMemo(
    () => ({
      currency,
      setCurrency(next) {
        setCurrencyState(next === 'USD' ? 'USD' : 'EUR')
      },
    }),
    [currency],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return context
}

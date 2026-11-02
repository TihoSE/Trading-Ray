import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translate } from '../i18n/messages'
import { setMoneyLocale, USD_TO_EUR } from '../lib/money'

const STORAGE_KEY = 'trading-ray-locale'
const LocaleContext = createContext(null)

function readStoredLocale() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'nl' ? 'nl' : 'en'
  } catch {
    return 'en'
  }
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale)
  setMoneyLocale(locale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // The choice still applies for this visit when storage is blocked.
    }
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      usdToEur: USD_TO_EUR,
      setLocale(next) {
        setLocaleState(next === 'nl' ? 'nl' : 'en')
      },
      t(key, vars) {
        return translate(locale, key, vars)
      },
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}

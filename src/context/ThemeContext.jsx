import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'trading-ray-theme'
const ThemeContext = createContext(null)

export function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // The choice still applies for this visit when storage is blocked.
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme(next) {
        setThemeState(next === 'light' ? 'light' : 'dark')
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

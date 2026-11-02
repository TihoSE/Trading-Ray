/**
 * Trading-Ray is a Vite single-page app: React draws the UI, Vite bundles it,
 * and there is no application server in front of the browser.
 *
 * AuthProvider wraps the router so every route reads one session. Quote state
 * and the paper portfolio mount inside Layout for guests and signed-in users.
 * Guests can read live quotes; buying, selling, and the watchlist ask them to
 * create an account. Market data stays inside Layout because it is disposable.
 */
import { Toaster } from 'sonner'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { LocaleProvider } from './context/LocaleContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'
import Watchlist from './pages/Watchlist'

function Notices() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme}
      position="top-right"
      offset={12}
      mobileOffset={{ top: 72, right: 12, left: 12 }}
      closeButton
      toastOptions={{
        style: {
          background: 'var(--color-panel)',
          color: 'var(--color-ink)',
          border: '1px solid var(--color-line)',
        },
      }}
    />
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <Notices />
    <LocaleProvider>
    <CurrencyProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </CurrencyProvider>
    </LocaleProvider>
    </ThemeProvider>
  )
}

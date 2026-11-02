/**
 * Trading-Ray is a Vite single-page app: React draws the UI, Vite bundles it,
 * and there is no application server in front of the browser.
 *
 * AuthProvider wraps the router so every route reads one session. Quote state
 * and the paper portfolio mount inside Layout for guests and signed-in users.
 * Guests can read live quotes; buying, selling, and the watchlist ask them to
 * create an account. Market data stays inside Layout because it is disposable.
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Settings from './pages/Settings'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <LocaleProvider>
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
    </LocaleProvider>
  )
}

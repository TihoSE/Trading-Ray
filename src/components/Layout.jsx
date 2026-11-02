import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { AccountPromptProvider } from '../context/AccountPromptContext'
import { MarketProvider } from '../context/MarketContext'
import { PortfolioProvider } from '../context/PortfolioContext'
import { WatchlistProvider } from '../context/WatchlistContext'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import StockDetail from './StockDetail'

export default function Layout() {
  const { ready } = useAuth()
  const { t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#070b14] text-sm text-muted">
        {t('layout.restoring')}
      </div>
    )
  }

  return (
    <MarketProvider>
      <WatchlistProvider>
        <PortfolioProvider>
          <AccountPromptProvider>
            <div className="min-h-screen bg-[#070b14] lg:grid lg:grid-cols-[18rem_1fr]">
              <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex min-w-0 flex-col">
                <Navbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 px-4 py-6 sm:px-6">
                  <Outlet />
                </main>
              </div>
            </div>
            <StockDetail />
          </AccountPromptProvider>
        </PortfolioProvider>
      </WatchlistProvider>
    </MarketProvider>
  )
}


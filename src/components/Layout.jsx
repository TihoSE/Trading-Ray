import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MarketProvider } from '../context/MarketContext'
import { WatchlistProvider } from '../context/WatchlistContext'
import Auth from './Auth'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import StockDetail from './StockDetail'

export default function Layout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) {
    return <Auth />
  }

  return (
    <MarketProvider>
      <WatchlistProvider>
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
      </WatchlistProvider>
    </MarketProvider>
  )
}

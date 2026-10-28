import { Bell, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StockSearch from './StockSearch'

function avatarUrl(name) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0ea5e9`
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-[#070b14]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        className="rounded-xl p-2 text-slate-300 hover:bg-white/5 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      <StockSearch />

      <button
        type="button"
        className="hidden rounded-xl border border-line bg-panel p-2.5 text-slate-300 hover:bg-white/5 sm:grid"
        aria-label="Notifications"
      >
        <Bell size={18} />
      </button>

      {user ? (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-panel py-1.5 pr-1.5 pl-2">
          <img
            src={avatarUrl(user.name)}
            alt={`${user.name} avatar`}
            className="h-9 w-9 rounded-full ring-1 ring-sky-400/30"
          />
          <div className="hidden min-w-0 pr-1 sm:block">
            <p className="max-w-[9rem] truncate text-sm font-medium leading-tight">{user.name}</p>
            <p className="max-w-[9rem] truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      ) : null}
    </header>
  )
}

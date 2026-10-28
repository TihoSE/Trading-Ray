import { X } from 'lucide-react'
import { useMarket } from '../context/MarketContext'
import StockCard from './StockCard'

function formatPrice(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

export default function StockDetail() {
  const { detail, closeDetail, addToDashboard, isOnDashboard } = useMarket()

  if (!detail) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <button type="button" className="absolute inset-0" aria-label="Close details" onClick={closeDetail} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-line bg-[#070b14] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">Quote details</p>
          <button
            type="button"
            onClick={closeDetail}
            className="rounded-lg p-2 text-muted hover:bg-white/5"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <StockCard quote={detail} name={detail.name} />
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">Open</dt>
            <dd className="mt-1 font-medium">{formatPrice(detail.open)}</dd>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">High</dt>
            <dd className="mt-1 font-medium">{formatPrice(detail.high)}</dd>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">Low</dt>
            <dd className="mt-1 font-medium">{formatPrice(detail.low)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => {
            addToDashboard(detail)
            closeDetail()
          }}
          disabled={isOnDashboard(detail.symbol)}
          className="mt-4 w-full rounded-xl bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {isOnDashboard(detail.symbol) ? 'Already on dashboard' : 'Add to dashboard'}
        </button>
      </div>
    </div>
  )
}

import { X } from 'lucide-react'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { useMarket } from '../context/MarketContext'
import { formatEur } from '../lib/money'
import EtfHoldings from './EtfHoldings'
import StockCard from './StockCard'
import StockChart from './StockChart'
import TradePanel from './TradePanel'

export default function StockDetail() {
  const { detail, closeDetail, addToDashboard, isOnDashboard } = useMarket()
  const { t } = useLocale()
  useCurrency()

  if (!detail) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <button type="button" className="absolute inset-0" aria-label={t('detail.close')} onClick={closeDetail} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-[#070b14] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">{t('detail.title')}</p>
          <button
            type="button"
            onClick={closeDetail}
            className="rounded-lg p-2 text-muted hover:bg-white/5"
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>
        <StockCard quote={detail} name={detail.name} />
        <StockChart quote={detail} />
        <EtfHoldings quote={detail} />
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">{t('detail.open')}</dt>
            <dd className="mt-1 font-medium">{formatEur(detail.open)}</dd>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">{t('detail.high')}</dt>
            <dd className="mt-1 font-medium">{formatEur(detail.high)}</dd>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <dt className="text-xs text-muted">{t('detail.low')}</dt>
            <dd className="mt-1 font-medium">{formatEur(detail.low)}</dd>
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
          {isOnDashboard(detail.symbol) ? t('detail.onDashboard') : t('detail.add')}
        </button>
        <TradePanel quote={detail} />
      </div>
    </div>
  )
}

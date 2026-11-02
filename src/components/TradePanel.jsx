import { useState } from 'react'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import { STARTING_CASH, formatEur, tradeCost } from '../lib/money'

function formatQuote(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

export default function TradePanel({ quote }) {
  const { user } = useAuth()
  const { t } = useLocale()
  const { openPrompt } = useAccountPrompt()
  const { cash, ready, error: portfolioError, positionFor, trade } = usePortfolio()
  const [shares, setShares] = useState('1')
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('ok')

  const quantity = /^\d+$/.test(shares) ? Number(shares) : null
  const price = Number(quote.current)
  const cost = quantity && price > 0 ? tradeCost(quantity, price) : null
  const position = positionFor(quote.symbol)
  const held = position?.shares ?? 0
  const guest = !user
  const canBuy =
    guest || (ready && !portfolioError && quantity != null && cost != null && cash != null && cost <= cash)
  const canSell = guest || (ready && !portfolioError && quantity != null && cost != null && quantity <= held)

  async function submit(side) {
    if (!user) {
      openPrompt()
      return
    }
    if (quantity == null || !(price > 0)) return
    setPending(side)
    setMessage('')
    try {
      await trade({
        ticker: quote.symbol,
        side,
        shares: quantity,
        price,
      })
      setMessageTone('ok')
      setMessage(t(side === 'buy' ? 'trade.bought' : 'trade.sold', { qty: quantity, symbol: quote.symbol }))
    } catch (error) {
      setMessageTone('err')
      setMessage(error instanceof Error ? error.message : t('trade.failed'))
    } finally {
      setPending('')
    }
  }

  return (
    <form
      className="mt-4 rounded-2xl border border-line bg-panel p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t('trade.paper')}</p>
          <p className="mt-1 text-xs text-muted">
            {t('trade.fill', { price: formatQuote(price), cash: formatEur(STARTING_CASH) })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">{t('trade.cash')}</p>
          <p className="text-sm font-semibold">{cash == null ? '—' : formatEur(cash)}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {t('trade.held', { count: held, symbol: quote.symbol })}
        {position ? ` · ${t('trade.avg', { price: formatEur(position.avgCost) })}` : ''}
      </p>

      <label className="mt-3 block text-sm font-medium">
        {t('trade.shares')}
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={shares}
          onChange={(event) => setShares(event.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        />
      </label>

      <p className="mt-3 text-sm text-muted">
        {!(price > 0)
          ? t('trade.noPrice')
          : cost == null
            ? t('trade.wholeShares')
            : t('trade.estimate', { amount: formatEur(cost) })}
      </p>
      {cost != null && cash != null && cost > cash ? (
        <p className="mt-1 text-xs text-rose-300">{t('trade.notEnoughCash')}</p>
      ) : null}
      {quantity != null && held > 0 && quantity > held ? (
        <p className="mt-1 text-xs text-rose-300">{t('trade.notEnoughShares')}</p>
      ) : null}

      {portfolioError ? <p className="mt-3 text-sm text-rose-300">{portfolioError}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => submit('buy')}
          disabled={!canBuy || pending !== ''}
          className="rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
        >
          {pending === 'buy' ? t('trade.buying') : t('trade.buy')}
        </button>
        <button
          type="button"
          onClick={() => submit('sell')}
          disabled={!canSell || pending !== ''}
          className="rounded-xl bg-rose-400 py-2.5 text-sm font-semibold text-slate-950 hover:bg-rose-300 disabled:opacity-50"
        >
          {pending === 'sell' ? t('trade.selling') : t('trade.sell')}
        </button>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${messageTone === 'err' ? 'text-rose-300' : 'text-emerald-300'}`}>{message}</p>
      ) : null}
    </form>
  )
}

import { useState } from 'react'
import { toast } from 'sonner'
import { useAccountPrompt } from '../context/AccountPromptContext'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useLocale } from '../context/LocaleContext'
import { usePortfolio } from '../context/PortfolioContext'
import {
  STARTING_CASH,
  formatEur,
  formatShares,
  maxBuyableShares,
  parseCash,
  roundShares,
  sharesForAmount,
  tradeCost,
} from '../lib/money'

function parseShareInput(value) {
  const text = String(value).trim().replace(',', '.')
  if (!/^\d+(\.\d{0,4})?$/.test(text)) return null
  return roundShares(text)
}

export default function TradePanel({ quote }) {
  const { user } = useAuth()
  const { t } = useLocale()
  useCurrency()
  const { openPrompt } = useAccountPrompt()
  const { cash, ready, error: portfolioError, positionFor, trade } = usePortfolio()
  const [mode, setMode] = useState('shares')
  const [shares, setShares] = useState('1')
  const [amount, setAmount] = useState('')
  const [pending, setPending] = useState('')

  const price = Number(quote.current)
  const shareQty = parseShareInput(shares)
  const parsedAmount = parseCash(amount)
  const fraction = parsedAmount != null && price > 0 ? sharesForAmount(parsedAmount, price) : null
  const quantity = mode === 'amount' ? fraction : shareQty
  const cost = quantity != null && price > 0 ? tradeCost(quantity, price) : null
  const position = positionFor(quote.symbol)
  const held = position?.shares ?? 0
  const maxShares = cash == null ? 0 : maxBuyableShares(cash, price)
  const holdingValue = held > 0 && price > 0 ? held * price : held > 0 ? held * (position?.avgCost ?? 0) : 0
  const amountTooHigh = mode === 'amount' && parsedAmount != null && cash != null && parsedAmount > cash
  const amountTooSmall = mode === 'amount' && parsedAmount != null && price > 0 && fraction == null
  const guest = !user
  const orderReady =
    ready && !portfolioError && quantity != null && cost != null && cash != null && !amountTooHigh && !amountTooSmall
  const canBuy = guest || (orderReady && cost <= cash)
  const canSell = guest || (orderReady && quantity <= held + 1e-9)

  async function submit(side) {
    if (!user) {
      openPrompt()
      return
    }
    if (quantity == null || !(price > 0) || amountTooHigh || amountTooSmall) return
    if (side === 'buy' && (cost == null || cash == null || cost > cash)) return
    if (side === 'sell' && quantity > held + 1e-9) return
    setPending(side)
    try {
      await trade({
        ticker: quote.symbol,
        side,
        shares: quantity,
        price,
      })
      toast.success(
        t(side === 'buy' ? 'trade.bought' : 'trade.sold', {
          qty: formatShares(quantity),
          symbol: quote.symbol,
        }),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('trade.failed'))
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
            {t('trade.fill', { price: formatEur(price), cash: formatEur(STARTING_CASH) })}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1 rounded-xl border border-line bg-[#070b14] px-3 py-3 text-sm">
        <p className="font-medium">
          {t('trade.available', { amount: cash == null ? '—' : formatEur(cash) })}
        </p>
        {held > 0 ? (
          <p>
            {t('trade.holdingLine', {
              count: formatShares(held),
              symbol: quote.symbol,
              value: formatEur(holdingValue),
            })}
          </p>
        ) : null}
        {user && price > 0 ? (
          <p className="text-xs text-muted">
            {t('trade.maxCapacity', {
              count: formatShares(maxShares),
              amount: formatEur(tradeCost(maxShares, price) ?? 0),
            })}
          </p>
        ) : null}
      </div>

      <div role="group" aria-label={t('trade.paper')} className="mt-4 grid grid-cols-2 gap-2">
        {[
          ['shares', 'trade.modeShares'],
          ['amount', 'trade.modeAmount'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              mode === value ? 'border-sky-400 bg-sky-400 text-slate-950' : 'border-line text-ink hover:bg-white/5'
            }`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label htmlFor="trade-size" className="block text-sm font-medium">
          {mode === 'amount' ? t('trade.amount') : t('trade.shares')}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="trade-size"
            type="text"
            inputMode="decimal"
            value={mode === 'amount' ? amount : shares}
            onChange={(event) =>
              mode === 'amount' ? setAmount(event.target.value) : setShares(event.target.value)
            }
            className="w-full rounded-xl border border-line bg-[#070b14] px-3 py-2.5 text-sm outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
          />
          <button
            type="button"
            onClick={() => {
              if (!user) {
                openPrompt()
                return
              }
              if (mode === 'amount') {
                if (cash == null || cash <= 0) return
                setAmount(cash.toFixed(2))
                return
              }
              if (maxShares < 0.0001) return
              setShares(String(maxShares))
            }}
            disabled={Boolean(user) && (mode === 'amount' ? cash == null || cash <= 0 : maxShares < 0.0001 || !(price > 0))}
            className="shrink-0 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
          >
            {t('trade.max')}
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        {!(price > 0)
          ? t('trade.noPrice')
          : mode === 'amount'
            ? fraction != null
              ? t('trade.fraction', { shares: formatShares(fraction) })
              : parsedAmount == null
                ? ''
                : t('trade.amountTooSmall')
            : cost == null
              ? t('trade.wholeShares')
              : t('trade.estimate', { amount: formatEur(cost) })}
      </p>
      {amountTooHigh ? (
        <p className="mt-1 text-xs text-rose-300">{t('trade.amountTooHigh')}</p>
      ) : null}
      {!amountTooHigh && cost != null && cash != null && cost > cash ? (
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
    </form>
  )
}

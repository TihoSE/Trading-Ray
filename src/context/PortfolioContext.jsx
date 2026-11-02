import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STARTING_CASH } from '../lib/money'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const PortfolioContext = createContext(null)

function asNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function mapPosition(row) {
  if (!row) return null
  return {
    ticker: String(row.ticker).toUpperCase(),
    shares: asNumber(row.shares),
    avgCost: asNumber(row.avg_cost),
  }
}

function mapTrade(row) {
  return {
    id: row.id,
    ticker: String(row.ticker).toUpperCase(),
    side: row.side,
    shares: asNumber(row.shares),
    price: asNumber(row.price),
    amount: asNumber(row.amount),
    realizedPnl: row.realized_pnl == null ? null : asNumber(row.realized_pnl),
    createdAt: row.created_at,
  }
}

function schemaHint(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''
  if (
    code === 'PGRST202' ||
    code === 'PGRST205' ||
    /does not exist|schema cache|could not find the function/i.test(message)
  ) {
    return 'Portfolio tables are not in Supabase yet. Run supabase/portfolio.sql in the SQL editor, then reload.'
  }
  return message || 'Could not load portfolio.'
}

/**
 * Paper account for the signed-in user.
 *
 * Reads use the Supabase client and are filtered again by RLS. Writes do not:
 * cash and positions change only through `place_trade` and `set_paper_cash`.
 * Those functions run as the table owner, so a direct `.update()` on
 * `portfolios` is revoked and would not be a safe API even if it were granted.
 *
 * PostgREST sends Postgres `numeric` columns back as strings. `asNumber`
 * coerces them before they enter React state. `funded` is money the user put
 * in or took out; trading P&L is equity minus funded, so a practice deposit
 * is not shown as profit.
 */
export function PortfolioProvider({ children }) {
  const { user } = useAuth()
  const [cash, setCash] = useState(null)
  const [funded, setFunded] = useState(STARTING_CASH)
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setCash(null)
        setFunded(STARTING_CASH)
        setPositions([])
        setTrades([])
        setError('')
        setReady(true)
        return
      }

      setReady(false)
      const [portfolioResult, positionsResult, tradesResult] = await Promise.all([
        supabase.rpc('ensure_portfolio'),
        supabase
          .from('positions')
          .select('ticker, shares, avg_cost')
          .eq('user_id', user.id)
          .order('ticker', { ascending: true }),
        supabase
          .from('trades')
          .select('id, ticker, side, shares, price, amount, realized_pnl, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (cancelled) return

      const failure = portfolioResult.error || positionsResult.error || tradesResult.error
      if (failure) {
        console.error('Failed to load portfolio', failure.message)
        setCash(null)
        setFunded(STARTING_CASH)
        setPositions([])
        setTrades([])
        setError(schemaHint(failure))
        setReady(true)
        return
      }

      const fundedResult = await supabase
        .from('portfolios')
        .select('funded')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      setCash(asNumber(portfolioResult.data))
      if (!fundedResult.error && fundedResult.data) {
        setFunded(asNumber(fundedResult.data.funded))
      } else {
        setFunded(STARTING_CASH)
      }
      setPositions((positionsResult.data ?? []).map(mapPosition))
      setTrades((tradesResult.data ?? []).map(mapTrade))
      setError('')
      setReady(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      cash,
      funded,
      positions,
      trades,
      ready,
      error,
      positionFor(symbol) {
        const ticker = symbol.trim().toUpperCase()
        return positions.find((position) => position.ticker === ticker) ?? null
      },
      async trade({ ticker, side, shares, price }) {
        const symbol = ticker.trim().toUpperCase()
        const { data, error: tradeError } = await supabase.rpc('place_trade', {
          p_ticker: symbol,
          p_side: side,
          p_shares: shares,
          p_price: price,
        })

        if (tradeError) {
          throw new Error(tradeError.message || 'Trade failed.')
        }

        const nextPosition = mapPosition(data?.position)
        const nextTrade = data?.trade ? mapTrade(data.trade) : null

        setCash(asNumber(data?.cash))
        if (nextTrade) {
          setTrades((current) => [nextTrade, ...current.filter((item) => item.id !== nextTrade.id)].slice(0, 30))
        }
        setPositions((current) => {
          const rest = current.filter((position) => position.ticker !== symbol)
          if (!nextPosition) return rest
          return [...rest, nextPosition].sort((left, right) => left.ticker.localeCompare(right.ticker))
        })

        return data
      },
      async setPaperCash(amount) {
        const { data, error: cashError } = await supabase.rpc('set_paper_cash', {
          p_cash: amount,
        })

        if (cashError) {
          if (cashError.code === 'PGRST202' || /set_paper_cash/i.test(cashError.message ?? '')) {
            throw new Error('Run supabase/portfolio.sql again in the SQL editor, then retry.')
          }
          throw new Error(cashError.message || 'Could not update cash.')
        }

        setCash(asNumber(data?.cash))
        setFunded(asNumber(data?.funded))
        return data
      },
    }),
    [cash, funded, positions, trades, ready, error],
  )

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (!context) {
    throw new Error('usePortfolio must be used within PortfolioProvider')
  }
  return context
}

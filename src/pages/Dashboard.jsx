import { useEffect, useState } from 'react'
import PortfolioDonut from '../components/PortfolioDonut'
import StockCard from '../components/StockCard'
import { useLocale } from '../context/LocaleContext'
import { useMarket } from '../context/MarketContext'
import { POPULAR_SYMBOLS, fetchQuotes } from '../services/finnhub'

export default function Dashboard() {
  const { extraQuotes, openDetail } = useMarket()
  const { t } = useLocale()
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      const data = await fetchQuotes(POPULAR_SYMBOLS)
      if (!cancelled) {
        setQuotes(data)
        setStatus('ready')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    ...quotes.map((quote) => ({
      ...quote,
      name: quote.name ?? POPULAR_SYMBOLS.find((item) => item.symbol === quote.symbol)?.name,
    })),
    ...extraQuotes.filter((item) => !quotes.some((quote) => quote.symbol === item.symbol)),
  ]

  return (
    <section>
      <div className="mb-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{t('dash.kicker')}</p>
          <h1 className="mt-1 text-2xl font-semibold">{t('dash.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('dash.hint')}</p>
        </div>
        <PortfolioDonut />
      </div>

      {status === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: POPULAR_SYMBOLS.length }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl border border-line bg-panel" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((quote) => (
            <StockCard
              key={quote.symbol}
              quote={quote}
              name={quote.name}
              onOpen={openDetail}
            />
          ))}
        </div>
      )}
    </section>
  )
}

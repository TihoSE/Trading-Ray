export const STARTING_CASH = 10_000

// Quotes, cash, and fills are stored in US dollars.
export const USD_TO_EUR = 0.92

let moneyLocale = 'en-GB'
let moneyCurrency = 'EUR'

export function setMoneyLocale(locale) {
  moneyLocale = locale === 'nl' ? 'nl-NL' : 'en-GB'
}

export function setMoneyCurrency(currency) {
  moneyCurrency = currency === 'USD' ? 'USD' : 'EUR'
}

export function convertUsd(amountInUsd, targetCurrency = moneyCurrency) {
  const amount = Number(amountInUsd)
  if (!Number.isFinite(amount)) return null
  return targetCurrency === 'USD' ? amount : amount * USD_TO_EUR
}

export function usdFromDisplay(amountInDisplay, targetCurrency = moneyCurrency) {
  if (amountInDisplay == null || amountInDisplay === '') return null
  const amount = Number(amountInDisplay)
  if (!Number.isFinite(amount)) return null
  const stored = targetCurrency === 'USD' ? amount : amount / USD_TO_EUR
  return Math.round(stored * 100) / 100
}

export function displayAmount(amountInUsd, targetCurrency = moneyCurrency) {
  const converted = convertUsd(amountInUsd, targetCurrency)
  if (converted == null) return null
  return Math.round(converted * 100) / 100
}

export function formatCurrency(amountInUsd, targetCurrency = moneyCurrency, { digits = 2 } = {}) {
  const currency = targetCurrency === 'USD' ? 'USD' : 'EUR'
  const amount = convertUsd(amountInUsd, currency)
  if (amount == null) return '—'
  return amount.toLocaleString(moneyLocale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatSignedCurrency(amountInUsd, targetCurrency = moneyCurrency, options) {
  const amount = Number(amountInUsd)
  if (!Number.isFinite(amount)) return '—'
  if (amount > 0) return `+${formatCurrency(amount, targetCurrency, options)}`
  return formatCurrency(amount, targetCurrency, options)
}

export function formatMoney(value, options) {
  return formatCurrency(value, moneyCurrency, options)
}

export function formatEur(value) {
  return formatCurrency(value)
}

export function formatSignedEur(value) {
  return formatSignedCurrency(value)
}

export function parseCash(value) {
  const trimmed = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/[€$]/g, '')
  if (!trimmed) return null

  const lastComma = trimmed.lastIndexOf(',')
  const lastDot = trimmed.lastIndexOf('.')
  let normalized = trimmed
  if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.')
  } else if (lastDot > lastComma) {
    normalized = trimmed.replace(/,/g, '')
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return null
  return Math.round(amount * 100) / 100
}

export function roundShares(value) {
  const shares = Math.round(Number(value) * 10000) / 10000
  if (!Number.isFinite(shares) || shares < 0.0001 || shares > 1_000_000) return null
  return shares
}

export function formatShares(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount.toLocaleString(moneyLocale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

export function tradeCost(shares, price) {
  const quantity = roundShares(shares)
  if (quantity == null || !Number.isFinite(price) || price <= 0) return null
  const amount = Math.round(quantity * price * 100) / 100
  return amount > 0 ? amount : null
}

export function sharesForAmount(amount, price) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) return null
  let shares = Math.round((amount / price) * 10000) / 10000
  if (shares > 1_000_000) shares = 1_000_000
  while (shares >= 0.0001 && tradeCost(shares, price) > amount) {
    shares = Math.round((shares - 0.0001) * 10000) / 10000
  }
  return roundShares(shares)
}

export function maxBuyableShares(cash, price) {
  return sharesForAmount(cash, price) ?? 0
}

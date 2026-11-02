export const STARTING_CASH = 10_000

let moneyLocale = 'en-GB'

export function setMoneyLocale(locale) {
  moneyLocale = locale === 'nl' ? 'nl-NL' : 'en-GB'
}

export function formatEur(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount.toLocaleString(moneyLocale, {
    style: 'currency',
    currency: 'EUR',
  })
}

export function formatSignedEur(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  if (amount > 0) return `+${formatEur(amount)}`
  return formatEur(amount)
}

export function parseCash(value) {
  const trimmed = String(value).trim().replace(/\s/g, '').replace('€', '')
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

export function tradeCost(shares, price) {
  if (!Number.isInteger(shares) || shares < 1) return null
  if (!Number.isFinite(price) || price <= 0) return null
  return Math.round(shares * price * 100) / 100
}

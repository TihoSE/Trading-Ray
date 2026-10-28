# Aether Markets

Dark-themed stock dashboard built with React, Vite, Tailwind CSS, and lucide-react.

## Run

```bash
npm install
npm run dev
```

Quotes come from the [Finnhub quote endpoint](https://finnhub.io/api/v1/quote). Copy `.env.example` to `.env` and set `VITE_FINNHUB_API_KEY`, or paste a key on the Settings page. If the key is missing or the request fails, the app uses mock prices for NVDA, SPY, AAPL, MSFT, and TSLA.

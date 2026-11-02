# Trading-Ray

Dark stock dashboard for searching tickers, watching a personal list, and opening a quote with intraday charts. Prices come from Finnhub when a key is configured, and fall back to sample data when the API is missing or unavailable.

**Live demo:** [https://trading-ray.vercel.app](https://trading-ray.vercel.app)

## Tech stack

- React
- Vite
- Tailwind CSS
- Supabase (auth, watchlist, roles)
- Finnhub API (quotes, search, candles)

## Features

- Email sign-up and login with Supabase Auth
- Market dashboard with searchable tickers
- Per-account watchlist stored in Supabase
- Quote detail with 1H, 1D, 1W, and 1M charts
- Sample prices and candle series when Finnhub does not return data
- Admin-only settings. Live quotes go through `/api/finnhub`; the key stays in `FINNHUB_SECRET_KEY`

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for auth and the watchlist
- `FINNHUB_SECRET_KEY` for live quotes, search, and candles

On Vercel, set the same variables in the project environment. The `VITE_` values are inlined at build time. `FINNHUB_SECRET_KEY` is read only by the serverless function and is not shipped to the browser.

`.env` and `.vercel` are gitignored. `.env.example` stays in the repo without secrets.

Run `supabase/schema.sql` in the Supabase SQL editor so the watchlist and `profiles` tables exist. New accounts get the `user` role. Promote your own account once:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Only an admin can open Settings. A normal user cannot change that role from the app.

# Trading-Ray

Dark-themed stock dashboard built with React, Vite, Tailwind CSS, and lucide-react.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for auth and the watchlist
- `VITE_FINNHUB_API_KEY` (optional) for live quotes, or paste a key on the Settings page

If the Finnhub key is missing or the request fails, the app uses mock prices.

Auth uses Supabase (`signUp` / `signInWithPassword`). Create the `watchlist` table with `supabase/schema.sql` in the SQL editor so starred tickers persist per user.

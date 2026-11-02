# Stagegesprek — Trading-Ray

Live: [https://trading-ray.vercel.app](https://trading-ray.vercel.app). Repo: Vite SPA, React voor de UI, Supabase voor accounts, Finnhub voor koersen. Er is geen eigen backend.

## Technische vragen

### 1. Waarom mag de browser het portfolio wel lezen, maar niet zelf de cash updaten?

Omdat lezen en schrijven een ander vertrouwensniveau hebben.

`portfolios`, `positions` en `trades` hebben RLS aan, en alleen een `select`-policy: `auth.uid() = user_id`. Insert, update en delete zijn ingetrokken voor `anon` en `authenticated`. Een gebruiker kan dus geen saldo of aandelen van een ander zien, en ook de eigen cash niet met een gewone `.update()` verhogen.

Schrijven gaat via `place_trade` en `set_paper_cash` in `supabase/portfolio.sql`. Die functies zijn `security definer`: ze draaien als eigenaar van de tabel en omzeilen RLS. Daarom controleren ze zelf `auth.uid()`, en daarom staat `search_path` vast op `public`. `place_trade` doet `select … for update` op de portfoliorij, zodat twee orders van dezelfde gebruiker niet door elkaar lopen. De client in `PortfolioContext` past daarna alleen de React-state aan met wat de functie teruggeeft.

Het zwakke punt zeg ik er zelf bij: de vulprijs komt van de browser, omdat Postgres Finnhub niet kan aanroepen. Voor papieren geld is dat een bewuste keuze. Voor echt geld zou de prijs server-side vastgesteld moeten worden.

### 2. De anon key staat in de frontend. Is dat een lek?

Nee. De anon key identificeert het Supabase-project; hij is geen wachtwoord. Hij zit in de bundle omdat de browser zelf met Supabase praat. Zie `src/lib/supabase.js`.

Wat iemand met die key kan, bepaalt RLS en de SQL-functies, niet het verstoppen van de key. Zonder geldige JWT van `supabase.auth` geeft `auth.uid()` null, en dan faalt `place_trade` met "Not authenticated". Met een JWT zie je alleen je eigen rijen.

De admin-rol komt uit `profiles`, niet uit `user_metadata`. Metadata kan de gebruiker zelf zetten bij signup. `fetchRole` in `AuthContext` faalt dicht: bij een fout of een onbekende rol wordt het `user`, nooit `admin`.

### 3. Waarom Vite en geen Next.js, en wat betekent dat voor Vercel?

React is de UI-library. Vite is de dev-server en de bundler. `vite.config.js` heeft de React-plugin, Tailwind 4, en in dev dezelfde `/api/finnhub`-route als Vercel. `vite build` maakt statische bestanden; Vercel serveert `dist` plus de serverless function `api/finnhub.js`.

Secrets die de browser nodig heeft staan in `VITE_`-variabelen. Vite zet `import.meta.env.VITE_*` vast op het moment van bouwen. Een latere wijziging in het Vercel-dashboard doet niets tot de volgende deploy. Ontbreekt `VITE_SUPABASE_URL` of de anon key bij de build, dan rendert `main.jsx` de app niet en toont alleen de configuratiefout.

De Finnhub-sleutel heet `FINNHUB_SECRET_KEY` en heeft geen `VITE_`-prefix. Alleen `api/finnhub.js` leest hem en zet hem op het verzoek naar Finnhub. De browser roept `/api/finnhub` aan en krijgt de koers terug, zonder sleutel.

### 4. Hoe ga je om met Finnhub rate limits, en waarom zie ik bij SPY geen holdings?

De browser praat niet rechtstreeks met Finnhub. `/api/finnhub` proxyt de toegestane endpoints en geeft status 429 en `Retry-After` door. De vrije quota is ongeveer 60 calls per minuut. Het enige dat ik in de client throttle is zoeken: `StockSearch` wacht 220 ms na de laatste toetsaanslag en cancelt de vorige timer. Het dashboard doet daarnaast één quotecall per kaart. Bij een rate limit valt `fetchQuote` terug op sample data, behalve bij een zoekresultaat, waar een verzonnen prijs erger is dan een fout.

`/etf/holdings` is een apart, betaald endpoint. Een 401 of 403 wordt `HoldingsAccessError` met de tekst dat holdings niet in het huidige data-plan zitten. Ik vul dan geen nepgewichten in, want die lijken op echte fondssamenstelling. De tabel staat wel klaar: top 10 op gewicht, of alles.

### 5. Wat leeft in React-state en wat in Supabase, en waarom niet alles in de database?

Koersen zijn vluchtig en van een derde partij. Die horen niet per gebruiker in Postgres. Quotes, zoekresultaten en de extra kaarten op het dashboard zitten in React-state (`MarketContext` en de componenten) en verdwijnen bij een refresh, behalve de vaste populaire tickers die opnieuw worden opgehaald.

Accountgegevens horen wel in de database, per user: sessie en rol (`auth.users` en `profiles`), watchlist, en het papieren portfolio (cash, posities, trades). De watchlist wordt optimistic bijgewerkt en teruggedraaid als de write faalt. Het portfolio niet: de UI wacht op de RPC, omdat het saldo de bron van waarheid op de server is.

`funded` houdt bij hoeveel geld de gebruiker zelf heeft gestort of opgenomen. Het rendement is equity minus `funded`. Een klik op "+ €1.000" is dus geen handelswinst.

## Datastroom

Finnhub levert marktgegevens. React bewaart die alleen in het geheugen. Supabase bewaart wat van de gebruiker is. Een koop loopt de andere kant op: de UI stuurt ticker, kant, aantal en de getoonde prijs naar Postgres, en Postgres stuurt het nieuwe saldo terug.

```text
Finnhub  /quote  /search  /stock/candle  /etf/holdings
            |              |                    |
            |         220ms debounce            |  alleen als het een ETF is
            v              v                    v
        fetchQuote    searchSymbols      fetchEtfHoldings
            |              |                    |
            +--------------+--------------------+
                           v
              React state (MarketContext, StockSearch, EtfHoldings)
              quotes verdwijnen bij refresh; sample data als de call faalt
                           |
                           |  gebruiker koopt, verkoopt, of zet cash
                           v
              supabase.rpc('place_trade' | 'set_paper_cash')
                           |
                           v
              Postgres: RLS voor select, SECURITY DEFINER voor writes
              portfolios.cash + positions + trades
                           |
                           v
              JSON terug naar PortfolioContext (cash, positie, trade)
```

Watchlist en login slaan Finnhub over. Die gaan rechtstreeks van React naar Supabase Auth en de tabellen `watchlist` en `profiles`.

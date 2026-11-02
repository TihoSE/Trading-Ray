-- Paper portfolio with €10,000 starting cash.
-- Run this in the Supabase SQL editor. It is safe to run more than once.
--
-- Clients may read their own rows. Cash, positions, and trades change only
-- through place_trade, which locks the portfolio row and checks the balance.
-- The fill price is the quote submitted by the app. Postgres cannot call
-- Finnhub, so place_trade checks that the price is positive and in range.

create table if not exists public.portfolios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cash numeric(16, 2) not null default 10000 check (cash >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.positions (
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  shares numeric(18, 0) not null check (shares > 0),
  avg_cost numeric(16, 4) not null check (avg_cost >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  side text not null check (side in ('buy', 'sell')),
  shares numeric(18, 0) not null check (shares > 0),
  price numeric(16, 4) not null check (price > 0),
  amount numeric(16, 2) not null check (amount > 0),
  realized_pnl numeric(16, 2),
  created_at timestamptz not null default now()
);

create index if not exists trades_user_created_idx
  on public.trades (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;

  insert into public.portfolios (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into public.portfolios (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- RLS is select-only. Authenticated clients cannot insert or update these
-- tables; those grants are revoked below. Writes go through SECURITY DEFINER
-- functions, which bypass RLS and therefore check auth.uid() themselves.
-- search_path is pinned so a caller cannot shadow objects in public.
alter table public.portfolios enable row level security;
alter table public.positions enable row level security;
alter table public.trades enable row level security;

drop policy if exists "Users can read own portfolio" on public.portfolios;
create policy "Users can read own portfolio"
  on public.portfolios for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own positions" on public.positions;
create policy "Users can read own positions"
  on public.positions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own trades" on public.trades;
create policy "Users can read own trades"
  on public.trades for select
  using (auth.uid() = user_id);

revoke all on public.portfolios from public, anon, authenticated;
revoke all on public.positions from public, anon, authenticated;
revoke all on public.trades from public, anon, authenticated;

grant select on public.portfolios to authenticated;
grant select on public.positions to authenticated;
grant select on public.trades to authenticated;

create or replace function public.ensure_portfolio()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cash numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.portfolios (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select cash
  into v_cash
  from public.portfolios
  where user_id = v_user;

  return v_cash;
end;
$$;

-- FOR UPDATE on the portfolio row serializes this user's orders. The fill
-- price is accepted from the client because Postgres cannot call the quote
-- provider. That is a deliberate paper-trading tradeoff, not a design for
-- real money.
create or replace function public.place_trade(
  p_ticker text,
  p_side text,
  p_shares numeric,
  p_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ticker text := upper(btrim(coalesce(p_ticker, '')));
  v_side text := lower(btrim(coalesce(p_side, '')));
  v_shares numeric;
  v_price numeric;
  v_amount numeric;
  v_cash numeric;
  v_old_shares numeric := 0;
  v_old_avg numeric := 0;
  v_new_shares numeric := 0;
  v_new_avg numeric := 0;
  v_realized numeric;
  v_trade_id uuid;
  v_created_at timestamptz;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_ticker !~ '^[A-Z0-9.]{1,12}$' then
    raise exception 'Invalid ticker';
  end if;

  if v_side not in ('buy', 'sell') then
    raise exception 'Invalid side';
  end if;

  if p_shares is null or p_price is null then
    raise exception 'Shares and price are required';
  end if;

  v_shares := trunc(p_shares);
  if v_shares <> p_shares or v_shares < 1 or v_shares > 1000000 then
    raise exception 'Shares must be a whole number from 1 to 1000000';
  end if;

  v_price := round(p_price, 4);
  if v_price <= 0 or v_price > 1000000 then
    raise exception 'Price must be greater than 0 and at most 1000000';
  end if;

  v_amount := round(v_shares * v_price, 2);
  if v_amount <= 0 then
    raise exception 'Trade amount must be positive';
  end if;

  -- The portfolio row serializes this user's trades.
  insert into public.portfolios (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select cash
  into v_cash
  from public.portfolios
  where user_id = v_user
  for update;

  if v_side = 'buy' then
    if v_cash < v_amount then
      raise exception 'Insufficient cash';
    end if;

    select shares, avg_cost
    into v_old_shares, v_old_avg
    from public.positions
    where user_id = v_user
      and ticker = v_ticker
    for update;

    if not found then
      v_old_shares := 0;
      v_old_avg := 0;
    end if;

    v_new_shares := v_old_shares + v_shares;
    v_new_avg := round(((v_old_shares * v_old_avg) + v_amount) / v_new_shares, 4);

    update public.portfolios
    set cash = cash - v_amount,
        updated_at = now()
    where user_id = v_user
    returning cash into v_cash;

    insert into public.positions (user_id, ticker, shares, avg_cost, updated_at)
    values (v_user, v_ticker, v_new_shares, v_new_avg, now())
    on conflict (user_id, ticker) do update
      set shares = excluded.shares,
          avg_cost = excluded.avg_cost,
          updated_at = excluded.updated_at;

    v_realized := null;
  else
    select shares, avg_cost
    into v_old_shares, v_old_avg
    from public.positions
    where user_id = v_user
      and ticker = v_ticker
    for update;

    if not found or v_old_shares < v_shares then
      raise exception 'Insufficient shares';
    end if;

    v_new_shares := v_old_shares - v_shares;
    v_new_avg := v_old_avg;
    v_realized := round((v_price - v_old_avg) * v_shares, 2);

    update public.portfolios
    set cash = cash + v_amount,
        updated_at = now()
    where user_id = v_user
    returning cash into v_cash;

    if v_new_shares = 0 then
      delete from public.positions
      where user_id = v_user
        and ticker = v_ticker;
    else
      update public.positions
      set shares = v_new_shares,
          updated_at = now()
      where user_id = v_user
        and ticker = v_ticker;
    end if;
  end if;

  insert into public.trades (
    user_id,
    ticker,
    side,
    shares,
    price,
    amount,
    realized_pnl
  )
  values (
    v_user,
    v_ticker,
    v_side,
    v_shares,
    v_price,
    v_amount,
    v_realized
  )
  returning id, created_at into v_trade_id, v_created_at;

  return jsonb_build_object(
    'cash', v_cash,
    'trade', jsonb_build_object(
      'id', v_trade_id,
      'ticker', v_ticker,
      'side', v_side,
      'shares', v_shares,
      'price', v_price,
      'amount', v_amount,
      'realized_pnl', v_realized,
      'created_at', v_created_at
    ),
    'position', case
      when v_new_shares > 0 then jsonb_build_object(
        'ticker', v_ticker,
        'shares', v_new_shares,
        'avg_cost', v_new_avg
      )
      else null
    end
  );
end;
$$;

revoke all on function public.ensure_portfolio() from public, anon;
revoke all on function public.place_trade(text, text, numeric, numeric) from public, anon;

grant execute on function public.ensure_portfolio() to authenticated;
grant execute on function public.place_trade(text, text, numeric, numeric) to authenticated;

-- Practice cash. funded is the money put into the account, so a deposit or
-- withdrawal does not show up as a trading gain or loss.
alter table public.portfolios
  add column if not exists funded numeric(16, 2) not null default 10000;

create or replace function public.set_paper_cash(p_cash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cash numeric;
  v_old numeric;
  v_funded numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_cash is null or p_cash < 0 or p_cash > 1000000000 then
    raise exception 'Cash must be between 0 and 1000000000';
  end if;

  v_cash := round(p_cash, 2);

  insert into public.portfolios (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select cash, funded
  into v_old, v_funded
  from public.portfolios
  where user_id = v_user
  for update;

  v_funded := v_funded + (v_cash - v_old);

  update public.portfolios
  set cash = v_cash,
      funded = v_funded,
      updated_at = now()
  where user_id = v_user;

  return jsonb_build_object(
    'cash', v_cash,
    'funded', v_funded
  );
end;
$$;

revoke all on function public.set_paper_cash(numeric) from public, anon;
grant execute on function public.set_paper_cash(numeric) to authenticated;

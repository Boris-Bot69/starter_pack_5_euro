-- Run this in the Supabase SQL editor.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_order_id text not null unique,
  name text not null,
  email text not null,
  customer_type text not null,
  arrival_date date not null,
  address text,
  items jsonb not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'failed')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.orders enable row level security;
-- Orders are written and read only by the Edge Functions using the service role.
revoke all on public.orders from anon, authenticated;

-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Paste the contents, click "Run". Verify both tables appear in Table Editor afterwards.

-- Games table: one row per game, full state as JSONB
create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state jsonb not null,
  version integer not null default 1,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on code for fast lookup by invite link
create index games_code_idx on public.games (code);

-- Players table: tracks who occupies which slot in each game
create table public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  slot text not null check (slot in ('A', 'B')),
  session_token text not null,
  display_name text,
  joined_at timestamptz not null default now(),
  unique (game_id, slot),
  unique (game_id, session_token)
);

-- Index for fast lookup by session token
create index players_session_token_idx on public.players (session_token);

-- RLS: deny all by default. Server uses service role key, which bypasses RLS.
alter table public.games enable row level security;
alter table public.players enable row level security;

-- Auto-update updated_at on row update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_updated_at();

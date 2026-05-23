-- Run this manually in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Enables Realtime delivery for games table updates.

alter publication supabase_realtime add table public.games;

-- Realtime requires read access under RLS. The browser client treats delivered
-- rows only as change notifications and refetches redacted state via server actions.
create policy "Anyone can read games"
  on public.games
  for select
  using (true);

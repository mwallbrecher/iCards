-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Adds rematch coordination column to games table.

alter table public.games
  add column rematch_requested_by text check (rematch_requested_by in ('A', 'B'));

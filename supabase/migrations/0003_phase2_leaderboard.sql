-- ============================================================================
-- Phase 2 — Leaderboard (weekly-goal streak / consistency)
-- A per-user stats row that friends (and opted-in public users) can read, so
-- consistency can be ranked without exposing anyone's private workout data.
-- The client computes its own streak from local session history and upserts it.
--
-- Denormalized username + is_public keep the board render + RLS a single-row
-- check (no cross-table lookups against RLS-protected user_profiles).
-- Future strength boards will add their own table/columns; this one is streak.
--
-- Safe to run more than once (idempotent).
-- Run in: Supabase Dashboard → SQL Editor.
-- ============================================================================

create table if not exists public.user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text,
  is_public      boolean not null default false,
  current_streak int not null default 0,   -- consecutive met weeks
  longest_streak int not null default 0,
  weekly_goal    int,                       -- days_per_week target snapshot
  total_sessions int not null default 0,
  updated_at     timestamptz not null default now()
);

create index if not exists user_stats_public_streak_idx
  on public.user_stats (is_public, current_streak desc);

alter table public.user_stats enable row level security;

-- SELECT: your own row, any public row, or an accepted-friend's row.
-- (The friendships subquery only ever touches rows where you're a party, which
--  friendships' own RLS already permits.)
drop policy if exists user_stats_select on public.user_stats;
create policy user_stats_select on public.user_stats for select using (
  auth.uid() = user_id
  or is_public = true
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ( (f.requester_id = auth.uid() and f.addressee_id = user_stats.user_id)
         or (f.addressee_id = auth.uid() and f.requester_id = user_stats.user_id) )
  )
);

-- INSERT / UPDATE: only your own row.
drop policy if exists user_stats_insert on public.user_stats;
create policy user_stats_insert on public.user_stats
  for insert with check (auth.uid() = user_id);

drop policy if exists user_stats_update on public.user_stats;
create policy user_stats_update on public.user_stats
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_stats to authenticated;

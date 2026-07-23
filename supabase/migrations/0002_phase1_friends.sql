-- ============================================================================
-- Phase 1 — Friends
-- A friend graph with request → accept semantics, protected by RLS so a user
-- can only ever see or touch relationships they are part of.
--
-- Safe to run more than once (idempotent).
-- Run in: Supabase Dashboard → SQL Editor.
-- ============================================================================

-- 1. friendships ------------------------------------------------------------
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- One relationship per unordered pair: blocks both a duplicate (A,B) and the
-- reverse (B,A) from ever coexisting.
create unique index if not exists friendships_pair_uniq
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Helpful lookups by either side.
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- 2. RLS --------------------------------------------------------------------
alter table public.friendships enable row level security;

-- SELECT: only the two people involved can see the row.
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- INSERT: you may only create a request where YOU are the requester, and it
-- must start life as 'pending' (you can't insert a pre-accepted friendship).
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = requester_id and status = 'pending');

-- UPDATE: only the addressee can act on a request (accept it). They remain the
-- addressee afterwards — can't reassign the row to someone else.
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (auth.uid() = addressee_id)
             with check (auth.uid() = addressee_id);

-- DELETE: either party may remove the relationship — cancel a sent request,
-- decline a received one, or unfriend after it's accepted.
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select, insert, update, delete on public.friendships to authenticated;

-- 3. Tighten the Phase 0 directory ------------------------------------------
-- Deferred from Phase 0: the handle directory should require a login. Friend
-- search + relationship display are all authenticated, so drop anon access.
revoke select on public.public_profiles from anon;

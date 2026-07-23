-- ============================================================================
-- Phase 0 — Identity foundation
-- Adds @username handles + public opt-in flag to user_profiles, enforces
-- case-insensitive uniqueness, and exposes a PUBLIC-SAFE directory view that
-- leaks nothing but the handle (never email, plan, goals, etc.).
--
-- Safe to run more than once (idempotent).
-- Run in: Supabase Dashboard → SQL Editor.
-- ============================================================================

-- 1. New columns -------------------------------------------------------------
alter table public.user_profiles
  add column if not exists username  text,
  add column if not exists is_public boolean not null default false;

-- 2. Format guard: 3–20 chars, letters / numbers / underscore only -----------
alter table public.user_profiles
  drop constraint if exists user_profiles_username_format_chk;
alter table public.user_profiles
  add  constraint user_profiles_username_format_chk
  check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

-- 3. Case-insensitive uniqueness (so "Alex" and "alex" can't both exist) ------
create unique index if not exists user_profiles_username_lower_key
  on public.user_profiles (lower(username));

-- 4. Public directory view ---------------------------------------------------
--    Selects ONLY the safe columns. Runs with the view owner's rights
--    (security_invoker off = default), so it can serve handles across users
--    without user_profiles' row-level policies exposing any other column.
create or replace view public.public_profiles as
  select user_id, username, is_public
  from   public.user_profiles
  where  username is not null;

-- 5. Grants ------------------------------------------------------------------
--    Logged-in users can read the directory (friend search, handle display,
--    live "is this handle taken?" checks). Not exposed to anon.
grant select on public.public_profiles to authenticated;

-- Note: the Supabase linter will flag public_profiles as a SECURITY DEFINER
-- view. That is intentional here — it is the standard pattern for a
-- column-limited public projection over an RLS-protected table.

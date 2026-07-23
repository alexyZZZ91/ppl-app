-- ============================================================================
-- Phase 3 — Share a Program
-- Friend-to-friend program sharing. A share is a snapshot of the sender's plan
-- delivered to one friend, who can adopt it (replace their own plan) or dismiss.
--
-- Safe to run more than once (idempotent).
-- Run in: Supabase Dashboard → SQL Editor.
-- ============================================================================

create table if not exists public.shared_programs (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  owner_username text,
  recipient_id   uuid not null references auth.users(id) on delete cascade,
  name           text,
  plan           jsonb not null,
  status         text not null default 'pending' check (status in ('pending','adopted','dismissed')),
  created_at     timestamptz not null default now(),
  constraint shared_no_self check (owner_id <> recipient_id)
);

create index if not exists shared_recipient_idx on public.shared_programs (recipient_id, status);
create index if not exists shared_owner_idx     on public.shared_programs (owner_id);

alter table public.shared_programs enable row level security;

-- SELECT: sender or recipient can see the share.
drop policy if exists shared_select on public.shared_programs;
create policy shared_select on public.shared_programs for select using (
  auth.uid() = owner_id or auth.uid() = recipient_id
);

-- INSERT: only as the sender, and only to an accepted friend.
drop policy if exists shared_insert on public.shared_programs;
create policy shared_insert on public.shared_programs for insert with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ( (f.requester_id = auth.uid() and f.addressee_id = recipient_id)
         or (f.addressee_id = auth.uid() and f.requester_id = recipient_id) )
  )
);

-- UPDATE: only the recipient (adopt / dismiss = set status).
drop policy if exists shared_update on public.shared_programs;
create policy shared_update on public.shared_programs
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- DELETE: either party may remove it.
drop policy if exists shared_delete on public.shared_programs;
create policy shared_delete on public.shared_programs for delete using (
  auth.uid() = owner_id or auth.uid() = recipient_id
);

grant select, insert, update, delete on public.shared_programs to authenticated;

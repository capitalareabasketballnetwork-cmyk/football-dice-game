-- Apply in your Supabase project SQL editor before enabling DieBall Accounts.
-- Requires the standard Supabase auth.users and authenticated role.
create table if not exists public.diebowl_rosters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roster jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint diebowl_roster_object check (jsonb_typeof(roster) = 'object')
);
alter table public.diebowl_rosters enable row level security;
revoke all on public.diebowl_rosters from anon;
grant select,insert,update,delete on public.diebowl_rosters to authenticated;
drop policy if exists "Roster owners can read" on public.diebowl_rosters;
drop policy if exists "Roster owners can insert" on public.diebowl_rosters;
drop policy if exists "Roster owners can update" on public.diebowl_rosters;
drop policy if exists "Roster owners can delete" on public.diebowl_rosters;
create policy "Roster owners can read" on public.diebowl_rosters for select to authenticated using (auth.uid() = user_id);
create policy "Roster owners can insert" on public.diebowl_rosters for insert to authenticated with check (auth.uid() = user_id);
create policy "Roster owners can update" on public.diebowl_rosters for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Roster owners can delete" on public.diebowl_rosters for delete to authenticated using (auth.uid() = user_id);
-- Add your website's https://football-dice-game-gamma.vercel.app/account URL as an allowed Auth redirect URL.

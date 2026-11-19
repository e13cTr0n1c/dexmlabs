-- Callsign Catch accounts. Players may read their own rows.
-- Cards and the log are written only by the service role, inside the Edge Functions.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  migrated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  aircraft_type text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'legendary', 'mythic')),
  callsign text not null,
  icao24 text not null,
  caught_at timestamptz not null,
  source text not null check (source in ('live', 'legacy')),
  created_at timestamptz not null default now()
);

create table public.catches_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  callsign text not null,
  icao24 text not null default '',
  caught_at timestamptz not null default now(),
  accepted boolean not null default false,
  reason text not null default ''
);

create index cards_user_caught_idx on public.cards (user_id, caught_at desc);
create index catches_log_user_time_idx on public.catches_log (user_id, caught_at desc);
create index catches_log_dedupe_idx on public.catches_log (user_id, callsign, icao24, caught_at desc);

-- Points follow the game: the first catch of a type scores the full amount, later ones score the smaller duplicate amount.
create view public.scores
with (security_invoker = true) as
select
  s.user_id,
  count(*)::int as catches,
  count(distinct s.aircraft_type)::int as types,
  coalesce(sum(s.pts), 0)::int as points
from (
  select
    c.user_id,
    c.aircraft_type,
    case when row_number() over (partition by c.user_id, c.aircraft_type order by c.caught_at, c.id) = 1
      then case c.rarity
        when 'common' then 10
        when 'uncommon' then 25
        when 'rare' then 60
        when 'legendary' then 150
        when 'mythic' then 400
        else 0
      end
      else case c.rarity
        when 'common' then 2
        when 'uncommon' then 5
        when 'rare' then 12
        when 'legendary' then 30
        when 'mythic' then 80
        else 0
      end
    end as pts
  from public.cards c
) s
group by s.user_id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.catches_log enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.cards from anon, authenticated;
revoke all on public.catches_log from anon, authenticated;
revoke all on public.scores from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.cards to authenticated;
grant select on public.catches_log to authenticated;
grant select on public.scores to authenticated;

create policy "read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "read own cards"
  on public.cards
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "read own log"
  on public.catches_log
  for select
  to authenticated
  using (user_id = auth.uid());

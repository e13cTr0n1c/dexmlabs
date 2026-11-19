-- Policy check for a local `supabase start`. Docker is required.
-- From standalone/callsign-catch, after `supabase db reset`:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- With pgTAP installed, `supabase test db` will also run this file.

begin;

insert into auth.users (id, email, instance_id, aud, role, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now())
on conflict do nothing;

insert into public.cards (user_id, aircraft_type, rarity, callsign, icao24, caught_at, source)
values ('00000000-0000-0000-0000-0000000000a1', 'A320', 'common', 'BAW117', '4009c6', now(), 'live');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (select count(*) from public.cards) <> 1 then
    raise exception 'player A should see their own card';
  end if;
  begin
    insert into public.cards (user_id, aircraft_type, rarity, callsign, icao24, caught_at, source)
    values ('00000000-0000-0000-0000-0000000000a1', 'A388', 'rare', 'UAE1', '8963f4', now(), 'live');
    raise exception 'a player was able to insert a card';
  exception when insufficient_privilege then
    null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';

do $$
begin
  if (select count(*) from public.cards) <> 0 then
    raise exception 'player B should not see player A cards';
  end if;
end $$;

rollback;

# Callsign Catch

A plane spotting card game. Type a callsign. If that aircraft is airborne right now, you collect a card for its type. Rarity comes from the aircraft type, using the same table as the guest game. The table lives in one file, `shared/types.json`, and both the page and the server read it.

This folder is meant to move to its own repository and be served by GitHub Pages at `https://e13ctr0n1c.github.io/callsign-catch/`. Paths in the page are relative. `web/config.js` has a `baseUrl` you can set when the site is hosted under a prefix.

## Play the preview

No Supabase project is required. With the placeholders in `web/config.js`, or with `?mock=1` on the address, the page uses a practice account in the browser. It follows the same catch and migrate rules as the server, against a small set of practice flights (BAW117, UAE1, RRR100, GROUND1, QUIET1). Those flights are not live.

```bash
cd standalone/callsign-catch
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/web/index.html?mock=1`.

As a guest, cards stay in `localStorage` under `callsign:collection`, with export, import, and redeem a code, the same as the game on dexmlabs.app. Signing in (Google, GitHub, or an email link) keeps later catches on the account. The first time you sign in, if a local save exists, the page asks to bring it across. That can happen once per account. Cards that come across wear a Legacy badge. Anything that fails the checks is listed, and gift cards stay on the device.

## Real project, free tier

1. Create a free Supabase project.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
3. In this folder, copy `.env.example` to `.env` and put your Google and GitHub OAuth client id and secret in it. Those values are only for local `supabase start`. Do not commit `.env`.
4. `supabase link --project-ref <ref>` then `supabase db push`.
5. In the hosted dashboard, turn on Email (magic link), Google, and GitHub. Add the site address to the redirect allow list, including `https://e13ctr0n1c.github.io/callsign-catch/` and `https://e13ctr0n1c.github.io/callsign-catch/web/`.
6. Deploy the functions: `supabase functions deploy catch` and `supabase functions deploy migrate`. The hosted runtime injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The service role key must only exist as a function secret. Never put it in `web/config.js` or in git.
7. Paste the project URL and the anon key into `web/config.js`. The anon key is public. Leave the file with empty strings in git until you are ready to publish it, and do not commit a service role key by mistake.
8. Publish the repository with GitHub Pages from the repository root. The root page sends people to `web/`. Set `baseUrl` in `web/config.js` if the pages site is not served from `/`.

Local stack:

```bash
cp .env.example .env
supabase start
supabase functions serve
```

`supabase status` prints the local API URL and anon key. Put those in `web/config.js`, serve this folder on port 4173 (that port is in `supabase/config.toml` as the site URL), and open the game without `?mock=1`. Magic link messages show up in the local Inbucket UI, usually `http://127.0.0.1:54324`.

### Free tier limits

The free tier allows about 50,000 monthly active users, a 500 MB database, 5 GB of egress, and 500,000 Edge Function calls a month. A project pauses after one week without activity. `.github/workflows/supabase-keepalive.yml` is a daily ping to stop that pause. The schedule is commented out until the repository has `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets. Uncomment the schedule after you add them. A manual run does nothing while the secrets are missing.

The catch function allows 30 attempts a minute and 500 a day per account, and the same callsign on the same aircraft counts once every six hours.

## Tests

```bash
deno test --allow-read supabase/tests/functions_test.mjs
node --test web/tests/mock.test.mjs
```

The Deno tests cover catch and migrate validation with adsb.lol mocked, including ground, stale, rate limit, the six hour window, and a save that is only partly accepted. They also read the migration SQL and check that row level security is enabled, that players can only select their own rows, and that there is no insert, update, or delete grant.

The Node tests cover the practice account, migration, and the `#import=` fragment.

Row level security against a real database needs Docker and a local stack. This environment did not have Docker, so that run was not done here. When you have it:

```bash
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

`supabase/tests/rls.sql` signs in as two players, checks that one cannot see the other's cards, and checks that a player cannot insert a card. The service role, used only inside the functions, is what writes.

## Layout

- `web/` is the static site. There is no build step. Supabase JS v2 is loaded from the jsDelivr CDN only when a real project is configured.
- `shared/types.json` is the one rarity table.
- `supabase/` is a Supabase CLI project: `config.toml`, `migrations/`, `functions/catch`, `functions/migrate`, and `seed.sql`.
- `.github/workflows/supabase-keepalive.yml` moves with this folder when the project gets its own repository.

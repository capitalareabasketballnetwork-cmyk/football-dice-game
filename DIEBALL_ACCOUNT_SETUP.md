# DieBall Accounts / DieBowl Roster Cloud Save

The website ships a real Supabase Auth client and user-scoped roster persistence.
The sign-in form intentionally stays unavailable until the project owner connects
an actual Supabase project. It does **not** simulate accounts or ask users to type
credentials into an insecure local-storage sign-in.

## To enable accounts

1. Create or connect a Supabase project. In Authentication → Providers, enable Email.
   Keep email confirmations enabled. Configure a real mail provider for production.
2. In Supabase's SQL Editor, run `supabase-diebowl-rosters.sql`. This creates the
   roster table with row-level security: only each signed-in owner can read/write it.
3. In Supabase Authentication → URL Configuration, set Site URL to
   `https://football-dice-game-gamma.vercel.app`, and add
   `https://football-dice-game-gamma.vercel.app/account` as an allowed redirect.
4. In the Vercel project `football-dice-game`, set for Production:
   `SUPABASE_URL` = `https://<project-ref>.supabase.co`
   `SUPABASE_ANON_KEY` = the project's **publishable / anon client key**.
   Do not use or expose a service-role or secret key. The public-config endpoint
   deliberately exposes only these public client parameters.
5. Redeploy the project, create an account at `/account`, confirm email, sign in,
   choose your DieBowl roster, and click **SAVE MY ROSTER**. Check sign-out/in on
   another device to verify cloud sync.
6. Add a privacy notice and terms, review anti-abuse / captcha / rate-limiting, and
   test email deliverability before broadly releasing account registration.

Until those steps are completed, the DieBowl **IN TESTING** mode supports
guest play and stores the roster only on that browser/device. When Supabase is
configured, playing DieBowl requires a signed-in account. Classic and TV continue
to be available with their existing gameplay rules.

The starter option pool is an intentional 39-player subset of the master
300-player fictional roster. Player portraits are deterministic procedural
pixel-art illustrations; no real-person photos or rights are required.

## Deployment files

- `account.html`, `auth.js` – account user interface and Supabase Auth
- `api/public-config.js` – public client configuration, no secrets
- `supabase-diebowl-rosters.sql` – RLS-protected roster table
- `diebowl-players.js` – fictional starter options and pixel portraits
- `diebowl.html`, `pro.js` – team builder and game engine

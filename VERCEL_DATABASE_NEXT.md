# VERRIFT | Fix the API database error on Vercel

## What the screenshots establish

- The updated site successfully renders static HTML and CSS.
- The workspace displays: `VERRIFT API is not configured or is temporarily unavailable`.
- Vercel runtime logs show `Production needs Supabase or Upstash persistence`, meaning the deployed API does not currently see usable database environment configuration.
- Creating a database in Vercel alone does **not** create VERRIFT's application state table/function. You must run the SQL file separately.

## Step 1: provision and connect Supabase

1. Vercel dashboard -> **verrift** project -> **Storage** or **Marketplace** -> choose **Supabase**.
2. Install/create a Supabase project, following any billing notices carefully.
3. Make sure the Supabase resource is **connected to the Vercel project `verrift`**. An unconnected database does not supply env vars to the deployed functions.
4. In **verrift -> Settings -> Environment Variables**, confirm these exact variables exist in **Production**:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_PUBLISHABLE_KEY`

   These are synced automatically by Vercel's Supabase integration on supported accounts. Do not confuse `POSTGRES_URL` with the three Supabase REST variables. The code accepts `NEXT_PUBLIC_SUPABASE_URL` as an alternative to `SUPABASE_URL` but never exposes the secret key in the browser.

## Step 2: create VERRIFT's table and RPC

1. Vercel -> Storage -> Supabase resource -> **Open in Supabase**, or open the project's Supabase Dashboard directly.
2. Select **SQL Editor** -> **New query**.
3. Open the source file `supabase/schema.sql` and paste the entire SQL into the editor.
4. Click **Run**. Confirm there are no SQL errors.

Do not paste private API keys into the SQL editor. This schema creates the server-managed `verrift_state` table and atomic `verrift_cas_state` procedure.

## Step 3: configure authentication and other environment variables

Supabase -> Authentication -> Providers -> enable Ethereum wallet/Web3 sign-in and set the site URL under Authentication -> URL Configuration to the **real** Vercel URL.

Set these Vercel variables in Production:

| Key | Value |
| --- | --- |
| `SESSION_SECRET` | output of `openssl rand -hex 32`, never the command text |
| `SUPABASE_URL` | synced by Supabase integration |
| `SUPABASE_SECRET_KEY` | synced by Supabase integration, server only |
| `SUPABASE_PUBLISHABLE_KEY` | synced by Supabase integration |
| `PUBLIC_ORIGIN` | `https://verrift.vercel.app` if that is your assigned domain |
| `BASE_SEPOLIA_RPC` | `https://sepolia.base.org` |
| `ANTHROPIC_API_KEY` | actual Anthropic API key; required for Claude analyses |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` |
| `ADMIN_WALLET_ADDRESS` | optional, your wallet for the separate operator view |

Do not add `ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_*`, `DATABASE_URL`, or a private wallet key for this version.

## Step 4: redeploy and verify

1. Vercel -> Deployments -> most recent deployment -> Redeploy **after** environment variables have been saved.
2. Open `https://verrift.vercel.app/` - you should see the public storytelling landing page, independent of the backend.
3. Open `https://verrift.vercel.app/app` - it is the working dashboard route, but it requires a configured API and database.
4. Open `https://verrift.vercel.app/api/status`. It should return JSON containing `"persistence":"supabase"`. This proves the Supabase env config was recognized; it does **not** by itself prove DB tables are accessible.
5. Open `/app` in an incognito window. Create a guest case, trigger a failed check, restore it, and rerun. This verifies actual database writes and reads. If it fails, inspect Vercel runtime logs for the corresponding request. Incomplete SQL or invalid credentials will usually appear in those logs.

## Source references

- [Supabase Vercel Marketplace integration](https://supabase.com/docs/guides/integrations/vercel-marketplace)
- [Supabase for Vercel](https://vercel.com/integrations/supabase)

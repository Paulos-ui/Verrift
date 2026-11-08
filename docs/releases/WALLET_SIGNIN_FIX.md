# VERRIFT wallet sign-in diagnosis

## Symptom
A MetaMask or OKX wallet is detected, but signing in shows "Supabase rejected the wallet signature". In Supabase Auth logs, `POST /auth/v1/token?grant_type=web3` returns HTTP 422.

## First fix: Enable Ethereum Web3 authentication
1. Open the Supabase project connected to the VERRIFT Vercel environment.
2. Under **Authentication > Sign In / Providers**, find the **Web3** provider. Enable **Ethereum** and save.
3. Under **Authentication > URL Configuration**, set the production site URL to `https://verrift.vercel.app` (or your real deployed domain). Allow the exact root `https://verrift.vercel.app/` and/or `https://verrift.vercel.app/**` in Redirect URLs.
4. In Vercel > VERRIFT > Settings > Environment Variables, check the app is pointing to the SAME Supabase project via `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and set `PUBLIC_ORIGIN=https://verrift.vercel.app` for the actual deployed domain. Never send your secrets in screenshots.
5. If you changed a Vercel environment variable, redeploy. If you only changed Supabase settings, refresh the application and sign a fresh wallet challenge.

## If login is still rejected
Open the HTTP 422 event in **Supabase > Logs > Auth** to inspect the response details, including `code` and `message`. Do not share raw access tokens, wallet signatures, private keys, or API keys.

From this release, the VERRIFT backend translates a few recognized Supabase authentication errors into clear next-step messages while logging only HTTP status and a short sanitized error code. The returned UI error is no longer the same generic message for every failure.

This change **does not** bypass Supabase wallet verification, change private sessions, create wallets, or cause money transfers. It is not a guarantee the production configuration is already correct.

References:
- https://supabase.com/docs/guides/auth/auth-web3
- https://supabase.com/docs/reference/javascript/auth-signinwithweb3

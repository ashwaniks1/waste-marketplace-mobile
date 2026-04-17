# Security

## Client (this app)

- **Publishable keys only**: `EXPO_PUBLIC_SUPABASE_ANON_KEY` is embedded in the client bundle. Never add `SUPABASE_SERVICE_ROLE_KEY` or any other secret to this repo or to `EXPO_PUBLIC_*` variables.
- **HTTPS**: Supabase URL must be `https://`. The app warns at runtime if it is not.
- **Session storage**: Sessions are persisted with `@react-native-async-storage/async-storage` (required for Supabase on React Native). For stricter device-at-rest protection, consider a chunked `expo-secure-store` adapter if session size fits your Keychain limits, or a hardened storage layer in a custom dev client.
- **Secrets in CI**: Use [EAS Secrets](https://docs.expo.dev/build-reference/variables/) or your CI provider’s secret store for production env vars; keep `.env` local and gitignored.
- **Authorization**: All data access must be enforced with **Postgres RLS** on the Supabase project. The anon key is not a security boundary by itself.

## Backend (separate repo)

- Enable **RLS** on every `public` table exposed to the Data API; policies must match Buyer / Seller / Driver flows.
- Privileged actions (payouts, matching, webhooks) belong in **Edge Functions** with the service role, not in the mobile app.

## Reporting

Report vulnerabilities through your organization’s usual channel (do not open public issues with exploit details until fixed).

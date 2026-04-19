## Waste Marketplace iOS (Expo)

React Native + Expo + TypeScript mobile app for the Waste Marketplace platform (Buyer / Seller / Driver roles).

### Prereqs
- Node.js (already installed)
- Expo Go on your phone, or Xcode Simulator

### Setup
1. Copy env file:

```bash
cp .env.example .env
```

2. Fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_API_URL` — your deployed Next.js origin (no trailing slash), used for `POST /api/ensure-profile` (secure profile provisioning).

3. Run:

```bash
npm start
```

### Current status
- Supabase Auth (email/password) wired
- Role-based navigation skeleton (Buyer/Seller/Driver dashboards)

### Security
See [SECURITY.md](./SECURITY.md) for client and backend expectations (keys, RLS, no service role in the app).

### Checks
```bash
npm run typecheck
npm test
```


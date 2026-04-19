# Maestro (mobile E2E)

1. Install [Maestro](https://maestro.mobile.dev/).
2. Build a **development client** (Expo Go has limitations for native modules).
3. Copy `smoke.template.yaml` to `smoke.yaml` and set `appId` to your iOS bundle identifier or Android package from `app.json` / Gradle.
4. Run: `maestro test maestro/smoke.yaml`

Flows should cover: sign in → Settings → My profile loads → Edit profile → Save (requires `EXPO_PUBLIC_APP_API_URL` pointing at your Next.js API).

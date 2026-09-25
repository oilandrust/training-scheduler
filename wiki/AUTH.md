# Auth, import, and public links

The app is now per-user. Sign in with a 6-digit email code (Resend) or Google. Each `TrainingModule` has an `ownerId`. Anonymous `/` editing is gone.

## Local setup

1. Copy env and fill secrets:

```bash
cp backend/.env.example backend/.env
```

2. Apply the Prisma migration and regenerate the client:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

3. Optional seed (creates `demo@training-scheduler.local` as owner of the Hakomi weekend):

```bash
npm run prisma:seed --prefix backend
```

Sign in as that user via magic link (the OTP is printed in the API log when `RESEND_API_KEY` is empty).

## Environment

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC pepper for session + OTP hashes |
| `FRONTEND_ORIGIN` | CORS origin **and** cookie `Secure` (https) + post-OAuth redirect |
| `RESEND_API_KEY` / `RESEND_FROM` | Email OTP. Unset = log the code |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | App login + Drive connect |
| `GOOGLE_CALLBACK_URL` | `…/api/auth/google/callback` |
| `GOOGLE_DRIVE_CALLBACK_URL` | `…/api/auth/drive/callback` |
| `GOOGLE_API_KEY` | Browser API key for [Google Picker](https://developers.google.com/drive/picker) (enable Picker API; restrict by HTTP referrer) |
| `GOOGLE_APP_ID` | Cloud project number (optional; defaults to the numeric prefix of `GOOGLE_CLIENT_ID`) |
| `LLM_PROVIDER` | `openrouter` (default) or `groq` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq extraction |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter extraction (`google/gemini-2.5-flash-lite`) |

Cookies are `HttpOnly`, `SameSite=Lax`, path `/`. Production nginx already proxies `/api/` to Nest on the same host, so the session cookie is first-party.

## Google Cloud

Use the existing Web client. Add redirect URIs for both callbacks (localhost:3000 and the production host). Login scopes: `openid email profile`. Drive import adds `drive.file` (Picker-selected files only) and `access_type=offline`.

OAuth consent screen links (public, no auth):

| Field | URL |
| --- | --- |
| Application home page | `https://training-scheduler.lefolio.fr/` |
| Privacy policy | `https://training-scheduler.lefolio.fr/privacy` |
| Terms of service | `https://training-scheduler.lefolio.fr/terms` |

## Production deploy

After `git pull` / `./deploy/deploy.sh`:

1. SSH to the host and add the new keys to `/opt/training-scheduler/backend/.env` (not in git).
2. `npx prisma migrate deploy` runs as part of deploy when schema files change.
3. Restart is skipped if only the frontend changed; auth/API changes restart systemd.

Public view URLs look like `https://training-scheduler.lefolio.fr/v/<token>` and hit `GET /api/share/:token` with no session.

## LLM extraction test bench

Compares model output for the Hakomi weekend PDF against the seed schedule fixture.

```bash
# default Groq model from .env
npm run test:extract --prefix backend

# try another Groq model
npm run test:extract --prefix backend -- --model qwen/qwen3.8-27b

# compare several models
npm run test:extract --prefix backend -- --models openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b

# OpenRouter
npm run test:extract --prefix backend -- --provider openrouter --model openai/gpt-4.1-mini

# save extraction JSON + lower pass bar
npm run test:extract --prefix backend -- --save tmp/extract.json --threshold 0.6
```

Golden file: [`backend/src/import/fixtures/hakomi-weekend-1.expected.json`](backend/src/import/fixtures/hakomi-weekend-1.expected.json) (same content as the Prisma seed).

The bench checks: JSON parse → Zod schema → day/activity recall vs seed (time ±5 min + fuzzy title, days aligned by date/weekday/order) → kind accuracy.

Model comparison results and the chosen default are in [`wiki/llm-extraction-bench.md`](llm-extraction-bench.md).

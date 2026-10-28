# CampusAI Growth Hub

A local campaign simulator for the NxtWave growth intern challenge. It demonstrates a student workshop registration funnel, referral attribution, channel measurement, campaign planning, and transparent rule-based recommendations. It does not contact students or claim a campaign result.

## Features

- Public workshop page and final-year registration form with server and browser validation.
- SQLite storage, normalized unique email addresses, unique referral codes, and one-time attribution.
- Password-protected local admin dashboard with metrics, charts, ambassador leaderboard, channel spend, CSV exports, and recommendations.
- Synthetic demonstration dataset with a prominent DEMO DATA label. Demo loading requires an empty database or an existing demo dataset; reset only removes a dataset marked as demo. Simulated form submissions are stored in a separate table and appear only in demo-mode metrics.
- Seven-day campaign plan with clearly marked assumptions. Ambassador click-to-registration conversion rate is left unavailable because referral link visits are not collected.

## Architecture

- Node.js 20+ and Express 4 serve static HTML/CSS/vanilla JavaScript and JSON routes.
- `better-sqlite3` stores campaign configuration, channel budgets, ambassadors, and registrations in `data/campusai.sqlite`.
- `express-session` keeps a local admin session in an HTTP-only, SameSite=Strict cookie. Sessions use the default in-memory store, which is appropriate only for a local prototype.
- Chart.js is installed as a dependency and served locally. No paid service or external AI API is used.
- Tests create a separate temporary SQLite database under the OS temp directory.

## Installation

Requirements: Node.js 20 or newer and npm. `better-sqlite3` may need build tools on a platform without a compatible prebuilt binary.

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `.env` and set a unique `ADMIN_PASSWORD` and a random `SESSION_SECRET` (at least 32 characters). `APP_URL` is the base for generated ambassador links. `DATABASE_PATH` defaults to `./data/campusai.sqlite`.

## Run locally

```powershell
npm.cmd start
```

Open the workshop page at [http://localhost:3000](http://localhost:3000) and the admin workspace at [http://localhost:3000/admin](http://localhost:3000/admin). Sign in with the password set in `.env`. `npm.cmd run dev` restarts the server when source files change.

## Database and attribution

SQLite creates tables on first start. `registrations.email` and `ambassadors.referral_code` have case-insensitive unique constraints. Monetary inputs are stored as integer paise and displayed as INR. Registration attribution follows one order: a known referral code assigns Student ambassadors; otherwise a recognized UTM source maps to clubs, communities, paid promotion, or organic social; missing or unknown source maps to Direct or unknown. One registration row contributes once, with a valid ambassador attribution taking precedence over UTM source. Unknown codes are not stored as attribution. See [docs/AI_LEARNING_NOTES.md](docs/AI_LEARNING_NOTES.md) for draft notes and [docs/GROWTH_PLAN.md](docs/GROWTH_PLAN.md) for planning assumptions.

## Tests

```powershell
npm.cmd test
```

Tests use an isolated temporary SQLite database and do not touch the normal development database.

## Demo walkthrough

1. Sign in to `/admin` with the local admin password.
2. Select **Load demo data**. The action is accepted only for an empty database or while a synthetic demo dataset is loaded.
3. Review the dashboard banner, charts, channel mix, spend, recommendations, and ambassador leaderboard.
4. Open an ambassador referral link (for example, `/register?ref=AMB102`) while demo mode is loaded, then submit invented final-year student details and a unique `example.test` email.
5. The form displays a demo notice. The simulated submission is saved separately, attributed to the ambassador, and reflected in the DEMO DATA dashboard without entering campaign registrations. Duplicate emails are rejected.
6. Select **Reset demo data** to clear the synthetic sample, simulated demo submissions, ambassadors, and demo spend. Do not enter a real student's personal data during a panel demo.

Demo names, registrations, colleges, and campaign spend are synthetic and must not be presented as real student outcomes. There are no testimonials, confirmed event date, joining link, or certificate claims.

## Limitations and deployment guidance

This is a local prototype, not production-secure. Before public deployment, replace the in-memory session store with a persistent store, use a strong secret manager, enforce HTTPS, add CSRF protection and stronger security headers, add audit logging and operational monitoring, review privacy/consent and retention requirements, add backups and migration handling, validate reverse-proxy settings, and run a security review. Do not expose the current admin dashboard or student data to the public internet as-is. A real workshop date and joining details must be configured only after confirmation.

**Public deployment status:** No public host or demo URL is configured. The application is prepared to accept `PORT`, `APP_URL`, `DATABASE_PATH`, `NODE_ENV`, and secrets from the environment, and `/health` is available for a host health check. A public demo still requires choosing a Node.js host with persistent disk for SQLite, setting `APP_URL` to its HTTPS origin, configuring production secrets, and completing the hardening steps above. Do not treat the localhost URL as a public deployment.

The prepared hosting option is a Render Node web service with a persistent disk. Render requires a paid web-service plan for persistent disks; a free web service cannot retain a SQLite database. Review [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [render.yaml](render.yaml) before creating any external service. No deployment was initiated. Browser-only checks remain outstanding; use [docs/BROWSER_TEST_CHECKLIST.md](docs/BROWSER_TEST_CHECKLIST.md) with a disposable database.

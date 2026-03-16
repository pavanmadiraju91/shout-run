# Plan: Repo Cleanup + Legal Pages (Pre-Release)

## Context
Before the first public release, two categories of work remain: (1) cleaning up hardcoded secrets, dev URLs, and repo references so the codebase is safe to make public, and (2) adding Terms of Service and Privacy Policy pages — legally important since shout captures and stores terminal output.

Production URLs: **`shout.run`** (web), **`api.shout.run`** (worker API). Repo will be renamed from `ideal-robot` → `shout` on GitHub.

---

## Part 1: Repo Cleanup

### 1a. Move Turso URL to a Wrangler secret

**File: `packages/worker/wrangler.toml`** (edit)

Line 23-24 currently:
```toml
[vars]
TURSO_URL = "libsql://shout-pavanmadiraju91.aws-eu-west-1.turso.io"
```

**Change:** Remove the entire `[vars]` section (TURSO_URL is the only var). Update the secrets comment:
```toml
# Secrets (set via `wrangler secret put`):
# TURSO_URL, TURSO_AUTH_TOKEN, JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
```

**Then run:** `wrangler secret put TURSO_URL` and paste the URL.

Note: The KV namespace ID on line 21 (`f0b42db3fede40d396def6137f0b668a`) is a Cloudflare resource binding — this is standard practice in wrangler.toml and not a secret.

### 1b. Update hardcoded dev URLs → production URLs

**All occurrences found via grep (verified):**

| File | Line | Current | Change to |
|------|------|---------|-----------|
| `packages/cli/src/commands/broadcast.ts` | 52 | `https://shout-worker.pavannandanmadiraju.workers.dev` | `https://api.shout.run` |
| `packages/cli/src/commands/broadcast.ts` | 171 | `https://shout-web-delta.vercel.app` | `https://shout.run` |
| `packages/cli/src/commands/login.ts` | 7 | `https://shout-worker.pavannandanmadiraju.workers.dev` | `https://api.shout.run` |
| `packages/worker/src/middleware/cors.ts` | 7 | `https://shout-web-delta.vercel.app` | Remove (keep only `http://localhost:3000` and `https://shout.run`) |

### 1c. Update all `ideal-robot` → `shout` references (after GitHub rename)

**All occurrences found via grep (verified):**

| File | Line | What to change |
|------|------|----------------|
| `package.json` (root) | 8 | `ideal-robot.git` → `shout.git` |
| `README.md` | 7-8 | Badge URLs: `ideal-robot` → `shout` |
| `README.md` | 184-185 | Clone URL + `cd ideal-robot` → `cd shout` |
| `README.md` | 291 | Issues link: `ideal-robot` → `shout` |
| `PRE-RELEASE.md` | 3, 77-78 | References to `ideal-robot` |
| `PLAN-npm-publish.md` | 54 | Repo URL |
| `packages/web/src/components/Header.tsx` | 46 | GitHub link |
| `packages/web/src/app/page.tsx` | 133 | GitHub link on homepage |
| `packages/web/src/app/about/page.tsx` | 120 | GitHub link |

**Git remote:** `git remote set-url origin https://github.com/pavanmadiraju91/shout.git`

### 1d. Fix about page CLI command

**File: `packages/web/src/app/about/page.tsx`** (edit)

| Line | Current | Change to |
|------|---------|-----------|
| 27 | `shout start` | `shout` |
| 98 | `shout start` | `shout` |

The CLI uses `shout` (broadcast is the default command) or `shout broadcast`, not `shout start`.

### 1e. Create community/security files

**`SECURITY.md`** (create) — vulnerability disclosure policy:
- Report via email (not public issues)
- Acknowledge within 48 hours
- Scope: web app, worker API, CLI
- Safe harbor statement

**`CONTRIBUTING.md`** (create) — contributor guide:
- Dev setup (pnpm install, env files, dev servers)
- PR process (branch from main, CI must pass)
- Code style (Prettier, ESM, .js extensions)

**`CODE_OF_CONDUCT.md`** (create) — Contributor Covenant v2.1 (industry standard).

### 1f. Git history leak scan

```bash
npx gitleaks detect --source . --report-path gitleaks-report.json
```

If leaks found: rotate the credential first, then assess whether to rewrite history.

### 1g. GitHub settings (manual — not code changes)

After renaming repo to `shout`:
- Branch protection on `main` (require CI, require PR review)
- Enable Dependabot security updates
- Enable GitHub secret scanning
- Enable CodeQL
- Set description: "Live terminal broadcasting for developers"
- Topics: `terminal`, `cli`, `streaming`, `developer-tools`
- Social preview image

---

## Part 2: Legal Pages

### 2a. Terms of Service

**File: `packages/web/src/app/terms/page.tsx`** (create — server component)

Key sections tailored to shout:

1. **Acceptance** — by using shout, you agree
2. **Service description** — live terminal broadcasting and recording platform
3. **Accounts** — GitHub OAuth, one account per person, you're responsible for your account
4. **User content & recordings** — you own your recordings; shout gets a limited license to store, transmit, display; you're responsible for not broadcasting secrets
5. **Acceptable use** — no illegal content, no unauthorized surveillance, no rate limit abuse, no automated scraping
6. **Secret redaction disclaimer** — the CLI strips common env var patterns, but it's NOT guaranteed; users are responsible for what they broadcast
7. **Disclaimer of warranties** — "as is" basis, no uptime guarantees
8. **Limitation of liability** — standard liability cap
9. **Termination** — either party, post-termination data deletion within 30 days
10. **Changes** — right to update with notice via the website
11. **Contact** — email

### 2b. Privacy Policy

**File: `packages/web/src/app/privacy/page.tsx`** (create — server component)

Sections based on what shout actually collects (verified from codebase):

**Data we collect:**
| Category | Data | Where stored |
|----------|------|-------------|
| Account | GitHub username, avatar URL (from OAuth) | Turso DB (`users` table) |
| Sessions | Terminal output, title, tags, timestamps, terminal dimensions | Durable Object → R2 (`sessions/` bucket) |
| Session metadata | Status, visibility, viewer count, start/end times | Turso DB (`sessions` table) |
| Follows | Who follows whom | Turso DB (`follows` table) |
| Votes | Anonymous voter ID per session | Cloudflare KV (30-day TTL) |
| Analytics | Page views (aggregated, anonymous) | Vercel Analytics |

**Data we DON'T collect:**
- Passwords (GitHub OAuth only)
- Payment data (no paid tier)
- The CLI strips 25 categories of sensitive env vars before broadcast (list them)

**How we use it:** Display broadcasts, store replays, show profiles, aggregate analytics

**Third-party services:** Cloudflare (Workers, R2, KV, DO), Vercel (hosting, analytics), GitHub (OAuth), Turso (database)

**Your rights:** View all your data on your profile, export recordings as `.cast`, request account deletion via email. GDPR: right to erasure, portability.

**Security:** WSS encryption, JWT auth, CLI-side env var stripping

**Cookies/storage:** `shout-theme` in localStorage (theme preference only), no tracking cookies

### 2c. Add footer links

**File: `packages/web/src/components/Header.tsx`** (edit)

Add Terms and Privacy links. Two options:
- Add to the Header as small text links, OR
- Create a minimal `Footer.tsx` component rendered in the root layout

Simpler approach: add a small footer row at the bottom of the homepage and legal pages. Keep the Header clean.

**File: `packages/web/src/app/page.tsx`** (edit) — add footer with Terms | Privacy | About links at the bottom of the homepage.

---

## Files summary

| File | Action | Section |
|------|--------|---------|
| `packages/worker/wrangler.toml` | Edit (remove TURSO_URL from [vars]) | 1a |
| `packages/cli/src/commands/broadcast.ts` | Edit (lines 52, 171 — URLs) | 1b |
| `packages/cli/src/commands/login.ts` | Edit (line 7 — URL) | 1b |
| `packages/worker/src/middleware/cors.ts` | Edit (line 7 — remove Vercel preview) | 1b |
| `package.json` (root) | Edit (line 8 — repo URL) | 1c |
| `README.md` | Edit (lines 7, 8, 184, 185, 291 — repo URLs) | 1c |
| `PRE-RELEASE.md` | Edit (lines 3, 77-78) | 1c |
| `PLAN-npm-publish.md` | Edit (line 54) | 1c |
| `packages/web/src/components/Header.tsx` | Edit (line 46) | 1c |
| `packages/web/src/app/page.tsx` | Edit (line 133 + add footer) | 1c, 2c |
| `packages/web/src/app/about/page.tsx` | Edit (lines 27, 98, 120) | 1c, 1d |
| `SECURITY.md` | Create | 1e |
| `CONTRIBUTING.md` | Create | 1e |
| `CODE_OF_CONDUCT.md` | Create | 1e |
| `packages/web/src/app/terms/page.tsx` | Create | 2a |
| `packages/web/src/app/privacy/page.tsx` | Create | 2b |

## Verification
1. `grep -r "ideal-robot" . --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md"` — zero hits (excluding .git)
2. `grep -r "shout-worker.pavan" . --include="*.ts"` — zero hits
3. `grep -r "shout-web-delta" . --include="*.ts"` — zero hits
4. `grep -r "shout start" packages/web/` — zero hits
5. `pnpm build` — all packages build
6. `pnpm --filter @shout/web dev` — visit `/terms` and `/privacy`, verify they render
7. `wrangler secret list` — confirm TURSO_URL present
8. `npx gitleaks detect --source .` — clean report

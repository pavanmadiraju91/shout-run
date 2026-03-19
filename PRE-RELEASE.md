# Pre-Release Checklist

> What to do before flipping `shout` from private to public.
> Not a formal compliance doc — just a "hey, check these boxes first" reference.

---

## Secrets & Sensitive Config

- [x] **wrangler.toml — Turso URL**
  Moved to a wrangler secret. Only a comment remains in `wrangler.toml`.

- [ ] **wrangler.toml — KV namespace ID (line ~21)**
  `f0b42db3fede40d396def6137f0b668a` is your real KV ID. Lower risk than the DB URL, but still
  leaks infrastructure details. Consider parameterizing it or documenting that contributors create
  their own.

- [ ] **Rotate credentials (belt-and-suspenders)**
  `.dev.vars` is properly gitignored and never committed — verified. But if you want to sleep well:
  - GitHub OAuth App client ID + secret
  - Turso auth token
  - JWT signing secret

- [ ] **Scan git history for past leaks**
  Run `git log --all -p | grep -iE '(sk-|ghp_|secret|token|password)'` or use a tool like
  [`trufflehog`](https://github.com/trufflesecurity/trufflehog) /
  [`gitleaks`](https://github.com/gitleaks/gitleaks) for a proper sweep.

- [x] **Enable GitHub secret scanning**
  Enabled via `gh api` — vulnerability alerts active.

## Already Good (no action needed)

- `.gitignore` covers all the right things: `.dev.vars`, `.env`, `.env.local`, `.wrangler/`, etc.
- `.env.example` and `.env.local.example` contain only placeholder/localhost values.
- No hardcoded API keys, tokens, or secrets found in source code.
- GitHub Actions workflows reference secrets via `${{ secrets.* }}` — no hardcoded values.
- Root `package.json` has `"private": true` — no accidental npm publishes.

---

## Community & Open-Source Files

- [x] **LICENSE** — MIT, already exists
- [x] **README.md** — comprehensive, includes architecture diagram, self-hosting guide, CLI reference
- [x] **.github/dependabot.yml** — configured for monthly updates
- [x] **.github/FUNDING.yml** — points to `pavanmadiraju91`
- [x] **CI workflow** — lint, typecheck, build in `ci.yml`
- [x] **SECURITY.md** — vulnerability disclosure policy created
- [x] **CONTRIBUTING.md** — contribution guidelines created
- [x] **CODE_OF_CONDUCT.md** — Contributor Covenant v2.1 created
- [x] **CODEOWNERS** — `.github/CODEOWNERS` assigns `@pavanmadiraju91` to all files
- [x] **Issue / PR templates** — bug report, feature request, and PR template created

---

## Repo Settings (GitHub UI)

- [x] **Branch protection on `main`**
  - Require status checks to pass (lint, typecheck, build, test)
  - Enforce admins enabled
  - Force pushes and branch deletion disabled
- [x] **Enable Dependabot security updates** — vulnerability alerts enabled via API
- [x] **Enable CodeQL** — `.github/workflows/codeql.yml` workflow created (JS/TS analysis, weekly cron)
- [x] **Set repo description and topics** — description, homepage, and topics set via `gh repo edit`
- [x] **Verify "About" section** — homepage points to `https://shout.run`, topics added

---

## Code Hygiene

- [x] **Dev URLs cleaned up** — no more `shout-worker.pavan` or `shout-web-delta` references
- [x] **`ideal-robot` references cleaned up** — repo URL updated to `shout-run`
- [x] **CLI publishConfig** — `packages/cli/package.json` has `publishConfig.name: "shout-run"` and
  `access: "public"`. Published to npm successfully.
- [x] **Check for TODO/FIXME/HACK comments** — codebase is clean, no issues found
- [ ] **Verify self-hosting docs still work** — README has a self-hosting section; make sure
  someone can actually follow it from scratch.

---

## Legal Pages

- [x] **Terms of Service** — `/terms` page exists
- [x] **Privacy Policy** — `/privacy` page exists

---

## Nice-to-Haves

- [ ] **Tag a release** — `v0.1.0` or whatever feels right; gives a clean "start" for the public repo
- [x] **Add badges to README** — CI status, npm version, SDK version, license badges present
- [x] **Set up GitHub Discussions** — enabled via `gh repo edit`
- [x] **.github/FUNDING.yml** — already done and renders correctly
- [ ] **Social preview image** — the OG image that shows when someone shares your repo link
- [ ] **OG social preview image** — metadata in `layout.tsx` but no actual image file exists
- [ ] **GitHub social preview image** — upload via repo Settings > Social preview for link previews

---

*Last updated: March 2026*

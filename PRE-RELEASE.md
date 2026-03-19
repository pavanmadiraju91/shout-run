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

- [ ] **Enable GitHub secret scanning**
  Settings > Code security and analysis > Secret scanning. GitHub will alert you if anything slips
  through in future commits.

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
- [ ] **CODEOWNERS** — optional, but useful if you want auto-assigned reviewers
- [ ] **Issue / PR templates** — `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md`

---

## Repo Settings (GitHub UI)

- [ ] **Branch protection on `main`**
  - Require pull request reviews
  - Require status checks to pass (CI)
  - Disable force pushes and branch deletion
- [ ] **Enable Dependabot security updates** (not just version updates)
- [ ] **Enable CodeQL** for code scanning (Settings > Code security and analysis)
- [ ] **Set repo description and topics** — helps discoverability
  (e.g., `terminal`, `broadcasting`, `cli`, `websocket`, `developer-tools`)
- [ ] **Verify "About" section** — homepage URL, description, topics

---

## Code Hygiene

- [x] **Dev URLs cleaned up** — no more `shout-worker.pavan` or `shout-web-delta` references
- [x] **`ideal-robot` references cleaned up** — repo URL updated to `shout-run`
- [x] **CLI publishConfig** — `packages/cli/package.json` has `publishConfig.name: "shout-run"` and
  `access: "public"`. Published to npm successfully.
- [ ] **Check for TODO/FIXME/HACK comments** — do a quick grep; remove anything embarrassing or
  that references internal context you don't want public.
- [ ] **Verify self-hosting docs still work** — README has a self-hosting section; make sure
  someone can actually follow it from scratch.

---

## Legal Pages

- [x] **Terms of Service** — `/terms` page exists
- [x] **Privacy Policy** — `/privacy` page exists

---

## Nice-to-Haves

- [ ] **Tag a release** — `v0.1.0` or whatever feels right; gives a clean "start" for the public repo
- [ ] **Add badges to README** — CI status, npm version, license
- [ ] **Set up GitHub Discussions** — for community Q&A without cluttering issues
- [x] **.github/FUNDING.yml** — already done and renders correctly
- [ ] **Social preview image** — the OG image that shows when someone shares your repo link

---

*Last updated: March 2026*

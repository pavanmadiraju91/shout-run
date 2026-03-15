# Pre-Release Checklist

> What to do before flipping `ideal-robot` from private to public.
> Not a formal compliance doc — just a "hey, check these boxes first" reference.

---

## Secrets & Sensitive Config

- [ ] **wrangler.toml — Turso URL (line ~24)**
  Your actual database endpoint is hardcoded: `libsql://shout-pavanmadiraju91.aws-eu-west-1.turso.io`.
  Move it to a wrangler secret or replace with a placeholder + docs on how to set your own.

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
- [ ] **SECURITY.md** — add a security policy with instructions for reporting vulnerabilities
  (email, private disclosure, or GitHub's built-in security advisories)
- [ ] **CONTRIBUTING.md** — contribution guidelines, dev setup, PR expectations
- [ ] **CODE_OF_CONDUCT.md** — GitHub has a one-click template (Contributor Covenant)
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

- [ ] **Review `package.json` repo URL** — currently points to
  `https://github.com/pavanmadiraju91/ideal-robot.git`.
  Update if you're renaming the repo (e.g., `shout` instead of `ideal-robot`).
- [ ] **CLI publishConfig** — `packages/cli/package.json` has `publishConfig.name: "shout-cli"` and
  `access: "public"`. Make sure the npm name isn't squatted before you publish.
- [ ] **Check for TODO/FIXME/HACK comments** — do a quick grep; remove anything embarrassing or
  that references internal context you don't want public.
- [ ] **Verify self-hosting docs still work** — README has a self-hosting section; make sure
  someone can actually follow it from scratch.

---

## Nice-to-Haves

- [ ] **Tag a release** — `v0.1.0` or whatever feels right; gives a clean "start" for the public repo
- [ ] **Add badges to README** — CI status, npm version, license
- [ ] **Set up GitHub Discussions** — for community Q&A without cluttering issues
- [ ] **Add a `.github/FUNDING.yml`** — already done, but double-check it renders correctly on the
  public repo's sidebar
- [ ] **Social preview image** — the OG image that shows when someone shares your repo link

---

*Last updated: March 2026*

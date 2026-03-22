# GEO Audit Report: shout.run (Follow-up #2)

**Audit Date:** 2026-03-22
**Previous Audit:** 2026-03-20 (Score: 47/100)
**URL:** https://shout.run
**Business Type:** SaaS / Developer Tool (Open Source)
**Pages Analyzed:** 4 static (/, /about, /privacy, /terms) + /llms.txt, /robots.txt

---

## Executive Summary

**Overall GEO Score: 54/100 (Poor — trending upward)**

Score trajectory: **29 → 47 → 54** (+25 total over 7 days)

Following two PRs (#45: structured data + FAQ + canonicals + llms.txt, #46: llms.txt routing fix), the site has resolved both critical technical blockers from the previous audit. llms.txt now returns HTTP 200 with correct `text/plain` content type, and robots.txt renders all 6 AI crawler rules correctly. Technical GEO jumped from 72 to 88 — the strongest category by far.

However, the site remains invisible to AI recommendation systems due to zero third-party brand presence. With 0 GitHub stars, no Hacker News/Reddit/Stack Overflow mentions, no blog posts, and only 4 pages of content, AI systems have no external evidence to build entity recognition. The **Brand Authority** score of 12/100 is the single largest drag on the overall score and cannot be fixed with code changes alone.

### Score Breakdown

| Category | Score | Weight | Weighted | Previous | Delta |
|---|---|---|---|---|---|
| AI Citability | 78/100 | 25% | 19.5 | 62/100 | **+16** |
| Brand Authority | 12/100 | 20% | 2.4 | 8/100 | **+4** |
| Content E-E-A-T | 62/100 | 20% | 12.4 | 62/100 | 0 |
| Technical GEO | 88/100 | 15% | 13.2 | 72/100 | **+16** |
| Schema & Structured Data | 62/100 | 10% | 6.2 | 62/100 | 0 |
| Platform Optimization | 5/100 | 10% | 0.5 | 5/100 | 0 |
| **Overall GEO Score** | | | **54/100** | **47/100** | **+7** |

---

## Resolved Issues (was Critical)

### llms.txt — NOW WORKING
**Previous:** HTTP 404 — caught by `[username]` dynamic route
**Current:** HTTP 200 with `Content-Type: text/plain; charset=utf-8`
**Fix applied:** Dedicated route handler at `app/llms.txt/route.ts` (PR #46)
**Content:** ~47 lines including site description, page links, install commands, SDK info, and all 7 MCP tools

### robots.txt AI crawler rules — NOW WORKING
**Previous:** Only `User-Agent: *` with `Allow: /` — AI-specific rules missing
**Current:** All 5 AI crawler user agents explicitly listed (GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended, GoogleOther) with `Allow: /`
**Sitemap reference included**

---

## High Priority Issues (Remaining)

### 1. Zero third-party brand presence
**Severity:** HIGH
**Impact:** AI systems rely heavily on third-party signals (GitHub stars, Reddit discussions, blog posts, HN threads) to recognize entities. With 0 GitHub stars, no external mentions, and no community launches, AI systems have no external evidence for entity recognition.
**Action required:** Marketing — not code changes. See 30-Day Action Plan below.

### 2. No blog or long-form content (only 4 pages)
**Severity:** HIGH
**Impact:** Extremely limited content surface area. No tutorials, comparisons, or use case articles. AI systems cannot cite what doesn't exist.
**Fix:** Add `/blog` section with launch post, architecture deep-dive, "shout vs asciinema" comparison, and use case articles.

### 3. Homepage content is thin (~120 words)
**Severity:** HIGH
**Impact:** AI systems prefer pages with 500+ words of substantive content. The definition paragraph helps but body copy remains too thin for meaningful extraction.
**Fix:** Expand with feature highlights, "Why shout?" section, or move top 3-4 FAQs to homepage.

### 4. Brand name disambiguation
**Severity:** HIGH
**Impact:** "shout" is a common English word, a laundry product, a Tears for Fears song, and a Unix command. AI systems struggle to disambiguate without the full domain "shout.run."
**Fix:** Consistently use "shout.run" (full domain) in all external content and meta titles. The domain itself is a strong disambiguator.

### 5. No comparison content
**Severity:** HIGH
**Impact:** Cannot win recommendation queries like "best terminal sharing tool" or "shout vs asciinema." Zero comparison pages, no feature matrices.
**Fix:** Create `/compare` page with feature matrix comparing shout vs asciinema (17K stars), ttyd (11.2K stars), and tty-share (970 stars).

---

## Medium Priority Issues

### 6. Sitemap excludes dynamic pages
**Severity:** MEDIUM
**Score impact:** Sitemap completeness scored 5/10 in Technical GEO
**Fix:** Generate dynamic sitemap entries for public user profiles (`/[username]`) and sessions (`/[username]/[sessionId]`). Add `lastmod` dates.

### 7. SoftwareApplication JSON-LD improvements needed
**Severity:** MEDIUM
**Issues found:**
- `applicationCategory` is `"DeveloperApplication"` — Google prefers `"DeveloperTools"`
- Missing `downloadUrl` (should be `https://www.npmjs.com/package/shout-run`)
- Missing `softwareVersion`
- Missing `featureList`
- Missing `screenshot`
**Fix:** Update JSON-LD in root layout.

### 8. Missing Organization JSON-LD schema
**Severity:** MEDIUM
**Impact:** No site-level entity schema for knowledge panel establishment
**Fix:** Add Organization schema to root layout:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "shout.run",
  "url": "https://shout.run",
  "sameAs": ["https://github.com/pavanmadiraju91/shout-run"]
}
```

### 9. No HowTo schema on Quick Start
**Severity:** MEDIUM
**Impact:** The /about page has a clear 3-step Quick Start (install, login, broadcast) — a natural HowTo with no corresponding schema.
**Fix:** Add HowTo JSON-LD to /about page.

### 10. Missing BreadcrumbList schema
**Severity:** MEDIUM
**Fix:** Add BreadcrumbList JSON-LD to subpages (/about, /terms, /privacy).

### 11. No author bio page
**Severity:** MEDIUM
**Impact:** Author identified in JSON-LD but no dedicated page with credentials, bio, or social links. Authoritativeness scored only 38/100 in E-E-A-T.
**Fix:** Create author page or add author section to /about.

---

## Low Priority Issues

### 12. Missing HSTS header
**Severity:** LOW
**Fix:** Add to `next.config.js` headers:
```js
{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
```

### 13. No RSS feed
**Severity:** LOW
**Impact:** AI training pipelines and feed readers cannot subscribe to updates.

### 14. Heavy JavaScript bundles (~102 KB shared)
**Severity:** LOW
**Impact:** Not critical for GEO but affects Core Web Vitals.

---

## Category Deep Dives

### AI Citability (78/100) — up from 62

| Dimension | Score | Notes |
|---|---|---|
| Passage Self-Containment | 85/100 | FAQ answers are fully self-contained and quotable. Definition paragraph is excellent. |
| Answer Block Quality | 82/100 | 8 FAQ Q&A pairs with FAQPage JSON-LD. Answers are 1-3 sentences (optimal for citation). |
| Statistical/Factual Density | 75/100 | Strong on limits (4h, 100KB/s, 50/day). Missing performance metrics and usage stats. |
| Content Surface Area | 65/100 | Only 1 substantial content page (/about at ~2,800 words). Homepage too minimal (~120 words). |
| Comparison Content | 35/100 | **Critical weakness.** Zero comparison pages or "vs" content. |

**What improved:** llms.txt now serving correctly (+8 points). AI crawlers can access the structured content file with all 7 MCP tools documented. The combination of working llms.txt + FAQPage JSON-LD + SoftwareApplication schema makes the site highly quotable for definitional queries ("What is shout.run?", "How does terminal broadcasting work?").

**What's still weak:** Cannot compete in recommendation queries ("best terminal sharing tool") due to zero comparison content. Limited to 1 real documentation page. Need dedicated SDK guide, MCP guide, and use case pages.

**Top recommendations:**
1. Add comparison page (`/compare`) with feature matrix vs. asciinema, tmate, ttyd (+15 points potential)
2. Create dedicated `/docs/sdk`, `/docs/mcp`, `/use-cases` pages (+10 points)
3. Move top 3-4 FAQs to homepage for better main page citability (+5 points)

---

### Brand Authority (12/100) — up from 8

**Platform Presence:**

| Platform | Status | Metrics | Impact |
|---|---|---|---|
| GitHub | Present | 0 stars, 0 forks, 0 watchers, 113 commits | Active dev, no social proof |
| npm (shout-run) | Present | 358 weekly downloads | Some traction |
| npm (shout-run-sdk) | Present | 184 weekly downloads | Growing |
| npm (shout-run-mcp) | Present | 200 weekly downloads | Growing |
| PyPI (shout-run-sdk) | Present | 494 weekly downloads | Good for 7-day-old package |
| PyPI (shout-run-mcp) | Present | 439 weekly downloads | Good for 7-day-old package |
| Reddit | Absent | No mentions | 0 |
| Hacker News | Absent | No mentions | 0 |
| Stack Overflow | Absent | No questions or tags | 0 |
| YouTube | Absent | No videos | 0 |
| Dev.to/Medium | Absent | No articles | 0 |
| Product Hunt | Absent | Not launched | 0 |
| Wikipedia | Absent | No mentions | 0 |
| Twitter/X | Unknown | Could not verify | 0 |

**Combined weekly downloads:** 1,675+ across all packages — encouraging for 7 days old but invisible to AI models that weight GitHub stars and community discussion more heavily.

**Competitor comparison:**

| Tool | GitHub Stars | Age | Authority Level |
|---|---|---|---|
| asciinema | 17,000+ | 10+ years | Very High |
| ttyd | 11,200+ | 7+ years | High |
| tty-share | 970+ | 5+ years | Medium |
| **shout.run** | **0** | **7 days** | **Very Low** |

**What improved:** npm and PyPI download numbers provide early traction signals (+4 points). The score improvement is modest because package downloads carry less weight than GitHub stars and third-party mentions in AI entity recognition.

---

### Content E-E-A-T (62/100) — unchanged

| Dimension | Score | Key Gap |
|---|---|---|
| Experience | 68/100 | No demos, screenshots, or recordings of the product in action |
| Expertise | 72/100 | Technically accurate docs but no deep-dive articles or blog posts |
| Authoritativeness | 38/100 | **Critical weakness.** No external citations, author credentials, or community recognition |
| Trustworthiness | 70/100 | Open-source + privacy policy + ToS. No security policy or business entity |

**Why unchanged:** No new content was added in the two PRs. The fixes were purely technical (routing). E-E-A-T requires content expansion and external validation to improve.

**High-impact actions:**
1. Add author bio page with professional background, LinkedIn, other projects (+15-20 Authoritativeness points)
2. Embed a live demo on homepage (+10 Experience points)
3. Display GitHub metrics (stars, downloads) on site (+5 Authoritativeness points)
4. Add screenshots/recordings of the product (+8 Experience points)

---

### Technical GEO (88/100) — up from 72

| Dimension | Score | Max | Notes |
|---|---|---|---|
| AI Crawler Access | 24 | 25 | All 5 AI crawlers explicitly allowed. Missing `anthropic-ai` user agent (minor). |
| llms.txt Quality | 18 | 20 | HTTP 200, text/plain, ~47 lines, all MCP tools listed. Missing version/timestamp. |
| Meta Tags & Canonicals | 19 | 20 | Complete OG, Twitter Card, canonicals on all static pages. |
| Rendering & Accessibility | 14 | 15 | Full SSR via Next.js 15. Terminal components client-only by design. |
| Sitemap Completeness | 5 | 10 | Only 4 static URLs. No dynamic pages, no lastmod dates. |
| Security & Performance | 8 | 10 | Good headers (X-Frame-Options, X-Content-Type-Options). Missing HSTS. |

**What improved:** llms.txt fix (+8 points) and robots.txt fix (+8 points) resolved both critical blockers. The site now has excellent AI crawler infrastructure.

**Remaining gaps:** Sitemap is the biggest weakness — only 4 static URLs with no dynamic pages. HSTS header is missing. Dynamic sitemap generation would add 3-5 points.

---

### Schema & Structured Data (62/100) — unchanged

| Dimension | Score | Notes |
|---|---|---|
| Schema Type Coverage | 16/25 | SoftwareApplication + FAQPage present. Missing Organization, HowTo, WebSite. |
| Schema Completeness | 17/25 | Good basics but missing downloadUrl, softwareVersion, featureList, screenshot. |
| Schema Accuracy | 18/25 | Valid structure. `applicationCategory` should be "DeveloperTools" not "DeveloperApplication". |
| Missing Opportunities | 11/25 | Organization, HowTo, BreadcrumbList, WebSite+SearchAction all absent. |

**Present schemas:**

| Schema Type | Page | Status |
|---|---|---|
| SoftwareApplication | Root layout (all pages) | Valid — needs property additions |
| FAQPage | /about | Valid — 8 Q&A pairs, no duplicates confirmed |
| Open Graph | All pages | Complete |
| Twitter Card | All pages | Complete |

**Missing schemas:**

| Schema Type | Priority | Benefit |
|---|---|---|
| Organization | High | Knowledge panel, brand entity establishment |
| HowTo | High | Step-by-step rich snippets for Quick Start |
| WebSite + SearchAction | Medium | Sitelinks searchbox in SERPs |
| BreadcrumbList | Medium | Navigation breadcrumbs in SERPs |
| VideoObject | Low | Rich results for session replays |

**Code fixes needed:**
1. Change `applicationCategory` from `"DeveloperApplication"` to `"DeveloperTools"`
2. Add `downloadUrl: "https://www.npmjs.com/package/shout-run"`
3. Add `featureList` array
4. Add Organization JSON-LD
5. Add HowTo JSON-LD for Quick Start on /about

**Note:** Previous audit flagged a duplicate FAQ question ("How does shout work?" twice). This was **not confirmed** in codebase review — the 8 questions are all unique.

---

### Platform Optimization (5/100) — unchanged

The site has zero presence on platforms that AI models train on and cite from. This is expected at 7 days old but is the single largest GEO gap. Every platform presence point (a Show HN post, a Reddit thread, a Dev.to article) directly increases the probability of AI citation.

No code changes can improve this score. It requires marketing actions.

---

## Code Quick Wins (Implement This Week)

These are changes that can be made in the codebase right now:

| # | Change | File(s) | Expected Impact |
|---|---|---|---|
| 1 | Fix `applicationCategory` → `"DeveloperTools"` | `packages/web/src/app/layout.tsx` | +2 schema accuracy |
| 2 | Add `downloadUrl` to SoftwareApplication | `packages/web/src/app/layout.tsx` | +1 schema completeness |
| 3 | Add Organization JSON-LD | `packages/web/src/app/layout.tsx` | +3 schema coverage |
| 4 | Add HowTo JSON-LD for Quick Start | `packages/web/src/app/about/page.tsx` | +3 schema coverage |
| 5 | Add HSTS header | `packages/web/next.config.js` | +1 security |
| 6 | Generate dynamic sitemap | `packages/web/src/app/sitemap.ts` | +3-5 technical GEO |
| 7 | Add `featureList` to SoftwareApplication | `packages/web/src/app/layout.tsx` | +1 schema completeness |

**Estimated score after code fixes: 62-65/100** (+8-11 points)

---

## Marketing Actions (Highest Impact)

These cannot be done with code — they require human action on external platforms.

| # | Action | Expected Impact | Priority |
|---|---|---|---|
| 1 | Post "Show HN: shout.run — Live stream your terminal to the web" | +5-15 brand authority | **Critical** |
| 2 | Write Dev.to launch article (1000+ words) | +5 brand authority, +10 platform optimization | High |
| 3 | Post to r/commandline and r/programming | +3 brand authority | High |
| 4 | Record 2-3 minute YouTube demo video | +3 brand authority, +5 experience | High |
| 5 | Launch on Product Hunt (schedule for a Tuesday) | +5 brand authority | High |
| 6 | Submit PR to awesome-cli-apps GitHub repo | +2 brand authority | Medium |
| 7 | Add "Please star" CTA to README and CLI output | +1-3 brand authority over time | Medium |

**Estimated score after marketing push: 70-80/100** (depends on reception)

---

## 30-Day Action Plan

### Week 1: Code Quick Wins + Community Launch
- [ ] Fix `applicationCategory` → `"DeveloperTools"`
- [ ] Add `downloadUrl` to SoftwareApplication JSON-LD
- [ ] Add Organization JSON-LD schema
- [ ] Add HowTo JSON-LD for Quick Start on /about
- [ ] Add HSTS header
- [ ] Post "Show HN" on Hacker News
- [ ] Self-star GitHub repo

### Week 2: Content Expansion
- [ ] Write Dev.to launch article (1000+ words): "I built an open-source terminal broadcasting tool"
- [ ] Create "shout vs asciinema vs ttyd" comparison page
- [ ] Add blog section with launch post
- [ ] Record YouTube demo video (2-3 minutes)
- [ ] Generate dynamic sitemap for public sessions

### Week 3: Platform Presence
- [ ] Launch on Product Hunt
- [ ] Submit to awesome-cli-apps and awesome-streaming lists
- [ ] Post to r/programming and r/commandline
- [ ] Add author bio section to /about page
- [ ] Engage on relevant Stack Overflow questions

### Week 4: Content Depth
- [ ] Write TypeScript SDK tutorial (500+ words)
- [ ] Write MCP integration guide (500+ words)
- [ ] Create use case pages (DevRel, teaching, CI/CD monitoring)
- [ ] Add `featureList` to SoftwareApplication schema
- [ ] Expand homepage content to 500+ words

---

## Score Projection

| Timeframe | Projected Score | Key Drivers |
|---|---|---|
| Current | 54/100 | Technical fixes deployed |
| After code fixes (Week 1) | 62-65/100 | Schema improvements, HSTS, sitemap |
| After HN + Dev.to (Week 2) | 68-75/100 | Brand authority jump |
| After full plan (Week 4) | 75-85/100 | Content expansion + platform presence |
| 3-month target | 80-90/100 | Organic growth from launches + content |

---

## Appendix A: Pages Analyzed

| URL | Title | Word Count | Status |
|---|---|---|---|
| https://shout.run | shout.run — Terminal sessions you can share | ~120 | Thin content — needs expansion |
| https://shout.run/about | Docs - shout | ~2,800 | Strongest page — FAQ + docs |
| https://shout.run/privacy | Privacy Policy - shout | ~400 | Adequate |
| https://shout.run/terms | Terms of Service - shout | ~1,200 | Adequate |
| https://shout.run/llms.txt | (text/plain) | ~47 lines | **FIXED** — HTTP 200 |
| https://shout.run/robots.txt | (text/plain) | ~20 lines | **FIXED** — all AI rules present |

## Appendix B: Audit History

| Date | Score | Key Changes |
|---|---|---|
| 2026-03-15 | 29/100 | Initial audit — no structured data, no AI optimization |
| 2026-03-20 | 47/100 | PR #45: JSON-LD, FAQ, canonicals, definition paragraph, llms.txt |
| 2026-03-22 | 54/100 | PR #46: llms.txt routing fix. Both critical technical issues resolved. |

---

*Next audit recommended after completing Week 2 actions (content expansion + community launch). The biggest score jump will come from external platform presence, which requires marketing rather than code changes.*

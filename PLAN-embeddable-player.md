# Plan: Embeddable Terminal Player

## Context
Shout recordings should be embeddable anywhere — docs, blog posts, READMEs, Twitter/X, Reddit, etc. This is a core growth mechanism for MVP: every embed is a backlink to the shout platform. The existing `Terminal`, `PlayerBar`, and `useReplayController` components already do everything needed for replay. The main work is creating a lightweight embed route, removing the iframe blocker for it, and following the oEmbed standard that platforms like YouTube, asciinema, and CodePen all use.

### Industry standard (validated via research)
- **oEmbed protocol** — the standard for embeddable content. Platforms query a provider endpoint with a URL and get back iframe HTML. WordPress, Medium, Notion, HubSpot all auto-consume it.
- **asciinema's approach** — offers 3 methods: (1) iframe embed, (2) self-injecting `<script>` tag, (3) oEmbed endpoint at `/oembed`. We follow the same pattern.
- **Next.js 15 App Router** — use a separate `layout.tsx` for the embed route to isolate it from the root layout (no Header/nav). Use `generateMetadata` server function for dynamic OG tags.
- **CSP `frame-ancestors`** — modern replacement for `X-Frame-Options`. More granular: allows specifying which domains can embed.

## What changes

### 1. Create embed route with isolated layout

**File: `packages/web/src/app/embed/layout.tsx`** (new)

A bare layout — no Header, no ThemeProvider wrapper, no Analytics. Just `<html>`, `<body>`, CSS imports, and a small inline theme script that reads the `?theme=` query param (falling back to dark).

```tsx
export default function EmbedLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: embedThemeScript }} />
      </head>
      <body className="bg-shout-bg text-shout-text m-0 p-0 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
```

**File: `packages/web/src/app/embed/[sessionId]/page.tsx`** (new)

A minimal, chromeless page rendering **only** terminal + player bar. Reuses existing components directly.

- Fetches session metadata via `fetchSession(sessionId)`
- Uses existing `Terminal` (replay mode) + `PlayerBar` + `useReplayController` — no modifications to these
- Full-height layout (`100vh`) — fills the iframe
- Query params for customization:
  - `?theme=dark|light` — override theme (default: dark)
  - `?autoplay=1|0` — auto-play on load (default: 1)
  - `?speed=1|2|4` — initial playback speed
  - `?controls=1|0` — show/hide PlayerBar (default: 1)
- Small "powered by shout" watermark link in bottom-right — opens full session page (`/{username}/{sessionId}`) in `_blank`

### 2. Fix security headers for embed route

**File: `packages/web/next.config.js`** (edit)

Currently `X-Frame-Options: DENY` on all routes blocks all iframes. Split into two rules:

- `/embed/*` — no `X-Frame-Options`, add `Content-Security-Policy: frame-ancestors *` (allow embedding anywhere)
- Everything else — keep `X-Frame-Options: DENY` (block framing)

```js
async headers() {
  return [
    {
      source: '/embed/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
    {
      source: '/((?!embed).*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ];
},
```

### 3. Add "Embed" button + copy modal to session viewer

**File: `packages/web/src/app/[username]/[sessionId]/page.tsx`** (edit)

Add an "Embed" button next to the existing Share and Export buttons (~line 234). On click, shows a small dropdown/popover with two embed options (following asciinema's pattern):

**Option A — iframe:**
```html
<iframe src="https://shout.run/embed/{sessionId}" width="100%" height="400" style="border:0;border-radius:8px" allowfullscreen></iframe>
```

**Option B — script tag** (self-injecting, like asciinema):
```html
<script src="https://shout.run/embed/{sessionId}/script.js" async></script>
```

Each with a "Copy" button. Dismiss on click-outside.

### 4. Self-injecting script endpoint

**File: `packages/web/src/app/embed/[sessionId]/script.js/route.ts`** (new — Next.js Route Handler)

Returns a small JS snippet that creates and injects an iframe at the script's location. This is the asciinema pattern — works in blogs, CMS, etc. where authors can paste a `<script>` tag.

```js
// Returned JS (simplified):
(function() {
  var d = document, s = d.currentScript;
  var iframe = d.createElement('iframe');
  iframe.src = 'https://shout.run/embed/{sessionId}';
  iframe.style.cssText = 'width:100%;height:400px;border:0;border-radius:8px';
  iframe.allowFullscreen = true;
  s.parentNode.insertBefore(iframe, s);
})();
```

Route handler returns with `Content-Type: application/javascript`.

### 5. Dynamic OG meta tags for session pages

**File: `packages/web/src/app/[username]/[sessionId]/layout.tsx`** (new — server component)

Exports `generateMetadata()` to produce dynamic Open Graph and Twitter Card tags per session. This is the Next.js 15 standard approach — server-side fetch, no client hydration.

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const session = await fetchSession(params.sessionId);
  return {
    title: `${session.title || 'Terminal Session'} by ${session.username} — shout`,
    description: `Watch ${session.username}'s terminal recording on shout`,
    openGraph: {
      title: `${session.title} — shout`,
      description: `Terminal recording by ${session.username}`,
      type: 'video.other',
      url: `https://shout.run/${session.username}/${session.id}`,
      siteName: 'shout',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${session.title} — shout`,
      description: `Terminal recording by ${session.username}`,
    },
    alternates: {
      types: {
        'application/json+oembed': `https://api.shout.run/api/oembed?url=https://shout.run/${session.username}/${session.id}`,
      },
    },
  };
}
```

The `alternates.types` entry is the oEmbed discovery link — platforms that support oEmbed auto-detect this.

### 6. oEmbed API endpoint (worker)

**File: `packages/worker/src/routes/sessions.ts`** (edit)

Add `GET /api/oembed?url={url}&maxwidth=&maxheight=` following the oEmbed spec. Returns JSON:

```json
{
  "type": "rich",
  "version": "1.0",
  "title": "Session title",
  "author_name": "username",
  "author_url": "https://shout.run/username",
  "provider_name": "shout",
  "provider_url": "https://shout.run",
  "html": "<iframe src=\"https://shout.run/embed/{id}\" width=\"800\" height=\"400\" style=\"border:0;border-radius:8px\" allowfullscreen></iframe>",
  "width": 800,
  "height": 400,
  "thumbnail_url": null
}
```

Parses the session ID from the `url` param, fetches session metadata, returns standard oEmbed response. This enables auto-embedding in WordPress, Notion, Medium, and any platform supporting oEmbed discovery.

## Files summary

| File | Action | Purpose |
|------|--------|---------|
| `packages/web/src/app/embed/layout.tsx` | Create | Bare layout — no Header, no nav |
| `packages/web/src/app/embed/[sessionId]/page.tsx` | Create | Chromeless replay player |
| `packages/web/src/app/embed/[sessionId]/script.js/route.ts` | Create | Self-injecting script (asciinema pattern) |
| `packages/web/next.config.js` | Edit | Split headers: allow framing on `/embed/*` |
| `packages/web/src/app/[username]/[sessionId]/page.tsx` | Edit | Add Embed button + copy modal |
| `packages/web/src/app/[username]/[sessionId]/layout.tsx` | Create | Server layout with `generateMetadata` + oEmbed discovery |
| `packages/worker/src/routes/sessions.ts` | Edit | Add `/api/oembed` endpoint |

## Existing code reused (no modifications)
- `packages/web/src/components/Terminal.tsx` — replay mode as-is
- `packages/web/src/components/PlayerBar.tsx` — as-is
- `packages/web/src/hooks/useReplayController.ts` — as-is
- `packages/web/src/lib/api.ts` — `fetchSession()`
- `packages/web/src/app/globals.css` — theme CSS variables

## Verification
1. `pnpm --filter @shout/web dev` — start dev server
2. Visit `http://localhost:3000/embed/{sessionId}?theme=dark` — chromeless terminal + player, no header
3. Visit with `?theme=light&controls=0` — light theme, no player bar
4. Create test HTML: `<iframe src="http://localhost:3000/embed/{sessionId}">` — loads without X-Frame-Options error
5. Test `<script src="http://localhost:3000/embed/{sessionId}/script.js">` in a test HTML — auto-injects iframe
6. Verify non-embed pages still block framing: `<iframe src="http://localhost:3000/">` should fail
7. Test Embed button on session page — click shows popover with iframe/script snippets, copy works
8. Check OG tags: `curl -s http://localhost:3000/{username}/{sessionId} | grep 'og:'`
9. Test oEmbed: `curl "http://localhost:8787/api/oembed?url=https://shout.run/user/session123"` — returns valid JSON

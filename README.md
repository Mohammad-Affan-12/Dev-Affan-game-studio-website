# Dev Affan — Indie Mobile Game Studio Website

Official static website for **Dev Affan**, an independent mobile game studio crafting original offline physics puzzle games for Android and Google Play — led by **Color Ball Drop: Rope Puzzle**, with **Cut & Cascade** planned as a separate future project.

## Architecture

- **Framework:** Zero-dependency Node.js 18+ static site generator (`scripts/build.mjs`)
- **Single-source-of-truth catalog:** `data/games.json` + `data/site.json`
- **Design system:** `src/styles/tokens.css` → `src/styles/main.css` (2.5D casual puzzle palette: midnight navy `#0B1224`, deep blue `#132B4F`, electric cyan `#36D5F4`, mint teal `#72E7CD`, sunshine gold `#FFC83D`, coral red `#FF6276`, paired with `Fredoka` + `Nunito`)
- **Optimized visual assets:**
  - Original 2.5D Color Ball Drop promotional WebP artwork in `src/assets/art/` (source originals in `assets-source/`)
  - Authentic Color Ball Drop gameplay screenshots (portrait WebP) and gameplay video (`gameplay-level-3.mp4`) in `src/assets/games/color-ball-drop/`
  - 1200×630 Open Graph PNG in `src/assets/og-studio.png`
- **Minimal vanilla JavaScript:** `src/scripts/main.js` (mobile drawer, progressive catalog filter, cookieless `sessionStorage` UTM capture, Google Play `referrer` pass-through, and optional analytics dispatch)
- **Cloudflare Pages native output:** `dist/` with clean static routes, `404.html`, `sitemap.xml`, `robots.txt`, and `_headers`

## Local Development & Testing

```powershell
# 1. Build the static site into dist/
node scripts/build.mjs

# 2. Run static SEO, accessibility, link, JSON-LD, and HTTP route checks
node tests/verify-site.mjs

# 3. Run real headless Chrome QA across 360px–1440px viewports
node tests/browser-qa.mjs

# 4. Preview locally at http://127.0.0.1:4173
node scripts/dev-server.mjs
```

## Adding Future Games

Add a new entry to `data/games.json` and run `node scripts/build.mjs`. The generator automatically builds:
- Game landing page: `/games/<slug>/`
- Dedicated Google Play privacy policy URL: `/privacy/<slug>/`
- Catalog entry on `/games/` and homepage
- Entries in `dist/sitemap.xml`

When **Color Ball Drop: Rope Puzzle** launches on Google Play:
1. Set `"status": "released"` and `"statusLabel": "Available on Google Play"` in `data/games.json`.
2. Populate `"googlePlayUrl"` with `https://play.google.com/store/apps/details?id=com.colorballdrop.ropepuzzle`.
3. Rebuild with `node scripts/build.mjs`.

## Cloudflare Pages Deployment Configuration

- **Framework preset:** None (custom static build)
- **Repository:** `Mohammad-Affan-12/Dev-Affan-game-studio-website`
- **Production branch:** `main`
- **Build command:** `node scripts/build.mjs`
- **Build output directory:** `dist`
- **Environment variables:** None required

After Cloudflare assigns your `.pages.dev` (or custom) domain:
1. Set `"siteUrl"` in `data/site.json`.
2. Rebuild so `<link rel="canonical">`, `og:url`, `sitemap.xml`, and `robots.txt` use the production domain.

## Google Search Console Setup

1. Add your live Cloudflare Pages domain as a **URL prefix** property in Google Search Console.
2. Verify ownership via HTML meta tag or verification file.
3. Submit `https://<your-domain>/sitemap.xml`.
4. Inspect `/` and `/games/color-ball-drop/` in URL Inspection.

## Analytics & Conversion Measurement

See [docs/ANALYTICS-AND-CONVERSION.md](docs/ANALYTICS-AND-CONVERSION.md) for Cloudflare Web Analytics setup, UTM campaign tracking, and Google Play Console attribution. Website button clicks are outbound intent signals, never verified installs.

## Remaining Items Requiring Owner Approval Before Launch

- [ ] **Live Google Play Store URL** for `com.colorballdrop.ropepuzzle` (set `googlePlayUrl` and `status: "released"` in `data/games.json` when published)
- [ ] **Verified studio support/privacy email** (`contact.email` + `contact.emailVerified: true` in `data/site.json`)
- [ ] **Official social profile links** (YouTube, TikTok, Instagram, X in `data/site.json`)
- [ ] **Final Cloudflare Pages `siteUrl`** in `data/site.json`
- [ ] **Final review of `/privacy/color-ball-drop/`** against the signed release APK's merged permissions, Data Safety answers, and target age / Families Policy status (set `privacy.requiresVerification: false` once approved)
- [ ] **Optional Cloudflare Web Analytics token ($0)** in `data/site.json`

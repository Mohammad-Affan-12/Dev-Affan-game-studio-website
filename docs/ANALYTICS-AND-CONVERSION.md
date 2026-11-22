# Analytics, Conversion & Attribution Plan

## 1. Conversion Funnel

```
TikTok / YouTube / Instagram / Search
  -> Dedicated Game Page (/games/color-ball-drop/)
    -> Google Play CTA Click (outbound intent)
      -> Google Play Store Listing
        -> Confirmed Install & Retention (Google Play Console)
```

## 2. Privacy-Conscious $0 Measurement Stack

1. **Cloudflare Web Analytics (Recommended Default — $0, Cookieless)**
   - Tracks page views, referrers, and core web vitals without cookies or a consent banner.
   - Activate in Cloudflare Pages Dashboard -> Web Analytics, then paste the token into `data/site.json` under `analytics.cloudflareWebAnalyticsToken`.
2. **Optional Google Analytics 4 (GA4 — $0)**
   - Only enable if you need granular outbound CTA event reporting (`store_cta_clicked`, `game_page_viewed`).
   - Add `analytics.ga4MeasurementId` in `data/site.json`. If serving EU/UK users with GA4 cookies enabled, configure Google Consent Mode v2 before enabling.

## 3. Event Schema (Object-Action Convention)

Implemented in `src/scripts/main.js` (`window.devAffanTrack`):

| Event Name | Trigger | Properties |
|---|---|---|
| `game_page_viewed` | Visitor loads `/games/<slug>/` | `game_slug`, `game_status`, active UTM parameters |
| `store_cta_clicked` | Visitor clicks an active Google Play CTA | `game_slug`, `cta_location`, `destination_store` (`google_play`), active UTM parameters |

**Never treat `store_cta_clicked` as a verified install.**

## 4. UTM Parameter Hygiene & Play Store Referrer Pass-Through

Use lowercase, hyphenated UTM parameters on external social/video links only (never on internal site links):

| Channel | Example Landing URL |
|---|---|
| TikTok Bio / Video | `/games/color-ball-drop/?utm_source=tiktok&utm_medium=organic-social&utm_campaign=launch&utm_content=gameplay-clip-1` |
| YouTube Shorts | `/games/color-ball-drop/?utm_source=youtube&utm_medium=organic-social&utm_campaign=launch&utm_content=short-1` |
| Instagram Reels | `/games/color-ball-drop/?utm_source=instagram&utm_medium=organic-social&utm_campaign=launch&utm_content=reel-1` |

When a visitor lands with UTM parameters, `src/scripts/main.js`:
1. Saves `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` in `sessionStorage` (cookieless, cleared when the tab closes).
2. Automatically appends `&referrer=utm_source%3D...` to outbound `play.google.com` links so **Google Play Console** receives campaign attribution.

## 5. Measuring Confirmed Installs in Google Play Console

Use **Google Play Console** as the single source of truth for real players:
- **Grow → Store performance → Store analysis:** Track store listing visitors, acquisitions, and store listing conversion rate.
- **Grow → Store performance → Acquisition reports:** Filter by **UTM campaign / source** passed through the website's `referrer` parameter.
- **Quality → Android vitals & Statistics:** Monitor Day 1 / Day 7 retention, crash rate, and ANRs for Godot Android builds.

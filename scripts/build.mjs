import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function fileVersionHash(filePath) {
  if (!fs.existsSync(filePath)) return "1";
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
}

function getVideoMimeType(url = "") {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".ogg") || clean.endsWith(".ogv")) return "video/ogg";
  return "video/mp4";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeBaseUrl(url = "") {
  return url.trim().replace(/\/+$/, "");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/\band\(/g, "and (")
    .trim();
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/* ==========================================================================
   Original Studio & Puzzle SVG Icons (2px stroke, aria-hidden="true")
   ========================================================================== */
const ICONS = {
  brand: `<svg class="brand-emblem" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#132B4F"/>
    <rect x="2" y="2" width="60" height="60" rx="14" stroke="#36D5F4" stroke-opacity="0.55" stroke-width="2.5"/>
    <circle cx="22" cy="24" r="7" fill="#FF6276"/>
    <circle cx="42" cy="24" r="7" fill="#36D5F4"/>
    <circle cx="32" cy="43" r="8" fill="#FFC83D"/>
    <path d="M12 34L52 20" stroke="#72E7CD" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3.87v16.26a1 1 0 0 0 1.5.86l14.07-8.13a1 1 0 0 0 0-1.72L6.5 3.01A1 1 0 0 0 5 3.87Z"/></svg>`,
  arrowRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 5 7 7-7 7"/></svg>`,
  chevronLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  chevronRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  levels: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  physics: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M4 20 20 4"/></svg>`,
  daily: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  trails: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17c4-8 10-12 18-12"/><path d="M7 20c3-5 8-8 14-8"/></svg>`,
  accessibility: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
  offline: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  shield: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>`,
  external: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

function renderGameArtwork(game, { loading = "lazy", priority = false } = {}) {
  const realImage = game.media?.heroImage;
  const conceptImage = game.media?.conceptCover;
  const conceptSmall = game.media?.conceptCoverSmall || "";
  const fetchAttr = priority ? ' fetchpriority="high"' : "";

  if (realImage) {
    return `<img src="${escapeHtml(realImage)}" alt="${escapeHtml(game.media.heroImageAlt || game.title)}" width="1280" height="720" loading="${loading}"${fetchAttr}>`;
  }

  if (conceptImage) {
    const srcset = conceptSmall
      ? ` srcset="${escapeHtml(conceptSmall)} 768w, ${escapeHtml(conceptImage)} 1280w" sizes="(max-width: 760px) 100vw, 55vw"`
      : "";
    return `<img src="${escapeHtml(conceptImage)}"${srcset} alt="${escapeHtml(game.media?.conceptCoverAlt || `${game.title} promotional illustration`)}" width="1280" height="720" loading="${loading}"${fetchAttr}>
      <span class="art-caption-badge">Promotional Illustration</span>`;
  }

  return "";
}


function renderStoreCta(game, location, variant = "primary") {
  const isReleased = game.status === "released" && Boolean(game.googlePlayUrl);
  if (isReleased) {
    return `<a class="btn btn--${variant}" href="${escapeHtml(game.googlePlayUrl)}" target="_blank" rel="noopener noreferrer" data-store-cta="google-play" data-game-slug="${escapeHtml(game.slug)}" data-cta-location="${escapeHtml(location)}">
      ${ICONS.play}
      <span>Get on Google Play</span>
    </a>`;
  }

  return "";
}

function renderStatusPill(game, extraClass = "") {
  const cls = [
    "status-pill",
    game.status === "released" ? "status-pill--released" : "",
    game.status === "planned" ? "status-pill--planned" : "",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");
  const label =
    game.statusLabel ||
    (game.status === "released"
      ? "Available on Google Play"
      : game.status === "planned"
        ? "Future Project"
        : "Coming Soon on Google Play");
  return `<span class="${cls}"><span class="status-dot" aria-hidden="true"></span>${escapeHtml(label)}</span>`;
}

function renderFeatureIcon(iconName, idx) {
  const palette = ["", "pillar-icon--gold", "pillar-icon--coral", "pillar-icon--mint"];
  const cls = palette[idx % palette.length];
  const svg = ICONS[iconName] || ICONS.physics;
  return `<div class="pillar-icon${cls ? ` ${cls}` : ""}">${svg}</div>`;
}

function renderScreenshotReel(screenshots, { layout = "four", label = "Gameplay screenshots" } = {}) {
  if (!Array.isArray(screenshots) || screenshots.length === 0) return "";
  const trackMod = layout === "six" ? "shot-reel__track--six" : "shot-reel__track--four";
  return `<div class="shot-reel" data-reel>
      <div class="shot-reel__track ${trackMod}" data-reel-track tabindex="0" role="region" aria-label="${escapeHtml(label)}">
        ${screenshots
          .map(
            (shot) => `<figure class="shot-reel__item" data-reel-item>
          <div class="phone-shot__frame">
            <img src="${escapeHtml(shot.src)}" alt="${escapeHtml(shot.alt)}" width="540" height="960" loading="lazy">
          </div>
          <figcaption>${escapeHtml(shot.caption || shot.alt)}</figcaption>
        </figure>`
          )
          .join("\n        ")}
      </div>
    </div>`;
}

function renderReelButtons(labelPrefix = "gameplay screenshots") {
  return `<div class="reel-controls" data-reel-controls>
      <button type="button" class="reel-btn" data-reel-prev aria-label="Scroll ${escapeHtml(labelPrefix)} left">
        ${ICONS.chevronLeft}
      </button>
      <button type="button" class="reel-btn" data-reel-next aria-label="Scroll ${escapeHtml(labelPrefix)} right">
        ${ICONS.chevronRight}
      </button>
    </div>`;
}

/* ==========================================================================
   Shared Layout Shell
   ========================================================================== */
function renderAnalyticsHead(site) {
  const snippets = [];

  if (site.analytics?.cloudflareWebAnalyticsToken) {
    snippets.push(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${escapeHtml(site.analytics.cloudflareWebAnalyticsToken)}"}'></script>`
    );
  }

  if (site.analytics?.ga4MeasurementId) {
    const id = escapeHtml(site.analytics.ga4MeasurementId);
    snippets.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}', { anonymize_ip: true });
</script>`);
  }

  return snippets.join("\n  ");
}

function renderLayout({
  site,
  games,
  assetVersions = {},
  title,
  description,
  currentPath,
  bodyAttrs = "",
  jsonLd = null,
  ogType = "website",
  ogImage = "/assets/og-studio.png",
  noIndex = false,
  content,
}) {
  const baseUrl = normalizeBaseUrl(site.siteUrl);
  const canonicalUrl = baseUrl && !noIndex ? `${baseUrl}${currentPath}` : "";
  const resolvedOgImage = baseUrl ? `${baseUrl}${ogImage}` : ogImage;
  const tokensQuery = assetVersions.tokensCss ? `?v=${assetVersions.tokensCss}` : "";
  const mainCssQuery = assetVersions.mainCss ? `?v=${assetVersions.mainCss}` : "";
  const mainJsQuery = assetVersions.mainJs ? `?v=${assetVersions.mainJs}` : "";

  const activeGame = games.find((g) => g.featured) || games[0];
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/games/", label: "Games" },
    { href: "/about/", label: "About" },
    { href: "/contact/", label: "Contact" },
  ];

  const navLinksHtml = navItems
    .map((item) => {
      const isCurrent =
        item.href === "/"
          ? currentPath === "/"
          : currentPath === item.href || currentPath.startsWith(item.href);
      return `<li><a href="${item.href}"${isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a></li>`;
    })
    .join("\n          ");

  const configuredSocials = Object.entries(site.social || {}).filter(([, url]) => Boolean(url));
  const socialFooterHtml = configuredSocials
    .map(
      ([network, url]) =>
        `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(network.charAt(0).toUpperCase() + network.slice(1))}</a></li>`
    )
    .join("\n            ");

  const structuredDataScript = jsonLd
    ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>`
    : "";

  const analyticsHead = renderAnalyticsHead(site);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${currentPath === "/" ? '<meta name="google-site-verification" content="F1lUHnX-s_2v30R6uaZiPNhur1ECMNuHlu9cmbPwGQ0" />' : ""}
  ${noIndex ? '<meta name="robots" content="noindex, follow">' : ""}
  ${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">` : ""}
  <meta name="theme-color" content="#070e20">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">

  <meta property="og:site_name" content="${escapeHtml(site.studioName)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${canonicalUrl ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">` : ""}
  <meta property="og:image" content="${escapeHtml(resolvedOgImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(resolvedOgImage)}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@500;600;700;800&display=swap"></noscript>
  ${currentPath === "/" ? '<link rel="preload" as="image" href="/assets/art/color-ball-drop-hero-stage-540.webp" imagesrcset="/assets/art/color-ball-drop-hero-stage-540.webp 485w, /assets/art/color-ball-drop-hero-stage.webp 808w" imagesizes="(max-width: 767px) 242px, (max-width: 959px) 377px, 449px" fetchpriority="high">' : ""}

  <link rel="stylesheet" href="/styles/tokens.css${tokensQuery}">
  <link rel="stylesheet" href="/styles/main.css${mainCssQuery}">
  ${structuredDataScript}
  ${analyticsHead}
</head>
<body${bodyAttrs ? ` ${bodyAttrs}` : ""}>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <header class="site-header">
    <div class="container nav-bar">
      <a class="brand-mark" href="/" aria-label="${escapeHtml(site.studioName)} home">
        ${ICONS.brand}
        <span>${escapeHtml(site.studioName)}</span>
      </a>

      <nav aria-label="Primary navigation">
        <ul class="nav-links">
          ${navLinksHtml}
        </ul>
      </nav>

      <button
        type="button"
        class="nav-toggle"
        data-nav-toggle
        aria-expanded="false"
        aria-controls="mobile-nav"
        aria-label="Toggle navigation menu"
      >
        ${ICONS.menu}
      </button>
    </div>
  </header>

  <nav id="mobile-nav" class="mobile-nav" aria-label="Mobile navigation" hidden>
    <div class="container">
      <ul>
        ${navLinksHtml}
        <li><a href="/privacy/"${currentPath.startsWith("/privacy") ? ' aria-current="page"' : ""}>Privacy Policies</a></li>
      </ul>
    </div>
  </nav>

  <main id="main-content">
    ${content}
  </main>

  <footer class="site-footer surface--sapphire">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <a class="brand-mark" href="/">
            ${ICONS.brand}
            <span>${escapeHtml(site.studioName)}</span>
          </a>
          <p class="footer-tagline">${escapeHtml(site.tagline)}</p>
        </div>

        <div class="footer-col">
          <p class="footer-heading">Games</p>
          <ul class="footer-links">
            <li><a href="/games/${escapeHtml(activeGame.slug)}/">${escapeHtml(activeGame.title)}</a></li>
            <li><a href="/games/">All Games &amp; Roadmap</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <p class="footer-heading">Privacy</p>
          <ul class="footer-links">
            <li><a href="/privacy/${escapeHtml(activeGame.slug)}/">${escapeHtml(activeGame.shortTitle || activeGame.title)} Privacy Policy</a></li>
            <li><a href="/privacy/">Studio &amp; Game Policies</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <p class="footer-heading">Studio</p>
          <ul class="footer-links">
            <li><a href="/about/">About Studio</a></li>
            <li><a href="/contact/">Contact</a></li>
            ${socialFooterHtml}
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} ${escapeHtml(site.studioName)}. All rights reserved.</span>
        <span>Offline physics puzzle games built for Android &amp; Google Play.</span>
      </div>
    </div>
  </footer>

  <script src="/scripts/main.js${mainJsQuery}" defer></script>
</body>
</html>
`;
}

/* ==========================================================================
   Page Builders
   ========================================================================== */
function buildHomePage(site, games, assetVersions) {
  const featured = games.find((g) => g.featured) || games[0];
  const futureGames = games.filter((g) => g.slug !== featured.slug);
  const baseUrl = normalizeBaseUrl(site.siteUrl);
  const configuredSocials = Object.entries(site.social || {}).filter(([, url]) => Boolean(url));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.studioName,
    description: site.description,
    ...(baseUrl ? { url: `${baseUrl}/` } : {}),
    ...(configuredSocials.length > 0 ? { sameAs: configuredSocials.map(([, url]) => url) } : {}),
  };

  const homeShots = (featured.media?.screenshots || []).slice(0, 4);
  const mechanicsPreview = (featured.mechanics || [])
    .slice(0, 8)
    .map((m) => `<li>${escapeHtml(m)}</li>`)
    .join("\n            ");

  const storeButton = renderStoreCta(featured, "homepage-hero", "primary");
  const heroActionsHtml = storeButton
    ? `${storeButton}
          <a class="btn btn--secondary" href="/games/${escapeHtml(featured.slug)}/">
            <span>Explore ${escapeHtml(featured.shortTitle || featured.title)}</span>
            ${ICONS.arrowRight}
          </a>`
    : `<a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
            <span>Explore ${escapeHtml(featured.shortTitle || featured.title)}</span>
            ${ICONS.arrowRight}
          </a>
          <a class="btn btn--secondary" href="#gameplay-showcase">Watch Real Gameplay</a>`;

  const futureSection =
    futureGames.length > 0
      ? `<section class="section surface--sapphire">
      <div class="container">
        <div class="section-header">
          <h2>Next on the Studio Slate</h2>
          <p>Our full development focus is launching ${escapeHtml(featured.title)} first. Separate future projects sit on the roadmap below.</p>
        </div>

        ${futureGames
          .map(
            (fg) => `<div class="future-card future-card--row">
          <div>
            <div class="actions" style="margin-bottom: var(--space-3);">
              <h3>${escapeHtml(fg.title)}</h3>
              ${renderStatusPill(fg)}
            </div>
            <p>${escapeHtml(fg.shortPitch)}</p>
          </div>
          <a class="btn btn--secondary" href="/games/${escapeHtml(fg.slug)}/">
            <span>Project Status</span>
            ${ICONS.arrowRight}
          </a>
        </div>`
          )
          .join("\n        ")}

        <div class="cta-panel">
          <div>
            <h2>Explore ${escapeHtml(featured.title)}</h2>
            <p style="margin-top: var(--space-3);">Watch the full capture, browse all 5 chapters, and review game details ahead of Google Play release.</p>
          </div>
          <div class="actions">
            ${
              storeButton ||
              `<a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
              <span>Open Game Page</span>
              ${ICONS.arrowRight}
            </a>`
            }
            <a class="btn btn--light-on-dark" href="/games/">All Games</a>
          </div>
        </div>
      </div>
    </section>`
      : "";

  const content = `
    <section class="hero-stage surface--sapphire">
      <div class="container">
        <div class="hero-stage__grid">
          <div class="hero-stage__copy">
            <h1>Cut the Rope. <span class="hero-highlight">Drop the Balls.</span> Match Every Bucket.</h1>
            <p class="hero-lead">${escapeHtml(featured.title)} brings 100 offline physics puzzles to Android. Slice gold ropes, trigger wooden contraptions, and guide every ball home.</p>

            <div class="actions">
              ${heroActionsHtml}
            </div>

            <div class="hero-status-row">
              ${renderStatusPill(featured)}
              <span>100 Offline Levels &middot; 5 Chapters &middot; Portrait Play</span>
            </div>
          </div>

          <div class="hero-stage__art">
            <div class="hero-stage__media">
              <img
                src="/assets/art/color-ball-drop-hero-stage.webp"
                srcset="/assets/art/color-ball-drop-hero-stage-540.webp 485w, /assets/art/color-ball-drop-hero-stage.webp 808w"
                sizes="(max-width: 767px) 242px, (max-width: 959px) 377px, 449px"
                alt="Promotional 2.5D illustration for Color Ball Drop showing glossy red, blue, yellow, green, and steel balls suspended on wooden beams and gold ropes above matching glowing buckets"
                width="808"
                height="900"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              >
            </div>
            <span class="media-note">Promotional Artwork</span>
          </div>
        </div>
      </div>
    </section>

    <section id="gameplay-showcase" class="section surface--light">
      <div class="container">
        <div class="section-header">
          <h2>Watch ${escapeHtml(featured.shortTitle || featured.title)} in Motion</h2>
          <p>Real gameplay recorded directly from the Android Godot build, showing swipe cuts, chain reactions, and color matching.</p>
        </div>

        <div class="gameplay-stage">
          <div class="video-column">
            <div class="video-phone">
              <video controls playsinline preload="metadata" aria-label="Real ${escapeHtml(featured.shortTitle || featured.title)} Chapter 1 gameplay video" poster="${escapeHtml(featured.media.videoPoster)}">
                <source src="${escapeHtml(featured.media.videoUrl)}" type="${escapeHtml(getVideoMimeType(featured.media.videoUrl))}">
                Your browser does not support embedded gameplay video.
              </video>
            </div>
            <span class="media-note">Actual Android Build Capture</span>
          </div>

          <div class="gameplay-breakdown">
            <ol class="play-beats">
              <li class="play-beat">
                <span class="play-beat__num play-beat__num--gold" aria-hidden="true">1</span>
                <div class="play-beat__body">
                  <h3>Read the contraption before cutting</h3>
                  <p>Check rope tension, wooden supports, portal exits, and bucket order first. Distinct shape symbols on every ball and bucket keep colors unmistakable.</p>
                </div>
              </li>
              <li class="play-beat">
                <span class="play-beat__num play-beat__num--cobalt" aria-hidden="true">2</span>
                <div class="play-beat__body">
                  <h3>Time every swipe for clean cascades</h3>
                  <p>Slice gold ropes and wooden beams to bounce balls off bumper pins, tip seesaw bridges, pass through dye rings, and thread color filter gates.</p>
                </div>
              </li>
              <li class="play-beat">
                <span class="play-beat__num play-beat__num--mint" aria-hidden="true">3</span>
                <div class="play-beat__body">
                  <h3>Score 3 stars and unlock blade trails</h3>
                  <p>Clear puzzles within the cut limit to earn coins, keep daily challenge streaks alive, and unlock 8 swipe blade trails offline.</p>
                </div>
              </li>
            </ol>

            <dl class="proof-strip" aria-label="Game highlights">
              <div class="proof-stat">
                <dt>Offline Levels</dt>
                <dd>100</dd>
              </div>
              <div class="proof-stat">
                <dt>Chapters</dt>
                <dd>5</dd>
              </div>
              <div class="proof-stat">
                <dt>Contraptions</dt>
                <dd>12</dd>
              </div>
              <div class="proof-stat">
                <dt>Blade Trails</dt>
                <dd>8</dd>
              </div>
            </dl>

            <div class="actions">
              <a class="btn btn--secondary" href="/games/${escapeHtml(featured.slug)}/">
                <span>See All 5 Chapters &amp; Specs</span>
                ${ICONS.arrowRight}
              </a>
              <a class="text-action-link" href="#home-gallery">Browse Gameplay Screens</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="home-gallery" class="section surface--light-alt" data-reel>
      <div class="container">
        <div class="section-header section-header--split">
          <div>
            <h2>Screens from the Actual Game</h2>
            <p style="margin-top: var(--space-3);">Portrait captures straight from playable levels, chapter select, and blade trail unlocks.</p>
          </div>
          <div class="section-header__actions">
            ${renderReelButtons("Color Ball Drop screenshots")}
            <a class="text-action-link" href="/games/${escapeHtml(featured.slug)}/#screenshots">
              <span>See All 6 Captures</span>
              ${ICONS.arrowRight}
            </a>
          </div>
        </div>

        <div class="shot-reel__track shot-reel__track--four" data-reel-track tabindex="0" role="region" aria-label="Color Ball Drop gameplay screenshots">
          ${homeShots
            .map(
              (shot) => `<figure class="shot-reel__item" data-reel-item>
            <div class="phone-shot__frame">
              <img src="${escapeHtml(shot.src)}" alt="${escapeHtml(shot.alt)}" width="540" height="960" loading="lazy">
            </div>
            <figcaption>${escapeHtml(shot.caption || shot.alt)}</figcaption>
          </figure>`
            )
            .join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section surface--cobalt">
      <div class="container">
        <div class="studio-split">
          <div class="spotlight-copy">
            <h2>Twelve Contraptions, One Thumb</h2>
            <p>${escapeHtml(site.studioName)} builds focused Android physics games with tactile touch controls, crisp readability, and zero internet dependency for core levels.</p>
            <ul class="mechanics-chips" aria-label="Featured physics contraptions">
              ${mechanicsPreview}
            </ul>
            <div class="actions">
              <a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
                <span>Explore ${escapeHtml(featured.shortTitle || featured.title)}</span>
                ${ICONS.arrowRight}
              </a>
              <a class="btn btn--light-on-dark" href="/about/">About ${escapeHtml(site.studioName)}</a>
            </div>
          </div>

          <div class="spotlight-art">
            <img
              src="/assets/art/color-ball-drop-mechanics.webp"
              alt="${escapeHtml(featured.media.conceptMechanicsAlt)}"
              width="1280"
              height="720"
              loading="lazy"
            >
            <span class="art-caption-badge">Promotional Illustration</span>
          </div>
        </div>
      </div>
    </section>

    ${futureSection}
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `${site.studioName} | Indie Android Physics Puzzle Studio`,
    description: site.description,
    currentPath: "/",
    jsonLd,
    content,
  });
}

function buildGamesIndexPage(site, games, assetVersions) {
  const featured = games.find((g) => g.featured) || games[0];
  const releasedCount = games.filter((g) => g.status === "released").length;
  const comingSoonCount = games.filter((g) => g.status === "coming-soon").length;
  const plannedCount = games.filter((g) => g.status === "planned").length;

  const cardsHtml = games
    .map((game) => {
      const hasArt = Boolean(game.media?.heroImage || game.media?.conceptCover);
      if (!hasArt && game.status === "planned") {
        return `<article class="future-card future-card--row" data-game-status="${escapeHtml(game.status)}">
          <div>
            <div class="actions" style="margin-bottom: var(--space-3);">
              <h2>${escapeHtml(game.title)}</h2>
              ${renderStatusPill(game)}
            </div>
            <p>${escapeHtml(game.shortPitch)}</p>
          </div>
          <a class="btn btn--secondary" href="/games/${escapeHtml(game.slug)}/">
            <span>View Project Status</span>
            ${ICONS.arrowRight}
          </a>
        </article>`;
      }

      const storeButton = renderStoreCta(game, "catalog-card", "secondary");
      const secondaryAction =
        storeButton ||
        `<a class="btn btn--secondary" href="/games/${escapeHtml(game.slug)}/#gameplay-video">Watch Gameplay</a>`;

      return `<article class="game-card${game.featured ? " game-card--featured" : ""}" data-game-status="${escapeHtml(game.status)}">
          <div class="game-card__media">
            ${renderGameArtwork(game, { loading: "eager" })}
            ${renderStatusPill(game, "game-card__status")}
          </div>
          <div class="game-card__body">
            <div class="game-card__top">
              <h2>${escapeHtml(game.title)}</h2>
              <span class="game-card__genre">${escapeHtml(game.genre)}</span>
            </div>
            <p>${escapeHtml(game.shortPitch)}</p>
            <div class="actions">
              <a class="btn btn--primary" href="/games/${escapeHtml(game.slug)}/">
                <span>Discover ${escapeHtml(game.shortTitle || game.title)}</span>
                ${ICONS.arrowRight}
              </a>
              ${secondaryAction}
            </div>
          </div>
        </article>`;
    })
    .join("\n        ");

  const content = `
    <section class="section surface--sapphire section--compact">
      <div class="container">
        <div class="section-header" style="margin-bottom: 0;">
          <h1>Our Games</h1>
          <p>Android games by ${escapeHtml(site.studioName)}, led by <strong>${escapeHtml(featured.title)}</strong> alongside our separate future project slate.</p>
        </div>
      </div>
    </section>

    <section class="section surface--cobalt">
      <div class="container">
        <div class="filter-bar" role="group" aria-label="Filter games by release status">
          <button type="button" class="filter-btn" data-filter="all" aria-pressed="true">All Titles (${games.length})</button>
          <button type="button" class="filter-btn" data-filter="released" aria-pressed="false">Available Now (${releasedCount})</button>
          <button type="button" class="filter-btn" data-filter="coming-soon" aria-pressed="false">Coming Soon (${comingSoonCount})</button>
          <button type="button" class="filter-btn" data-filter="planned" aria-pressed="false">Future Projects (${plannedCount})</button>
        </div>

        <p id="catalog-status" class="catalog-status-note" aria-live="polite">
          Showing ${games.length} ${games.length === 1 ? "title" : "titles"}. ${escapeHtml(featured.shortTitle || featured.title)} is in active development for Android.
        </p>

        <div class="games-grid games-grid--featured-first">
          ${cardsHtml}
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `Our Games | ${site.studioName}`,
    description: `Explore Android mobile games by ${site.studioName}, led by Color Ball Drop: Rope Puzzle and upcoming future projects.`,
    currentPath: "/games/",
    content,
  });
}

function buildGameDetailPage(site, games, game, assetVersions) {
  const baseUrl = normalizeBaseUrl(site.siteUrl);
  const pagePath = `/games/${game.slug}/`;
  const featured = games.find((g) => g.featured) || games[0];
  const isPlanned = game.status === "planned";

  const jsonLd = !isPlanned
    ? {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: game.title,
        description: game.shortPitch,
        genre: game.genre,
        gamePlatform: "Android",
        operatingSystem: "Android",
        applicationCategory: "Game",
        author: {
          "@type": "Organization",
          name: site.studioName,
        },
        ...(baseUrl ? { url: `${baseUrl}${pagePath}` } : {}),
        ...(game.googlePlayUrl ? { downloadUrl: game.googlePlayUrl } : {}),
      }
    : null;

  if (isPlanned) {
    const plannedContent = `
      <section class="section surface--sapphire">
        <div class="container">
          <nav aria-label="Breadcrumb">
            <ol class="breadcrumb">
              <li><a href="/">Home</a></li>
              <li aria-hidden="true">/</li>
              <li><a href="/games/">Games</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">${escapeHtml(game.title)}</li>
            </ol>
          </nav>

          <div class="prose">
            <h1>${escapeHtml(game.title)}</h1>
            <div>${renderStatusPill(game)}</div>
            ${(game.longDescription || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n            ")}

            <div class="notice-box">
              <strong>Looking for Our Active Game?</strong>
              <p>Our current game in development for Android is <strong>${escapeHtml(featured.title)}</strong>, an offline 2D physics puzzle game with 100 levels and 5 chapters. ${escapeHtml(game.title)} is a separate future project not yet in production.</p>
            </div>

            <div class="actions" style="margin-top: var(--space-4);">
              <a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
                <span>Discover ${escapeHtml(featured.shortTitle || featured.title)}</span>
                ${ICONS.arrowRight}
              </a>
              <a class="btn btn--secondary" href="/games/">Back to Our Games</a>
              <a class="btn btn--light-on-dark" href="/privacy/${escapeHtml(game.slug)}/">
                ${ICONS.shield}
                <span>Reserved Privacy URL</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    `;

    return renderLayout({
      site,
      games,
      assetVersions,
      title: game.seo?.title || `${game.title} | ${site.studioName}`,
      description: game.seo?.description || game.shortPitch,
      currentPath: pagePath,
      bodyAttrs: `data-game-slug="${escapeHtml(game.slug)}" data-game-status="${escapeHtml(game.status)}"`,
      content: plannedContent,
    });
  }

  const screenshots = Array.isArray(game.media?.screenshots) ? game.media.screenshots : [];
  const chapters = Array.isArray(game.chapters) ? game.chapters : [];
  const mechanics = Array.isArray(game.mechanics) ? game.mechanics : [];
  const features = Array.isArray(game.features) ? game.features : [];

  const storeButton = renderStoreCta(game, "game-hero", "primary");
  const heroPrimaryAction =
    storeButton ||
    `<a class="btn btn--primary" href="#gameplay-video">
      ${ICONS.play}
      <span>Watch Real Gameplay</span>
    </a>`;

  const videoSection = game.media?.videoUrl
    ? `<section id="gameplay-video" class="section surface--light">
      <div class="container">
        <div class="gameplay-stage">
          <div class="video-column">
            <div class="video-phone">
              <video controls playsinline preload="metadata" aria-label="Real ${escapeHtml(game.shortTitle || game.title)} gameplay video"${game.media.videoPoster ? ` poster="${escapeHtml(game.media.videoPoster)}"` : ""}>
                <source src="${escapeHtml(game.media.videoUrl)}" type="${escapeHtml(getVideoMimeType(game.media.videoUrl))}">
                Your browser does not support embedded gameplay video.
              </video>
            </div>
            <span class="media-note">Actual Android Build Capture</span>
          </div>

          <div class="spotlight-copy">
            <h2>Watch Real Gameplay</h2>
            <div class="prose">
              ${(game.longDescription || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("\n              ")}
            </div>
            ${
              mechanics.length > 0
                ? `<ul class="mechanics-chips" aria-label="Gameplay mechanics">
              ${mechanics.map((m) => `<li>${escapeHtml(m)}</li>`).join("\n              ")}
            </ul>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>`
    : "";

  const screenshotsSection =
    screenshots.length > 0
      ? `<section id="screenshots" class="section surface--light-alt" data-reel>
      <div class="container">
        <div class="section-header section-header--split">
          <div>
            <h2>Authentic Gameplay Screenshots</h2>
            <p style="margin-top: var(--space-3);">Real portrait captures taken directly from ${escapeHtml(game.shortTitle || game.title)} showing levels, chapter select, 3-star wins, and blade trails.</p>
          </div>
          ${renderReelButtons("game screenshots")}
        </div>
        ${renderScreenshotReel(screenshots, { layout: screenshots.length >= 5 ? "six" : "four", label: `${game.shortTitle || game.title} screenshots` })}
      </div>
    </section>`
      : "";

  const chaptersAndHighlightsSection =
    chapters.length > 0 || features.length > 0
      ? `<section class="section surface--cobalt">
      <div class="container">
        ${
          chapters.length > 0
            ? `<div class="section-header">
          <h2>5 Chapters &middot; 100 Levels</h2>
          <p>Each chapter adds new physics contraptions and tighter multi-ball cascades.</p>
        </div>
        <ol class="chapter-track" aria-label="Five chapters">
          ${chapters
            .map(
              (ch) => `<li class="chapter-node">
            <span class="chapter-node__badge" aria-hidden="true">${ch.number}</span>
            <div class="chapter-node__meta">
              <span class="chapter-node__levels">${escapeHtml(ch.levels)}</span>
              <h3>${escapeHtml(ch.name)}</h3>
            </div>
          </li>`
            )
            .join("\n          ")}
        </ol>`
            : ""
        }

        ${
          features.length > 0
            ? `<div class="section-header" style="margin-top: var(--space-12);">
          <h2>Built Into Every Level</h2>
        </div>
        <ul class="highlight-rows">
          ${features
            .map(
              (feat, idx) => `<li class="highlight-row">
            ${renderFeatureIcon(feat.icon, idx)}
            <div>
              <h3>${escapeHtml(feat.title)}</h3>
              <p>${escapeHtml(feat.description)}</p>
            </div>
          </li>`
            )
            .join("\n          ")}
        </ul>`
            : ""
        }
      </div>
    </section>`
      : "";

  const content = `
    <section class="game-hero surface--sapphire">
      <div class="container">
        <nav aria-label="Breadcrumb">
          <ol class="breadcrumb">
            <li><a href="/">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/games/">Games</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">${escapeHtml(game.shortTitle || game.title)}</li>
          </ol>
        </nav>

        <div class="game-hero__grid">
          <div class="game-hero__copy">
            <h1>${escapeHtml(game.title)}</h1>
            <p class="hero-lead">${escapeHtml(game.shortPitch)}</p>

            <div class="actions">
              ${heroPrimaryAction}
              <a class="btn btn--light-on-dark" href="/privacy/${escapeHtml(game.slug)}/">
                ${ICONS.shield}
                <span>Privacy Policy</span>
              </a>
            </div>

            <div class="hero-status-row">
              ${renderStatusPill(game)}
              <span>${escapeHtml(game.releaseNote)}</span>
            </div>
          </div>

          <div class="game-hero__stage">
            ${renderGameArtwork(game, { loading: "eager", priority: true })}
          </div>
        </div>
      </div>
    </section>

    ${videoSection}
    ${screenshotsSection}
    ${chaptersAndHighlightsSection}

    <section class="section surface--sapphire">
      <div class="container">
        <div class="section-header">
          <h2>Game Information</h2>
        </div>
        <dl class="facts-grid">
          <div class="fact-pair">
            <dt>Studio</dt>
            <dd>${escapeHtml(site.studioName)}</dd>
          </div>
          <div class="fact-pair">
            <dt>Status</dt>
            <dd>${escapeHtml(game.statusLabel)}</dd>
          </div>
          <div class="fact-pair">
            <dt>Platform</dt>
            <dd>${escapeHtml(game.platform)}</dd>
          </div>
          <div class="fact-pair">
            <dt>Genre</dt>
            <dd>${escapeHtml(game.genre)}</dd>
          </div>
          <div class="fact-pair">
            <dt>Play Mode</dt>
            <dd>Offline &middot; Portrait</dd>
          </div>
          ${
            game.packageId
              ? `<div class="fact-pair">
            <dt>Android Package</dt>
            <dd class="is-package">${escapeHtml(game.packageId)}</dd>
          </div>`
              : ""
          }
        </dl>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: game.seo?.title || `${game.title} | ${site.studioName}`,
    description: game.seo?.description || game.shortPitch,
    currentPath: pagePath,
    bodyAttrs: `data-game-slug="${escapeHtml(game.slug)}" data-game-status="${escapeHtml(game.status)}"`,
    ogImage: game.media?.heroImage || "/assets/og-studio.png",
    jsonLd,
    content,
  });
}

function buildAboutPage(site, games, assetVersions) {
  const featured = games.find((g) => g.featured) || games[0];
  const content = `
    <section class="section surface--sapphire">
      <div class="container">
        <div class="studio-split">
          <div class="prose">
            <h1>About ${escapeHtml(site.studioName)}</h1>
            <p>${escapeHtml(site.studioName)} is an independent mobile game studio crafting tactile offline puzzle games for Android and Google Play.</p>
            <p>Our active project is <a href="/games/${escapeHtml(featured.slug)}/">${escapeHtml(featured.title)}</a>, an offline 2D physics puzzle game with 100 levels, 5 chapters, colorblind shape symbols, and one-hand portrait touch controls.</p>

            <h2>How We Build Games</h2>
            <ul>
              <li><strong>Gameplay first:</strong> Crisp physics reactions and readable contraptions that feel great on mobile touchscreens.</li>
              <li><strong>Offline by default:</strong> Campaign progress and settings stay on your device so levels play anywhere.</li>
              <li><strong>Honest previews:</strong> Real Android gameplay captures separated clearly from promotional illustrations, paired with dedicated per-game privacy policies.</li>
            </ul>

            <div class="actions" style="margin-top: var(--space-4);">
              <a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
                <span>Explore ${escapeHtml(featured.shortTitle || featured.title)}</span>
                ${ICONS.arrowRight}
              </a>
              <a class="btn btn--light-on-dark" href="/contact/">Contact Studio</a>
            </div>
          </div>

          <div class="spotlight-art">
            <img
              src="/assets/art/color-ball-drop-hero.webp"
              alt="Dev Affan studio promotional illustration featuring glossy puzzle balls, gold ropes, and matching colored buckets"
              width="1600"
              height="900"
              loading="eager"
            >
            <span class="art-caption-badge">Promotional Illustration</span>
          </div>
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `About Studio | ${site.studioName}`,
    description: `Learn about ${site.studioName}, an independent mobile game studio building original Android physics puzzle games.`,
    currentPath: "/about/",
    content,
  });
}

function buildContactPage(site, games, assetVersions) {
  const featured = games.find((g) => g.featured) || games[0];
  const hasVerifiedEmail = Boolean(site.contact?.email && site.contact?.emailVerified);
  const configuredSocials = Object.entries(site.social || {}).filter(([, url]) => Boolean(url));

  const supportCardHtml = hasVerifiedEmail
    ? `<div class="contact-panel">
        <h2>Player Support &amp; Inquiries</h2>
        <p>For help with ${escapeHtml(featured.title)}, bug reports, or privacy questions, email our studio directly:</p>
        <div class="actions">
          <a class="btn btn--primary" href="mailto:${escapeHtml(site.contact.email)}">
            <span>${escapeHtml(site.contact.email)}</span>
          </a>
        </div>
      </div>`
    : `<div class="contact-panel">
        <h2>Player Support Channel Launching Soon</h2>
        <p>We are finalizing a dedicated studio support email ahead of the Google Play release of <strong>${escapeHtml(featured.title)}</strong>. That address will appear right here before the game goes live.</p>
        <p>Once published, you can contact ${escapeHtml(site.studioName)} here for player support, bug reports, accessibility feedback, and privacy questions.</p>
      </div>`;

  const socialButtons =
    configuredSocials.length > 0
      ? `<div class="actions" style="margin-top: var(--space-3);">
          ${configuredSocials
            .map(
              ([network, url]) =>
                `<a class="btn btn--secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                  <span>${escapeHtml(network.charAt(0).toUpperCase() + network.slice(1))}</span>
                  ${ICONS.external}
                </a>`
            )
            .join("\n          ")}
        </div>`
      : "";

  const content = `
    <section class="section surface--sapphire section--compact">
      <div class="container">
        <div class="section-header" style="margin-bottom: 0;">
          <h1>Contact ${escapeHtml(site.studioName)}</h1>
          <p>Player support status, privacy links, and studio information for our Android games.</p>
        </div>
      </div>
    </section>

    <section class="section surface--cobalt">
      <div class="container">
        <div class="contact-layout">
          ${supportCardHtml}

          <div class="contact-panel">
            <h2>Helpful Links</h2>
            <ul class="contact-links-list">
              <li>
                <a href="/games/${escapeHtml(featured.slug)}/">Explore ${escapeHtml(featured.title)}</a>
                <p style="font-size: var(--text-sm);">Watch real gameplay and check release status.</p>
              </li>
              <li>
                <a href="/privacy/${escapeHtml(featured.slug)}/">${escapeHtml(featured.shortTitle || featured.title)} Privacy Policy</a>
                <p style="font-size: var(--text-sm);">Review local saves and pre-release SDK status.</p>
              </li>
              <li>
                <a href="/privacy/">Website Privacy Policy</a>
                <p style="font-size: var(--text-sm);">Learn how this static website operates.</p>
              </li>
            </ul>
            ${socialButtons}
          </div>
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `Contact | ${site.studioName}`,
    description: `Support status and privacy resources for ${site.studioName} Android games.`,
    currentPath: "/contact/",
    content,
  });
}

function buildWebsitePrivacyPage(site, games, assetVersions) {
  const gamePolicyLinks = games
    .map(
      (game) => `<tr>
            <td><strong>${escapeHtml(game.title)}</strong></td>
            <td><a href="/privacy/${escapeHtml(game.slug)}/"><code>/privacy/${escapeHtml(game.slug)}/</code></a></td>
            <td>${game.privacy?.requiresVerification ? "Pre-release draft" : "Published"}</td>
          </tr>`
    )
    .join("\n          ");

  const content = `
    <section class="section surface--sapphire section--compact">
      <div class="container">
        <div class="section-header" style="margin-bottom: 0;">
          <h1>Privacy Policies</h1>
          <p>Website privacy practices and dedicated Google Play privacy policy URLs for ${escapeHtml(site.studioName)} games.</p>
        </div>
      </div>
    </section>

    <section class="section surface--light">
      <div class="container">
        <div class="prose">
          <h2>Individual Game Privacy Policies</h2>
          <p>Each Android game maintains its own dedicated privacy policy page for Google Play:</p>
        </div>

        <div class="table-wrap" style="margin-top: var(--space-6); margin-bottom: var(--space-12);">
          <table>
            <thead>
              <tr>
                <th scope="col">Game</th>
                <th scope="col">Privacy Policy URL</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              ${gamePolicyLinks}
            </tbody>
          </table>
        </div>

        <div class="prose">
          <h2>Website Privacy Information</h2>
          <p><strong>Last Updated:</strong> ${escapeHtml(site.lastUpdated)}</p>
          <p>This website is a static informational site hosted on Cloudflare Pages. We do not require user accounts, logins, or payment information on this website.</p>
          <ul>
            <li><strong>Server &amp; Edge Logs:</strong> Cloudflare Pages may process standard technical request metadata (such as IP address and user agent) strictly for security, DDoS protection, and content delivery.</li>
            <li><strong>Campaign Attribution:</strong> If you arrive from a promotional link containing UTM parameters (such as <code>utm_source</code>), this site temporarily stores those non-personal campaign tags in your browser's <code>sessionStorage</code> so outbound Google Play links can attribute store visits. This data clears when your tab closes and uses no tracking cookies.</li>
            <li><strong>Analytics:</strong> ${site.analytics?.cloudflareWebAnalyticsToken || site.analytics?.ga4MeasurementId ? "Configured privacy-conscious analytics is active on this site to measure page visits and outbound store clicks." : "Optional third-party analytics scripts are currently disabled. If Cloudflare Web Analytics (cookieless) or GA4 is enabled later, this notice will reflect the active provider."}</li>
          </ul>

          <h2>Contact</h2>
          <p>For privacy questions regarding this website, please check our <a href="/contact/">Contact page</a>.</p>
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `Privacy Policies | ${site.studioName}`,
    description: `Website privacy policy and dedicated Google Play privacy policy URLs for ${site.studioName} games.`,
    currentPath: "/privacy/",
    content,
  });
}

function buildGamePrivacyPage(site, games, game, assetVersions) {
  const privacy = game.privacy || {};
  const sdks = Array.isArray(privacy.thirdPartySdks) ? privacy.thirdPartySdks : [];
  const hasVerifiedEmail = Boolean(site.contact?.email && site.contact?.emailVerified);

  const sdkRows = sdks
    .map(
      (sdk) => `<tr>
          <td><strong>${escapeHtml(sdk.name)}</strong></td>
          <td>${escapeHtml(sdk.purpose)}</td>
          <td><a href="${escapeHtml(sdk.policyUrl)}" target="_blank" rel="noopener noreferrer">Provider Policy</a></td>
          <td>${escapeHtml(sdk.status)}</td>
        </tr>`
    )
    .join("\n        ");

  const content = `
    <section class="section surface--sapphire section--compact">
      <div class="container">
        <nav aria-label="Breadcrumb">
          <ol class="breadcrumb">
            <li><a href="/">Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/privacy/">Privacy</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">${escapeHtml(game.shortTitle || game.title)}</li>
          </ol>
        </nav>

        <div class="section-header" style="margin-bottom: 0;">
          <h1>${escapeHtml(game.title)} Privacy Policy</h1>
          <p>Effective Date: ${escapeHtml(privacy.effectiveDate || site.lastUpdated)} &middot; Developer: ${escapeHtml(site.studioName)}${game.packageId ? ` &middot; Package: <code>${escapeHtml(game.packageId)}</code>` : ""}</p>
        </div>
      </div>
    </section>

    <section class="section surface--light">
      <div class="container">
        ${
          privacy.requiresVerification
            ? `<div class="notice-box" style="margin-bottom: var(--space-8); max-width: 860px;">
                <strong>Pre-Release Privacy Notice</strong>
                <p>This policy reflects the current development build of <strong>${escapeHtml(game.title)}</strong> and will undergo final verification against the signed release build, Google Play Data Safety declarations, and target audience settings before launch.</p>
              </div>`
            : ""
        }

        <div class="prose">
          <h2>1. Overview &amp; Local Saves</h2>
          <p>${escapeHtml(privacy.summary || `This Privacy Policy explains how ${site.studioName} handles information for ${game.title}.`)}</p>
          ${privacy.localSavesNote ? `<p>${escapeHtml(privacy.localSavesNote)}</p>` : ""}

          <h2>2. Advertising, Billing &amp; Analytics Status</h2>
          <ul>
            ${privacy.adsStatus ? `<li><strong>Advertising:</strong> ${escapeHtml(privacy.adsStatus)}</li>` : ""}
            ${privacy.billingStatus ? `<li><strong>In-App Purchases / Billing:</strong> ${escapeHtml(privacy.billingStatus)}</li>` : ""}
            ${privacy.analyticsStatus ? `<li><strong>Optional Analytics:</strong> ${escapeHtml(privacy.analyticsStatus)}</li>` : ""}
          </ul>
        </div>

        ${
          sdks.length > 0
            ? `<div class="table-wrap" style="margin-top: var(--space-6); margin-bottom: var(--space-10);">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Service / SDK</th>
                      <th scope="col">Current Build Status</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Release Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sdkRows}
                  </tbody>
                </table>
              </div>`
            : ""
        }

        <div class="prose">
          <h2>3. Children's Privacy</h2>
          <p>${escapeHtml(privacy.childrenAudienceNote || "Target age rating disclosures are finalized prior to publication.")}</p>

          <h2>4. Changes to This Policy</h2>
          <p>We will update this Privacy Policy before enabling any new third-party SDK, advertising, billing, or analytics service. The effective date above reflects the latest revision.</p>

          <h2>5. Contact</h2>
          ${
            hasVerifiedEmail
              ? `<p>If you have questions about this Privacy Policy, contact us at <a href="mailto:${escapeHtml(site.contact.email)}">${escapeHtml(site.contact.email)}</a>.</p>`
              : `<p>Our studio support email is being finalized ahead of Google Play launch and will be added here before release. See our <a href="/contact/">Contact page</a> for current studio information.</p>`
          }
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `${game.shortTitle || game.title} Privacy Policy | ${site.studioName}`,
    description: `Privacy policy and SDK status for ${game.title} on Android and Google Play by ${site.studioName}.`,
    currentPath: `/privacy/${game.slug}/`,
    content,
  });
}

function build404Page(site, games, assetVersions) {
  const featured = games.find((g) => g.featured) || games[0];
  const content = `
    <section class="section surface--sapphire">
      <div class="container">
        <div class="prose">
          <h1>Page Not Found</h1>
          <p>That link missed the bucket. Head back to our games catalog or explore ${escapeHtml(featured.title)}.</p>
          <div class="actions" style="margin-top: var(--space-4);">
            <a class="btn btn--primary" href="/games/${escapeHtml(featured.slug)}/">
              <span>Explore ${escapeHtml(featured.shortTitle || featured.title)}</span>
              ${ICONS.arrowRight}
            </a>
            <a class="btn btn--secondary" href="/games/">Browse Our Games</a>
          </div>
        </div>
      </div>
    </section>
  `;

  return renderLayout({
    site,
    games,
    assetVersions,
    title: `Page Not Found | ${site.studioName}`,
    description: `The requested page could not be found on ${site.studioName}.`,
    currentPath: "/404.html",
    noIndex: true,
    content,
  });
}

function buildSitemapXml(site, games) {
  const baseUrl = normalizeBaseUrl(site.siteUrl || site.siteUrlPlaceholder);
  const routes = [
    "/",
    "/games/",
    "/about/",
    "/contact/",
    "/privacy/",
    ...games.flatMap((g) => [`/games/${g.slug}/`, `/privacy/${g.slug}/`]),
  ];

  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${escapeHtml(`${baseUrl}${route}`)}</loc>
    <lastmod>${escapeHtml(site.lastUpdated)}</lastmod>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobotsTxt(site) {
  const baseUrl = normalizeBaseUrl(site.siteUrl || site.siteUrlPlaceholder);
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
}

function buildCloudflareHeaders() {
  return `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/styles/*
  Cache-Control: public, max-age=31536000, immutable

/scripts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`;
}

function writeOutput(outDir, relPath, content) {
  const fullPath = path.join(outDir, relPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, "utf8");
}

export function buildSite({
  sitePath = path.join(ROOT_DIR, "data", "site.json"),
  gamesPath = path.join(ROOT_DIR, "data", "games.json"),
  srcDir = path.join(ROOT_DIR, "src"),
  outDir = path.join(ROOT_DIR, "dist"),
} = {}) {
  const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
  const games = JSON.parse(fs.readFileSync(gamesPath, "utf8"));

  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("data/games.json must contain at least one game entry.");
  }

  const seenSlugs = new Set();
  for (const game of games) {
    if (!game.slug || !/^[a-z0-9-]+$/.test(game.slug)) {
      throw new Error(`Invalid game slug: "${game.slug}". Use lowercase letters, numbers, and hyphens.`);
    }
    if (seenSlugs.has(game.slug)) {
      throw new Error(`Duplicate game slug: "${game.slug}". Each game must have a unique slug.`);
    }
    seenSlugs.add(game.slug);
  }

  const assetVersions = {
    tokensCss: fileVersionHash(path.join(srcDir, "styles", "tokens.css")),
    mainCss: fileVersionHash(path.join(srcDir, "styles", "main.css")),
    mainJs: fileVersionHash(path.join(srcDir, "scripts", "main.js")),
  };

  fs.rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  copyDir(path.join(srcDir, "styles"), path.join(outDir, "styles"));
  for (const cssFile of ["tokens.css", "main.css"]) {
    const destCss = path.join(outDir, "styles", cssFile);
    if (fs.existsSync(destCss)) {
      fs.writeFileSync(destCss, minifyCss(fs.readFileSync(destCss, "utf8")), "utf8");
    }
  }
  copyDir(path.join(srcDir, "scripts"), path.join(outDir, "scripts"));
  copyDir(path.join(srcDir, "assets"), path.join(outDir, "assets"));

  writeOutput(outDir, "index.html", buildHomePage(site, games, assetVersions));
  writeOutput(outDir, "games/index.html", buildGamesIndexPage(site, games, assetVersions));
  writeOutput(outDir, "about/index.html", buildAboutPage(site, games, assetVersions));
  writeOutput(outDir, "contact/index.html", buildContactPage(site, games, assetVersions));
  writeOutput(outDir, "privacy/index.html", buildWebsitePrivacyPage(site, games, assetVersions));
  writeOutput(outDir, "404.html", build404Page(site, games, assetVersions));

  for (const game of games) {
    writeOutput(outDir, `games/${game.slug}/index.html`, buildGameDetailPage(site, games, game, assetVersions));
    writeOutput(outDir, `privacy/${game.slug}/index.html`, buildGamePrivacyPage(site, games, game, assetVersions));
  }

  writeOutput(outDir, "sitemap.xml", buildSitemapXml(site, games));
  writeOutput(outDir, "robots.txt", buildRobotsTxt(site));
  writeOutput(outDir, "_headers", buildCloudflareHeaders());

  return {
    outDir,
    gameCount: games.length,
    routesGenerated: 6 + games.length * 2,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = buildSite();
  console.log(
    `Built Dev Affan Studio website -> ${result.outDir} (${result.routesGenerated} HTML pages, ${result.gameCount} game catalog ${result.gameCount === 1 ? "entry" : "entries"})`
  );
}

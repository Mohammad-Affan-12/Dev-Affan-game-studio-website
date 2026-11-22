/**
 * Dev Affan Studio — Lightweight Client Runtime
 * - Accessible mobile navigation drawer
 * - Progressive game catalog filter
 * - Accessible horizontal scroll-snap screenshot reel controls
 * - Cookieless UTM capture & Google Play referrer pass-through
 * - Standardized Object-Action event tracking (GA4-ready when configured)
 */

(function () {
  "use strict";

  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const UTM_STORAGE_KEY = "dev_affan_campaign_utms";

  /**
   * Capture incoming campaign UTM parameters into sessionStorage (cookieless).
   */
  function captureCampaignParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const found = {};
      let hasAny = false;

      for (const key of UTM_KEYS) {
        const value = params.get(key);
        if (value && value.trim()) {
          found[key] = value.trim().toLowerCase().slice(0, 100);
          hasAny = true;
        }
      }

      if (hasAny) {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found));
      }
    } catch {
      // Ignore storage restrictions in private browsing modes.
    }
  }

  function getStoredCampaignParams() {
    try {
      const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Append campaign attribution to Google Play Store URLs via `referrer`
   * so Google Play Console can attribute real installs by channel.
   */
  function decorateGooglePlayLinks() {
    const utms = getStoredCampaignParams();
    const utmKeysPresent = Object.keys(utms);
    if (utmKeysPresent.length === 0) return;

    const referrerParts = utmKeysPresent.map(
      (k) => `${encodeURIComponent(k)}=${encodeURIComponent(utms[k])}`
    );
    const referrerValue = referrerParts.join("&");

    document.querySelectorAll('a[data-store-cta="google-play"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.includes("play.google.com")) return;
      try {
        const url = new URL(href);
        if (!url.searchParams.has("referrer")) {
          url.searchParams.set("referrer", referrerValue);
          link.setAttribute("href", url.toString());
        }
      } catch {
        // Leave malformed URLs untouched.
      }
    });
  }

  /**
   * Standardized Object-Action event helper.
   * Forwards to GA4 (`window.gtag`) only when configured; never fakes installs.
   */
  function trackEvent(eventName, payload) {
    const utms = getStoredCampaignParams();
    const data = Object.assign({}, utms, payload || {});

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, data);
    }
  }

  window.devAffanTrack = trackEvent;

  /**
   * Accessible Mobile Navigation Drawer
   */
  function initMobileNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const drawer = document.getElementById("mobile-nav");
    if (!toggle || !drawer) return;

    function setOpen(isOpen) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      drawer.hidden = !isOpen;
    }

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      setOpen(!expanded);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    const desktopMedia = window.matchMedia("(min-width: 820px)");
    const handleViewportChange = (e) => {
      if (e.matches) {
        setOpen(false);
      }
    };
    if (typeof desktopMedia.addEventListener === "function") {
      desktopMedia.addEventListener("change", handleViewportChange);
    }
  }

  /**
   * Progressive Catalog Filter on /games/
   */
  function initCatalogFilter() {
    const filterButtons = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll(".games-grid [data-game-status]");
    const pipelineCards = document.querySelectorAll("[data-pipeline-card]");
    const statusLive = document.getElementById("catalog-status");
    if (filterButtons.length === 0 || cards.length === 0) return;

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.getAttribute("data-filter");
        filterButtons.forEach((btn) =>
          btn.setAttribute("aria-pressed", String(btn === button))
        );

        let visibleCount = 0;
        cards.forEach((card) => {
          const status = card.getAttribute("data-game-status");
          const show = selected === "all" || status === selected;
          card.hidden = !show;
          if (show) visibleCount += 1;
        });

        pipelineCards.forEach((card) => {
          card.hidden = selected === "released";
        });

        if (statusLive) {
          statusLive.textContent =
            visibleCount === 0
              ? "No titles currently match this filter."
              : `Showing ${visibleCount} ${visibleCount === 1 ? "title" : "titles"}.`;
        }
      });
    });
  }

  /**
   * Accessible Horizontal Scroll-Snap Screenshot Reel Controls
   */
  function initScreenshotReels() {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    document.querySelectorAll("[data-reel]").forEach((reel) => {
      const track = reel.querySelector("[data-reel-track]");
      const controls = reel.querySelector("[data-reel-controls]");
      const prevBtn = reel.querySelector("[data-reel-prev]");
      const nextBtn = reel.querySelector("[data-reel-next]");
      if (!track || !prevBtn || !nextBtn) return;

      function getStepWidth() {
        const firstItem = track.querySelector("[data-reel-item]");
        if (!firstItem) return Math.round(track.clientWidth * 0.78);
        const styles = window.getComputedStyle(track);
        const gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
        return Math.round(firstItem.getBoundingClientRect().width + gap);
      }

      function syncButtons() {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        const hasOverflow = maxScroll > 4;
        if (controls) {
          controls.hidden = !hasOverflow;
        }
        prevBtn.disabled = !hasOverflow || track.scrollLeft <= 2;
        nextBtn.disabled = !hasOverflow || track.scrollLeft >= maxScroll - 2;
      }

      function scrollByDirection(direction) {
        const behavior = reducedMotionQuery.matches ? "auto" : "smooth";
        track.scrollBy({
          left: direction * getStepWidth(),
          behavior,
        });
      }

      prevBtn.addEventListener("click", () => scrollByDirection(-1));
      nextBtn.addEventListener("click", () => scrollByDirection(1));
      track.addEventListener("scroll", syncButtons, { passive: true });
      window.addEventListener("resize", syncButtons, { passive: true });

      syncButtons();
    });
  }

  /**
   * Track outbound Google Play CTA clicks and game page views.
   */
  function initAnalyticsListeners() {
    const gameSlug = document.body.getAttribute("data-game-slug");
    if (gameSlug) {
      trackEvent("game_page_viewed", {
        game_slug: gameSlug,
        game_status: document.body.getAttribute("data-game-status") || "unknown",
      });
    }

    document.querySelectorAll('a[data-store-cta="google-play"]').forEach((link) => {
      link.addEventListener("click", () => {
        trackEvent("store_cta_clicked", {
          game_slug: link.getAttribute("data-game-slug") || "unknown",
          cta_location: link.getAttribute("data-cta-location") || "unknown",
          destination_store: "google_play",
        });
      });
    });
  }

  captureCampaignParams();
  decorateGooglePlayLinks();
  initMobileNav();
  initCatalogFilter();
  initScreenshotReels();
  initAnalyticsListeners();
})();

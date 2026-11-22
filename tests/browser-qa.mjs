import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "../scripts/build.mjs";
import { createStaticServer } from "../scripts/dev-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function connectCdp(chromeExe) {
  const debugPort = 9240 + Math.floor(Math.random() * 40);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-affan-chrome-"));
  const proc = spawn(
    chromeExe,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${debugPort}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let wsUrl = null;
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!wsUrl) {
    proc.kill();
    throw new Error("Headless browser CDP endpoint did not start in time.");
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const consoleErrors = [];
  const pageErrors = [];

  ws.addEventListener("message", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    } else if (data.method === "Runtime.exceptionThrown") {
      pageErrors.push(data.params.exceptionDetails.text || "Uncaught exception");
    } else if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
      consoleErrors.push(
        (data.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ")
      );
    }
  });

  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");

  async function goto(url) {
    const loaded = new Promise((resolve) => {
      const onMsg = (ev) => {
        const d = JSON.parse(ev.data);
        if (d.method === "Page.loadEventFired") {
          ws.removeEventListener("message", onMsg);
          resolve();
        }
      };
      ws.addEventListener("message", onMsg);
    });
    await send("Page.navigate", { url });
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 1500))]);
    await new Promise((r) => setTimeout(r, 80));
  }

  async function evaluate(expression) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "Evaluation exception");
    }
    return res.result?.value;
  }

  async function setViewport(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
  }

  async function close() {
    ws.close();
    proc.kill();
    await new Promise((r) => setTimeout(r, 200));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }

  return { send, goto, evaluate, setViewport, consoleErrors, pageErrors, close };
}

async function runBrowserQa() {
  const chromeExe = findBrowserExecutable();
  assert.ok(chromeExe, "No Chrome/Chromium/Edge executable found for browser QA.");

  const { outDir } = buildSite();
  const server = createStaticServer(outDir);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const browser = await connectCdp(chromeExe);
  const routes = [
    "/",
    "/games/",
    "/games/color-ball-drop/",
    "/games/cut-and-cascade/",
    "/about/",
    "/contact/",
    "/privacy/",
    "/privacy/color-ball-drop/",
    "/privacy/cut-and-cascade/",
    "/404.html",
  ];

  try {
    console.log("1. Checking responsive layout (zero overflow & loaded images) at 1440px, 1366px, 1024px, 768px, 430px, 390px, 360px...");
    for (const [label, w, h, mobile] of [
      ["desktop-1440", 1440, 900, false],
      ["laptop-1366", 1366, 768, false],
      ["laptop-1024", 1024, 768, false],
      ["tablet-768", 768, 1024, false],
      ["mobile-430", 430, 932, true],
      ["mobile-390", 390, 844, true],
      ["mobile-360", 360, 800, true],
    ]) {
      await browser.setViewport(w, h, mobile);
      for (const route of routes) {
        await browser.goto(`${base}${route}`);
        const check = await browser.evaluate(`(async () => {
          const imgs = [...document.querySelectorAll("img")];
          await Promise.all(
            imgs.map((img) => {
              img.loading = "eager";
              return img.complete
                ? Promise.resolve()
                : new Promise((res) => {
                    img.addEventListener("load", res, { once: true });
                    img.addEventListener("error", res, { once: true });
                  });
            })
          );
          return {
            scrollW: document.documentElement.scrollWidth,
            innerW: window.innerWidth,
            h1Count: document.querySelectorAll("h1").length,
            brokenImgs: imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute("src")),
            h1Left: Math.round(document.querySelector("h1")?.getBoundingClientRect().left ?? 0),
            brandLeft: Math.round(document.querySelector(".brand-mark")?.getBoundingClientRect().left ?? 0),
          };
        })()`);
        assert.ok(
          check.scrollW <= check.innerW,
          `Horizontal overflow on ${route} at ${label}: scrollWidth=${check.scrollW} > innerWidth=${check.innerW}`
        );
        assert.equal(check.h1Count, 1, `Expected 1 H1 on ${route}`);
        assert.deepEqual(check.brokenImgs, [], `Broken images on ${route} at ${label}: ${check.brokenImgs.join(", ")}`);
        if (route === "/" && w >= 880) {
          assert.ok(
            Math.abs(check.h1Left - check.brandLeft) <= 4,
            `Desktop hero H1 misaligned with container on ${route} at ${label}: h1Left=${check.h1Left}, brandLeft=${check.brandLeft}`
          );
        }
      }
    }

    console.log("2. Verifying prefers-reduced-motion...");
    await browser.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await browser.setViewport(1440, 900, false);
    await browser.goto(`${base}/`);
    const reducedDuration = await browser.evaluate(
      `getComputedStyle(document.querySelector(".btn--primary")).transitionDuration`
    );
    assert.ok(parseFloat(reducedDuration) <= 0.01, `Expected transitionDuration <= 0.01s, got ${reducedDuration}`);
    await browser.send("Emulation.setEmulatedMedia", { features: [] });

    console.log("3. Verifying catalog filter DOM visibility & title counts on /games/...");
    await browser.setViewport(1280, 900, false);
    await browser.goto(`${base}/games/`);
    const filterResult = await browser.evaluate(`(() => {
      const releasedBtn = document.querySelector('[data-filter="released"]');
      const devBtn = document.querySelector('[data-filter="coming-soon"]');
      const plannedBtn = document.querySelector('[data-filter="planned"]');
      const allBtn = document.querySelector('[data-filter="all"]');
      const status = document.getElementById("catalog-status");

      releasedBtn.click();
      const releasedState = {
        statusText: status.textContent.trim(),
        visibleCount: [...document.querySelectorAll(".games-grid [data-game-status]")].filter(
          (c) => getComputedStyle(c).display !== "none"
        ).length,
      };

      devBtn.click();
      const devState = {
        statusText: status.textContent.trim(),
        visibleCount: [...document.querySelectorAll(".games-grid [data-game-status]")].filter(
          (c) => getComputedStyle(c).display !== "none"
        ).length,
      };

      plannedBtn.click();
      const plannedState = {
        statusText: status.textContent.trim(),
        visibleCount: [...document.querySelectorAll(".games-grid [data-game-status]")].filter(
          (c) => getComputedStyle(c).display !== "none"
        ).length,
      };

      allBtn.click();
      const allState = { statusText: status.textContent.trim() };

      return { releasedState, devState, plannedState, allState };
    })()`);

    assert.equal(filterResult.releasedState.statusText, "No titles currently match this filter.");
    assert.equal(filterResult.releasedState.visibleCount, 0);
    assert.equal(filterResult.devState.statusText, "Showing 1 title.");
    assert.equal(filterResult.devState.visibleCount, 1);
    assert.equal(filterResult.plannedState.statusText, "Showing 1 title.");
    assert.equal(filterResult.plannedState.visibleCount, 1);
    assert.equal(filterResult.allState.statusText, "Showing 2 titles.");

    console.log("4. Verifying mobile navigation drawer (open, Escape focus restore, desktop resize auto-close)...");
    await browser.setViewport(390, 844, true);
    await browser.goto(`${base}/`);
    const navResult = await browser.evaluate(`(() => {
      const toggle = document.querySelector("[data-nav-toggle]");
      const drawer = document.getElementById("mobile-nav");
      const initialDisplay = getComputedStyle(drawer).display;

      toggle.click();
      const opened = {
        expanded: toggle.getAttribute("aria-expanded"),
        display: getComputedStyle(drawer).display,
        height: Math.round(drawer.getBoundingClientRect().height),
      };

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      const afterEsc = {
        expanded: toggle.getAttribute("aria-expanded"),
        display: getComputedStyle(drawer).display,
        focusRestored: document.activeElement === toggle,
      };

      toggle.click();
      return { initialDisplay, opened, afterEsc };
    })()`);

    assert.equal(navResult.initialDisplay, "none");
    assert.equal(navResult.opened.expanded, "true");
    assert.notEqual(navResult.opened.display, "none");
    assert.ok(navResult.opened.height > 100);
    assert.equal(navResult.afterEsc.expanded, "false");
    assert.equal(navResult.afterEsc.display, "none");
    assert.equal(navResult.afterEsc.focusRestored, true);

    await browser.setViewport(1280, 900, false);
    await new Promise((r) => setTimeout(r, 150));
    const afterResize = await browser.evaluate(`({
      display: getComputedStyle(document.getElementById("mobile-nav")).display,
      hidden: document.getElementById("mobile-nav").hidden,
      expanded: document.querySelector("[data-nav-toggle]").getAttribute("aria-expanded"),
    })`);
    assert.equal(afterResize.display, "none");
    assert.equal(afterResize.hidden, true);
    assert.equal(afterResize.expanded, "false");

    console.log("5. Verifying end-to-end UTM capture & Google Play referrer pass-through on released Color Ball Drop...");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-affan-utm-test-"));
    const siteEdgePath = path.join(tmpDir, "site.json");
    const gamesEdgePath = path.join(tmpDir, "games.json");
    const outEdgeDir = path.join(tmpDir, "dist");
    const baseSite = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "site.json"), "utf8"));
    const baseGames = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "games.json"), "utf8"));
    baseGames[0].status = "released";
    baseGames[0].googlePlayUrl = "https://play.google.com/store/apps/details?id=com.colorballdrop.ropepuzzle";
    fs.writeFileSync(siteEdgePath, JSON.stringify(baseSite));
    fs.writeFileSync(gamesEdgePath, JSON.stringify(baseGames));
    buildSite({ sitePath: siteEdgePath, gamesPath: gamesEdgePath, outDir: outEdgeDir });

    const edgeServer = createStaticServer(outEdgeDir);
    await new Promise((r) => edgeServer.listen(0, "127.0.0.1", r));
    const edgeBase = `http://127.0.0.1:${edgeServer.address().port}`;
    try {
      await browser.goto(
        `${edgeBase}/games/color-ball-drop/?utm_source=YouTube&utm_medium=shorts&utm_campaign=Launch`
      );
      const utmResult = await browser.evaluate(`(() => {
        const stored = JSON.parse(sessionStorage.getItem("dev_affan_campaign_utms") || "{}");
        const cta = document.querySelector('a[data-store-cta="google-play"]');
        const href = cta ? cta.getAttribute("href") : "";
        const events = [];
        window.gtag = (...args) => events.push(args);
        cta.addEventListener("click", (e) => e.preventDefault());
        cta.click();
        return { stored, href, events };
      })()`);

      assert.equal(utmResult.stored.utm_source, "youtube");
      assert.equal(utmResult.stored.utm_medium, "shorts");
      assert.ok(
        utmResult.href.includes("referrer=utm_source%3Dyoutube%26utm_medium%3Dshorts%26utm_campaign%3Dlaunch"),
        `Expected Google Play referrer param, got: ${utmResult.href}`
      );
      assert.equal(utmResult.events.length, 1);
      assert.equal(utmResult.events[0][1], "store_cta_clicked");
      assert.equal(utmResult.events[0][2].game_slug, "color-ball-drop");
    } finally {
      await new Promise((r) => edgeServer.close(r));
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    assert.deepEqual(browser.consoleErrors, [], `Console errors: ${browser.consoleErrors.join("; ")}`);
    assert.deepEqual(browser.pageErrors, [], `Page errors: ${browser.pageErrors.join("; ")}`);

    console.log("6. Verifying uncropped hero artwork across 1440x900, 1366x768, 768x1024, and 390x844...");
    for (const [label, w, h, mobile] of [
      ["desktop-1440", 1440, 900, false],
      ["laptop-1366", 1366, 768, false],
      ["tablet-768", 768, 1024, false],
      ["mobile-390", 390, 844, true],
    ]) {
      await browser.setViewport(w, h, mobile);
      await browser.goto(`${base}/`);
      const heroCheck = await browser.evaluate(`(async () => {
        const img = document.querySelector(".hero-stage__media img");
        if (!img) return { found: false };
        if (!img.complete) {
          await new Promise((res) => { img.onload = res; img.onerror = res; });
        }
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        const natRatio = img.naturalWidth / img.naturalHeight;
        const renRatio = rect.width / rect.height;
        return {
          found: true,
          naturalWidth: img.naturalWidth,
          objectFit: style.objectFit,
          left: rect.left,
          right: rect.right,
          innerW: window.innerWidth,
          ratioDiff: Math.abs(natRatio - renRatio) / natRatio,
          foldBottom: Math.round(rect.bottom),
        };
      })()`);
      assert.equal(heroCheck.found, true, `Hero stage artwork missing at ${label}`);
      assert.ok(heroCheck.naturalWidth > 0, `Hero stage artwork failed to load at ${label}`);
      assert.equal(heroCheck.objectFit, "contain", `Hero artwork must use object-fit: contain at ${label}`);
      assert.ok(
        heroCheck.left >= 0 && heroCheck.right <= heroCheck.innerW + 1,
        `Hero artwork clipped horizontally at ${label}: left=${heroCheck.left}, right=${heroCheck.right}, innerW=${heroCheck.innerW}`
      );
      assert.ok(
        heroCheck.ratioDiff < 0.03,
        `Hero artwork distorted/cropped at ${label}: ratioDiff=${heroCheck.ratioDiff}`
      );
    }

    console.log("7. Verifying horizontal scroll-snap gallery on 390x844 and 768x1024...");
    for (const [label, w, h, mobile] of [
      ["mobile-390", 390, 844, true],
      ["tablet-768", 768, 1024, false],
    ]) {
      await browser.setViewport(w, h, mobile);
      for (const route of ["/", "/games/color-ball-drop/"]) {
        await browser.goto(`${base}${route}`);
        const reelCheck = await browser.evaluate(`(() => {
          const track = document.querySelector("[data-reel-track]");
          const nextBtn = document.querySelector("[data-reel-next]");
          if (!track || !nextBtn) return { found: false };
          const style = getComputedStyle(track);
          const overflow = track.scrollWidth > track.clientWidth;
          nextBtn.click();
          return new Promise((res) => {
            setTimeout(() => {
              res({
                found: true,
                overflow,
                snap: style.scrollSnapType,
                scrollLeft: track.scrollLeft,
                controlsHidden: nextBtn.closest("[data-reel-controls]")?.hidden ?? false,
              });
            }, 350);
          });
        })()`);
        assert.equal(reelCheck.found, true, `Reel missing on ${route} at ${label}`);
        assert.equal(reelCheck.overflow, true, `Reel should overflow horizontally on ${route} at ${label}`);
        assert.match(reelCheck.snap, /x/i, `Reel missing x scroll-snap on ${route} at ${label}`);
        assert.equal(reelCheck.controlsHidden, false, `Reel buttons hidden on ${route} at ${label}`);
        assert.ok(reelCheck.scrollLeft > 0, `Clicking next reel button did not scroll on ${route} at ${label}`);
      }
    }

    console.log("8. Verifying WCAG AA computed contrast across Sapphire, Light, and Cobalt sections...");
    await browser.setViewport(1440, 900, false);
    for (const route of ["/", "/games/color-ball-drop/", "/contact/", "/privacy/color-ball-drop/"]) {
      await browser.goto(`${base}${route}`);
      const contrastFailures = await browser.evaluate(`(() => {
        function parseRgba(str) {
          const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/.exec(str);
          if (!m) return null;
          return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        }
        function composite(fg, bg) {
          const a = fg.a;
          return {
            r: Math.round(fg.r * a + bg.r * (1 - a)),
            g: Math.round(fg.g * a + bg.g * (1 - a)),
            b: Math.round(fg.b * a + bg.b * (1 - a)),
            a: 1,
          };
        }
        function getBg(el) {
          const layers = [];
          let cur = el;
          while (cur) {
            const c = parseRgba(getComputedStyle(cur).backgroundColor);
            if (c && c.a > 0) layers.push(c);
            if (c && c.a >= 0.99) break;
            cur = cur.parentElement;
          }
          let base = { r: 7, g: 14, b: 32, a: 1 };
          for (let i = layers.length - 1; i >= 0; i -= 1) {
            base = composite(layers[i], base);
          }
          return base;
        }
        function relLum(c) {
          const [r, g, b] = [c.r, c.g, c.b].map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        function ratio(c1, c2) {
          const l1 = relLum(c1);
          const l2 = relLum(c2);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }
        const failures = [];
        const targets = document.querySelectorAll("main h1, main h2, main h3, main p, main li, main a, main dt, main dd, main th, main td, footer p, footer a");
        for (const el of targets) {
          const st = getComputedStyle(el);
          if (st.display === "none" || st.visibility === "hidden" || !el.textContent.trim()) continue;
          const fgRaw = parseRgba(st.color);
          if (!fgRaw) continue;
          const bg = getBg(el);
          const fg = fgRaw.a < 1 ? composite(fgRaw, bg) : fgRaw;
          const cr = ratio(fg, bg);
          const fsPx = parseFloat(st.fontSize);
          const fw = parseInt(st.fontWeight, 10) || 400;
          const isLarge = fsPx >= 24 || (fsPx >= 18.66 && fw >= 700);
          const minRatio = isLarge ? 3.0 : 4.5;
          if (cr < minRatio) {
            failures.push({
              tag: el.tagName,
              text: el.textContent.trim().slice(0, 40),
              cr: Number(cr.toFixed(2)),
              minRatio,
              fg: st.color,
              bg: \`rgb(\${bg.r}, \${bg.g}, \${bg.b})\`,
            });
          }
        }
        return failures;
      })()`);
      assert.deepEqual(
        contrastFailures,
        [],
        `WCAG AA contrast failures on ${route}: ${JSON.stringify(contrastFailures)}`
      );
    }

    console.log("ALL REAL BROWSER QA CHECKS PASSED.");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

runBrowserQa().catch((err) => {
  console.error("BROWSER QA FAILED:", err);
  process.exit(1);
});

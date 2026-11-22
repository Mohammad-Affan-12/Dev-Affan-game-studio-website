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
    console.log("1. Checking responsive layout (zero overflow & loaded images) at 1440px, 1024px, 768px, 430px, 390px, 360px...");
    for (const [label, w, h, mobile] of [
      ["desktop-1440", 1440, 900, false],
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

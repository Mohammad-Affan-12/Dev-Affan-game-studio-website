import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "./build.mjs";
import { createStaticServer } from "./dev-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR =
  process.argv[2] ||
  path.resolve(__dirname, "..", "screenshots");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function run() {
  const chromeExe = findChrome();
  if (!chromeExe) throw new Error("Chrome/Edge not found.");

  const { outDir } = buildSite();
  const server = createStaticServer(outDir);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const debugPort = 9236;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-affan-shots-"));
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
  for (let i = 0; i < 40; i++) {
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
    throw new Error("Chrome CDP did not start.");
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");

  const targets = [
    { name: "home-desktop", route: "/", w: 1440, h: 900, mobile: false, full: true },
    { name: "home-mobile", route: "/", w: 390, h: 844, mobile: true, full: true },
    { name: "games-desktop", route: "/games/", w: 1440, h: 900, mobile: false, full: true },
    { name: "games-mobile", route: "/games/", w: 390, h: 844, mobile: true, full: true },
    { name: "color-ball-drop-desktop", route: "/games/color-ball-drop/", w: 1440, h: 900, mobile: false, full: true },
    { name: "color-ball-drop-mobile", route: "/games/color-ball-drop/", w: 390, h: 844, mobile: true, full: true },
    { name: "privacy-desktop", route: "/privacy/color-ball-drop/", w: 1440, h: 900, mobile: false, full: true },
  ];

  try {
    for (const t of targets) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: t.w,
        height: t.h,
        deviceScaleFactor: 1,
        mobile: t.mobile,
      });

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
      await send("Page.navigate", { url: `${base}${t.route}` });
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 3500))]);
      // Wait for fonts & lazy images to settle
      await send("Runtime.evaluate", {
        awaitPromise: true,
        expression: `Promise.all([
          document.fonts ? document.fonts.ready : Promise.resolve(),
          ...Array.from(document.querySelectorAll('img')).map((img) => {
            img.loading = 'eager';
            return img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; });
          })
        ])`,
      });
      await new Promise((r) => setTimeout(r, 300));

      const shot = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: t.full,
      });
      const filePath = path.join(OUT_DIR, `${t.name}.png`);
      fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
      console.log(`Captured ${filePath}`);
    }
  } finally {
    ws.close();
    proc.kill();
    await new Promise((r) => setTimeout(r, 200));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore transient Windows file lock on temp profile dir
    }
    await new Promise((r) => server.close(r));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

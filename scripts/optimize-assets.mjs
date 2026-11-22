import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

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
  if (!chromeExe) throw new Error("Chrome/Edge executable not found.");

  const debugPort = 9237;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-affan-opt-"));
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
    throw new Error("Could not connect to Chrome CDP.");
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

  const srcDir = path.join(ROOT_DIR, "assets-source");
  const artOutDir = path.join(ROOT_DIR, "src", "assets", "art");
  const shotsOutDir = path.join(ROOT_DIR, "src", "assets", "games", "color-ball-drop");
  fs.mkdirSync(artOutDir, { recursive: true });
  fs.mkdirSync(shotsOutDir, { recursive: true });

  const jobs = [
    // Promotional 2.5D Color Ball Drop studio artwork (WebP)
    { input: path.join(srcDir, "color-ball-drop-hero.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-hero.webp"), width: 1600, height: 900, quality: 0.84 },
    { input: path.join(srcDir, "color-ball-drop-hero.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-hero-960.webp"), width: 960, height: 540, quality: 0.82 },
    { input: path.join(srcDir, "color-ball-drop-hero.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-hero-stage.webp"), width: 808, height: 900, cropLeftRatio: 0.495, quality: 0.85 },
    { input: path.join(srcDir, "color-ball-drop-hero.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-hero-stage-540.webp"), width: 485, height: 540, cropLeftRatio: 0.495, quality: 0.83 },
    { input: path.join(srcDir, "color-ball-drop-cover.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-cover.webp"), width: 1280, height: 720, quality: 0.84 },
    { input: path.join(srcDir, "color-ball-drop-cover.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-cover-768.webp"), width: 768, height: 432, quality: 0.82 },
    { input: path.join(srcDir, "color-ball-drop-mechanics.jpg"), mime: "image/jpeg", out: path.join(artOutDir, "color-ball-drop-mechanics.webp"), width: 1280, height: 720, quality: 0.84 },

    // Authentic Color Ball Drop gameplay screenshots (updated UI/UX — portrait 540x960 WebP)
    { input: path.join(srcDir, "screenshots", "corrected_home_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-home.webp"), width: 540, height: 960, quality: 0.86 },
    { input: path.join(srcDir, "screenshots", "corrected_gameplay_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-level-01.webp"), width: 540, height: 960, quality: 0.86 },
    { input: path.join(srcDir, "screenshots", "corrected_mastery_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-mastery-99.webp"), width: 540, height: 960, quality: 0.86 },
    { input: path.join(srcDir, "screenshots", "corrected_levels_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-level-select.webp"), width: 540, height: 960, quality: 0.86 },
    { input: path.join(srcDir, "screenshots", "corrected_win_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-win.webp"), width: 540, height: 960, quality: 0.86 },
    { input: path.join(srcDir, "screenshots", "corrected_trails_720x1280.png"), mime: "image/png", out: path.join(shotsOutDir, "shot-trails.webp"), width: 540, height: 960, quality: 0.86 },
  ];

  try {
    for (const job of jobs) {
      const b64 = fs.readFileSync(job.input).toString("base64");
      const dataUri = `data:${job.mime};base64,${b64}`;

      const cropLeftRatio = Number(job.cropLeftRatio || 0);
      const res = await send("Runtime.evaluate", {
        awaitPromise: true,
        returnByValue: true,
        expression: `new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const sx = Math.round(img.naturalWidth * ${cropLeftRatio});
            const sw = img.naturalWidth - sx;
            const sh = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = ${job.width};
            canvas.height = ${job.height};
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, 0, sw, sh, 0, 0, ${job.width}, ${job.height});
            resolve(canvas.toDataURL('image/webp', ${job.quality}));
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = ${JSON.stringify(dataUri)};
        })`,
      });

      const webpBuf = Buffer.from(res.result.value.split(",")[1], "base64");
      fs.writeFileSync(job.out, webpBuf);
      console.log(`Generated ${path.relative(ROOT_DIR, job.out)} (${job.width}x${job.height}) -> ${(webpBuf.length / 1024).toFixed(1)} KB`);
    }

    // Compose crisp 1200x630 Open Graph PNG for Dev Affan + Color Ball Drop
    const heroB64 = fs.readFileSync(path.join(srcDir, "color-ball-drop-hero.jpg")).toString("base64");
    const ogHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #0B1224;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #F6FAFF;
    position: relative;
  }
  .bg {
    position: absolute; inset: 0;
    background-image: url("data:image/jpeg;base64,${heroB64}");
    background-size: cover; background-position: center right;
  }
  .scrim {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(11,18,36,0.97) 0%, rgba(11,18,36,0.88) 43%, rgba(11,18,36,0.22) 70%, rgba(11,18,36,0.04) 100%);
  }
  .content {
    position: relative; z-index: 2;
    height: 100%; width: 640px;
    padding: 64px 70px;
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .brand {
    display: flex; align-items: center; gap: 16px;
    font-size: 28px; font-weight: 800; letter-spacing: -0.02em;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 10px 20px; border-radius: 999px;
    background: rgba(54,213,244,0.14); border: 1.5px solid rgba(54,213,244,0.45);
    color: #72E7CD; font-size: 18px; font-weight: 700; width: fit-content;
    margin-bottom: 18px;
  }
  h1 {
    font-size: 62px; line-height: 1.04; font-weight: 900;
    letter-spacing: -0.03em; margin-bottom: 20px;
  }
  h1 span { color: #FFC83D; }
  p {
    font-size: 24px; line-height: 1.4; color: #CBD6F0; max-width: 500px;
  }
  .foot {
    display: flex; align-items: center; gap: 16px;
    font-size: 20px; font-weight: 700; color: #FFC83D;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #36D5F4; }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="scrim"></div>
  <div class="content">
    <div class="brand">
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
        <rect width="64" height="64" rx="16" fill="#132B4F"/>
        <rect x="2" y="2" width="60" height="60" rx="14" stroke="#36D5F4" stroke-opacity="0.55" stroke-width="2.5"/>
        <circle cx="22" cy="24" r="7" fill="#FF6276"/>
        <circle cx="42" cy="24" r="7" fill="#36D5F4"/>
        <circle cx="32" cy="42" r="8" fill="#FFC83D"/>
        <path d="M12 34L52 20" stroke="#72E7CD" stroke-width="3.2" stroke-linecap="round"/>
      </svg>
      <span>Dev Affan</span>
    </div>
    <div>
      <div class="pill">Indie Physics Puzzle Studio</div>
      <h1>Color Ball Drop:<br><span>Rope Puzzle</span></h1>
      <p>Cut gold ropes, guide colorful balls, and solve 100 handcrafted offline physics puzzles on Android.</p>
    </div>
    <div class="foot">
      <span>100 Levels &middot; 5 Chapters</span>
      <span class="dot"></span>
      <span style="color:#CBD6F0; font-weight:600;">Coming Soon on Google Play</span>
    </div>
  </div>
</body>
</html>`;

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const frameTree = await send("Page.getFrameTree");
    await send("Page.setDocumentContent", {
      frameId: frameTree.frameTree.frame.id,
      html: ogHtml,
    });
    await new Promise((r) => setTimeout(r, 250));
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const ogPngBuf = Buffer.from(shot.data, "base64");
    fs.writeFileSync(path.join(ROOT_DIR, "src", "assets", "og-studio.png"), ogPngBuf);
    console.log(`Generated src/assets/og-studio.png (1200x630) -> ${(ogPngBuf.length / 1024).toFixed(1)} KB`);
  } finally {
    ws.close();
    proc.kill();
    await new Promise((r) => setTimeout(r, 200));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "../scripts/build.mjs";
import { createStaticServer } from "../scripts/dev-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function walkHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

function resolveDistLink(distDir, link) {
  const clean = link.split("#")[0].split("?")[0];
  if (!clean || clean === "/") {
    return path.join(distDir, "index.html");
  }
  const rel = clean.replace(/^\/+/, "");
  const direct = path.join(distDir, rel);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const indexCandidate = path.join(distDir, rel, "index.html");
  if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
    return indexCandidate;
  }
  return null;
}

async function runTests() {
  console.log("1. Building production site...");
  const buildResult = buildSite();
  const distDir = buildResult.outDir;
  assert.equal(buildResult.gameCount, 2, "Expected 2 games in catalog (Color Ball Drop + Cut & Cascade)");
  assert.equal(buildResult.routesGenerated, 10, "Expected 10 HTML pages generated");

  console.log("2. Auditing generated HTML pages (SEO, a11y, links, JSON-LD)...");
  const htmlFiles = walkHtmlFiles(distDir);
  assert.equal(htmlFiles.length, 10, "Expected 10 HTML files in dist/");

  const titles = new Set();
  const descriptions = new Set();

  for (const file of htmlFiles) {
    const rel = path.relative(distDir, file);
    const html = fs.readFileSync(file, "utf8");

    const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
    assert.equal(h1Matches.length, 1, `${rel}: expected exactly 1 <h1>, found ${h1Matches.length}`);

    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
    for (let i = 1; i < headingLevels.length; i += 1) {
      assert.ok(
        headingLevels[i] <= headingLevels[i - 1] + 1,
        `${rel}: skipped heading level h${headingLevels[i - 1]} -> h${headingLevels[i]}`
      );
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(titleMatch && titleMatch[1].trim().length > 5, `${rel}: missing or short <title>`);
    assert.ok(!titles.has(titleMatch[1]), `${rel}: duplicate <title> "${titleMatch[1]}"`);
    titles.add(titleMatch[1]);

    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    assert.ok(descMatch && descMatch[1].trim().length > 20, `${rel}: missing or short meta description`);
    assert.ok(!descriptions.has(descMatch[1]), `${rel}: duplicate meta description`);
    descriptions.add(descMatch[1]);

    assert.match(html, /property="og:title"/i, `${rel}: missing og:title`);
    assert.match(html, /property="og:description"/i, `${rel}: missing og:description`);
    assert.match(html, /name="viewport"/i, `${rel}: missing viewport meta`);

    assert.match(html, /\/styles\/tokens\.css\?v=[a-f0-9]{8}/, `${rel}: missing cache-busting query on tokens.css`);
    assert.match(html, /\/styles\/main\.css\?v=[a-f0-9]{8}/, `${rel}: missing cache-busting query on main.css`);
    assert.match(html, /\/scripts\/main\.js\?v=[a-f0-9]{8}/, `${rel}: missing cache-busting query on main.js`);

    assert.doesNotMatch(
      html,
      /<link\s+rel="canonical"/i,
      `${rel}: canonical should stay omitted until siteUrl is confirmed`
    );

    const ldMatches = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    for (const ld of ldMatches) {
      assert.doesNotThrow(() => JSON.parse(ld[1]), `${rel}: invalid JSON-LD`);
    }

    const refMatches = [...html.matchAll(/(?:href|src)="([^"]+)"/gi)].map((m) => m[1]);
    for (const ref of refMatches) {
      if (
        ref.startsWith("http://") ||
        ref.startsWith("https://") ||
        ref.startsWith("mailto:") ||
        ref.startsWith("#")
      ) {
        continue;
      }
      const resolved = resolveDistLink(distDir, ref);
      assert.ok(resolved, `${rel}: broken internal link or asset "${ref}"`);
    }

    const imgTags = html.match(/<img\b[^>]*>/gi) || [];
    for (const tag of imgTags) {
      assert.match(tag, /\balt="/i, `${rel}: <img> missing alt attribute: ${tag}`);
    }
  }

  assert.ok(fs.existsSync(path.join(distDir, "robots.txt")), "Missing robots.txt");
  assert.ok(fs.existsSync(path.join(distDir, "sitemap.xml")), "Missing sitemap.xml");
  assert.ok(fs.existsSync(path.join(distDir, "_headers")), "Missing Cloudflare _headers");
  const sitemap = fs.readFileSync(path.join(distDir, "sitemap.xml"), "utf8");
  assert.match(sitemap, /\/games\/color-ball-drop\//, "Sitemap missing Color Ball Drop page");
  assert.match(sitemap, /\/privacy\/color-ball-drop\//, "Sitemap missing Color Ball Drop privacy page");
  assert.match(sitemap, /\/games\/cut-and-cascade\//, "Sitemap missing Cut & Cascade future page");
  assert.match(sitemap, /\/privacy\/cut-and-cascade\//, "Sitemap missing Cut & Cascade privacy page");

  console.log("3. Testing HTTP preview server routes and 404 handling...");
  const server = createStaticServer(distDir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  try {
    const okRoutes = [
      "/",
      "/games/",
      "/games/color-ball-drop/",
      "/games/cut-and-cascade/",
      "/about/",
      "/contact/",
      "/privacy/",
      "/privacy/color-ball-drop/",
      "/privacy/cut-and-cascade/",
      "/styles/tokens.css",
      "/styles/main.css",
      "/scripts/main.js",
      "/assets/art/color-ball-drop-hero.webp",
      "/assets/games/color-ball-drop/shot-level-01.webp",
      "/assets/games/color-ball-drop/gameplay-level-3.mp4",
      "/robots.txt",
      "/sitemap.xml",
    ];
    for (const route of okRoutes) {
      const res = await fetch(`${base}${route}`);
      assert.equal(res.status, 200, `Expected HTTP 200 for ${route}, got ${res.status}`);
    }

    const notFoundRes = await fetch(`${base}/nonexistent-route-check`);
    assert.equal(notFoundRes.status, 404, "Expected HTTP 404 for unknown route");
    const notFoundBody = await notFoundRes.text();
    assert.match(notFoundBody, /Page Not Found/i, "404 page should render friendly 404 message");

    const malformedRes = await fetch(`${base}/%E0%A4%A`);
    assert.equal(malformedRes.status, 400, "Expected HTTP 400 for malformed URI");

    for (const trav of ["/..%2Fpackage.json", "/..%5cpackage.json"]) {
      const travRes = await fetch(`${base}${trav}`);
      assert.ok(
        travRes.status === 403 || travRes.status === 404,
        `Traversal ${trav} should return 403 or 404, got ${travRes.status}`
      );
      const travText = await travRes.text();
      assert.doesNotMatch(travText, /dev-affan-game-studio-website/, `Traversal ${trav} leaked package.json`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("4. Testing edge cases (released game CTA, canonical domain, invalid/duplicate slug)...");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-affan-test-"));
  try {
    const siteEdgePath = path.join(tmpDir, "site.json");
    const gamesEdgePath = path.join(tmpDir, "games.json");
    const outEdgeDir = path.join(tmpDir, "dist");

    const baseSite = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "site.json"), "utf8"));
    baseSite.siteUrl = "https://devaffan.pages.dev";
    baseSite.contact.email = "support@example.test";
    baseSite.contact.emailVerified = true;
    fs.writeFileSync(siteEdgePath, JSON.stringify(baseSite, null, 2));

    const baseGames = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "data", "games.json"), "utf8"));
    baseGames[0].status = "released";
    baseGames[0].statusLabel = "Available on Google Play";
    baseGames[0].googlePlayUrl = "https://play.google.com/store/apps/details?id=com.colorballdrop.ropepuzzle";
    fs.writeFileSync(gamesEdgePath, JSON.stringify(baseGames, null, 2));

    const edgeRes = buildSite({
      sitePath: siteEdgePath,
      gamesPath: gamesEdgePath,
      outDir: outEdgeDir,
    });
    assert.equal(edgeRes.gameCount, 2);

    const releasedHtml = fs.readFileSync(path.join(outEdgeDir, "games", "color-ball-drop", "index.html"), "utf8");
    assert.match(releasedHtml, /data-store-cta="google-play"/, "Released game should render active Google Play CTA");
    assert.match(
      releasedHtml,
      /<link rel="canonical" href="https:\/\/devaffan\.pages\.dev\/games\/color-ball-drop\/">/,
      "Configured siteUrl should emit canonical URL"
    );

    const contactHtml = fs.readFileSync(path.join(outEdgeDir, "contact", "index.html"), "utf8");
    assert.match(contactHtml, /mailto:support@example\.test/, "Verified email should render on Contact page");

    const badGamesPath = path.join(tmpDir, "bad-games.json");
    fs.writeFileSync(badGamesPath, JSON.stringify([{ ...baseGames[0], slug: "Invalid Slug!" }]));
    assert.throws(
      () => buildSite({ sitePath: siteEdgePath, gamesPath: badGamesPath, outDir: outEdgeDir }),
      /Invalid game slug/
    );

    const dupGamesPath = path.join(tmpDir, "dup-games.json");
    fs.writeFileSync(dupGamesPath, JSON.stringify([baseGames[0], { ...baseGames[0], title: "Duplicate Game" }]));
    assert.throws(
      () => buildSite({ sitePath: siteEdgePath, gamesPath: dupGamesPath, outDir: outEdgeDir }),
      /Duplicate game slug/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("ALL VERIFICATION CHECKS PASSED.");
}

runTests().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});

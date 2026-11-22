import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DIST = path.resolve(__dirname, "..", "dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

export function createStaticServer(distDir = DEFAULT_DIST) {
  const resolvedDistDir = path.resolve(distDir);

  return http.createServer((req, res) => {
    let pathname;
    try {
      const reqUrl = new URL(req.url || "/", "http://localhost");
      pathname = decodeURIComponent(reqUrl.pathname);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("400 Bad Request");
      return;
    }

    // Enforce strict containment inside distDir (blocks /../ and \..\ traversal)
    const relativePath = pathname.replace(/^[/\\]+/, "");
    let filePath = path.resolve(resolvedDistDir, relativePath);
    if (
      filePath !== resolvedDistDir &&
      !filePath.startsWith(resolvedDistDir + path.sep)
    ) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    } else if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      const htmlFallback = path.join(filePath, "index.html");
      if (fs.existsSync(htmlFallback)) {
        filePath = htmlFallback;
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const notFoundPath = path.join(distDir, "404.html");
    if (fs.existsSync(notFoundPath)) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(notFoundPath).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const port = Number(process.env.PORT || 4173);
  const server = createStaticServer(DEFAULT_DIST);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Dev Affan Studio preview server running at http://127.0.0.1:${port}`);
  });
}

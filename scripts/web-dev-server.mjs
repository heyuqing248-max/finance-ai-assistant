import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number.parseInt(process.env.FINANCE_AI_WEB_PORT || process.env.PORT || "4173", 10);
const host = process.env.FINANCE_AI_WEB_HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function safeResolve(pathname = "/") {
  const decoded = decodeURIComponent(pathname.split("?")[0] || "/");
  const normalizedPath = decoded === "/" ? "/index.html" : decoded;
  const candidate = resolve(projectRoot, `.${normalizedPath}`);
  const allowedPrefix = `${projectRoot}${sep}`;
  if (candidate !== projectRoot && !candidate.startsWith(allowedPrefix)) return "";
  return candidate;
}

const server = createServer((request, response) => {
  const filePath = safeResolve(request.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.on("error", (error) => {
  console.error(`Unable to start Finance AI webpage server on http://${host}:${port}`);
  console.error(error?.message || error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Finance AI webpage running at http://${host}:${port}`);
});

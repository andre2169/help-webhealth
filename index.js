import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL(".", import.meta.url)), "dist"));
const port = Number(process.env.PORT || 4173);
const fallbackApiOrigin = "https://backendhelpapihealth.shardweb.app";
const localApiOrigins = ["http://localhost:8000", "http://127.0.0.1:8000"];
const MAX_URL_LENGTH = 2048;
const MAX_HEADER_BYTES = 32_000;
const STATIC_CACHE_SECONDS = 31_536_000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
};

function getApiOrigins() {
  const origins = new Set(localApiOrigins);

  try {
    origins.add(new URL(process.env.VITE_API_URL || fallbackApiOrigin).origin);
  } catch {
    origins.add(fallbackApiOrigin);
  }

  return [...origins].join(" ");
}

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self' " + getApiOrigins(),
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
  ].join("; "),
};

function getExtension(pathname) {
  const match = pathname.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0] : ".html";
}

function getCacheControl(filePath) {
  const fileName = filePath.split(sep).pop();
  if (fileName === "sw.js" || fileName === "manifest.webmanifest") {
    return "no-store";
  }

  if (filePath.includes(`${sep}assets${sep}`)) {
    return `public, max-age=${STATIC_CACHE_SECONDS}, immutable`;
  }

  if (getExtension(filePath) === ".html") {
    return "no-store";
  }

  return "public, max-age=3600";
}

function getHeaderBytes(headers) {
  return Object.entries(headers).reduce((total, [name, value]) => {
    const joinedValue = Array.isArray(value) ? value.join(",") : String(value || "");
    return total + Buffer.byteLength(name) + Buffer.byteLength(joinedValue);
  }, 0);
}

function sendText(request, response, statusCode, text) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(text);
}

function sendFile(request, response, filePath) {
  const extension = getExtension(filePath);
  response.writeHead(200, {
    ...securityHeaders,
    "Cache-Control": getCacheControl(filePath),
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

function resolvePath(urlPath, documentRoot) {
  let cleanPath = "/";
  try {
    cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }

  if (cleanPath.includes("\0")) return null;
  const requestedPath = normalize(join(documentRoot, cleanPath));

  if (requestedPath !== documentRoot && !requestedPath.startsWith(documentRoot + sep)) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  // Missing assets and API routes must never receive a successful HTML response.
  if (/\.[^/]+$/.test(cleanPath) || /^\/(?:assets|icons|brand|api)(?:\/|$)/.test(cleanPath)) {
    return null;
  }
  return join(documentRoot, "index.html");
}

export function createWebServer({ documentRoot = root } = {}) {
  const safeRoot = resolve(documentRoot);
  return createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, {
      ...securityHeaders,
      "Allow": "GET, HEAD",
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Method not allowed");
    return;
  }

  if ((request.url || "").length > MAX_URL_LENGTH) {
    sendText(request, response, 414, "URI too long");
    return;
  }

  if (getHeaderBytes(request.headers) > MAX_HEADER_BYTES) {
    sendText(request, response, 431, "Request headers too large");
    return;
  }

  if (request.url === "/health") {
    sendText(request, response, 200, "ok\n");
    return;
  }

  const filePath = resolvePath(request.url || "/", safeRoot);

  if (!filePath || !existsSync(filePath)) {
    sendText(request, response, 404, "Not found");
    return;
  }

  sendFile(request, response, filePath);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createWebServer().listen(port, "0.0.0.0", () => {
    console.log(`helphealth-web listening on ${port}`);
  });
}

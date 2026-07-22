import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL(".", import.meta.url)), "dist"));
const port = Number(process.env.PORT || 4173);
const fallbackApiOrigin = "https://beckendhelpapihealth.shardweb.app";
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
  ".webp": "image/webp",
};

function getApiOrigin() {
  try {
    return new URL(process.env.VITE_API_URL || fallbackApiOrigin).origin;
  } catch {
    return fallbackApiOrigin;
  }
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
    "connect-src 'self' " + getApiOrigin(),
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

function resolvePath(urlPath) {
  let cleanPath = "/";
  try {
    cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }

  const requestedPath = normalize(join(root, cleanPath));

  if (requestedPath !== root && !requestedPath.startsWith(root + sep)) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(root, "index.html");
}

createServer((request, response) => {
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

  const filePath = resolvePath(request.url || "/");

  if (!filePath || !existsSync(filePath)) {
    sendText(request, response, 404, "Not found");
    return;
  }

  sendFile(request, response, filePath);
}).listen(port, "0.0.0.0", () => {
  console.log(`helphealth-web listening on ${port}`);
});

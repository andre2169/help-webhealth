import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL(".", import.meta.url)), "dist"));
const port = Number(process.env.PORT || 4173);
const fallbackApiOrigin = "https://beckendhelpapihealth.shardweb.app";

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

function sendFile(response, filePath) {
  const extension = getExtension(filePath);
  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
  });
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
  if (request.url === "/health") {
    response.writeHead(200, {
      ...securityHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("ok\n");
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, {
      ...securityHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not found");
    return;
  }

  sendFile(response, filePath);
}).listen(port, "0.0.0.0", () => {
  console.log(`help-web2 listening on ${port}`);
});

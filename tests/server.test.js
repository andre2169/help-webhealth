import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { before, after, test } from "node:test";
import { createWebServer } from "../index.js";

let root, server, port;
before(async () => {
  root = await mkdtemp(join(tmpdir(), "helpweb-http-test-"));
  await mkdir(join(root, "assets"));
  for (const [name, body] of Object.entries({ "index.html": "<html>App shell</html>", "sw.js": "// worker", "manifest.webmanifest": "{}", "assets/app-123.js": "// application" })) {
    await writeFile(join(root, name), body);
  }
  server = createWebServer({ documentRoot: root });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  port = server.address().port;
});
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await rm(root, { recursive: true, force: true });
});
function get(path, method = "GET", headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path, method, headers }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}
test("health e HEAD nao retornam conteudo indevido", async () => {
  assert.equal((await get("/health")).body, "ok\n");
  const head = await get("/health", "HEAD");
  assert.equal(head.status, 200); assert.equal(head.body, "");
  assert.equal((await get("/", "HEAD")).body, "");
});
test("rotas da SPA recebem shell sem cache permanente", async () => {
  for (const path of ["/", "/login", "/tickets/42?deleted=1", "/admin/catalog"]) {
    const result = await get(path);
    assert.equal(result.status, 200); assert.equal(result.body, "<html>App shell</html>");
    assert.equal(result.headers["cache-control"], "no-store");
  }
});
test("assets versionados sao imutaveis; worker e manifest nao", async () => {
  const asset = await get("/assets/app-123.js?v=1");
  assert.equal(asset.headers["cache-control"], "public, max-age=31536000, immutable");
  assert.match(asset.headers["content-type"], /^text\/javascript/);
  for (const path of ["/sw.js", "/manifest.webmanifest"]) {
    assert.equal((await get(path)).headers["cache-control"], "no-store");
  }
});
test("arquivos ausentes e rotas de API nunca recebem HTML com 200", async () => {
  for (const path of ["/assets/missing.js", "/icons/missing.png", "/brand/missing", "/api/v1/auth/me", "/missing.webmanifest"]) {
    const result = await get(path);
    assert.equal(result.status, 404, path); assert.equal(result.body, "Not found");
    assert.equal(result.headers["cache-control"], "no-store");
  }
});
test("traversal, URL invalida e byte nulo nao escapam do dist", async () => {
  for (const path of ["/../package.json", "/%2e%2e%2fpackage.json", "/%2e%2e%5cpackage.json", "/%00", "/%invalid"]) {
    assert.equal((await get(path)).status, 404, path);
  }
});
test("metodos de escrita e URLs excessivas sao rejeitados", async () => {
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    const result = await get("/login", method);
    assert.equal(result.status, 405); assert.equal(result.headers.allow, "GET, HEAD");
  }
  assert.equal((await get("/" + "x".repeat(2048))).status, 414);
  assert.equal((await get("/", "GET", { "x-large": "x".repeat(33000) })).status, 431);
});
test("cabecalhos de seguranca estao presentes inclusive em erros", async () => {
  for (const path of ["/", "/missing.js", "/health"]) {
    const { headers } = await get(path);
    assert.equal(headers["x-frame-options"], "DENY");
    assert.equal(headers["x-content-type-options"], "nosniff");
    assert.equal(headers["referrer-policy"], "no-referrer");
    assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
    assert.match(headers["content-security-policy"], /script-src 'self'/);
    assert.doesNotMatch(headers["content-security-policy"], /unsafe-eval|connect-src \*/);
  }
});

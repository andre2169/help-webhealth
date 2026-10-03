import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://helpweb.example.invalid";
function harness() {
  const listeners = new Map(), stores = new Map(), calls = [];
  let online = true, status = 200, mime = "text/html", skips = 0, claims = 0;
  const key = request => new URL(typeof request === "string" ? request : request.url, origin).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        async match(request) { return data.get(key(request))?.clone(); },
        async put(request, response) { data.set(key(request), response.clone()); },
        async addAll(urls) { for (const url of urls) data.set(key(url), new Response("installed:" + url, { headers: { "content-type": "text/html" } })); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async match(request) { for (const data of stores.values()) if (data.has(key(request))) return data.get(key(request)).clone(); },
  };
  vm.runInNewContext(source, {
    URL, caches,
    self: { location: { origin }, addEventListener: (name, callback) => listeners.set(name, callback),
      skipWaiting: async () => { skips++; }, clients: { claim: async () => { claims++; } } },
    fetch: async request => {
      calls.push(key(request));
      if (!online) throw new Error("offline");
      return new Response("network:" + key(request), { status, headers: { "content-type": mime } });
    },
  });
  function dispatch(name, request) {
    const waits = []; let response;
    listeners.get(name)({ request, waitUntil: promise => waits.push(promise), respondWith: promise => { response = promise; } });
    return { get response() { return response; }, waits, async finish() { await Promise.all(waits); } };
  }
  return { stores, calls, caches, dispatch, key, setNetwork: options => { ({ online = online, status = status, mime = mime } = options); },
    counts: () => ({ skips, claims }) };
}
function req(path, overrides = {}) {
  return { url: new URL(path, origin).href, method: "GET", mode: "cors", destination: "", ...overrides };
}
test("instalacao espera todos os recursos essenciais antes de ativar", async () => {
  const h = harness(); await h.dispatch("install").finish();
  assert.equal(h.counts().skips, 1);
  const current = [...h.stores.values()][0];
  assert.ok(current.has(h.key("/")));
  assert.ok(current.has(h.key("/manifest.webmanifest")));
  assert.ok(current.has(h.key("/icons/help-web-health-apple-touch-180.png")));
});
test("ativacao remove apenas caches antigos desta aplicacao", async () => {
  const h = harness(); await h.dispatch("install").finish();
  await h.caches.open("helpweb-health-static-old"); await h.caches.open("other-application");
  await h.dispatch("activate").finish();
  assert.equal(h.stores.has("helpweb-health-static-old"), false);
  assert.equal(h.stores.has("other-application"), true);
  assert.equal(h.counts().claims, 1);
});
test("POST, dados da API e outra origem nao sao interceptados", () => {
  const h = harness();
  for (const request of [req("/api/v1/auth/me"), req("/api/v1/tickets", { mode: "navigate" }), req("/health", { mode: "navigate" }), req("/login", { method: "POST" }), req("https://api.example.invalid/api/v1/auth/me")]) {
    assert.equal(h.dispatch("fetch", request).response, undefined, request.url);
  }
  assert.equal(h.calls.length, 0); assert.equal(h.stores.size, 0);
});
test("navegacao usa rede primeiro e shell em modo offline", async () => {
  const h = harness(); await h.dispatch("install").finish();
  const event = h.dispatch("fetch", req("/tickets/42", { mode: "navigate" }));
  assert.match(await (await event.response).text(), /network:/); await event.finish();
  h.setNetwork({ online: false });
  const offline = h.dispatch("fetch", req("/login", { mode: "navigate" }));
  assert.match(await (await offline.response).text(), /network:.*tickets\/42/); await offline.finish();
});
test("cache da navegacao participa da vida util do evento", async () => {
  const h = harness(); const event = h.dispatch("fetch", req("/", { mode: "navigate" }));
  await event.response;
  assert.ok(event.waits.length > 0, "Cache writes must be covered by waitUntil");
  await event.finish();
  assert.ok([...h.stores.values()][0].has(h.key("/")));
});
test("respostas de erro e JSON nunca sobrescrevem o shell", async () => {
  const h = harness(); await h.dispatch("install").finish();
  for (const options of [{ status: 503 }, { status: 200, mime: "application/json" }]) {
    h.setNetwork(options);
    const event = h.dispatch("fetch", req("/tickets", { mode: "navigate" }));
    await event.response; await event.finish();
    assert.equal(await (await h.caches.match("/")).text(), "installed:/");
  }
});
test("assets atualizam cache com waitUntil e continuam disponiveis offline", async () => {
  const h = harness(); h.setNetwork({ mime: "text/javascript" });
  const event = h.dispatch("fetch", req("/assets/app.js", { destination: "script" }));
  assert.match(await (await event.response).text(), /network:/);
  assert.ok(event.waits.length > 0); await event.finish();
  h.setNetwork({ online: false });
  const offline = h.dispatch("fetch", req("/assets/app.js", { destination: "script" }));
  assert.match(await (await offline.response).text(), /network:/); await offline.finish();
});
test("asset com falha HTTP nao e gravado no cache", async () => {
  const h = harness(); h.setNetwork({ status: 404 });
  const event = h.dispatch("fetch", req("/assets/missing.js", { destination: "script" }));
  assert.equal((await event.response).status, 404); await event.finish();
  assert.equal(await h.caches.match("/assets/missing.js"), undefined);
});

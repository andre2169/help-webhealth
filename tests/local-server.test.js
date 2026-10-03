import assert from "node:assert/strict";
import test from "node:test";
import config from "../vite.config.js";

test("mantem a porta local autorizada sem escolher outra automaticamente", () => {
  assert.equal(config.server.host, "localhost");
  assert.equal(config.server.port, 5173);
  assert.equal(config.server.strictPort, true);
  assert.equal(config.server.proxy["/api"].target, "http://127.0.0.1:8000");
  assert.equal(config.server.proxy["/health"].target, "http://127.0.0.1:8000");
});

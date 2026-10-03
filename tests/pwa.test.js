import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicUrl = new URL("../public/", import.meta.url);

test("mantém os recursos essenciais do PWA", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.webmanifest", publicUrl), "utf8")
  );
  const serviceWorker = await readFile(new URL("sw.js", publicUrl), "utf8");

  assert.equal(manifest.name, "HELP WEB HEALTH");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(
    manifest.icons.map((icon) => icon.sizes),
    ["192x192", "512x512", "192x192", "512x512"]
  );
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
});

test("mantém o host local do PWA na URL da API", async () => {
  const apiSource = await readFile(new URL("../src/api/api.js", import.meta.url), "utf8");
  const serverSource = await readFile(new URL("../index.js", import.meta.url), "utf8");

  assert.match(apiSource, /window\.location\.hostname/);
  assert.match(apiSource, /127\.0\.0\.1/);
  assert.match(apiSource, /localHosts/);
  assert.match(serverSource, /http:\/\/localhost:8000/);
  assert.match(serverSource, /http:\/\/127\.0\.0\.1:8000/);
  assert.doesNotMatch(serverSource, /connect-src ['"]\*['"]/);
});

test("usa PNGs válidos com as dimensões declaradas para instalação", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", publicUrl), "utf8"));
  const icons = [
    ...manifest.icons,
    { src: "/icons/help-web-health-apple-touch-180.png", sizes: "180x180" },
    { src: "/icons/help-web-health-favicon-32.png", sizes: "32x32" },
    { src: "/icons/help-web-health-favicon-16.png", sizes: "16x16" },
  ];
  for (const icon of icons) {
    const bytes = await readFile(new URL(icon.src.slice(1), publicUrl));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some((icon) => icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
});

import test from "node:test";
import assert from "node:assert/strict";
import { SITE_INFO, releaseDate, supportLinks } from "../src/config/siteInfo.js";

test("demo contacts never become actionable links", () => {
  assert.equal(SITE_INFO.developer, "André Vilas Boas");
  assert.deepEqual(supportLinks(SITE_INFO.support), { phone: null, email: null });
  assert.deepEqual(supportLinks({ demonstration: true, phone: "(71) 99999-8888", email: "equipe@hospital.com.br" }), { phone: null, email: null });
});

test("real support links accept local and international Brazilian numbers", () => {
  const support = { demonstration: false, phone: "(71) 99999-8888", email: "equipe@hospital.com.br" };
  assert.deepEqual(supportLinks(support), { phone: "tel:+5571999998888", email: "mailto:equipe%40hospital.com.br" });
  assert.equal(supportLinks({ ...support, phone: "+55 71 99999-8888" }).phone, "tel:+5571999998888");
  assert.equal(supportLinks({ ...support, phone: "(55) 99999-8888" }).phone, "tel:+5555999998888");
  assert.deepEqual(supportLinks({ demonstration: false, phone: "(00) 00000-0000", email: "suporte@example.invalid" }), { phone: null, email: null });
});

test("release date is optional, fixed and rejects invalid calendar dates", () => {
  assert.equal(releaseDate(SITE_INFO.updatedAt), "");
  assert.equal(releaseDate("2026-10-03"), "03/10/2026");
  assert.equal(releaseDate("2026-02-30"), "");
  assert.equal(releaseDate("03/10/2026"), "");
});

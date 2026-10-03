import assert from "node:assert/strict";
import test from "node:test";
import { metricRows } from "../src/utils/reportMetrics.js";

test("limits rankings and preserves every ticket in Others", () => {
  const counts = Object.fromEntries(Array.from({ length: 10000 }, (_, index) => [`Setor ${index}`, index + 1]));
  const rows = metricRows(counts);
  assert.equal(rows.length, 7);
  assert.equal(rows.at(-1).remainder, true);
  assert.equal(rows.at(-1).label, "Outros");
  assert.equal(rows.reduce((sum, row) => sum + row.total, 0), 50005000);
  assert.equal(rows[0].total, 10000);
});

test("keeps chronological order and zero intervals in time series", () => {
  const rows = metricRows({ "01/2026": 3, "02/2026": 0, "03/2026": 5 }, { preserveOrder: true });
  assert.deepEqual(rows.map(row => row.total), [3, 0, 5]);
  assert.deepEqual(rows.map(row => row.label), ["01/2026", "02/2026", "03/2026"]);
});

test("does not add Others to a small distribution", () => {
  assert.deepEqual(metricRows({ Rede: 4, Hardware: 2, Acesso: 0 }).map(row => row.label), ["Rede", "Hardware"]);
});

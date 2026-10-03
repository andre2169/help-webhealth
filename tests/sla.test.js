import assert from "node:assert/strict";
import test from "node:test";
import { getSlaState } from "../src/utils/sla.js";

const now = Date.parse("2026-09-29T12:00:00Z");

test("shows remaining time and identifies approaching deadlines", () => {
  assert.deepEqual(
    getSlaState({ dueAt: "2026-09-29T16:00:00Z", slaHours: 24, now }),
    { label: "Restam 4h 0min", tone: "risk" }
  );
  assert.equal(
    getSlaState({ dueAt: "2026-09-29T12:45:00Z", slaHours: 8, now }).tone,
    "risk"
  );
});

test("marks overdue work and hides active countdown after closure", () => {
  assert.equal(
    getSlaState({ dueAt: "2026-09-29T11:00:00Z", now }).tone,
    "overdue"
  );
  assert.deepEqual(
    getSlaState({ dueAt: "2026-09-29T11:00:00Z", status: "resolved", now }),
    { label: "SLA encerrado", tone: "neutral" }
  );
});

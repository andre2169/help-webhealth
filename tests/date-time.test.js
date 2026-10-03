import test from "node:test";
import assert from "node:assert/strict";
import { apiDateToLocalInput, localDateTimeToIso } from "../src/utils/dateTime.js";

test("converts a local date and time to UTC and back without changing the selection", () => {
  const value = "2026-10-04T15:27";
  const iso = localDateTimeToIso(value);
  assert.ok(iso.endsWith("Z"));
  assert.equal(apiDateToLocalInput(iso), value);
  assert.equal(apiDateToLocalInput(iso.replace("Z", "")), value);
});

test("rejects invalid calendar dates, times and incomplete selections", () => {
  for (const value of ["", "2026-02-30T12:00", "2026-10-04T25:00", "2026-10-04", "not a date"])
    assert.equal(localDateTimeToIso(value), null, value);
  assert.equal(apiDateToLocalInput(null), "");
  assert.equal(apiDateToLocalInput("invalid"), "");
});

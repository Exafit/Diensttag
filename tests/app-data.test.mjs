import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(projectRoot, "app.js"), "utf8");
const storage = new Map([
  [
    "aussenzeit.entries.v1",
    JSON.stringify([
      {
        id: "absence-1",
        date: "2026-08-31",
        year: 2026,
        category: "OVER_8H",
        regionType: "DOMESTIC",
        country: "Deutschland",
        location: "",
        allowanceAmount: 14,
        note: "Einsatz",
      },
    ]),
  ],
  [
    "aussenzeit.dayRecords.v1",
    JSON.stringify([
      {
        id: "day-1",
        date: "2026-08-31",
        year: 2026,
        workdayStatus: "WORKDAY",
        primaryWorkplaceVisited: true,
      },
      {
        id: "day-2",
        date: "2026-09-01",
        year: 2026,
        workdayStatus: "NON_WORKDAY",
        primaryWorkplaceVisited: true,
      },
    ]),
  ],
]);

const context = vm.createContext({
  console,
  crypto: globalThis.crypto,
  document: { addEventListener() {} },
  Intl,
  localStorage: {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
  },
});

vm.runInContext(source, context, { filename: "app.js" });

const result = vm.runInContext(`(() => {
  const records = getDayRecordsForYear(2026);
  state.selectedWorkFilter = "COMMUTE";
  const commuteFilterCount = filterDayRecords(records).length;
  state.selectedWorkFilter = "NON_WORKDAY";
  const nonWorkdayFilterCount = filterDayRecords(records).length;
  const normalized = normalizeDayRecords([
    { id: "old", date: "2026-01-02", workdayStatus: "WORKDAY", primaryWorkplaceVisited: true },
    { id: "new", date: "2026-01-02", workdayStatus: "NON_WORKDAY", primaryWorkplaceVisited: true },
    { id: "invalid", date: "x", workdayStatus: "WORKDAY" }
  ]);
  return {
    workdays: countWorkdays(records),
    commuteDays: countCommuteDays(records),
    commuteFilterCount,
    nonWorkdayFilterCount,
    normalized,
    csv: buildYearCsv(2026)
  };
})()`, context);

assert.equal(result.workdays, 1);
assert.equal(result.commuteDays, 1);
assert.equal(result.commuteFilterCount, 1);
assert.equal(result.nonWorkdayFilterCount, 1);
assert.equal(result.normalized.length, 1);
assert.equal(result.normalized[0].id, "new");
assert.equal(result.normalized[0].primaryWorkplaceVisited, null);

const csvLines = result.csv.split("\r\n");
assert.equal(csvLines.length, 3);
assert.match(csvLines[0], /"Arbeitstag"/);
assert.match(csvLines[0], /"Erste Tätigkeitsstätte aufgesucht"/);
assert.match(csvLines[1], /"2026-08-31".*"Ja","Ja",">8h"/);
assert.match(csvLines[2], /"2026-09-01".*"Nein","Nicht anwendbar"/);

console.log("app-data.test.mjs: ok");

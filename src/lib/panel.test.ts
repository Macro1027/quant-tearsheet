import { describe, expect, it } from "vitest";
import { assemblePanel } from "./alignPanel";
import { mappingStorageKey, recallMapping, rememberMapping } from "./mappingMemory";
import { emptyMapping, evaluateSlot, parseCsv, parseDateCell, parseNumeric, rejectUpload, suggestMapping } from "./parseCsv";
import { formatP, formatPercent, formatRatio } from "./format";

describe("formatting", () => {
  it("renders percents, ratios, and small p-values", () => {
    expect(formatPercent(0.12)).toBe("12.00%");
    expect(formatPercent(-0.2)).toBe("-20.00%");
    expect(formatRatio(1.25)).toBe("1.25");
    expect(formatP(0.0004)).toBe("4.00e-4");
    expect(formatP(0.042)).toBe("0.042");
  });
});

describe("cells", () => {
  it("parses dates and numbers without scaling percents", () => {
    expect(parseDateCell("2020-01-15T10:00:00Z", null)).toEqual({ status: "ok", date: "2020-01-15" });
    expect(parseDateCell("15/01/2020", null)).toEqual({ status: "ok", date: "2020-01-15" });
    expect(parseDateCell("02/03/2020", null).status).toBe("ambiguous");
    expect(parseDateCell("02/03/2020", "mdy")).toEqual({ status: "ok", date: "2020-02-03" });
    expect(parseDateCell("02/03/2020", "dmy")).toEqual({ status: "ok", date: "2020-03-02" });
    expect(parseNumeric("1,234.50")).toEqual({ status: "ok", value: 1234.5, percent: false });
    expect(parseNumeric("(1,234.50)")).toEqual({ status: "ok", value: -1234.5, percent: false });
    expect(parseNumeric("2.5%")).toEqual({ status: "ok", value: 2.5, percent: true });
    expect(parseNumeric("1.234,50")).toEqual({ status: "ok", value: 1234.5, percent: false });
    expect(parseNumeric("1,25")).toEqual({ status: "ok", value: 1.25, percent: false });
    expect(parseNumeric("NA").status).toBe("missing");
  });
});

describe("parseCsv", () => {
  it("refuses the wrong kind of file and reads a semicolon table with a BOM", () => {
    expect(rejectUpload({ name: "book.xlsx", size: 10 })).toMatch(/not a CSV or text file/);
    expect(rejectUpload({ name: "big.csv", size: 21 * 1024 * 1024 })).toMatch(/20 MB/);
    const parsed = parseCsv("returns.csv", "\uFEFFdate;return\n2020-01-02;1%\n2020-01-03;-2%\n");
    expect("table" in parsed).toBe(true);
    if (!("table" in parsed)) return;
    const mapping = suggestMapping("strategy", parsed.table);
    const evaluation = evaluateSlot("strategy", parsed.table, mapping);
    expect(evaluation.blocking).toBeNull();
    expect(evaluation.value?.scale).toBe("percent");
    expect(evaluation.value?.points.map((point) => point.value)).toEqual([1, -2]);
  });

  it("blocks duplicate and ambiguous dates, and sorts an unordered file", () => {
    const duplicates = parseCsv("d.csv", "date,return\n2020-01-02,1\n2020-01-02,2\n");
    if (!("table" in duplicates)) throw new Error("expected a table");
    const duplicateEval = evaluateSlot("strategy", duplicates.table, suggestMapping("strategy", duplicates.table));
    expect(duplicateEval.blocking).toMatch(/Duplicate dates: 2020-01-02/);

    const ambiguous = parseCsv("a.csv", "date,return\n02/03/2020,1\n04/05/2020,2\n");
    if (!("table" in ambiguous)) throw new Error("expected a table");
    const suggested = suggestMapping("strategy", ambiguous.table);
    expect(evaluateSlot("strategy", ambiguous.table, suggested).blocking).toMatch(/month-first or day-first/);
    const resolved = evaluateSlot("strategy", ambiguous.table, { ...suggested, dateOrder: "mdy" });
    expect(resolved.value?.points[0].date).toBe("2020-02-03");

    const messy = parseCsv("m.csv", "date,return\n2020-01-03,2\n2020-01-01,1\n2020-01-02,1.5\n");
    if (!("table" in messy)) throw new Error("expected a table");
    const messyEval = evaluateSlot("strategy", messy.table, suggestMapping("strategy", messy.table));
    expect(messyEval.warnings.some((warning) => warning.includes("sorted"))).toBe(true);
    expect(messyEval.value?.points.map((point) => point.date)).toEqual(["2020-01-01", "2020-01-02", "2020-01-03"]);
  });
});

describe("assemblePanel", () => {
  it("inner-joins series, keeps strategy dates when asked, and records the percent scale", () => {
    const strategy = evaluateSlot("strategy", table("date,return,bench\n2020-01-01,0.01,0.00\n2020-01-02,0.02,0.01\n2020-01-03,-0.01,0.02\n"), {
      ...emptyMapping(),
      date: "date",
      value: "return",
      benchmark: "bench",
    });
    const benchmark = evaluateSlot("benchmark", table("date,return\n2020-01-02,0.01\n2020-01-03,0.02\n2020-01-04,0.03\n"), {
      ...emptyMapping(),
      date: "date",
      value: "return",
    });
    const inner = assemblePanel({
      strategy,
      benchmark,
      factors: null,
      benchmarkFile: true,
      factorFile: false,
      seriesKind: "returns",
      frequencyMode: "auto",
      alignment: "inner",
      range: null,
    });
    expect(inner.survival).toEqual({ kept: 2, total: 3 });
    expect(inner.input?.strategy.map((point) => point.date)).toEqual(["2020-01-02", "2020-01-03"]);
    expect(inner.warnings.some((warning) => warning.includes("benchmark file"))).toBe(true);

    const ownDates = assemblePanel({
      strategy,
      benchmark,
      factors: null,
      benchmarkFile: true,
      factorFile: false,
      seriesKind: "returns",
      frequencyMode: "auto",
      alignment: "strategy-dates",
      range: null,
    });
    expect(ownDates.input?.strategy).toHaveLength(3);
    expect(ownDates.input?.benchmark?.map((point) => point.date)).toEqual(["2020-01-02", "2020-01-03"]);

    const percent = evaluateSlot("strategy", table("date,return\n2020-01-02,1%\n2020-01-03,-2%\n"), {
      ...emptyMapping(),
      date: "date",
      value: "return",
    });
    const scaled = assemblePanel({
      strategy: percent,
      benchmark: null,
      factors: null,
      benchmarkFile: false,
      factorFile: false,
      seriesKind: null,
      frequencyMode: "auto",
      alignment: "inner",
      range: null,
    });
    expect(scaled.status.kind).toBe("needs-choice");
    const ready = assemblePanel({
      strategy: percent,
      benchmark: null,
      factors: null,
      benchmarkFile: false,
      factorFile: false,
      seriesKind: "price",
      frequencyMode: "daily",
      alignment: "inner",
      range: { start: "2020-01-03", end: "2020-01-03" },
    });
    expect(ready.status).toMatchObject({ kind: "too-short" });
  });
});

describe("mapping memory", () => {
  it("remembers column roles and not series values", () => {
    rememberMapping("strategy", { ...emptyMapping(), date: "date", value: "return" });
    const stored = localStorage.getItem(mappingStorageKey) ?? "";
    expect(stored).toContain("return");
    expect(stored).not.toContain("0.01");
    expect(recallMapping("strategy", ["date", "return"], emptyMapping()).value).toBe("return");
  });
});

function table(csv: string) {
  const parsed = parseCsv("panel.csv", csv);
  if (!("table" in parsed)) throw new Error(parsed.error);
  return parsed.table;
}

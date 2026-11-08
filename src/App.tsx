import { useEffect, useMemo, useRef, useState } from "react";
import { AnalyzeError, fetchHealth, postAnalyze } from "./api/analyze";
import { DataDock, type SlotView } from "./components/DataDock";
import { Intro, Tearsheet, TooShort, type Banner, type ReportMeta } from "./components/Tearsheet";
import { assemblePanel, type FrequencyMode } from "./lib/alignPanel";
import { recallMapping, rememberMapping } from "./lib/mappingMemory";
import { emptyMapping, evaluateSlot, parseCsv, rejectUpload, suggestMapping, type ColumnMapping, type SlotId } from "./lib/parseCsv";
import type { Alignment, SeriesKind, TearsheetModel } from "./types/tearsheet";

type SlotState = {
  file: SlotView["file"];
  mapping: ColumnMapping;
  parsing: boolean;
  parseError: string | null;
};

type Service = "unknown" | "connected" | "disconnected";

const slotsIds: SlotId[] = ["strategy", "benchmark", "factors"];

function initialSlot(): SlotState {
  return { file: null, mapping: emptyMapping(), parsing: false, parseError: null };
}

export function App() {
  const [slots, setSlots] = useState<Record<SlotId, SlotState>>({
    strategy: initialSlot(),
    benchmark: initialSlot(),
    factors: initialSlot(),
  });
  const [seriesKind, setSeriesKind] = useState<SeriesKind | null>(null);
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>("auto");
  const [alignment, setAlignment] = useState<Alignment>("inner");
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [service, setService] = useState<Service>("unknown");
  const [model, setModel] = useState<TearsheetModel | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState("0");
  const requestSeq = useRef(0);

  const view = useMemo(() => {
    const evaluations = {
      strategy: slots.strategy.file ? evaluateSlot("strategy", slots.strategy.file, slots.strategy.mapping) : null,
      benchmark: slots.benchmark.file ? evaluateSlot("benchmark", slots.benchmark.file, slots.benchmark.mapping) : null,
      factors: slots.factors.file ? evaluateSlot("factors", slots.factors.file, slots.factors.mapping) : null,
    };
    const panel = assemblePanel({
      strategy: evaluations.strategy,
      benchmark: evaluations.benchmark,
      factors: evaluations.factors,
      benchmarkFile: Boolean(slots.benchmark.file),
      factorFile: Boolean(slots.factors.file),
      seriesKind,
      frequencyMode,
      alignment,
      range,
    });
    const slotViews = Object.fromEntries(
      slotsIds.map((slot) => [slot, { ...slots[slot], evaluation: evaluations[slot] }]),
    ) as Record<SlotId, SlotView>;
    return { panel, slotViews };
  }, [slots, seriesKind, frequencyMode, alignment, range]);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const ok = await fetchHealth();
      if (!cancelled) setService(ok ? "connected" : "disconnected");
    };
    void ping();
    const timer = window.setInterval(() => void ping(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const input = view.panel.input;
    if (!input) {
      setLoading(false);
      setModel(null);
      setBanner(null);
      return;
    }
    if (service === "unknown") return;
    if (service === "disconnected") {
      setLoading(false);
      setBanner({ tone: "down", message: "Analysis service is not running" });
      return;
    }
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setLoading(true);
    postAnalyze(input, controller.signal)
      .then((next) => {
        if (seq !== requestSeq.current) return;
        setModel(next);
        setBanner(null);
        setResetKey(String(seq));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (seq !== requestSeq.current || isAbort(error)) return;
        const failed = error instanceof AnalyzeError ? error : new AnalyzeError("failed", "Analysis failed");
        setBanner({ tone: failed.tone, message: failed.message });
        setLoading(false);
      });
    return () => controller.abort();
  }, [view.panel.input, service]);

  async function onFile(slot: SlotId, file: File) {
    const rejected = rejectUpload(file);
    if (rejected) {
      setSlots((current) => ({ ...current, [slot]: { file: null, mapping: emptyMapping(), parsing: false, parseError: rejected } }));
      return;
    }
    setSlots((current) => ({ ...current, [slot]: { file: null, mapping: emptyMapping(), parsing: true, parseError: null } }));
    try {
      const text = await file.text();
      const parsed = parseCsv(file.name, text);
      if ("error" in parsed) {
        setSlots((current) => ({ ...current, [slot]: { file: null, mapping: emptyMapping(), parsing: false, parseError: parsed.error } }));
        return;
      }
      const mapping = recallMapping(slot, parsed.table.headers, suggestMapping(slot, parsed.table));
      setSlots((current) => ({ ...current, [slot]: { file: parsed.table, mapping, parsing: false, parseError: null } }));
    } catch {
      setSlots((current) => ({ ...current, [slot]: { file: null, mapping: emptyMapping(), parsing: false, parseError: "The file could not be read." } }));
    }
  }

  function onMapping(slot: SlotId, mapping: ColumnMapping) {
    rememberMapping(slot, mapping);
    setSlots((current) => ({ ...current, [slot]: { ...current[slot], mapping } }));
  }

  function onRemove(slot: SlotId) {
    setSlots((current) => ({ ...current, [slot]: initialSlot() }));
  }

  function onReset() {
    setSlots({ strategy: initialSlot(), benchmark: initialSlot(), factors: initialSlot() });
    setSeriesKind(null);
    setFrequencyMode("auto");
    setAlignment("inner");
    setRange(null);
    setModel(null);
    setBanner(null);
    setLoading(false);
  }

  const input = view.panel.input;
  const meta: ReportMeta | null = input
    ? {
        filename: slots.strategy.file?.filename ?? "Strategy",
        seriesKind: input.seriesKind,
        frequency: input.frequency,
        alignment: input.alignment,
        hasRiskFree: input.riskFree != null,
        benchmarkAttached: Boolean(slots.benchmark.file) || Boolean(slots.strategy.mapping.benchmark),
        factorsAttached: Boolean(slots.factors.file),
        benchmarkInRequest: input.benchmark != null,
        factorsInRequest: input.factors.length > 0,
      }
    : null;

  const note = view.panel.status.kind === "needs-choice" ? view.panel.status.message : undefined;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-8 min-[960px]:grid-cols-[22rem_minmax(0,1fr)] min-[960px]:px-8">
      <header className="min-[960px]:col-span-2">
        <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Local study</p>
        <h1 className="mt-2 font-serif text-5xl leading-none">Tearsheet</h1>
        <p className="mt-3 max-w-2xl text-muted">Upload a series. The page checks the file, and the Python analysis fills the report.</p>
      </header>
      <DataDock
        service={service}
        slots={view.slotViews}
        panel={view.panel}
        seriesKind={seriesKind}
        frequencyMode={frequencyMode}
        alignment={alignment}
        range={range}
        onFile={onFile}
        onMapping={onMapping}
        onRemove={onRemove}
        onSeriesKind={setSeriesKind}
        onFrequency={setFrequencyMode}
        onAlignment={setAlignment}
        onRange={setRange}
        onReset={onReset}
      />
      <main>
        {view.panel.status.kind === "too-short" ? (
          <TooShort message={view.panel.status.message} />
        ) : meta ? (
          <Tearsheet model={model} meta={meta} banner={banner} loading={loading} resetKey={resetKey} />
        ) : (
          <Intro note={note} />
        )}
      </main>
    </div>
  );
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

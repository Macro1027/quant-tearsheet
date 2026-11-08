import type { AssembledPanel, FrequencyMode } from "../lib/alignPanel";
import type { ColumnMapping, ParsedTable, SlotEvaluation, SlotId } from "../lib/parseCsv";
import type { Alignment, Frequency, SeriesKind } from "../types/tearsheet";
import { UploadSlot } from "./UploadSlot";

export type SlotView = {
  file: ParsedTable | null;
  mapping: ColumnMapping;
  parsing: boolean;
  parseError: string | null;
  evaluation: SlotEvaluation | null;
};

const hints: Record<SlotId, string> = {
  strategy: "Date and a value. Benchmark and risk-free can be extra columns.",
  benchmark: "Optional. Use this when the benchmark is a separate file.",
  factors: "Optional. One column per factor, beside a date.",
};

export function DataDock({
  service,
  slots,
  panel,
  seriesKind,
  frequencyMode,
  alignment,
  range,
  onFile,
  onMapping,
  onRemove,
  onSeriesKind,
  onFrequency,
  onAlignment,
  onRange,
  onReset,
}: {
  service: "unknown" | "connected" | "disconnected";
  slots: Record<SlotId, SlotView>;
  panel: AssembledPanel;
  seriesKind: SeriesKind | null;
  frequencyMode: FrequencyMode;
  alignment: Alignment;
  range: { start: string; end: string } | null;
  onFile: (slot: SlotId, file: File) => void;
  onMapping: (slot: SlotId, mapping: ColumnMapping) => void;
  onRemove: (slot: SlotId) => void;
  onSeriesKind: (kind: SeriesKind | null) => void;
  onFrequency: (mode: FrequencyMode) => void;
  onAlignment: (alignment: Alignment) => void;
  onRange: (range: { start: string; end: string }) => void;
  onReset: () => void;
}) {
  const start = range?.start ?? panel.span?.start ?? "";
  const end = range?.end ?? panel.span?.end ?? "";
  return (
    <aside className="print:hidden min-[960px]:sticky min-[960px]:top-6 min-[960px]:max-h-[calc(100vh-3rem)] min-[960px]:overflow-auto">
      <div className="mb-4 flex items-center gap-2" data-testid="service-status">
        <span className={`inline-block h-2 w-2 rounded-full ${service === "connected" ? "bg-up" : service === "disconnected" ? "bg-down" : "bg-ochre"}`} />
        <p className="font-mono text-[11px] tracking-wide text-muted uppercase">
          {service === "connected" ? "Analysis service connected" : service === "disconnected" ? "Analysis service is not running" : "Checking the analysis service…"}
        </p>
      </div>
      <div className="space-y-4">
        {(["strategy", "benchmark", "factors"] as const).map((slot) => (
          <UploadSlot
            key={slot}
            slot={slot}
            title={slot === "strategy" ? "Strategy" : slot === "benchmark" ? "Benchmark" : "Factors"}
            hint={hints[slot]}
            file={slots[slot].file}
            parsing={slots[slot].parsing}
            parseError={slots[slot].parseError}
            mapping={slots[slot].mapping}
            evaluation={slots[slot].evaluation}
            onFile={(file) => onFile(slot, file)}
            onMapping={(mapping) => onMapping(slot, mapping)}
            onRemove={() => onRemove(slot)}
          />
        ))}
      </div>
      <div className="mt-4 space-y-3 border border-line bg-sheet p-4">
        <label className="block text-sm">
          <span className="text-xs text-muted">Series kind</span>
          <select
            aria-label="Series kind"
            className="mt-1 w-full border border-line bg-sheet px-2 py-2"
            value={seriesKind ?? ""}
            onChange={(event) => onSeriesKind((event.target.value || null) as SeriesKind | null)}
          >
            <option value="">Choose</option>
            <option value="returns">Returns</option>
            <option value="price">Price / level</option>
            <option value="excess">Excess return</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-muted">Frequency</span>
          <select
            aria-label="Frequency"
            className="mt-1 w-full border border-line bg-sheet px-2 py-2"
            value={frequencyMode}
            onChange={(event) => onFrequency(event.target.value as FrequencyMode)}
          >
            <option value="auto">Auto{panel.detectedFrequency ? ` · ${panel.detectedFrequency}` : ""}</option>
            {(["daily", "weekly", "monthly", "quarterly"] as Frequency[]).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-muted">Alignment</span>
          <select
            aria-label="Alignment"
            className="mt-1 w-full border border-line bg-sheet px-2 py-2"
            value={alignment}
            onChange={(event) => onAlignment(event.target.value as Alignment)}
          >
            <option value="inner">Inner join</option>
            <option value="strategy-dates">Strategy dates only</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs text-muted">From</span>
            <input
              aria-label="Range start"
              type="date"
              className="mt-1 w-full border border-line bg-sheet px-2 py-2"
              value={start}
              onChange={(event) => onRange({ start: event.target.value, end })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-muted">To</span>
            <input
              aria-label="Range end"
              type="date"
              className="mt-1 w-full border border-line bg-sheet px-2 py-2"
              value={end}
              onChange={(event) => onRange({ start, end: event.target.value })}
            />
          </label>
        </div>
        {panel.survival ? (
          <p className="font-mono text-[11px] text-muted">
            {panel.survival.kept} of {panel.survival.total} strategy dates survive the alignment.
          </p>
        ) : null}
        {panel.warnings.length ? (
          <ul className="space-y-1 text-xs text-ochre">
            {panel.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        {panel.preview.length ? (
          <div className="max-h-48 overflow-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead>
                <tr>
                  <th className="border-b border-line px-2 py-1 font-medium text-muted" scope="col">Date</th>
                  <th className="border-b border-line px-2 py-1 font-medium text-muted" scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {panel.preview.map((row) => (
                  <tr key={row.date} className={row.inRange ? "" : "text-muted"}>
                    <td className="border-b border-line px-2 py-1">{row.date}{row.inRange ? "" : " · outside range"}</td>
                    <td className="border-b border-line px-2 py-1 tabular">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <button type="button" className="no-print text-sm text-muted underline-offset-2 hover:underline" onClick={onReset}>
          Reset
        </button>
      </div>
    </aside>
  );
}

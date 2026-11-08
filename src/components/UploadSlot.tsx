import { useRef, useState } from "react";
import type { ColumnMapping, ParsedTable, SlotEvaluation, SlotId } from "../lib/parseCsv";

export function UploadSlot({
  title,
  hint,
  slot,
  file,
  parsing,
  parseError,
  mapping,
  evaluation,
  onFile,
  onMapping,
  onRemove,
}: {
  title: string;
  hint: string;
  slot: SlotId;
  file: ParsedTable | null;
  parsing: boolean;
  parseError: string | null;
  mapping: ColumnMapping;
  evaluation: SlotEvaluation | null;
  onFile: (file: File) => void;
  onMapping: (mapping: ColumnMapping) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const label = `Upload ${title.toLowerCase()} CSV`;

  return (
    <section className="border border-line bg-sheet p-4" aria-labelledby={`${slot}-title`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${slot}-title`} className="font-serif text-2xl">{title}</h2>
        {file ? (
          <button type="button" className="font-mono text-[11px] text-muted underline-offset-2 hover:underline" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <button
        type="button"
        className={`no-print mt-3 w-full border border-dashed px-3 py-4 text-left text-sm ${over ? "border-pine bg-pine/5" : "border-line"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const next = event.dataTransfer.files[0];
          if (next) onFile(next);
        }}
      >
        {parsing ? "Reading file…" : file ? "Replace file" : "Drop a CSV here, or choose a file"}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        aria-label={label}
        accept=".csv,.txt,.tsv,text/csv,text/plain"
        disabled={parsing}
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = "";
          if (next) onFile(next);
        }}
      />
      {parseError ? <p className="mt-3 text-sm text-down" role="alert">{parseError}</p> : null}
      {file ? (
        <div className="mt-4 space-y-3">
          <p className="truncate font-mono text-xs text-muted">{file.filename}</p>
          {evaluation?.blocking ? <p className="text-sm text-down" role="alert">{evaluation.blocking}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <ColumnSelect label="Date" value={mapping.date} headers={file.headers} allowEmpty={false} onChange={(date) => onMapping({ ...mapping, date })} />
            {slot !== "factors" ? (
              <ColumnSelect label="Value" value={mapping.value} headers={file.headers} allowEmpty={false} onChange={(value) => onMapping({ ...mapping, value })} />
            ) : null}
            {slot === "strategy" ? (
              <ColumnSelect label="Benchmark" value={mapping.benchmark} headers={file.headers} allowEmpty onChange={(benchmark) => onMapping({ ...mapping, benchmark })} />
            ) : null}
            {slot !== "factors" ? (
              <ColumnSelect label="Risk-free" value={mapping.riskFree} headers={file.headers} allowEmpty onChange={(riskFree) => onMapping({ ...mapping, riskFree })} />
            ) : null}
          </div>
          {evaluation?.ambiguousExample ? (
            <fieldset className="border border-line p-3">
              <legend className="px-1 text-xs text-muted">Dates such as {evaluation.ambiguousExample} can be read two ways.</legend>
              <div className="mt-2 flex gap-2">
                <OrderButton pressed={mapping.dateOrder === "mdy"} onClick={() => onMapping({ ...mapping, dateOrder: "mdy" })}>Month first</OrderButton>
                <OrderButton pressed={mapping.dateOrder === "dmy"} onClick={() => onMapping({ ...mapping, dateOrder: "dmy" })}>Day first</OrderButton>
              </div>
            </fieldset>
          ) : null}
          {slot === "factors" ? (
            <fieldset>
              <legend className="text-xs text-muted">Factor columns</legend>
              <div className="mt-2 max-h-36 space-y-1 overflow-auto">
                {file.headers.filter((header) => header !== mapping.date).map((header) => (
                  <label key={header} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!mapping.excluded.includes(header)}
                      onChange={(event) => {
                        const excluded = event.target.checked ? mapping.excluded.filter((name) => name !== header) : [...mapping.excluded, header];
                        onMapping({ ...mapping, excluded });
                      }}
                    />
                    {header}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {evaluation ? <SlotSummary evaluation={evaluation} /> : null}
          {evaluation?.warnings.length ? (
            <ul className="space-y-1 text-xs text-ochre">
              {evaluation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead>
                <tr>
                  {file.headers.map((header) => (
                    <th key={header} className="border-b border-line px-2 py-1 font-medium text-muted" scope="col">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.rows.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${index}-${cellIndex}`} className="border-b border-line px-2 py-1">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SlotSummary({ evaluation }: { evaluation: SlotEvaluation }) {
  const { summary } = evaluation;
  const bits = [
    `${summary.rowCount} rows`,
    summary.start && summary.end ? `${summary.start} to ${summary.end}` : null,
    summary.valueScale === "percent" ? "Quoted in percent" : summary.valueScale === "decimal" ? "Decimal" : null,
    `${summary.missingCount} missing`,
    `${summary.gapCount} gaps`,
    summary.duplicateCount ? `${summary.duplicateCount} duplicate dates` : null,
  ].filter(Boolean);
  return <p className="font-mono text-[11px] leading-relaxed text-muted">{bits.join(" · ")}</p>;
}

function ColumnSelect({
  label,
  value,
  headers,
  allowEmpty,
  onChange,
}: {
  label: string;
  value: string | null;
  headers: string[];
  allowEmpty: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-muted">{label}</span>
      <select
        className="mt-1 w-full border border-line bg-sheet px-2 py-2"
        value={value ?? ""}
        aria-label={label}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{allowEmpty ? "None" : "Choose"}</option>
        {headers.map((header) => (
          <option key={header} value={header}>{header}</option>
        ))}
      </select>
    </label>
  );
}

function OrderButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`border px-2 py-1 text-xs ${pressed ? "border-pine bg-pine text-sheet" : "border-line"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

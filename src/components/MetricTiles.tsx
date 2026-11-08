export function MetricTiles({ items }: { items: { label: string; value: string; gloss?: string }[] }) {
  return (
    <dl className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="bg-sheet px-4 py-3">
          <dt className="text-[11px] tracking-wide text-muted uppercase">{item.label}</dt>
          <dd className="tabular mt-2 font-mono text-[1.65rem] leading-none text-ink">{item.value}</dd>
          {item.gloss ? <p className="mt-2 text-xs leading-snug text-muted">{item.gloss}</p> : null}
        </div>
      ))}
    </dl>
  );
}

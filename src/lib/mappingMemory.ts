import type { ColumnMapping, SlotId } from "./parseCsv";

const KEY = "tearsheet.columnMapping";

type Store = Partial<Record<SlotId, ColumnMapping>>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable. Mapping still works for this page view.
  }
}

export function rememberMapping(slot: SlotId, mapping: ColumnMapping) {
  const store = read();
  store[slot] = mapping;
  write(store);
}

export function recallMapping(slot: SlotId, headers: string[], suggested: ColumnMapping): ColumnMapping {
  const saved = read()[slot];
  if (!saved) return suggested;
  const known = (name: string | null) => (name && headers.includes(name) ? name : null);
  return {
    date: known(saved.date) ?? suggested.date,
    value: known(saved.value) ?? suggested.value,
    benchmark: known(saved.benchmark) ?? suggested.benchmark,
    riskFree: known(saved.riskFree) ?? suggested.riskFree,
    excluded: Array.isArray(saved.excluded) ? saved.excluded.filter((name) => headers.includes(name)) : [],
    dateOrder: saved.dateOrder === "mdy" || saved.dateOrder === "dmy" ? saved.dateOrder : suggested.dateOrder,
  };
}

export const mappingStorageKey = KEY;

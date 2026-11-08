# Tearsheet — Product Requirements

**Status:** Draft for the first milestone  
**Owner:** Frontend and file upload live in this repo. All quantitative calculations are implemented separately by the project owner.  
**Surface:** A single-page, client-only web app. Files stay in the browser.

## 1. Summary

Tearsheet is a browser app for turning an uploaded CSV into a full performance tearsheet. The person using it loads a return or price series, optionally a benchmark and a set of factors, and reads the result as one document: headline performance, path and drawdowns, distribution and regression diagnostics, benchmark-relative results, standalone risk, and factor-model risk.

This repository builds the product shell that makes that reading possible:

- Upload, parse, validate, map, and align CSV files.
- Hold the resulting panel in memory and pass it to a single analysis function.
- Render every tearsheet section from the object that function returns.
- Explain, in plain language, what each block is for, so the page is also a map of the subject.

This repository does not implement the statistics. Sharpe ratios, regressions, value-at-risk, factor betas, and every other number are produced by code the owner writes against the contract in section 8. Until that function fills a field, the matching block shows an explicit empty state and never a placeholder number.

## 2. Why this exists

A useful tearsheet is wide. Performance, distributional shape, regression against a benchmark, active risk, and factor attribution answer different questions, and they are easy to study as isolated formulas and hard to study as one argument about a track record. The app’s job is to put that whole argument on one screen, fed by the user’s own file, with each block labeled clearly enough that working through the page is a way to learn the material.

The split of work follows from that. The interface, the file pipeline, and the teaching captions are product work. The estimators are the owner’s work, and they should be able to land without a redesign of the page.

## 3. Goals

1. A CSV can be loaded, checked, and understood before any analysis runs.
2. The tearsheet presents a broad, fixed set of sections covering performance, statistical and regression analysis, benchmarking, risk, and factor models.
3. Each section can render as soon as its data is present, and can stay empty while the rest of the page works.
4. The owner can implement analysis by filling in one typed function and the types next to it, without changing upload or layout code.
5. Series data never leaves the browser in this version.

## 4. Non-goals

- Computing any performance, risk, regression, or factor statistic.
- Converting prices to returns, excess returns, or log returns. The screen records what kind of series the file is; the analysis function interprets it.
- Filling missing returns, winsorizing, or choosing an imputation rule.
- A backtest engine, an optimizer, a broker connection, or a market-data feed.
- Accounts, a backend, cloud storage, or multi-user sharing.
- Generating a PDF. A print stylesheet is enough for this version.

## 5. Who it is for

One user: the owner, studying a strategy or portfolio they already have numbers for. They know what they want to compute, and they want the page to demand the full set of standard tearsheet questions rather than a thin summary. Secondary use is reopening the same page with a different file and comparing the shape of the report, not storing a library of past runs.

## 6. Decisions

| Topic | Decision |
| --- | --- |
| Stack | Vite, React, TypeScript, Tailwind CSS. Charts render data they are given. |
| Persistence | In memory for the session. Column-mapping choices may be stored in `localStorage`. Series values are not. |
| Analysis entry | `src/quant/analyze.ts` exports `analyze(input: AnalysisInput): TearsheetModel`. The file ships as a stub that returns every section as `null`. The owner replaces the body. |
| Types | `src/types/tearsheet.ts` is the shared contract. Frontend and analysis both import it. |
| Default series kind | The user must choose Returns, Price / level, or Excess return before analysis runs. The app does not guess a conversion. |
| Alignment | Inner join on parsed dates across strategy, benchmark, risk-free, and factors. The user can switch to “strategy dates only” and leave other series missing where dates do not match. |
| Date range | A range control slices the aligned panel, then calls `analyze` again. Slicing is frontend work. |
| Frequency | Detect a candidate from the median gap between dates, show it, and let the user override to daily, weekly, monthly, or quarterly. The override is passed through; annualization stays in the analysis function. |
| Numbers on screen | Format only. The analysis function returns raw values. The UI applies percent, ratio, and date formatting. |
| Empty numbers | A missing section is `null`. The UI must not substitute zero. |

## 7. Experience

The app is one page with two regions.

**Data dock.** Three upload slots — strategy (required), benchmark (optional), factors (optional) — plus a short validation summary, series kind, frequency, alignment, and date range. A strategy file may already contain benchmark and risk-free columns; the mapper can point at those and the extra slots stay unused.

**Tearsheet.** A single scrolling report. The order is fixed: overview, performance, distribution and regression, benchmark, risk, factor model. A section with a `null` model is still visible, with its title, a two- or three-sentence explanation of the question it answers, and the sentence “Not computed yet.” A section with data shows the charts and tables below and keeps the explanation.

Changing a file, a mapping, the date range, the frequency override, or the alignment rule rebuilds the panel and calls `analyze` again. The previous tearsheet stays on screen until the new model returns.

There is no second page in this version. There is no saved-history list.

## 8. The contract the analysis function implements

The frontend guarantees a normalized panel. The analysis function guarantees a model whose sections are either fully absent (`null`) or populated with the fields for that section. Partial objects inside a section are not part of the contract.

### 8.1 What the frontend passes in

```ts
type SeriesKind = "returns" | "price" | "excess";
type Frequency = "daily" | "weekly" | "monthly" | "quarterly";
type Alignment = "inner" | "strategy-dates";

type Point = { date: string; value: number }; // ISO date, finite number

type AnalysisInput = {
  seriesKind: SeriesKind;
  frequency: Frequency;
  alignment: Alignment;
  strategy: Point[];
  benchmark: Point[] | null;
  riskFree: Point[] | null;
  factors: { name: string; points: Point[] }[];
  range: { start: string; end: string };
};
```

Dates are sorted ascending. Duplicate dates have already been rejected. Values are finite numbers in the units of the file (a return of 1% may be `0.01` or `1`; the UI records which, see section 9). The frontend does not scale them.

### 8.2 What the analysis function returns

```ts
type TearsheetModel = {
  overview: OverviewModel | null;
  performance: PerformanceModel | null;
  regression: RegressionModel | null;
  benchmark: BenchmarkModel | null;
  risk: RiskModel | null;
  factors: FactorModel | null;
};
```

Field lists for each model are in section 10. They are display fields: the number, the sample size it was computed on, and enough series to draw the chart. The type file is the source of truth when this document and the code disagree; this document is the source of truth for what the screen must contain.

The stub returns all six fields as `null`. The owner may ship one section at a time by returning a model for that section and `null` for the others.

### 8.3 How the UI treats the function

- `analyze` is called only when the strategy series has at least two points after slicing and the user has confirmed series kind.
- The UI calls it synchronously first. The call site is written so it can later return a promise without a change to the sections.
- A thrown error is shown as a banner on the tearsheet (“Analysis failed”) with the message, and the previous successful model remains visible if there was one.
- The UI never inspects intermediate math, only `TearsheetModel`.

## 9. File upload and management

This is the part of the product this milestone fully implements.

### 9.1 Slots

| Slot | Required | What it may contain |
| --- | --- | --- |
| Strategy | Yes | Date column plus one value column. Optional extra columns for benchmark and risk-free. |
| Benchmark | No | Date column plus one value column, used when the benchmark is not already in the strategy file. |
| Factors | No | Date column plus one column per factor. Column headers become factor names. |

Each slot accepts one file at a time. Replacing a file clears that slot’s mapping and re-runs validation. Removing the strategy file clears the tearsheet back to the initial empty page. Removing the benchmark or factors file recomputes without those inputs.

### 9.2 Accepting a file

- The control is a drop zone and a file picker on each slot.
- Accepted types: `.csv`, and text files that parse as delimited tables. Other extensions are refused with a direct reason.
- Maximum size: 20 MB. Larger files are refused before parsing.
- Encoding: UTF-8. A leading byte-order mark is stripped.
- Delimiter: comma, semicolon, or tab, chosen as the delimiter that yields the most consistent column count on the first 50 non-empty lines.
- The first non-empty row is the header. Headers are trimmed. An empty header cell is named `column_N`.
- Parsing runs in the browser. A parse error names the row when the parser can.

### 9.3 Column mapping

After a successful parse, the slot shows the header list, a five-row preview, and the mapping controls.

- **Date** — required on every slot. Auto-suggested when a header matches `date`, `time`, `timestamp`, or `datetime` and the column parses.
- **Value** — required on strategy and benchmark. Auto-suggested from `return`, `returns`, `ret`, `pnl`, `price`, `close`, `level`, `nav`, `equity`.
- **Benchmark** — optional, strategy file only.
- **Risk-free** — optional, strategy file only, or a column in the benchmark file labeled as such.
- Factor files have no value picker. Every non-date column is a factor. The user can exclude a column.

The user can override every suggestion. Analysis stays disabled until the strategy date and value are both mapped and valid.

### 9.4 Parsing cells

- Dates: ISO `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, and timestamps whose calendar date is unambiguous. Ambiguous day/month values are reported and the user picks a day-first or month-first reading for that file.
- Numbers: strip thousands separators and a trailing percent sign; parentheses mean negative. A trailing percent sign marks the column as “quoted in percent” and the UI shows that flag next to the series kind. The stored number keeps the percent sign removed and is **not** divided by 100. The flag is passed on the input as `valueScale: "decimal" | "percent"` per series, so the analysis function can scale if it chooses.
- Blank cells, `NA`, `N/A`, `null`, and `NaN` are missing. Missing value rows are dropped from that series and counted in the validation summary. They are not filled.

### 9.5 Validation

**Blocking.** The slot cannot be used until these are clear.

- No parseable date column, or no parseable value column.
- Fewer than two dated numeric rows.
- Duplicate timestamps after parsing. The summary lists the first ten offending dates.
- A factor file whose every non-date column was excluded.

**Warnings.** The file can still be used.

- Dates were out of order. The app sorts them and says so.
- Gaps: a gap larger than three times the median spacing. Count and first examples are shown.
- The series is marked percent (a percent sign was present) or looks like it might be (median absolute value greater than 1). The second case is a warning, not a conversion.
- Benchmark or factor dates cover only part of the strategy. The summary states how many strategy dates survive the current alignment.
- Irregular spacing, so the frequency guess is weak.

The validation summary is always visible in the dock while a file is loaded: row count, date span, duplicate count, missing count, gap count, scale flag, and alignment survival count.

### 9.6 Preview and range

- The dock shows a scrollable preview of the mapped strategy series (date and value), up to the first 100 rows, with a note of the full count.
- The date-range control defaults to the full aligned span. The user can narrow it. The sliced series is what `analyze` receives, and the preview marks rows outside the range.
- Frequency is a select: Auto, Daily, Weekly, Monthly, Quarterly. Auto displays the detected candidate. The value sent to `analyze` is the override, or the candidate when Auto is selected. If Auto cannot decide, the control requires an explicit choice.

### 9.7 Session behavior

- Refreshing the page drops the files. That is intentional in this version.
- The last mapping of header name → role is remembered per slot in `localStorage` so a file with the same headers maps itself the next time. Values are not written there.
- A “Reset” action clears slots, memory, and the tearsheet.

## 10. Tearsheet sections

Each section has a stable title, a short explanation, and a body that depends on its model. Charts receive points already computed by the analysis function. The UI sorts them by date for display if needed and does not transform values beyond formatting.

Explanations live in the frontend copy. They define the question the block answers. They do not state a formula.

### 10.1 Overview

**Question it answers.** What is this series, over what span, and what are the few numbers that frame everything below?

**Body.**

- Identity line: series kind, frequency, alignment, start, end, number of observations used.
- Tiles: total growth of a unit, annualized return, annualized volatility, Sharpe ratio, maximum drawdown, Calmar ratio. Each tile shows the value and a one-line gloss from the copy deck (for example, Sharpe’s gloss is “Return in excess of the risk-free series, per unit of volatility”).
- If `riskFree` is null, the Sharpe tile still renders when the model provides it, and the gloss notes that the analysis function chose the risk-free treatment.

**Model.**

```ts
type OverviewModel = {
  start: string;
  end: string;
  observations: number;
  totalGrowth: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpe: number | null;
  maxDrawdown: number;
  calmar: number | null;
};
```

`sharpe` and `calmar` may be `null` when the analysis function refuses them (for example, zero volatility). The tile then reads “Undefined” and does not show a fake value. A `null` overview section is the whole-section empty state, distinct from a null tile inside a present overview.

### 10.2 Performance

**Question it answers.** How did the series accumulate, how did that path break into calendar periods, and how deep were the losses along the way?

**Body.**

- Cumulative growth chart. One line for the strategy. A second line when the model includes a benchmark path.
- Drawdown chart (underwater), strategy only, as a filled area.
- Monthly returns heatmap: years as rows, months as columns, a final year-total column. Cells are colored on a diverging scale from the values in the model. Missing months stay blank.
- Table of the five largest drawdowns: start, trough, end, depth, length in observations, recovery length. Recovery end may be null when the drawdown is open.
- Rolling panel with a window control (21, 63, 126, 252 observations — labels shown as “21 periods” and so on, since frequency is not always daily). One chart, three series the model may supply: rolling annualized return, rolling annualized volatility, rolling Sharpe. A series the model omits is left off the legend.

**Model.**

```ts
type PerformanceModel = {
  cumulative: Point[];
  benchmarkCumulative: Point[] | null;
  drawdown: Point[];
  monthlyReturns: { year: number; month: number; value: number }[];
  annualReturns: { year: number; value: number }[];
  drawdownEpisodes: {
    start: string;
    trough: string;
    end: string | null;
    depth: number;
    length: number;
    recovery: number | null;
  }[];
  rolling: {
    window: number;
    return: Point[] | null;
    volatility: Point[] | null;
    sharpe: Point[] | null;
  }[];
};
```

The window control selects which `rolling` entry to draw. If the model returns an empty `rolling` array, the panel shows its explanation and “Not computed yet” for that panel only.

### 10.3 Distribution and regression

**Question it answers.** What shape do the period returns have, and how does a straight-line fit against the benchmark describe them?

**Body.**

- Moment tiles: mean, volatility, skewness, excess kurtosis, sample size.
- Histogram of period returns, with bin edges and counts supplied by the model.
- Normal quantile-quantile points supplied by the model, plotted as a scatter against a reference line.
- Autocorrelation bars at lags the model provides.
- When a benchmark is present: scatter of strategy vs benchmark period values, plus the model’s fitted line as slope and intercept.
- Regression table. Rows are the terms the model returns (intercept, benchmark, and any extra terms). Columns: coefficient, standard error, t-statistic, p-value. Footer: observations, R², adjusted R², residual standard error.
- Residual time series, and a small residual histogram, when those arrays are present.
- A single line of diagnostic names and values for whatever tests the model includes (the UI prints the label and the statistic; it does not know the test).

**Model.**

```ts
type RegressionModel = {
  mean: number;
  volatility: number;
  skewness: number;
  excessKurtosis: number;
  observations: number;
  histogram: { x0: number; x1: number; count: number }[];
  qq: { theoretical: number; sample: number }[];
  autocorrelation: { lag: number; value: number }[];
  fit: {
    x: Point[];
    y: Point[];
    intercept: number;
    slope: number;
  } | null;
  coefficients: {
    name: string;
    estimate: number;
    stdError: number;
    tStat: number;
    pValue: number;
  }[];
  rSquared: number | null;
  adjustedRSquared: number | null;
  residualStdError: number | null;
  residuals: Point[] | null;
  residualHistogram: { x0: number; x1: number; count: number }[] | null;
  diagnostics: { name: string; value: number; pValue: number | null }[];
};
```

If `benchmark` was not supplied, `fit` is `null` and the regression table may still contain an intercept-only result. The scatter block hides when `fit` is `null`. The section itself is present whenever the model is non-null, because the moments and histogram stand on the strategy alone.

### 10.4 Benchmark

**Question it answers.** Where did the series beat or lag the reference, and how does that depend on whether the reference was up or down?

The section stays in the page when no benchmark is loaded. Its empty state reads “Add a benchmark to see relative performance.” That copy is different from “Not computed yet,” which is reserved for a loaded benchmark whose model is still `null`.

**Body.**

- Cumulative chart of strategy, benchmark, and active (strategy minus benchmark) growth, using three series from the model.
- Tiles: annualized active return, tracking error, information ratio, batting average (share of periods ahead of the benchmark), up capture, down capture.
- Rolling beta and rolling correlation for the selected window, same window control as performance, fed by this section’s own arrays.

**Model.**

```ts
type BenchmarkModel = {
  strategyCumulative: Point[];
  benchmarkCumulative: Point[];
  activeCumulative: Point[];
  annualizedActiveReturn: number;
  trackingError: number;
  informationRatio: number | null;
  battingAverage: number;
  upCapture: number | null;
  downCapture: number | null;
  rolling: {
    window: number;
    beta: Point[] | null;
    correlation: Point[] | null;
  }[];
};
```

### 10.5 Risk

**Question it answers.** How large are typical losses, how heavy is the left tail, and how long does pain last?

**Body.**

- Tiles: annualized volatility, downside deviation, maximum drawdown, average drawdown, ulcer index, value-at-risk, expected shortfall.
- A confidence select, 95% or 99%. The model contains both settings; the select chooses which pair of VaR and expected-shortfall tiles to show.
- Tail chart: the worst 5% of period returns as a bar list (date and value), capped at 20 rows, from the model.
- A one-line note of the sample size used for the tail measures.

**Model.**

```ts
type RiskModel = {
  annualizedVolatility: number;
  downsideDeviation: number | null;
  maxDrawdown: number;
  averageDrawdown: number | null;
  ulcerIndex: number | null;
  byConfidence: {
    confidence: 0.95 | 0.99;
    valueAtRisk: number;
    expectedShortfall: number;
  }[];
  worstPeriods: { date: string; value: number }[];
  observations: number;
};
```

### 10.6 Factor model

**Question it answers.** How much of the series lines up with the uploaded factors, what is left over, and which factors account for return and for risk?

The section stays visible with “Add a factor file to see exposures and risk decomposition.” until a factor file is loaded. After that, a `null` model uses “Not computed yet.”

**Body.**

- Exposure table: one row per factor plus intercept. Columns: coefficient, standard error, t-statistic, p-value.
- Fit tiles: R², residual volatility, annualized residual volatility when the model provides it.
- Contribution bar chart: factor name and contribution to mean return, values supplied ready to plot.
- Risk split: a two-part breakdown, systematic and idiosyncratic, as shares that the chart labels with the model’s own percentages.
- Correlation heatmap among the strategy and the factors, matrix supplied in full.

**Model.**

```ts
type FactorModel = {
  coefficients: {
    name: string;
    estimate: number;
    stdError: number;
    tStat: number;
    pValue: number;
  }[];
  rSquared: number;
  residualVolatility: number;
  annualizedResidualVolatility: number | null;
  returnContribution: { name: string; value: number }[];
  riskShare: { systematic: number; idiosyncratic: number };
  correlation: { names: string[]; matrix: number[][] };
};
```

Factor names are the CSV headers the user kept. The UI does not rename them to a standard model. A caption under the table says the factors are whatever the file contained.

## 11. Interface copy and formatting

- Section titles are the six names in section 10, in that order.
- Explanations are stored in one copy module, not inline in chart components, so wording can be edited without touching layout.
- Percent-like metrics (returns, drawdowns, volatilities, VaR, capture) render as percentages with two decimal places. Ratios (Sharpe, information ratio, Calmar) render with two decimal places and no percent sign. Correlation and R² render with two decimal places. p-values render in scientific notation below 0.001 and with three decimal places otherwise.
- Dates render as `YYYY-MM-DD`.
- Chart axes use the same formatters as the tiles.
- Color encodes sign on heatmaps and drawdowns, and series identity on line charts. The palette is defined once.
- The page is readable on a laptop-width window. The dock stacks above the report below 960px. Tables scroll horizontally instead of overflowing the page.
- Print CSS hides the dock’s drop zones and prints the tearsheet as a continuous document, with each section allowed to break across pages and tables kept together when they are short.

## 12. Components

The first implementation is expected to split along these lines. Names can change; responsibilities should not.

| Piece | Responsibility |
| --- | --- |
| `App` | Holds slot state, build the `AnalysisInput`, call `analyze`, hold the model and the last error. |
| `DataDock` | Slots, validation summary, series kind, scale flags, frequency, alignment, range, reset. |
| `UploadSlot` | Drop zone, picker, parse, preview, mapping, remove and replace. |
| `parseCsv` | Delimiter, header, type checks, date and number parsing, duplicate and gap reports. No statistics. |
| `alignPanel` | Join on dates, apply the range slice, produce `AnalysisInput`. |
| `Tearsheet` | Renders the six sections from a model. |
| `Section` | Title, explanation, empty state, error isolation so one bad chart does not blank the page. |
| `MetricTiles`, chart wrappers, tables | Presentation of fields already on the model. |
| `src/quant/analyze.ts` | Stub. Owner’s code. |
| `src/types/tearsheet.ts` | The types in sections 8 and 10. |

A chart wrapper that receives `null` renders nothing and leaves the section-level empty state in charge. A wrapper that receives an empty array renders “No points in range.”

## 13. Empty, loading, and failure states

| State | What the user sees |
| --- | --- |
| No strategy file | The dock, plus a tearsheet intro that lists the six sections and says a strategy CSV is the starting point. |
| File rejected | The slot shows the blocking reason. Other slots are unchanged. |
| File accepted, mapping incomplete | Preview and the list of what is still unmapped. Tearsheet stays on the intro. |
| Ready | The report, with each section filled or explicitly not computed. |
| Analysis threw | Banner with the error message, previous model kept. |
| Date range leaves fewer than two points | Analysis is not called. The report says the range is too short. |
| Benchmark or factors absent | Those sections show the “add a file” empty state. Other sections still render. |

Busy state: parsing a multi-megabyte file shows a slot-level “Reading file…” state and disables that slot’s replace control until parsing finishes. The analysis stub is instant. When `analyze` becomes asynchronous, the report shows a thin progress line and keeps the previous model.

## 14. Accessibility and input

- Drop zones are buttons as well as drop targets, and they are reachable by keyboard.
- Mapping controls are labeled selects.
- Charts have a text summary: the series name, the start and end, and the last value. The table forms of monthly returns, drawdowns, regression, and factors are the accessible version of those pictures.
- Color is not the only sign encoding. Heatmap cells also show the formatted number. Positive and negative drawdowns are labeled on the axis.

## 15. Project layout

```
src/
  components/        # dock, tearsheet, charts, tables
  copy/sections.ts   # explanations
  lib/parseCsv.ts
  lib/alignPanel.ts
  lib/format.ts
  quant/analyze.ts   # stub, then the owner's implementation
  types/tearsheet.ts
  App.tsx
  main.tsx
```

Dependencies for the first build: React, a CSV parser, and one chart library. No statistics library. Adding one later is the owner’s choice inside `src/quant/` and does not change the contract.

## 16. Acceptance for this milestone

The milestone is done when all of the following are true.

1. A strategy CSV can be dropped or chosen, mapped, previewed, and cleared, and a bad file is refused with a specific reason.
2. Optional benchmark and factor files participate in alignment, and removing them updates the input.
3. Series kind, percent scale flag, frequency, alignment, and date range are visible and are part of `AnalysisInput`.
4. With the stub in place, all six sections render their explanations and the correct empty state, and no section shows a zero in place of a missing result.
5. A hand-built `TearsheetModel` returned from `analyze` (a fixture the owner can temporarily return) fills every chart and table in this document without further UI work.
6. A thrown error in `analyze` surfaces the banner and leaves the last good model on screen.
7. Reloading the page leaves no series values behind in storage. Remapping a file whose headers were mapped before restores those roles.
8. The page is usable at laptop width and with the dock stacked, and printing hides the upload controls.

## 17. Later, outside this milestone

These are named so the frontend does not accidentally absorb them.

- The body of `analyze` and any helper modules under `src/quant/` beyond the stub.
- Tests of statistical correctness. Frontend tests cover parsing, alignment, formatting, and “given this model, these labels appear.”
- A second strategy side by side, a trade blotter, and anything that needs a server.

When the owner implements a section, the only required edit outside `src/quant/` is none. If a result genuinely cannot fit the model, the type in `src/types/tearsheet.ts` changes first, and the matching component follows. The upload pipeline stays as specified here.

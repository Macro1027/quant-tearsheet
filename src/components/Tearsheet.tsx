import { useState, type ReactNode } from "react";
import { emptyCopy, gloss, sections } from "../copy/sections";
import { formatCount, formatMetric, formatP, formatPercent, formatRatio, formatStat } from "../lib/format";
import type { Alignment, BenchmarkModel, FactorModel, Frequency, PerformanceModel, RegressionModel, RiskModel, SeriesKind, TearsheetModel } from "../types/tearsheet";
import { BarSeriesChart, CorrelationTable, DrawdownChart, FitChart, GrowthChart, HistogramChart, MonthHeatmap, palette, QQChart, ShareBar } from "./Charts";
import { MetricTiles } from "./MetricTiles";
import { Section } from "./Section";

export type ReportMeta = {
  filename: string;
  seriesKind: SeriesKind;
  frequency: Frequency;
  alignment: Alignment;
  hasRiskFree: boolean;
  benchmarkAttached: boolean;
  factorsAttached: boolean;
  benchmarkInRequest: boolean;
  factorsInRequest: boolean;
};

export type Banner = { tone: "down" | "failed"; message: string };

const kindLabel: Record<SeriesKind, string> = {
  returns: "Returns",
  price: "Price / level",
  excess: "Excess return",
};

const alignmentLabel: Record<Alignment, string> = {
  inner: "Inner join",
  "strategy-dates": "Strategy dates",
};

export function Tearsheet({
  model,
  meta,
  banner,
  loading,
  resetKey,
}: {
  model: TearsheetModel | null;
  meta: ReportMeta;
  banner: Banner | null;
  loading: boolean;
  resetKey: string;
}) {
  return (
    <article className="sheet px-5 py-6 sm:px-8" data-testid="tearsheet">
      <header className="mb-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Tearsheet</p>
        <h2 className="mt-2 font-serif text-4xl leading-none">{meta.filename}</h2>
        <p className="mt-3 font-mono text-xs text-muted">
          {kindLabel[meta.seriesKind]} · {meta.frequency} · {alignmentLabel[meta.alignment]}
        </p>
      </header>
      {loading ? (
        <div className="progress mb-4" role="progressbar" aria-label="Analysis running">
          <span />
        </div>
      ) : null}
      {banner ? (
        <div role="alert" className="mb-6 border border-down/30 bg-down/5 px-4 py-3 text-sm" data-testid="banner">
          <p className="font-medium">{banner.tone === "down" ? "Analysis service is not running" : "Analysis failed"}</p>
          {banner.tone === "failed" && banner.message !== "Analysis failed" ? <p className="mt-1 text-muted">{banner.message}</p> : null}
        </div>
      ) : null}
      <Overview model={model?.overview ?? null} meta={meta} resetKey={resetKey} />
      <Performance model={model?.performance ?? null} resetKey={resetKey} />
      <Regression model={model?.regression ?? null} resetKey={resetKey} />
      <Benchmark model={model?.benchmark ?? null} meta={meta} resetKey={resetKey} />
      <Risk model={model?.risk ?? null} resetKey={resetKey} />
      <Factors model={model?.factors ?? null} meta={meta} resetKey={resetKey} />
    </article>
  );
}

export function Intro({ note }: { note?: string }) {
  return (
    <article className="sheet px-5 py-8 sm:px-8" data-testid="intro">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Tearsheet</p>
      <h2 className="mt-2 max-w-xl font-serif text-4xl leading-tight">A strategy CSV is the starting point.</h2>
      <p className="mt-4 max-w-xl text-muted">The report reads one record six ways. Each block stays visible, and it fills in when the analysis returns that section.</p>
      {note ? <p className="mt-4 max-w-xl text-sm text-pine">{note}</p> : null}
      <ol className="mt-8 divide-y divide-line border-y border-line">
        {sections.map((section) => (
          <li key={section.id} className="grid gap-2 py-4 sm:grid-cols-[4rem_1fr]">
            <span className="font-mono text-xs text-muted">{section.index}</span>
            <span>
              <span className="font-serif text-xl">{section.title}</span>
              <span className="mt-1 block text-sm text-muted">{section.explanation}</span>
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function TooShort({ message }: { message: string }) {
  return (
    <article className="sheet px-5 py-8 sm:px-8">
      <h2 className="font-serif text-3xl">Range</h2>
      <p className="mt-3 text-muted">{message}</p>
    </article>
  );
}

function Overview({ model, meta, resetKey }: { model: TearsheetModel["overview"]; meta: ReportMeta; resetKey: string }) {
  const copy = sections[0];
  return (
    <Section {...copy} resetKey={resetKey} empty={model ? null : emptyCopy.pending}>
      {model ? (
        <>
          <p className="mb-4 font-mono text-xs text-muted">
            {model.start} to {model.end} · {formatCount(model.observations)} observations
          </p>
          <MetricTiles
            items={[
              { label: "Total growth", value: formatPercent(model.totalGrowth), gloss: gloss.totalGrowth },
              { label: "Annualized return", value: formatPercent(model.annualizedReturn), gloss: gloss.annualizedReturn },
              { label: "Annualized volatility", value: formatPercent(model.annualizedVolatility), gloss: gloss.annualizedVolatility },
              { label: "Sharpe", value: formatMetric(model.sharpe, "ratio"), gloss: meta.hasRiskFree ? gloss.sharpe : gloss.sharpeChosen },
              { label: "Maximum drawdown", value: formatPercent(model.maxDrawdown), gloss: gloss.maxDrawdown },
              { label: "Calmar", value: formatMetric(model.calmar, "ratio"), gloss: gloss.calmar },
            ]}
          />
        </>
      ) : null}
    </Section>
  );
}

function Performance({ model, resetKey }: { model: PerformanceModel | null; resetKey: string }) {
  const copy = sections[1];
  const [window, setWindow] = useState(63);
  if (!model) return <Section {...copy} resetKey={resetKey} empty={emptyCopy.pending} />;
  const selected = model.rolling.find((item) => item.window === window) ?? model.rolling[0];
  const episodes = [...model.drawdownEpisodes].sort((a, b) => a.depth - b.depth).slice(0, 5);
  const growth = [{ name: "Strategy", points: model.cumulative, color: palette.strategy }];
  if (model.benchmarkCumulative) growth.push({ name: "Benchmark", points: model.benchmarkCumulative, color: palette.benchmark });
  return (
    <Section {...copy} resetKey={resetKey}>
      <BlockTitle>Cumulative growth</BlockTitle>
      <GrowthChart series={growth} />
      <BlockTitle>Drawdown</BlockTitle>
      <DrawdownChart points={model.drawdown} />
      <BlockTitle>Calendar returns</BlockTitle>
      <MonthHeatmap monthly={model.monthlyReturns} annual={model.annualReturns} />
      <BlockTitle>Largest drawdowns</BlockTitle>
      {episodes.length ? (
        <Table>
          <thead>
            <tr>
              {["Start", "Trough", "End", "Depth", "Length", "Recovery"].map((label) => (
                <Th key={label}>{label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => (
              <tr key={`${episode.start}-${episode.trough}`}>
                <Td>{episode.start}</Td>
                <Td>{episode.trough}</Td>
                <Td>{episode.end ?? "Open"}</Td>
                <Td>{formatPercent(episode.depth)}</Td>
                <Td>{formatCount(episode.length)}</Td>
                <Td>{episode.recovery == null ? "Open" : formatCount(episode.recovery)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="font-mono text-xs text-pine">No drawdown episodes.</p>
      )}
      <BlockTitle>Rolling</BlockTitle>
      {model.rolling.length && selected ? (
        <>
          <ChoiceRow label="Window" value={selected.window} options={model.rolling.map((item) => item.window)} onChange={setWindow} />
          <GrowthChart
            series={[
              selected.return ? { name: "Return", points: selected.return, color: palette.strategy, format: formatPercent } : null,
              selected.volatility ? { name: "Volatility", points: selected.volatility, color: palette.benchmark, format: formatPercent } : null,
              selected.sharpe ? { name: "Sharpe", points: selected.sharpe, color: palette.active, format: formatRatio, axis: "right" as const } : null,
            ].filter((item) => item != null)}
          />
        </>
      ) : (
        <p className="font-mono text-xs text-pine">{emptyCopy.pending}</p>
      )}
    </Section>
  );
}

function Regression({ model, resetKey }: { model: RegressionModel | null; resetKey: string }) {
  const copy = sections[2];
  if (!model) return <Section {...copy} resetKey={resetKey} empty={emptyCopy.pending} />;
  return (
    <Section {...copy} resetKey={resetKey}>
      <MetricTiles
        items={[
          { label: "Mean", value: formatPercent(model.mean), gloss: gloss.mean },
          { label: "Volatility", value: formatPercent(model.volatility), gloss: gloss.volatility },
          { label: "Skewness", value: formatRatio(model.skewness), gloss: gloss.skewness },
          { label: "Excess kurtosis", value: formatRatio(model.excessKurtosis), gloss: gloss.excessKurtosis },
          { label: "Observations", value: formatCount(model.observations) },
        ]}
      />
      <BlockTitle>Histogram</BlockTitle>
      <HistogramChart bins={model.histogram} />
      <BlockTitle>Quantiles</BlockTitle>
      <QQChart points={model.qq} />
      <BlockTitle>Autocorrelation</BlockTitle>
      <BarSeriesChart points={model.autocorrelation.map((item) => ({ name: String(item.lag), value: item.value }))} label="Autocorrelation" />
      {model.fit ? (
        <>
          <BlockTitle>Strategy against benchmark</BlockTitle>
          <FitChart x={model.fit.x} y={model.fit.y} intercept={model.fit.intercept} slope={model.fit.slope} />
        </>
      ) : null}
      {model.coefficients.length ? (
        <>
          <BlockTitle>Regression</BlockTitle>
          <CoefficientTable rows={model.coefficients} />
          <p className="mt-3 font-mono text-xs text-muted">
            {formatCount(model.observations)} observations
            {model.rSquared != null ? ` · R² ${formatRatio(model.rSquared)}` : ""}
            {model.adjustedRSquared != null ? ` · Adjusted R² ${formatRatio(model.adjustedRSquared)}` : ""}
            {model.residualStdError != null ? ` · Residual SE ${formatStat(model.residualStdError)}` : ""}
          </p>
        </>
      ) : null}
      {model.residuals?.length ? (
        <>
          <BlockTitle>Residuals</BlockTitle>
          <GrowthChart series={[{ name: "Residual", points: model.residuals, color: palette.residual }]} format={formatPercent} />
        </>
      ) : null}
      {model.residualHistogram?.length ? (
        <>
          <BlockTitle>Residual histogram</BlockTitle>
          <HistogramChart bins={model.residualHistogram} />
        </>
      ) : null}
      {model.diagnostics.length ? (
        <p className="mt-4 font-mono text-xs text-muted">
          {model.diagnostics.map((item) => `${item.name} ${formatStat(item.value)}${item.pValue != null ? ` (p ${formatP(item.pValue)})` : ""}`).join(" · ")}
        </p>
      ) : null}
    </Section>
  );
}

function Benchmark({ model, meta, resetKey }: { model: BenchmarkModel | null; meta: ReportMeta; resetKey: string }) {
  const copy = sections[3];
  const [window, setWindow] = useState(63);
  const empty = !meta.benchmarkAttached && !meta.benchmarkInRequest ? emptyCopy.benchmark : model ? null : emptyCopy.pending;
  if (!model || empty) return <Section {...copy} resetKey={resetKey} empty={empty ?? emptyCopy.pending} />;
  const selected = model.rolling.find((item) => item.window === window) ?? model.rolling[0];
  return (
    <Section {...copy} resetKey={resetKey}>
      <GrowthChart
        series={[
          { name: "Strategy", points: model.strategyCumulative, color: palette.strategy },
          { name: "Benchmark", points: model.benchmarkCumulative, color: palette.benchmark },
          { name: "Active", points: model.activeCumulative, color: palette.active },
        ]}
      />
      <div className="mt-6">
        <MetricTiles
          items={[
            { label: "Active return", value: formatPercent(model.annualizedActiveReturn), gloss: gloss.activeReturn },
            { label: "Tracking error", value: formatPercent(model.trackingError), gloss: gloss.trackingError },
            { label: "Information ratio", value: formatMetric(model.informationRatio, "ratio"), gloss: gloss.informationRatio },
            { label: "Batting average", value: formatPercent(model.battingAverage), gloss: gloss.batting },
            { label: "Up capture", value: formatMetric(model.upCapture, "percent"), gloss: gloss.upCapture },
            { label: "Down capture", value: formatMetric(model.downCapture, "percent"), gloss: gloss.downCapture },
          ]}
        />
      </div>
      <BlockTitle>Rolling beta and correlation</BlockTitle>
      {model.rolling.length && selected ? (
        <>
          <ChoiceRow label="Window" value={selected.window} options={model.rolling.map((item) => item.window)} onChange={setWindow} />
          <GrowthChart
            series={[
              selected.beta ? { name: "Beta", points: selected.beta, color: palette.strategy } : null,
              selected.correlation ? { name: "Correlation", points: selected.correlation, color: palette.benchmark } : null,
            ].filter((item) => item != null)}
            format={formatRatio}
          />
        </>
      ) : (
        <p className="font-mono text-xs text-pine">{emptyCopy.pending}</p>
      )}
    </Section>
  );
}

function Risk({ model, resetKey }: { model: RiskModel | null; resetKey: string }) {
  const copy = sections[4];
  const [confidence, setConfidence] = useState<0.95 | 0.99>(0.95);
  if (!model) return <Section {...copy} resetKey={resetKey} empty={emptyCopy.pending} />;
  const chosen = model.byConfidence.find((item) => item.confidence === confidence) ?? model.byConfidence[0];
  const worst = [...model.worstPeriods].sort((a, b) => a.value - b.value).slice(0, 20);
  const worstMax = Math.max(...worst.map((item) => Math.abs(item.value)), 0.0001);
  return (
    <Section {...copy} resetKey={resetKey}>
      <div className="mb-4">
        <ChoiceRow
          label="Confidence"
          value={chosen?.confidence === 0.99 ? 99 : 95}
          options={[95, 99]}
          render={(option) => `${option}%`}
          onChange={(option) => setConfidence(option === 99 ? 0.99 : 0.95)}
        />
      </div>
      <MetricTiles
        items={[
          { label: "Annualized volatility", value: formatPercent(model.annualizedVolatility), gloss: gloss.annualizedVolatility },
          { label: "Downside deviation", value: formatMetric(model.downsideDeviation, "percent"), gloss: gloss.downside },
          { label: "Maximum drawdown", value: formatPercent(model.maxDrawdown), gloss: gloss.maxDrawdown },
          { label: "Average drawdown", value: formatMetric(model.averageDrawdown, "percent"), gloss: gloss.averageDrawdown },
          { label: "Ulcer index", value: formatMetric(model.ulcerIndex, "percent"), gloss: gloss.ulcer },
          { label: "Value at risk", value: chosen ? formatPercent(chosen.valueAtRisk) : "Undefined", gloss: gloss.valueAtRisk },
          { label: "Expected shortfall", value: chosen ? formatPercent(chosen.expectedShortfall) : "Undefined", gloss: gloss.expectedShortfall },
        ]}
      />
      <BlockTitle>Worst periods</BlockTitle>
      <p className="mb-3 font-mono text-xs text-muted">{formatCount(model.observations)} observations in the tail measures.</p>
      {worst.length ? (
        <ul>
          {worst.map((item) => (
            <li key={`${item.date}-${item.value}`} className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-3 py-1">
              <span className="font-mono text-xs">{item.date}</span>
              <span className="h-2 bg-line" aria-hidden="true">
                <span className="block h-2 bg-down" style={{ width: `${(Math.abs(item.value) / worstMax) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs tabular">{formatPercent(item.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-xs text-pine">{emptyCopy.noPoints}</p>
      )}
    </Section>
  );
}

function Factors({ model, meta, resetKey }: { model: FactorModel | null; meta: ReportMeta; resetKey: string }) {
  const copy = sections[5];
  const empty = !meta.factorsAttached && !meta.factorsInRequest ? emptyCopy.factors : model ? null : emptyCopy.pending;
  if (!model || empty) return <Section {...copy} resetKey={resetKey} empty={empty ?? emptyCopy.pending} />;
  const contributionMax = Math.max(...model.returnContribution.map((item) => Math.abs(item.value)), 0.0001);
  return (
    <Section {...copy} resetKey={resetKey}>
      <p className="mb-4 text-sm text-muted">The factors are the columns kept from the uploaded file.</p>
      <CoefficientTable rows={model.coefficients} />
      <div className="mt-6">
        <MetricTiles
          items={[
            { label: "R²", value: formatRatio(model.rSquared), gloss: gloss.rSquared },
            { label: "Residual volatility", value: formatPercent(model.residualVolatility), gloss: gloss.residualVol },
            { label: "Annualized residual volatility", value: formatMetric(model.annualizedResidualVolatility, "percent"), gloss: gloss.annualResidual },
          ]}
        />
      </div>
      <BlockTitle>Return contribution</BlockTitle>
      {model.returnContribution.length ? (
        <ul>
          {model.returnContribution.map((item) => (
            <li key={item.name} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 py-1">
              <span className="truncate font-mono text-xs">{item.name}</span>
              <span className="h-2 bg-line" aria-hidden="true">
                <span className="block h-2 bg-pine" style={{ width: `${(Math.abs(item.value) / contributionMax) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs tabular">{formatPercent(item.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-xs text-pine">{emptyCopy.noPoints}</p>
      )}
      <BlockTitle>Risk split</BlockTitle>
      <ShareBar systematic={model.riskShare.systematic} idiosyncratic={model.riskShare.idiosyncratic} />
      <BlockTitle>Correlation</BlockTitle>
      <CorrelationTable names={model.correlation.names} matrix={model.correlation.matrix} />
    </Section>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
  render = (option) => `${option} periods`,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  render?: (option: number) => string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] tracking-wide text-muted uppercase">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          className={`border px-2 py-1 font-mono text-xs ${option === value ? "border-pine bg-pine text-sheet" : "border-line bg-sheet text-ink"}`}
          onClick={() => onChange(option)}
        >
          {render(option)}
        </button>
      ))}
    </div>
  );
}

function CoefficientTable({ rows }: { rows: RegressionModel["coefficients"] }) {
  if (!rows.length) return null;
  return (
    <Table>
      <thead>
        <tr>
          {["Term", "Coefficient", "Std. error", "t", "p-value"].map((label) => (
            <Th key={label}>{label}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <Td>{row.name}</Td>
            <Td>{formatStat(row.estimate)}</Td>
            <Td>{formatStat(row.stdError)}</Td>
            <Td>{formatRatio(row.tStat)}</Td>
            <Td>{formatP(row.pValue)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function BlockTitle({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 mb-3 font-serif text-2xl">{children}</h3>;
}

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-line px-2 py-2 text-left text-[11px] font-medium tracking-wide text-muted uppercase" scope="col">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-line px-2 py-2 font-mono text-xs tabular">{children}</td>;
}

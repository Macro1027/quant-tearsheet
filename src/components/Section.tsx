import { Component, type ReactNode } from "react";

type BoundaryState = { error: string | null };

class SectionBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error: error.message || "This section could not be drawn." };
  }

  render() {
    if (this.state.error) return <p className="mt-6 font-mono text-xs text-down">{this.state.error}</p>;
    return this.props.children;
  }
}

export function Section({
  index,
  title,
  explanation,
  empty,
  resetKey,
  children,
}: {
  index: string;
  title: string;
  explanation: string;
  empty?: string | null;
  resetKey: string;
  children?: ReactNode;
}) {
  return (
    <section className="section-block border-t border-line py-8">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted">{index}</p>
      <h2 className="mt-1 font-serif text-[2rem] leading-none text-ink">{title}</h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{explanation}</p>
      <SectionBoundary key={resetKey}>
        {empty ? <p className="mt-6 font-mono text-xs tracking-wide text-pine">{empty}</p> : <div className="mt-6">{children}</div>}
      </SectionBoundary>
    </section>
  );
}

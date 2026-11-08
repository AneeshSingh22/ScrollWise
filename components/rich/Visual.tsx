import type { Visual as V } from "@/types/card";
import { Rich } from "./Rich";

/**
 * Basic pictures drawn from data: flows, bars, comparisons, cells, emoji
 * scenes and line charts. Everything takes the card's accent color, so a
 * diagram matches its category like the rest of the card.
 */
export function Visual({ v }: { v: V }) {
  return (
    <figure className={`vis vis-${v.kind}`}>
      <Picture v={v} />
      {v.caption && <figcaption><Rich text={v.caption} /></figcaption>}
    </figure>
  );
}

function Picture({ v }: { v: V }) {
  switch (v.kind) {
    case "flow":
      return (
        <ol className="flow">
          {v.items.map((it, i) => (
            <li key={i}>
              <span className="flow-box">{it}</span>
              {i < v.items.length - 1 && <span className="flow-arrow" aria-hidden>↓</span>}
            </li>
          ))}
        </ol>
      );
    case "bars": {
      const max = Math.max(...v.items.map((i) => i.value)) || 1;
      return (
        <ul className="bars">
          {v.items.map((it, i) => (
            <li key={i}>
              <span className="bar-label">{it.label}</span>
              <span className="bar-track">
                <i style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }} />
              </span>
              <span className="bar-val">
                {it.note ?? `${fmt(it.value)}${v.unit ? ` ${v.unit}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      );
    }
    case "compare":
      return (
        <div className="compare">
          {[v.left, v.right].map((side, i) => (
            <div key={i} className="compare-side">
              <b>{side.title}</b>
              <ul>
                {side.points.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "cells":
      return (
        <div className="cells">
          {v.items.map((it, i) => (
            <span key={i} className="cell">
              <b>{it}</b>
              {v.labels?.[i] && <small>{v.labels[i]}</small>}
            </span>
          ))}
        </div>
      );
    case "picture":
      return (
        <div className="picture" aria-hidden>
          {v.icons}
        </div>
      );
    case "line":
      return <LineChart v={v} />;
  }
}

function fmt(n: number): string {
  return n >= 1000 ? n.toLocaleString("en-US") : String(n);
}

function LineChart({ v }: { v: Extract<V, { kind: "line" }> }) {
  const W = 280;
  const H = 150;
  const pad = { l: 12, r: 10, t: 10, b: 22 };
  const xs = v.points.map((p) => p[0]);
  const ys = v.points.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(0, ...ys), Math.max(...ys)];
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - ((y - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b);
  const d = v.points.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ");
  return (
    <svg className="line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${v.y} against ${v.x}`}>
      <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} className="axis" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} className="axis" />
      <path d={d} className="trace" />
      {v.points.map((p, i) => (
        <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={3.5} className="dot" />
      ))}
      <text x={W - pad.r} y={H - 5} textAnchor="end">{v.x} →</text>
      <text x={pad.l + 6} y={pad.t + 10}>↑ {v.y}</text>
    </svg>
  );
}

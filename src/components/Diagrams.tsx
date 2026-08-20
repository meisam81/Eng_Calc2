import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { BeamResults, BeamModel } from '../beam/types';
import './Diagrams.css';

interface DiagramsProps {
  results: BeamResults;
  model: BeamModel;
}

export function Diagrams({ results, model }: DiagramsProps) {
  const shearRef = useRef<HTMLDivElement>(null);
  const momentRef = useRef<HTMLDivElement>(null);
  const deflectionRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark ? '#9ca3af' : '#6b6375';
  const gridColor = isDark ? '#2e303a' : '#e5e4e7';
  const bgColor = isDark ? '#16171d' : '#fff';

  useEffect(() => {
    if (!shearRef.current || !momentRef.current || !deflectionRef.current || !beamRef.current) return;

    const x = results.shear.map((p) => p.x);
    const shearY = results.shear.map((p) => p.y);
    const momentY = results.moment.map((p) => p.y);
    const deflectionY = results.deflection.map((p) => p.y * 1000); // convert to mm

    const commonLayout = {
      font: { color: textColor, size: 12, family: 'system-ui, sans-serif' },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { l: 60, r: 20, t: 30, b: 40 },
      xaxis: { gridcolor: gridColor, zerolinecolor: gridColor, title: 'Position (m)' },
      yaxis: { gridcolor: gridColor, zeroline: true, zerolinecolor: gridColor },
      hovermode: 'closest' as const,
    };

    // Shear diagram
    Plotly.react(shearRef.current, [{
      x, y: shearY, type: 'scatter', mode: 'lines',
      line: { color: '#3b82f6', width: 2 },
      fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.15)',
      name: 'Shear',
    }], {
      ...commonLayout,
      title: { text: 'Shear Force Diagram (N)', font: { color: textColor } },
      yaxis: { ...commonLayout.yaxis, title: 'Shear (N)' },
    } as any, { responsive: true, displayModeBar: false });

    // Moment diagram
    Plotly.react(momentRef.current, [{
      x, y: momentY, type: 'scatter', mode: 'lines',
      line: { color: '#ef4444', width: 2 },
      fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.15)',
      name: 'Moment',
    }], {
      ...commonLayout,
      title: { text: 'Bending Moment Diagram (N·m)', font: { color: textColor } },
      yaxis: { ...commonLayout.yaxis, title: 'Moment (N·m)', autorange: 'reversed' as const },
    } as any, { responsive: true, displayModeBar: false });

    // Deflection diagram
    Plotly.react(deflectionRef.current, [{
      x, y: deflectionY, type: 'scatter', mode: 'lines',
      line: { color: '#10b981', width: 2 },
      fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.15)',
      name: 'Deflection',
    }], {
      ...commonLayout,
      title: { text: 'Deflection (mm)', font: { color: textColor } },
      yaxis: { ...commonLayout.yaxis, title: 'Deflection (mm)' },
    } as any, { responsive: true, displayModeBar: false });

    // Beam schematic
    drawBeamSchematic(beamRef.current!, model, results, textColor, gridColor, bgColor);
  }, [results, model, textColor, gridColor, bgColor]);

  return (
    <div className="diagrams">
      <div className="results-summary">
        <div className="summary-card">
          <span className="label">Max Shear</span>
          <span className="value">{formatNum(results.maxShear.value)} N</span>
          <span className="pos">at {formatNum(results.maxShear.position, 3)} m</span>
        </div>
        <div className="summary-card">
          <span className="label">Max Moment</span>
          <span className="value">{formatNum(results.maxMoment.value)} N·m</span>
          <span className="pos">at {formatNum(results.maxMoment.position, 3)} m</span>
        </div>
        <div className="summary-card">
          <span className="label">Max Deflection</span>
          <span className="value">{formatNum(results.maxDeflection.value * 1000, 4)} mm</span>
          <span className="pos">at {formatNum(results.maxDeflection.position, 3)} m</span>
        </div>
      </div>

      <div className="reactions-section">
        <h3>Support Reactions</h3>
        <table className="reactions-table">
          <thead>
            <tr>
              <th>Support</th>
              <th>Position (m)</th>
              <th>Vertical Reaction (N)</th>
              <th>Moment Reaction (N·m)</th>
            </tr>
          </thead>
          <tbody>
            {results.reactions.map((r, i) => (
              <tr key={r.supportId}>
                <td>Support {i + 1}</td>
                <td>{formatNum(r.position, 3)}</td>
                <td>{formatNum(r.verticalForce, 4)}</td>
                <td>{formatNum(r.moment, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={beamRef} className="beam-schematic"></div>
      <div ref={shearRef} className="plot"></div>
      <div ref={momentRef} className="plot"></div>
      <div ref={deflectionRef} className="plot"></div>
    </div>
  );
}

function formatNum(n: number, decimals = 2): string {
  if (Math.abs(n) < 1e-10) return '0';
  if (Math.abs(n) > 1e6 || Math.abs(n) < 1e-4) return n.toExponential(3);
  return n.toFixed(decimals);
}

function drawBeamSchematic(
  el: HTMLDivElement,
  model: BeamModel,
  _results: BeamResults,
  textColor: string,
  gridColor: string,
  bgColor: string
) {
  const L = model.properties.length;
  const supports = model.supports;
  const loads = model.loads;

  // Build SVG-based schematic using Plotly shapes
  const shapes: any[] = [];

  // Beam line
  shapes.push({
    type: 'line',
    x0: 0, y0: 0, x1: L, y1: 0,
    line: { color: textColor, width: 6 },
  });

  // Supports
  for (const s of supports) {
    if (s.type === 'pin' || s.type === 'roller') {
      // Triangle
      shapes.push({
        type: 'path',
        path: `M ${s.position},0 L ${s.position - 0.02 * L},-0.3 L ${s.position + 0.02 * L},-0.3 Z`,
        fillcolor: textColor,
        line: { color: textColor },
      });
      // Ground line
      shapes.push({
        type: 'line',
        x0: s.position - 0.03 * L, y0: -0.35, x1: s.position + 0.03 * L, y1: -0.35,
        line: { color: textColor, width: 2 },
      });
    } else if (s.type === 'fixed') {
      // Wall
      shapes.push({
        type: 'rect',
        x0: s.position - 0.015 * L, y0: -0.4, x1: s.position + 0.015 * L, y1: 0.4,
        fillcolor: 'rgba(100,100,100,0.3)',
        line: { color: textColor, width: 2 },
      });
    }
  }

  // Loads
  const annotations: any[] = [];
  for (const load of loads) {
    if (load.type === 'point') {
      const dir = load.magnitude < 0 ? 1 : -1; // negative = downward
      shapes.push({
        type: 'line',
        x0: load.position, y0: dir * 0.5, x1: load.position, y1: 0.02,
        line: { color: '#ef4444', width: 3 },
      });
      shapes.push({
        type: 'path',
        path: `M ${load.position - 0.015 * L},0.02 L ${load.position},-0.05 L ${load.position + 0.015 * L},0.02 Z`,
        fillcolor: '#ef4444',
        line: { color: '#ef4444' },
      });
      annotations.push({
        x: load.position, y: dir * 0.55,
        text: `${formatNum(load.magnitude)} N`,
        showarrow: false,
        font: { color: '#ef4444', size: 10 },
      });
    } else if (load.type === 'distributed') {
      const aStart = load.position;
      const aEnd = load.endPosition ?? aStart;
      const w1 = Math.abs(load.magnitude);
      const w2 = Math.abs(load.endMagnitude ?? load.magnitude);
      const maxW = Math.max(w1, w2);
      const scale = 0.4 / (maxW || 1);
      shapes.push({
        type: 'path',
        path: `M ${aStart},0 L ${aStart},${-w1 * scale} L ${aEnd},${-w2 * scale} L ${aEnd},0 Z`,
        fillcolor: 'rgba(239,68,68,0.2)',
        line: { color: '#ef4444', width: 1 },
      });
      // Arrows
      const nArrows = Math.min(10, Math.ceil((aEnd - aStart) / (L * 0.05)));
      for (let i = 0; i <= nArrows; i++) {
        const xp = aStart + ((aEnd - aStart) * i) / nArrows;
        const wp = w1 + (w2 - w1) * (i / nArrows);
        shapes.push({
          type: 'line',
          x0: xp, y0: -wp * scale, x1: xp, y1: -0.02,
          line: { color: '#ef4444', width: 1 },
        });
      }
      annotations.push({
        x: (aStart + aEnd) / 2, y: -Math.max(w1, w2) * scale - 0.1,
        text: `${formatNum(load.magnitude)} N/m`,
        showarrow: false,
        font: { color: '#ef4444', size: 10 },
      });
    } else if (load.type === 'moment') {
      shapes.push({
        type: 'circle',
        x0: load.position - 0.02 * L, y0: 0.15, x1: load.position + 0.02 * L, y1: 0.25,
        line: { color: '#f59e0b', width: 2 },
      });
      annotations.push({
        x: load.position, y: 0.3,
        text: `${formatNum(load.magnitude)} N·m`,
        showarrow: false,
        font: { color: '#f59e0b', size: 10 },
      });
    }
  }

  Plotly.react(el, [], {
    font: { color: textColor, size: 11, family: 'system-ui, sans-serif' },
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    margin: { l: 20, r: 20, t: 20, b: 20 },
    xaxis: {
      gridcolor: gridColor,
      zeroline: false,
      range: [-0.05 * L, 1.05 * L],
      showticklabels: true,
      title: '',
    },
    yaxis: {
      gridcolor: gridColor,
      zeroline: false,
      range: [-0.6, 0.6],
      showticklabels: false,
    },
    shapes,
    annotations,
    title: { text: 'Beam Schematic', font: { color: textColor, size: 14 } },
  } as any, { responsive: true, displayModeBar: false });
}
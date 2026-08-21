import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { BoltResults } from '../bolt/types';
import './BoltJointDiagram.css';

interface BoltJointDiagramProps {
  results: BoltResults;
}

export function BoltJointDiagram({ results }: BoltJointDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const textColor = isDark ? '#9ca3af' : '#6b6375';
    const gridColor = isDark ? '#2e303a' : '#e5e4e7';
    const bgColor = isDark ? '#16171d' : '#fff';

    // Dimensions in mm for display
    const d = results.boltDiameter * 1000; // bolt diameter
    const dh = results.holeDiameter * 1000; // hole diameter
    const L = results.gripLength * 1000; // grip length
    const alpha = results.frustumAngle; // frustum half-angle (rad)
    const tanAlpha = Math.tan(alpha);

    // Pressure cone: starts at bearing face diameter, expands to d + 2*(L/2)*tan(α) at midplane
    const bearingD = 1.5 * d; // bearing face diameter (nut/head)
    const coneMidR = (d + 2 * (L / 2) * tanAlpha) / 2; // cone radius at midplane
    const midL = L / 2;

    // Y-axis: use a symmetric range, scale diameters to fit
    const maxR = Math.max(coneMidR, bearingD / 2) * 1.3;
    const yRange = maxR * 1.2;

    // Build shapes
    const shapes: any[] = [];

    // ---- Clamped members (two plates) ----
    const plateR = maxR * 1.05;
    // Upper plate
    shapes.push({
      type: 'rect',
      x0: 0, y0: dh / 2, x1: L, y1: plateR,
      fillcolor: 'rgba(100,116,139,0.15)',
      line: { color: textColor, width: 1.5 },
    });
    // Lower plate
    shapes.push({
      type: 'rect',
      x0: 0, y0: -plateR, x1: L, y1: -dh / 2,
      fillcolor: 'rgba(100,116,139,0.15)',
      line: { color: textColor, width: 1.5 },
    });

    // ---- Pressure cones (frustums) ----
    // Upper cone: from bolt head (x=0) to midplane (x=L/2)
    // At x=0: radius = bearingD/2, at x=L/2: radius = coneMidR
    shapes.push({
      type: 'path',
      path: `M 0,${bearingD / 2} L ${midL},${coneMidR} L ${midL},${-coneMidR} L 0,${-bearingD / 2} Z`,
      fillcolor: 'rgba(239,68,68,0.12)',
      line: { color: '#ef4444', width: 1.5, dash: 'dot' },
    });

    // Lower cone: from nut (x=L) to midplane (x=L/2)
    shapes.push({
      type: 'path',
      path: `M ${L},${bearingD / 2} L ${midL},${coneMidR} L ${midL},${-coneMidR} L ${L},${-bearingD / 2} Z`,
      fillcolor: 'rgba(239,68,68,0.12)',
      line: { color: '#ef4444', width: 1.5, dash: 'dot' },
    });

    // ---- Bolt shank (cylinder) ----
    shapes.push({
      type: 'rect',
      x0: -d * 0.3, y0: -d / 2, x1: L + d * 0.3, y1: d / 2,
      fillcolor: 'rgba(59,130,246,0.2)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Bolt head ----
    shapes.push({
      type: 'rect',
      x0: -d * 0.3, y0: -bearingD / 2, x1: 0, y1: bearingD / 2,
      fillcolor: 'rgba(59,130,246,0.35)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Nut ----
    shapes.push({
      type: 'rect',
      x0: L, y0: -bearingD / 2, x1: L + d * 0.3, y1: bearingD / 2,
      fillcolor: 'rgba(59,130,246,0.35)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Thread lines on bolt shank (decorative) ----
    const threadCount = Math.min(20, Math.ceil(L / (d * 0.5)));
    for (let i = 0; i < threadCount; i++) {
      const xt = (L * i) / threadCount;
      shapes.push({
        type: 'line',
        x0: xt, y0: -d / 2, x1: xt + d * 0.1, y1: d / 2,
        line: { color: 'rgba(59,130,246,0.3)', width: 0.5 },
      });
    }

    // ---- Annotations ----
    const annotations: any[] = [
      {
        x: -d * 0.15, y: bearingD / 2 + maxR * 0.1,
        text: 'Bolt Head',
        showarrow: false,
        font: { color: '#3b82f6', size: 11 },
      },
      {
        x: L + d * 0.15, y: bearingD / 2 + maxR * 0.1,
        text: 'Nut',
        showarrow: false,
        font: { color: '#3b82f6', size: 11 },
      },
      {
        x: midL, y: coneMidR + maxR * 0.15,
        text: 'Pressure Cone (α=30°)',
        showarrow: false,
        font: { color: '#ef4444', size: 11 },
      },
      {
        x: L / 2, y: -plateR - maxR * 0.15,
        text: `Grip Length: ${L.toFixed(1)} mm`,
        showarrow: false,
        font: { color: textColor, size: 11 },
      },
      {
        x: L / 2, y: 0,
        text: `d = ${d.toFixed(1)} mm`,
        showarrow: false,
        font: { color: '#3b82f6', size: 10 },
      },
    ];

    // Preload force arrows (green, showing compression)
    const arrowLen = maxR * 0.2;
    // Bolt head side (compression down)
    shapes.push({
      type: 'line',
      x0: -d * 0.15, y0: bearingD / 2 + arrowLen, x1: -d * 0.15, y1: bearingD / 2 + maxR * 0.03,
      line: { color: '#10b981', width: 2.5 },
    });
    shapes.push({
      type: 'path',
      path: `M ${-d * 0.15 - d * 0.08},${bearingD / 2 + maxR * 0.03} L ${-d * 0.15},${bearingD / 2 - maxR * 0.02} L ${-d * 0.15 + d * 0.08},${bearingD / 2 + maxR * 0.03} Z`,
      fillcolor: '#10b981',
      line: { color: '#10b981' },
    });
    // Nut side (compression up)
    shapes.push({
      type: 'line',
      x0: L + d * 0.15, y0: -bearingD / 2 - arrowLen, x1: L + d * 0.15, y1: -bearingD / 2 - maxR * 0.03,
      line: { color: '#10b981', width: 2.5 },
    });
    shapes.push({
      type: 'path',
      path: `M ${L + d * 0.15 - d * 0.08},${-bearingD / 2 - maxR * 0.03} L ${L + d * 0.15},${-bearingD / 2 + maxR * 0.02} L ${L + d * 0.15 + d * 0.08},${-bearingD / 2 - maxR * 0.03} Z`,
      fillcolor: '#10b981',
      line: { color: '#10b981' },
    });
    annotations.push({
      x: -d * 0.15, y: bearingD / 2 + arrowLen + maxR * 0.08,
      text: `Fi = ${(results.preloadFromTorque / 1000).toFixed(1)} kN`,
      showarrow: false,
      font: { color: '#10b981', size: 11 },
    });

    // Dimension line for grip length
    const dimY = -plateR - maxR * 0.05;
    shapes.push({
      type: 'line',
      x0: 0, y0: dimY, x1: L, y1: dimY,
      line: { color: textColor, width: 1, dash: 'dash' },
    });
    shapes.push({
      type: 'line',
      x0: 0, y0: dimY - maxR * 0.03, x1: 0, y1: dimY + maxR * 0.03,
      line: { color: textColor, width: 1 },
    });
    shapes.push({
      type: 'line',
      x0: L, y0: dimY - maxR * 0.03, x1: L, y1: dimY + maxR * 0.03,
      line: { color: textColor, width: 1 },
    });

    Plotly.react(ref.current, [], {
      font: { color: textColor, size: 11, family: 'system-ui, sans-serif' },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { l: 20, r: 20, t: 30, b: 40 },
      xaxis: {
        gridcolor: gridColor,
        zeroline: false,
        showticklabels: true,
        title: 'Position along bolt axis (mm)',
        range: [-d * 0.6, L + d * 0.6],
      },
      yaxis: {
        gridcolor: gridColor,
        zeroline: false,
        showticklabels: false,
        range: [-yRange, yRange],
      },
      shapes,
      annotations,
      title: { text: 'Bolted Joint Schematic with Pressure Cone', font: { color: textColor, size: 14 } },
    } as any, { responsive: true, displayModeBar: false });
  }, [results]);

  return <div ref={ref} className="bolt-joint-diagram"></div>;
}
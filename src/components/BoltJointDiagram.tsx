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

    // Dimensions in mm
    const d = results.boltDiameter * 1000; // bolt diameter
    const L = results.gripLength * 1000; // grip length
    const alpha = results.frustumAngle; // frustum half-angle (rad)
    const tanAlpha = Math.tan(alpha);

    // Layout: bolt axis is VERTICAL (y-axis)
    // y=0 is at the nut (bottom), y=L is at the bolt head (top)
    // x is the radial direction (symmetric about 0)

    // Pressure cone: starts at bolt shank radius (d/2) at head & nut faces,
    // expands outward at angle α to the midplane (y=L/2)
    const boltR = d / 2;
    const coneMidR = boltR + (L / 2) * tanAlpha; // cone radius at midplane
    const midY = L / 2;

    // Head and nut dimensions
    const headH = d * 0.6; // head/nut thickness
    const headW = d * 1.5; // head/nut width (bearing diameter)

    // Plot ranges
    const xMax = Math.max(coneMidR, headW / 2) * 1.6;
    const yMin = -headH * 1.2;
    const yMax = L + headH * 1.2;

    const shapes: any[] = [];

    // ---- Clamped members (two plates) ----
    const plateR = xMax * 0.85;
    // Upper plate (between midplane and bolt head)
    shapes.push({
      type: 'rect',
      x0: -plateR, y0: midY, x1: plateR, y1: L,
      fillcolor: 'rgba(100,116,139,0.15)',
      line: { color: textColor, width: 1.5 },
    });
    // Lower plate (between nut and midplane)
    shapes.push({
      type: 'rect',
      x0: -plateR, y0: 0, x1: plateR, y1: midY,
      fillcolor: 'rgba(100,116,139,0.15)',
      line: { color: textColor, width: 1.5 },
    });

    // ---- Pressure cones (frustums) ----
    // Upper cone: from bolt head (y=L) to midplane (y=L/2)
    // At y=L: radius = boltR, at y=L/2: radius = coneMidR
    shapes.push({
      type: 'path',
      path: `M ${boltR},${L} L ${coneMidR},${midY} L ${-coneMidR},${midY} L ${-boltR},${L} Z`,
      fillcolor: 'rgba(239,68,68,0.10)',
      line: { color: '#ef4444', width: 1.5, dash: 'dot' },
    });

    // Lower cone: from nut (y=0) to midplane (y=L/2)
    shapes.push({
      type: 'path',
      path: `M ${boltR},0 L ${coneMidR},${midY} L ${-coneMidR},${midY} L ${-boltR},0 Z`,
      fillcolor: 'rgba(239,68,68,0.10)',
      line: { color: '#ef4444', width: 1.5, dash: 'dot' },
    });

    // ---- Bolt shank (vertical cylinder) ----
    shapes.push({
      type: 'rect',
      x0: -boltR, y0: -headH * 0.3, x1: boltR, y1: L + headH * 0.3,
      fillcolor: 'rgba(59,130,246,0.25)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Bolt head (top) ----
    shapes.push({
      type: 'rect',
      x0: -headW / 2, y0: L, x1: headW / 2, y1: L + headH,
      fillcolor: 'rgba(59,130,246,0.4)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Nut (bottom) ----
    shapes.push({
      type: 'rect',
      x0: -headW / 2, y0: -headH, x1: headW / 2, y1: 0,
      fillcolor: 'rgba(59,130,246,0.4)',
      line: { color: '#3b82f6', width: 2 },
    });

    // ---- Thread lines on bolt shank (decorative, horizontal) ----
    const threadCount = Math.min(15, Math.ceil(L / (d * 0.5)));
    for (let i = 1; i < threadCount; i++) {
      const yt = (L * i) / threadCount;
      shapes.push({
        type: 'line',
        x0: -boltR, y0: yt, x1: boltR, y1: yt,
        line: { color: 'rgba(59,130,246,0.3)', width: 0.5 },
      });
    }

    // ---- Annotations ----
    const annotations: any[] = [
      {
        x: 0, y: L + headH + headH * 0.3,
        text: 'Bolt Head',
        showarrow: false,
        font: { color: '#3b82f6', size: 12 },
      },
      {
        x: 0, y: -headH - headH * 0.3,
        text: 'Nut',
        showarrow: false,
        font: { color: '#3b82f6', size: 12 },
      },
      {
        x: coneMidR + xMax * 0.08, y: midY,
        text: 'Pressure Cone (α=30°)',
        showarrow: true,
        arrowhead: 2,
        arrowsize: 0.8,
        arrowwidth: 1,
        ax: coneMidR + xMax * 0.05,
        ay: midY,
        font: { color: '#ef4444', size: 11 },
      },
      {
        x: 0, y: midY,
        text: `d = ${d.toFixed(1)} mm`,
        showarrow: false,
        font: { color: '#3b82f6', size: 10 },
      },
    ];

    // ---- Preload force arrows (green, showing clamping) ----
    const arrowLen = headH * 0.6;
    // Top arrow (pushing down on bolt head)
    shapes.push({
      type: 'line',
      x0: headW / 2 + xMax * 0.1, y0: L + headH + arrowLen,
      x1: headW / 2 + xMax * 0.1, y1: L + headH + headH * 0.1,
      line: { color: '#10b981', width: 2.5 },
    });
    shapes.push({
      type: 'path',
      path: `M ${headW / 2 + xMax * 0.1 - d * 0.08},${L + headH + headH * 0.1} L ${headW / 2 + xMax * 0.1},${L + headH - headH * 0.05} L ${headW / 2 + xMax * 0.1 + d * 0.08},${L + headH + headH * 0.1} Z`,
      fillcolor: '#10b981',
      line: { color: '#10b981' },
    });
    // Bottom arrow (pushing up on nut)
    shapes.push({
      type: 'line',
      x0: headW / 2 + xMax * 0.1, y0: -headH - arrowLen,
      x1: headW / 2 + xMax * 0.1, y1: -headH - headH * 0.1,
      line: { color: '#10b981', width: 2.5 },
    });
    shapes.push({
      type: 'path',
      path: `M ${headW / 2 + xMax * 0.1 - d * 0.08},${-headH - headH * 0.1} L ${headW / 2 + xMax * 0.1},${-headH + headH * 0.05} L ${headW / 2 + xMax * 0.1 + d * 0.08},${-headH - headH * 0.1} Z`,
      fillcolor: '#10b981',
      line: { color: '#10b981' },
    });
    annotations.push({
      x: headW / 2 + xMax * 0.1 + xMax * 0.05, y: L + headH + arrowLen / 2,
      text: `Fi = ${(results.preloadFromTorque / 1000).toFixed(1)} kN`,
      showarrow: false,
      font: { color: '#10b981', size: 11 },
      textangle: 90,
    });

    // ---- Grip length dimension (left side) ----
    const dimX = -plateR - xMax * 0.08;
    shapes.push({
      type: 'line',
      x0: dimX, y0: 0, x1: dimX, y1: L,
      line: { color: textColor, width: 1, dash: 'dash' },
    });
    shapes.push({
      type: 'line',
      x0: dimX - xMax * 0.03, y0: 0, x1: dimX + xMax * 0.03, y1: 0,
      line: { color: textColor, width: 1 },
    });
    shapes.push({
      type: 'line',
      x0: dimX - xMax * 0.03, y0: L, x1: dimX + xMax * 0.03, y1: L,
      line: { color: textColor, width: 1 },
    });
    annotations.push({
      x: dimX - xMax * 0.05, y: midY,
      text: `L = ${L.toFixed(1)} mm`,
      showarrow: false,
      font: { color: textColor, size: 11 },
      textangle: 90,
    });

    Plotly.react(ref.current, [], {
      font: { color: textColor, size: 11, family: 'system-ui, sans-serif' },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      margin: { l: 50, r: 50, t: 30, b: 30 },
      xaxis: {
        gridcolor: gridColor,
        zeroline: false,
        showticklabels: false,
        range: [-xMax, xMax],
        title: '',
      },
      yaxis: {
        gridcolor: gridColor,
        zeroline: false,
        showticklabels: true,
        title: 'Position along bolt (mm)',
        range: [yMin, yMax],
      },
      shapes,
      annotations,
      title: { text: 'Bolted Joint Schematic with Pressure Cone', font: { color: textColor, size: 14 } },
    } as any, { responsive: true, displayModeBar: false });
  }, [results]);

  return <div ref={ref} className="bolt-joint-diagram"></div>;
}
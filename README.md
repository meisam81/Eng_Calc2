# Engineering Calculator — Beam Analysis Tool

A web application for structural engineering beam analysis. Configure beam properties, supports, and loads to solve for shear force diagrams, bending moment diagrams, deflection curves, and support reactions.

## Features

- **Beam Properties**: Length, modulus of elasticity (E), and moment of inertia (I) with material presets
- **Supports**: Pin, roller, fixed, and free supports at any position along the beam
- **Loads**: Point forces, distributed loads (uniform & trapezoidal), and applied moments
- **Results**:
  - Support reactions (vertical forces and moments)
  - Shear force diagram
  - Bending moment diagram
  - Deflection curve
  - Beam schematic visualization
  - Maximum values with locations

## Solver

The beam solver uses the **Direct Stiffness Method** (Finite Element Method) with Euler-Bernoulli beam elements. It handles statically determinate and indeterminate beams with arbitrary support and load configurations.

## Tech Stack

- React + TypeScript
- Vite
- Plotly.js for diagram visualization

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

# Engineering Calculator

A web application for structural and mechanical engineering calculations. Currently includes a **Beam Analysis Tool** and a **Bolt & Fastener Joint Calculator**.

🔗 **Live demo: [https://meisam81.github.io/Eng_Calc2/](https://meisam81.github.io/Eng_Calc2/)**

## Features

### Beam Analysis Tool
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

### Bolt & Fastener Joint Calculator
- **Thread Specs**: ISO metric & UN imperial thread size presets with auto-computed geometry
- **Torque ↔ Preload**: Long-form torque equation with thread and bearing friction
- **Joint Stiffness**: Shigley hollow frustum cone method (verified against published reference data)
- **Safety Factors**: Yield, separation, and fatigue (Goodman)
- **Visualization**: Bolted joint schematic with pressure cone diagram

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

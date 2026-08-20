# Copilot Instructions

## Project Overview
Engineering Calculator web app — currently features a Beam Analysis Tool using the Finite Element Method (Direct Stiffness Method).

## Tech Stack
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Charts**: Plotly.js (`plotly.js-dist-min`)
- **Linter**: Oxlint

## Project Structure
- `src/beam/` — Core beam solver engine (types, FEM solver)
- `src/components/` — React UI components (BeamForm, Diagrams)
- `src/App.tsx` — Main app component

## Commands
- `npm run dev` — Start dev server (http://localhost:5173)
- `npm run build` — Production build
- `npm run preview` — Preview production build

## Conventions
- Use TypeScript strict typing
- CSS files co-located with components
- Solver logic is pure TypeScript (no React dependency)
- SI units throughout (meters, Newtons, Pascals)
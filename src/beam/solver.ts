// Beam solver using the Direct Stiffness Method (Finite Element Method)
// Solves for reactions, shear, moment, slope, and deflection

import type {
  BeamModel,
  BeamResults,
  DiagramPoint,
  Load,
  Reaction,
} from './types';

// ---- Gaussian elimination solver ----
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-15) {
      throw new Error('Singular stiffness matrix — beam is unstable. Add more supports.');
    }

    for (let r = col + 1; r < n; r++) {
      const factor = aug[r][col] / aug[col][col];
      for (let c = col; c <= n; c++) {
        aug[r][c] -= factor * aug[col][c];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = 0;
    for (let c = r + 1; c < n; c++) sum += aug[r][c] * x[c];
    x[r] = (aug[r][n] - sum) / aug[r][r];
  }
  return x;
}

// ---- Fixed-end forces for a beam element (local coordinates) ----
// Returns [Fy_start, M_start, Fy_end, M_end] — forces/moments applied to nodes
// by the load (these are the "fixed-end" reactions that need to be subtracted)
function fixedEndForces(load: Load, L: number): [number, number, number, number] {
  const a = load.position;
  const b = L - a;

  if (load.type === 'point') {
    const P = load.magnitude;
    const fab = (P * b * b * a * (L + 2 * a)) / (L * L * L);
    const fba = (P * a * a * b * (2 * b + L)) / (L * L * L);
    const ra = (P * b) / L;
    const rb = (P * a) / L;
    // [Fy at start, M at start, Fy at end, M at end]
    return [ra, fab, rb, -fba];
  }

  if (load.type === 'moment') {
    const M = load.magnitude;
    const ma = (M * b * (2 * a - b)) / (L * L);
    const mb = (M * a * (2 * b - a)) / (L * L);
    const ra = -M / L;
    const rb = M / L;
    return [ra, ma, rb, mb];
  }

  if (load.type === 'distributed') {
    const aStart = load.position;
    const aEnd = load.endPosition ?? aStart;
    const w1 = load.magnitude;
    const w2 = load.endMagnitude ?? w1;
    const len = aEnd - aStart;
    if (len <= 0) return [0, 0, 0, 0];

    // Total load
    const W = ((w1 + w2) / 2) * len;
    // Centroid from start node
    const xc = aStart + (w1 + 2 * w2) / (3 * (w1 + w2)) * len;
    // Reactions (simply supported)
    const Rb = (W * xc) / L;
    const Ra = W - Rb;
    // Fixed-end moments using superposition of infinitesimal loads
    // For a trapezoidal load, we integrate the point-load FEM formula
    let Ma = 0;
    let Mb = 0;
    const steps = 200;
    const dx = len / steps;
    for (let i = 0; i < steps; i++) {
      const xi = aStart + (i + 0.5) * dx;
      const wi = w1 + (w2 - w1) * ((i + 0.5) * dx) / len;
      const dP = wi * dx;
      const bi = L - xi;
      const dMa = (dP * bi * bi * xi * (L + 2 * xi)) / (L * L * L);
      const dMb = (dP * xi * xi * bi * (2 * bi + L)) / (L * L * L);
      Ma += dMa;
      Mb += dMb;
    }
    return [Ra, Ma, Rb, -Mb];
  }

  return [0, 0, 0, 0];
}

// ---- Main solver ----
export function solveBeam(model: BeamModel): BeamResults {
  const { length: L, elasticity: E, inertia: I } = model.properties;
  const EI = E * I;

  if (L <= 0) throw new Error('Beam length must be positive.');
  if (EI <= 0) throw new Error('E·I must be positive.');

  // Sort supports by position
  const supports = [...model.supports].sort((a, b) => a.position - b.position);
  if (supports.length === 0) throw new Error('At least one support is required.');

  // Create nodes at support positions and beam ends
  const nodePositions = new Set<number>([0, L]);
  supports.forEach((s) => nodePositions.add(s.position));
  model.loads.forEach((ld) => {
    nodePositions.add(ld.position);
    if (ld.endPosition) nodePositions.add(ld.endPosition);
  });

  const nodes = [...nodePositions].sort((a, b) => a - b);
  const nodeIndex = new Map<number, number>();
  nodes.forEach((pos, i) => nodeIndex.set(pos, i));

  const numNodes = nodes.length;
  // Each node has 2 DOFs: [vertical displacement (v), rotation (θ)]
  const numDOF = numNodes * 2;

  // ---- Assemble global stiffness matrix ----
  const K = Array.from({ length: numDOF }, () => new Array(numDOF).fill(0));

  for (let e = 0; e < numNodes - 1; e++) {
    const Le = nodes[e + 1] - nodes[e];
    if (Le <= 0) continue;

    // Local stiffness matrix for beam element (Euler-Bernoulli)
    // DOF ordering: [v1, θ1, v2, θ2]
    const k = (EI / (Le * Le * Le)) * 12;
    const ke = [
      [12 * k, 6 * Le * k, -12 * k, 6 * Le * k],
      [6 * Le * k, 4 * Le * Le * k, -6 * Le * k, 2 * Le * Le * k],
      [-12 * k, -6 * Le * k, 12 * k, -6 * Le * k],
      [6 * Le * k, 2 * Le * Le * k, -6 * Le * k, 4 * Le * Le * k],
    ];

    const dofs = [e * 2, e * 2 + 1, (e + 1) * 2, (e + 1) * 2 + 1];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        K[dofs[i]][dofs[j]] += ke[i][j];
      }
    }
  }

  // ---- Assemble force vector ----
  const F = new Array(numDOF).fill(0);

  // Apply loads as equivalent nodal forces using fixed-end forces
  for (const load of model.loads) {
    // Find which element(s) the load falls on
    if (load.type === 'point' || load.type === 'moment') {
      const pos = load.position;
      // Find element containing this position
      let elem = -1;
      for (let e = 0; e < numNodes - 1; e++) {
        if (pos >= nodes[e] - 1e-10 && pos <= nodes[e + 1] + 1e-10) {
          elem = e;
          break;
        }
      }
      if (elem < 0) continue;
      const Le = nodes[elem + 1] - nodes[elem];
      const localPos = pos - nodes[elem];
      const adjLoad: Load = { ...load, position: localPos };
      const [fy1, m1, fy2, m2] = fixedEndForces(adjLoad, Le);
      const dofs = [elem * 2, elem * 2 + 1, (elem + 1) * 2, (elem + 1) * 2 + 1];
      F[dofs[0]] += fy1;
      F[dofs[1]] += m1;
      F[dofs[2]] += fy2;
      F[dofs[3]] += m2;
    } else if (load.type === 'distributed') {
      const aStart = load.position;
      const aEnd = load.endPosition ?? aStart;
      // Distribute across elements
      for (let e = 0; e < numNodes - 1; e++) {
        const eStart = nodes[e];
        const eEnd = nodes[e + 1];
        const overlapStart = Math.max(aStart, eStart);
        const overlapEnd = Math.min(aEnd, eEnd);
        if (overlapEnd <= overlapStart) continue;
        const Le = eEnd - eStart;
        const w1 = load.magnitude;
        const w2 = load.endMagnitude ?? w1;
        const localStart = overlapStart - eStart;
        const localEnd = overlapEnd - eStart;
        const wLocal1 = w1 + (w2 - w1) * (overlapStart - aStart) / ((aEnd - aStart) || 1);
        const wLocal2 = w1 + (w2 - w1) * (overlapEnd - aStart) / ((aEnd - aStart) || 1);
        const adjLoad: Load = {
          ...load,
          position: localStart,
          endPosition: localEnd,
          magnitude: wLocal1,
          endMagnitude: wLocal2,
        };
        const [fy1, m1, fy2, m2] = fixedEndForces(adjLoad, Le);
        const dofs = [e * 2, e * 2 + 1, (e + 1) * 2, (e + 1) * 2 + 1];
        F[dofs[0]] += fy1;
        F[dofs[1]] += m1;
        F[dofs[2]] += fy2;
        F[dofs[3]] += m2;
      }
    }
  }

  // ---- Apply boundary conditions ----
  // For each support, constrain appropriate DOFs
  const constrained: Set<number> = new Set();
  for (const s of supports) {
    // Find nearest node
    let nodeIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < numNodes; i++) {
      const d = Math.abs(nodes[i] - s.position);
      if (d < minDist) {
        minDist = d;
        nodeIdx = i;
      }
    }
    const vDOF = nodeIdx * 2;
    const rDOF = nodeIdx * 2 + 1;

    if (s.type === 'pin' || s.type === 'roller') {
      constrained.add(vDOF); // no vertical displacement
    } else if (s.type === 'fixed') {
      constrained.add(vDOF); // no vertical displacement
      constrained.add(rDOF); // no rotation
    }
    // 'free' constrains nothing
  }

  // Penalty method for constraints
  const penalty = 1e20;
  for (const dof of constrained) {
    K[dof][dof] += penalty;
  }

  // ---- Solve ----
  const U = solveLinearSystem(K, F);

  // ---- Compute reactions ----
  const reactions: Reaction[] = [];
  for (const s of supports) {
    let nodeIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < numNodes; i++) {
      const d = Math.abs(nodes[i] - s.position);
      if (d < minDist) {
        minDist = d;
        nodeIdx = i;
      }
    }
    const vDOF = nodeIdx * 2;
    const rDOF = nodeIdx * 2 + 1;

    let verticalForce = 0;
    let moment = 0;

    if (s.type === 'pin' || s.type === 'roller') {
      verticalForce = penalty * U[vDOF];
    } else if (s.type === 'fixed') {
      verticalForce = penalty * U[vDOF];
      moment = penalty * U[rDOF];
    }

    reactions.push({
      supportId: s.id,
      position: s.position,
      verticalForce,
      moment,
    });
  }

  // ---- Compute diagrams along the beam ----
  const numPoints = 500;
  const shear: DiagramPoint[] = [];
  const moment: DiagramPoint[] = [];
  const deflection: DiagramPoint[] = [];
  const slope: DiagramPoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = (L * i) / numPoints;

    // Find element containing x
    let elem = 0;
    for (let e = 0; e < numNodes - 1; e++) {
      if (x >= nodes[e] - 1e-10 && x <= nodes[e + 1] + 1e-10) {
        elem = e;
        break;
      }
    }
    const Le = nodes[elem + 1] - nodes[elem];
    const localX = x - nodes[elem];
    const v1 = U[elem * 2];
    const th1 = U[elem * 2 + 1];
    const v2 = U[(elem + 1) * 2];
    const th2 = U[(elem + 1) * 2 + 1];

    // Shape functions for beam element
    const N1 = 1 - 3 * (localX / Le) ** 2 + 2 * (localX / Le) ** 3;
    const N2 = localX * (1 - localX / Le) ** 2;
    const N3 = 3 * (localX / Le) ** 2 - 2 * (localX / Le) ** 3;
    const N4 = localX * ((localX / Le) ** 2 - localX / Le);

    const defl = N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2;
    const slp =
      (-6 * localX / (Le * Le) + 6 * (localX / Le) ** 2 / Le) * v1 +
      (1 - 4 * localX / Le + 3 * (localX / Le) ** 2) * th1 +
      (6 * localX / (Le * Le) - 6 * (localX / Le) ** 2 / Le) * v2 +
      (-2 * localX / Le + 3 * (localX / Le) ** 2) * th2;

    // Compute shear and moment by integrating loads from left
    // V(x) = R_left_sum - sum of loads to the left of x
    // M(x) = integral of V from 0 to x
    let V = 0;
    let M = 0;

    // Reactions to the left
    for (const r of reactions) {
      if (r.position <= x + 1e-10) {
        V += r.verticalForce;
        M += r.verticalForce * (x - r.position);
        M += r.moment; // applied moments at supports
      }
    }

    // Loads to the left
    for (const load of model.loads) {
      if (load.type === 'point') {
        if (load.position <= x + 1e-10) {
          V -= load.magnitude;
          M -= load.magnitude * (x - load.position);
        }
      } else if (load.type === 'moment') {
        if (load.position <= x + 1e-10) {
          M -= load.magnitude;
        }
      } else if (load.type === 'distributed') {
        const aStart = load.position;
        const aEnd = load.endPosition ?? aStart;
        const w1 = load.magnitude;
        const w2 = load.endMagnitude ?? w1;
        const xEnd = Math.min(aEnd, x);
        if (xEnd > aStart) {
          // Integrate distributed load from aStart to xEnd
          const steps = 100;
          const dx = (xEnd - aStart) / steps;
          for (let j = 0; j < steps; j++) {
            const xi = aStart + (j + 0.5) * dx;
            const wi = w1 + (w2 - w1) * (xi - aStart) / (aEnd - aStart);
            V -= wi * dx;
            M -= wi * dx * (x - xi);
          }
        }
      }
    }

    shear.push({ x, y: V });
    moment.push({ x, y: M });
    deflection.push({ x, y: defl });
    slope.push({ x, y: slp });
  }

  // ---- Find max values ----
  const maxShear = shear.reduce((max, p) =>
    Math.abs(p.y) > Math.abs(max.y) ? p : max
  );
  const maxMoment = moment.reduce((max, p) =>
    Math.abs(p.y) > Math.abs(max.y) ? p : max
  );
  const maxDeflection = deflection.reduce((max, p) =>
    Math.abs(p.y) > Math.abs(max.y) ? p : max
  );

  return {
    reactions,
    shear,
    moment,
    deflection,
    slope,
    maxShear: { value: maxShear.y, position: maxShear.x },
    maxMoment: { value: maxMoment.y, position: maxMoment.x },
    maxDeflection: { value: maxDeflection.y, position: maxDeflection.x },
  };
}
// Bolt & Fastener Joint Calculator — Solver Engine
// All calculations in SI units (m, N, Pa, N·m)

import type {
  BoltSpec,
  MaterialProps,
  JointGeometry,
  BoltResults,
  ThreadSizePreset,
} from './types';

// ---- Thread size presets (ISO metric & UN imperial) ----
export const THREAD_PRESETS: ThreadSizePreset[] = [
  // ISO Metric coarse
  { label: 'M4 × 0.7', standard: 'ISO', nominalDiameter: 0.004, pitch: 0.0007 },
  { label: 'M5 × 0.8', standard: 'ISO', nominalDiameter: 0.005, pitch: 0.0008 },
  { label: 'M6 × 1.0', standard: 'ISO', nominalDiameter: 0.006, pitch: 0.0010 },
  { label: 'M8 × 1.25', standard: 'ISO', nominalDiameter: 0.008, pitch: 0.00125 },
  { label: 'M10 × 1.5', standard: 'ISO', nominalDiameter: 0.010, pitch: 0.0015 },
  { label: 'M12 × 1.75', standard: 'ISO', nominalDiameter: 0.012, pitch: 0.00175 },
  { label: 'M14 × 2.0', standard: 'ISO', nominalDiameter: 0.014, pitch: 0.0020 },
  { label: 'M16 × 2.0', standard: 'ISO', nominalDiameter: 0.016, pitch: 0.0020 },
  { label: 'M20 × 2.5', standard: 'ISO', nominalDiameter: 0.020, pitch: 0.0025 },
  { label: 'M24 × 3.0', standard: 'ISO', nominalDiameter: 0.024, pitch: 0.0030 },
  { label: 'M30 × 3.5', standard: 'ISO', nominalDiameter: 0.030, pitch: 0.0035 },
  { label: 'M36 × 4.0', standard: 'ISO', nominalDiameter: 0.036, pitch: 0.0040 },
  // ISO Metric fine
  { label: 'M10 × 1.25 (fine)', standard: 'ISO', nominalDiameter: 0.010, pitch: 0.00125 },
  { label: 'M12 × 1.5 (fine)', standard: 'ISO', nominalDiameter: 0.012, pitch: 0.0015 },
  { label: 'M16 × 1.5 (fine)', standard: 'ISO', nominalDiameter: 0.016, pitch: 0.0015 },
  { label: 'M20 × 1.5 (fine)', standard: 'ISO', nominalDiameter: 0.020, pitch: 0.0015 },
  // UN (inch → converted to m)
  { label: '1/4-20 UNC', standard: 'UN', nominalDiameter: 0.00635, pitch: 0.00127 },
  { label: '5/16-18 UNC', standard: 'UN', nominalDiameter: 0.007938, pitch: 0.001411 },
  { label: '3/8-16 UNC', standard: 'UN', nominalDiameter: 0.009525, pitch: 0.0015875 },
  { label: '1/2-13 UNC', standard: 'UN', nominalDiameter: 0.0127, pitch: 0.0019538 },
  { label: '5/8-11 UNC', standard: 'UN', nominalDiameter: 0.015875, pitch: 0.0023091 },
  { label: '3/4-10 UNC', standard: 'UN', nominalDiameter: 0.01905, pitch: 0.00254 },
  { label: '1-8 UNC', standard: 'UN', nominalDiameter: 0.0254, pitch: 0.003175 },
];

// ---- Material presets ----
export const MATERIAL_PRESETS = [
  { label: 'ISO 8.8 (Steel)', yieldStrength: 640e6, ultimateStrength: 800e6, modulusElasticity: 210e9 },
  { label: 'ISO 10.9 (Steel)', yieldStrength: 940e6, ultimateStrength: 1040e6, modulusElasticity: 210e9 },
  { label: 'ISO 12.9 (Steel)', yieldStrength: 1100e6, ultimateStrength: 1220e6, modulusElasticity: 210e9 },
  { label: 'Stainless A2-70', yieldStrength: 450e6, ultimateStrength: 700e6, modulusElasticity: 190e9 },
  { label: 'Aluminum 7075-T6', yieldStrength: 471e6, ultimateStrength: 538e6, modulusElasticity: 71.7e9 },
  { label: 'Titanium Gr.5', yieldStrength: 880e6, ultimateStrength: 950e6, modulusElasticity: 114e9 },
];

// ---- Thread geometry calculations ----
export function computeThreadGeometry(spec: BoltSpec) {
  const d = spec.nominalDiameter;
  const p = spec.pitch;

  // Minor (root) diameter: dr = d - 1.22687 * p (ISO) or d - 1.299 * p (UN simplified)
  const dr = spec.standard === 'ISO' ? d - 1.22687 * p : d - 1.299038 * p;

  // Pitch diameter: dp = d - 0.649519 * p
  const dp = d - 0.649519 * p;

  // Tensile stress area (ISO): At = (π/4) * (d - 0.9382*P)²
  // For UN: As = (π/4) * (d - 0.9743/n)² where n = threads per inch
  // Using ISO formula which is widely accepted
  const At = (Math.PI / 4) * Math.pow(d - 0.9382 * p, 2);

  // Lead angle (for single-start thread, lead = pitch)
  const leadAngle = Math.atan(p / (Math.PI * dp));

  return { dr, dp, At, leadAngle, majorDiameter: d };
}

// ---- Torque-Preload relationship ----
// Using the long-form torque equation:
// T = Fi * (dm/2) * (tan(λ) + μ_t * sec(α)) + Fi * μ_b * db/2
// Simplified short-form: T = K * Fi * d
// where K is the nut factor

export function torqueToPreload(
  torque: number,
  _spec: BoltSpec,
  geom: { dp: number; leadAngle: number },
  threadFriction: number,
  bearingFriction: number,
  bearingDiameter: number,
): number {
  const dp = geom.dp;
  const lambda = geom.leadAngle;
  const mu_t = threadFriction;
  const mu_b = bearingFriction;
  const db = bearingDiameter; // mean bearing diameter of nut face

  // Thread friction term: (tan(λ) + μ_t) / (1 - μ_t * tan(λ))
  const threadTerm = (Math.tan(lambda) + mu_t) / (1 - mu_t * Math.tan(lambda));

  // Torque = Fi * [dp/2 * threadTerm + db/2 * mu_b]
  const factor = (dp / 2) * threadTerm + (db / 2) * mu_b;

  if (Math.abs(factor) < 1e-15) return 0;
  return torque / factor;
}

export function preloadToTorque(
  preload: number,
  _spec: BoltSpec,
  geom: { dp: number; leadAngle: number },
  threadFriction: number,
  bearingFriction: number,
  bearingDiameter: number,
): number {
  const dp = geom.dp;
  const lambda = geom.leadAngle;
  const mu_t = threadFriction;
  const mu_b = bearingFriction;
  const db = bearingDiameter;

  const threadTerm = (Math.tan(lambda) + mu_t) / (1 - mu_t * Math.tan(lambda));
  const factor = (dp / 2) * threadTerm + (db / 2) * mu_b;

  return preload * factor;
}

// ---- Joint stiffness calculations ----
// Bolt stiffness: kb = (Ab * Eb) / Lb
// where Ab is bolt cross-section area, Eb is bolt modulus, Lb is bolt grip length

// Member stiffness using frustum cone method (Shigley):
// km = 1 / Σ(1/ki) where each layer ki = (π * E * di * tan(α)) / ln(2 * di / (do + dh))
// Simplified for single material:
// km = (π * E_m * d * tan(α)) / (2 * ln(2 * l / (d + dh)))
// where α ≈ 30° (frustum half-angle), l = grip length, dh = hole diameter

export function computeBoltStiffness(
  boltArea: number,
  boltModulus: number,
  gripLength: number,
): number {
  if (gripLength <= 0) return 0;
  return (boltArea * boltModulus) / gripLength;
}

export function computeMemberStiffness(
  memberModulus: number,
  boltDiameter: number,
  holeDiameter: number,
  gripLength: number,
): number {
  // Frustum cone method (Shigley's Mechanical Engineering Design)
  // Half-angle α ≈ 30° → tan(α) ≈ 0.577
  const alpha = 30 * (Math.PI / 180);
  const tanAlpha = Math.tan(alpha);
  const d = boltDiameter;
  const dh = holeDiameter;
  const l = gripLength;

  if (l <= 0 || d <= 0) return 0;

  // Effective diameter at the frustum top: do = d + l * tan(α) * 2 (simplified)
  // Using the standard formula:
  // km = (π * E * d * tan(α)) / ln(2 * l / (d - dh) + 1)  ... alternate form
  // More standard: km = (π * E * d * tan(α)) / (2 * ln((d + 2*l*tan(α) - dh) / (d - dh)))
  // But the most common Shigley form for a single frustum:
  const do_top = d + 2 * l * tanAlpha; // outer diameter at top of frustum

  const denom = Math.log((do_top + dh) / (d + dh));
  if (Math.abs(denom) < 1e-15) return 0;

  const km = (Math.PI * memberModulus * d * tanAlpha) / denom;
  return km;
}

// ---- Main solver ----
export function solveBoltJoint(
  spec: BoltSpec,
  material: MaterialProps,
  joint: JointGeometry,
  appliedTorque: number,
  targetPreload: number,
  useTorqueInput: boolean,
): BoltResults {
  const warnings: string[] = [];

  // 1. Thread geometry
  const geom = computeThreadGeometry(spec);
  const At = geom.At;
  const dr = geom.dr;
  const dp = geom.dp;
  const lambda = geom.leadAngle;

  // 2. Bearing diameter (mean diameter of nut/bolt head bearing face)
  // Approximate: db ≈ 1.5 * d (typical hex nut)
  const db = 1.5 * spec.nominalDiameter;

  // 3. Compute preload
  let preload: number;
  let torque: number;

  if (useTorqueInput) {
    // User provides torque → compute preload
    preload = torqueToPreload(
      appliedTorque,
      spec,
      geom,
      joint.threadFriction,
      joint.bearingFriction,
      db,
    );
    torque = appliedTorque;
  } else {
    // User provides target preload → compute required torque
    preload = targetPreload;
    torque = preloadToTorque(
      preload,
      spec,
      geom,
      joint.threadFriction,
      joint.bearingFriction,
      db,
    );
  }

  // 4. Joint stiffness
  const boltArea = At; // use tensile stress area for bolt stiffness
  const kb = computeBoltStiffness(boltArea, material.modulusElasticity, joint.clampedLength);
  const km = computeMemberStiffness(
    joint.memberElasticity,
    joint.boltDiameter,
    joint.holeDiameter,
    joint.clampedLength,
  );

  const stiffnessRatio = kb + km > 0 ? kb / (kb + km) : 0;

  // 5. Load distribution under external load
  const Fext = joint.externalLoad;
  const loadBolt = stiffnessRatio * Fext; // additional load on bolt
  const loadMember = (1 - stiffnessRatio) * Fext; // load relieved from members

  // 6. Resultant forces
  const resultantBoltLoad = preload + loadBolt;
  const resultantMemberLoad = preload - loadMember;

  // 7. Stresses
  const boltStress = resultantBoltLoad / At;
  const memberStress = km > 0 ? Math.abs(resultantMemberLoad) / (Math.PI * (joint.boltDiameter * 2.5) ** 2 / 4 - Math.PI * joint.holeDiameter ** 2 / 4) : 0;

  // 8. Safety factors
  // Against yielding: n_y = Sy / σ_bolt
  const safetyFactorYield = boltStress > 0 ? material.yieldStrength / boltStress : Infinity;

  // Against joint separation: n_sep = Fi / (Fext - Fi) ... or Fi / |Fext|
  // Separation occurs when resultant member load = 0 → Fext = Fi / (1 - C)
  const separationLoad = preload / (1 - stiffnessRatio);
  const safetyFactorSeparation = Fext > 0 ? separationLoad / Fext : Infinity;

  // Against fatigue (simplified Goodman):
  // σ_a = (C * Fext) / (2 * At)  (alternating stress amplitude)
  // σ_m = (Fi + C * Fext) / At   (mean stress)
  // Se = 0.5 * Su (endurance limit approximation)
  const sigmaA = (stiffnessRatio * Fext) / (2 * At);
  const sigmaM = (preload + stiffnessRatio * Fext) / At;
  const Se = 0.5 * material.ultimateStrength;
  const safetyFactorFatigue =
    sigmaA > 0 ? 1 / (sigmaA / Se + sigmaM / material.ultimateStrength) : Infinity;

  // 9. Warnings
  if (safetyFactorYield < 1.5) {
    warnings.push('⚠️ Yield safety factor is below 1.5 — bolt may yield.');
  }
  if (safetyFactorYield < 1) {
    warnings.push('⛔ Yield safety factor is below 1.0 — bolt WILL yield!');
  }
  if (safetyFactorSeparation < 1.5 && safetyFactorSeparation !== Infinity) {
    warnings.push('⚠️ Separation safety factor is below 1.5 — joint may separate.');
  }
  if (safetyFactorSeparation < 1) {
    warnings.push('⛔ Separation safety factor is below 1.0 — joint WILL separate!');
  }
  if (resultantMemberLoad < 0) {
    warnings.push('⛔ Member load is negative — joint has separated!');
  }
  if (preload > 0.9 * material.yieldStrength * At) {
    warnings.push('⚠️ Preload exceeds 90% of yield strength — risk of over-tightening.');
  }
  if (kb <= 0) warnings.push('⚠️ Bolt stiffness is zero — check grip length.');
  if (km <= 0) warnings.push('⚠️ Member stiffness is zero — check geometry.');

  return {
    tensileStressArea: At,
    minorDiameter: dr,
    pitchDiameter: dp,
    leadAngle: lambda,
    preloadFromTorque: preload,
    torqueFromPreload: torque,
    boltStiffness: kb,
    memberStiffness: km,
    stiffnessRatio,
    loadBolt,
    loadMember,
    resultantBoltLoad,
    resultantMemberLoad,
    safetyFactorYield,
    safetyFactorSeparation,
    safetyFactorFatigue,
    boltStress,
    memberStress,
    boltDiameter: joint.boltDiameter,
    holeDiameter: joint.holeDiameter,
    gripLength: joint.clampedLength,
    frustumAngle: 30 * (Math.PI / 180),
    warnings,
  };
}
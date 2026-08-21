// Bolt & Fastener Joint Calculator — Type Definitions

export type ThreadStandard = 'ISO' | 'UN';

export interface BoltSpec {
  standard: ThreadStandard;
  nominalDiameter: number; // nominal bolt diameter (m)
  pitch: number; // thread pitch (m) — distance between threads
  // Derived properties computed in solver:
  tensileStressArea?: number; // At (m²)
  minorDiameter?: number; // root/minor diameter (m)
  pitchDiameter?: number; // pitch diameter (m)
  majorDiameter?: number; // major diameter (m)
}

export interface MaterialProps {
  yieldStrength: number; // Sy (Pa) — bolt material yield strength
  ultimateStrength: number; // Su (Pa) — ultimate tensile strength
  modulusElasticity: number; // E (Pa) — bolt material Young's modulus
}

export interface JointGeometry {
  clampedLength: number; // total grip length (m)
  boltDiameter: number; // bolt nominal diameter (m)
  holeDiameter: number; // clearance hole diameter (m)
  // Clamped member properties
  memberElasticity: number; // E of clamped material (Pa)
  memberThickness: number; // thickness of clamped members (m) — same as grip length
  // External load
  externalLoad: number; // F_ext (N) — applied axial load on joint
  // Friction
  threadFriction: number; // μ_t — friction coefficient in threads
  bearingFriction: number; // μ_b — friction coefficient at bearing/nut face
  // Torque factor
  torqueFactor?: number; // K — nut factor (if known, overrides friction calc)
}

export interface TorqueInput {
  appliedTorque: number; // T (N·m) — applied tightening torque
  friction: number; // μ — combined friction coefficient
  nominalDiameter: number; // d (m)
}

export interface BoltResults {
  // Thread geometry
  tensileStressArea: number; // At (m²)
  minorDiameter: number; // dr (m)
  pitchDiameter: number; // dp (m)
  leadAngle: number; // λ (rad)
  // Torque-Preload relationship
  preloadFromTorque: number; // Fi (N) — preload from applied torque
  torqueFromPreload: number; // T (N·m) — torque needed for target preload
  // Joint stiffness
  boltStiffness: number; // kb (N/m)
  memberStiffness: number; // km (N/m)
  stiffnessRatio: number; // C = kb / (kb + km)
  loadBolt: number; // load carried by bolt (N)
  loadMember: number; // load carried by members (N)
  // Resultant forces
  resultantBoltLoad: number; // final bolt load (N)
  resultantMemberLoad: number; // final member load (N)
  // Safety factors
  safetyFactorYield: number; // n_y — against yielding
  safetyFactorSeparation: number; // n_sep — against joint separation
  safetyFactorFatigue: number; // n_f — against fatigue (if applicable)
  // Stress values
  boltStress: number; // σ_bolt (Pa)
  memberStress: number; // σ_member (Pa)
  // Joint geometry (for visualization)
  boltDiameter: number; // d (m)
  holeDiameter: number; // dh (m)
  gripLength: number; // l (m)
  frustumAngle: number; // α (rad) — pressure cone half-angle
  // Warnings
  warnings: string[];
}

export interface ThreadSizePreset {
  label: string;
  standard: ThreadStandard;
  nominalDiameter: number; // m
  pitch: number; // m
}
// Core type definitions for the beam calculator

export type SupportType = 'pin' | 'roller' | 'fixed' | 'free';

export interface Support {
  id: string;
  position: number; // distance from left end
  type: SupportType;
}

export type LoadType = 'point' | 'distributed' | 'moment';

export interface Load {
  id: string;
  type: LoadType;
  position: number; // start position (for point & moment: exact location; for distributed: start)
  endPosition?: number; // end position for distributed loads
  magnitude: number; // force (N) for point, force/length (N/m) for distributed, moment (N·m) for moment
  endMagnitude?: number; // for trapezoidal distributed loads (linearly varying)
}

export interface BeamProperties {
  length: number; // beam length (m)
  elasticity: number; // Young's modulus E (Pa)
  inertia: number; // Moment of inertia I (m^4)
}

export interface BeamModel {
  properties: BeamProperties;
  supports: Support[];
  loads: Load[];
}

export interface BeamResults {
  reactions: Reaction[];
  shear: DiagramPoint[];
  moment: DiagramPoint[];
  deflection: DiagramPoint[];
  slope: DiagramPoint[];
  maxShear: { value: number; position: number };
  maxMoment: { value: number; position: number };
  maxDeflection: { value: number; position: number };
}

export interface Reaction {
  supportId: string;
  position: number;
  verticalForce: number; // N (positive = upward)
  moment: number; // N·m (positive = counterclockwise)
}

export interface DiagramPoint {
  x: number; // position along beam (m)
  y: number; // value (shear in N, moment in N·m, deflection in m)
}
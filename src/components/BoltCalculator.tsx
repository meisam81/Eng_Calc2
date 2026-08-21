import { useState } from 'react';
import type { BoltSpec, MaterialProps, JointGeometry, ThreadStandard } from '../bolt/types';
import { THREAD_PRESETS, MATERIAL_PRESETS, solveBoltJoint } from '../bolt/solver';
import type { BoltResults } from '../bolt/types';
import './BoltCalculator.css';

interface BoltCalculatorProps {
  onResults: (results: BoltResults | null) => void;
  results: BoltResults | null;
}

export function BoltCalculator({ onResults, results }: BoltCalculatorProps) {
  const [standard, setStandard] = useState<ThreadStandard>('ISO');
  const [presetIdx, setPresetIdx] = useState(4); // M10 × 1.5
  const [nominalDiameter, setNominalDiameter] = useState(0.010);
  const [pitch, setPitch] = useState(0.0015);

  const [matIdx, setMatIdx] = useState(0);
  const [yieldStrength, setYieldStrength] = useState(640e6);
  const [ultimateStrength, setUltimateStrength] = useState(800e6);
  const [boltModulus, setBoltModulus] = useState(210e9);

  const [clampedLength, setClampedLength] = useState(0.030);
  const [boltDiameter, setBoltDiameter] = useState(0.010);
  const [holeDiameter, setHoleDiameter] = useState(0.011);
  const [memberElasticity, setMemberElasticity] = useState(210e9);
  const [externalLoad, setExternalLoad] = useState(5000);
  const [threadFriction, setThreadFriction] = useState(0.15);
  const [bearingFriction, setBearingFriction] = useState(0.15);

  const [useTorqueInput, setUseTorqueInput] = useState(true);
  const [appliedTorque, setAppliedTorque] = useState(20);
  const [targetPreload, setTargetPreload] = useState(20000);

  const [error, setError] = useState<string | null>(null);

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    const p = THREAD_PRESETS[idx];
    setStandard(p.standard);
    setNominalDiameter(p.nominalDiameter);
    setPitch(p.pitch);
    setBoltDiameter(p.nominalDiameter);
    setHoleDiameter(p.nominalDiameter * 1.1);
  };

  const applyMaterial = (idx: number) => {
    setMatIdx(idx);
    const m = MATERIAL_PRESETS[idx];
    setYieldStrength(m.yieldStrength);
    setUltimateStrength(m.ultimateStrength);
    setBoltModulus(m.modulusElasticity);
  };

  const handleSolve = () => {
    try {
      const spec: BoltSpec = { standard, nominalDiameter, pitch };
      const material: MaterialProps = {
        yieldStrength,
        ultimateStrength,
        modulusElasticity: boltModulus,
      };
      const joint: JointGeometry = {
        clampedLength,
        boltDiameter,
        holeDiameter,
        memberElasticity,
        memberThickness: clampedLength,
        externalLoad,
        threadFriction,
        bearingFriction,
      };

      const res = solveBoltJoint(spec, material, joint, appliedTorque, targetPreload, useTorqueInput);
      onResults(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred.');
      onResults(null);
    }
  };

  return (
    <div className="bolt-form">
      <div className="tabs">
        <button className="active">Bolt & Joint</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-section">
        <h3>Thread Specification</h3>
        <div className="field">
          <label>Standard Size Preset</label>
          <select value={presetIdx} onChange={(e) => applyPreset(parseInt(e.target.value))}>
            {THREAD_PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="field">
            <label>Nominal Diameter (mm)</label>
            <input
              type="number"
              value={(nominalDiameter * 1000).toFixed(4)}
              onChange={(e) => {
                const v = (parseFloat(e.target.value) || 0) / 1000;
                setNominalDiameter(v);
                setBoltDiameter(v);
              }}
              step="any"
            />
          </div>
          <div className="field">
            <label>Thread Pitch (mm)</label>
            <input
              type="number"
              value={(pitch * 1000).toFixed(4)}
              onChange={(e) => setPitch((parseFloat(e.target.value) || 0) / 1000)}
              step="any"
            />
          </div>
          <div className="field">
            <label>Standard</label>
            <select value={standard} onChange={(e) => setStandard(e.target.value as ThreadStandard)}>
              <option value="ISO">ISO Metric</option>
              <option value="UN">UN (Imperial)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Bolt Material</h3>
        <div className="field">
          <label>Material Preset</label>
          <select value={matIdx} onChange={(e) => applyMaterial(parseInt(e.target.value))}>
            {MATERIAL_PRESETS.map((m, i) => (
              <option key={i} value={i}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <div className="field">
            <label>Yield Strength, Sy (MPa)</label>
            <input
              type="number"
              value={(yieldStrength / 1e6).toFixed(1)}
              onChange={(e) => setYieldStrength((parseFloat(e.target.value) || 0) * 1e6)}
              step="any"
            />
          </div>
          <div className="field">
            <label>Ultimate Strength, Su (MPa)</label>
            <input
              type="number"
              value={(ultimateStrength / 1e6).toFixed(1)}
              onChange={(e) => setUltimateStrength((parseFloat(e.target.value) || 0) * 1e6)}
              step="any"
            />
          </div>
          <div className="field">
            <label>Modulus, Eb (GPa)</label>
            <input
              type="number"
              value={(boltModulus / 1e9).toFixed(1)}
              onChange={(e) => setBoltModulus((parseFloat(e.target.value) || 0) * 1e9)}
              step="any"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Joint Geometry</h3>
        <div className="row">
          <div className="field">
            <label>Clamped Length (mm)</label>
            <input
              type="number"
              value={(clampedLength * 1000).toFixed(2)}
              onChange={(e) => setClampedLength((parseFloat(e.target.value) || 0) / 1000)}
              step="any"
            />
          </div>
          <div className="field">
            <label>Bolt Diameter (mm)</label>
            <input
              type="number"
              value={(boltDiameter * 1000).toFixed(4)}
              onChange={(e) => setBoltDiameter((parseFloat(e.target.value) || 0) / 1000)}
              step="any"
            />
          </div>
          <div className="field">
            <label>Hole Diameter (mm)</label>
            <input
              type="number"
              value={(holeDiameter * 1000).toFixed(4)}
              onChange={(e) => setHoleDiameter((parseFloat(e.target.value) || 0) / 1000)}
              step="any"
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Member Modulus, Em (GPa)</label>
            <input
              type="number"
              value={(memberElasticity / 1e9).toFixed(1)}
              onChange={(e) => setMemberElasticity((parseFloat(e.target.value) || 0) * 1e9)}
              step="any"
            />
          </div>
          <div className="field">
            <label>External Load (N)</label>
            <input
              type="number"
              value={externalLoad}
              onChange={(e) => setExternalLoad(parseFloat(e.target.value) || 0)}
              step="any"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Friction Coefficients</h3>
        <div className="row">
          <div className="field">
            <label>Thread Friction, μ_t</label>
            <input
              type="number"
              value={threadFriction}
              onChange={(e) => setThreadFriction(parseFloat(e.target.value) || 0)}
              step="0.01"
              min={0}
            />
          </div>
          <div className="field">
            <label>Bearing Friction, μ_b</label>
            <input
              type="number"
              value={bearingFriction}
              onChange={(e) => setBearingFriction(parseFloat(e.target.value) || 0)}
              step="0.01"
              min={0}
            />
          </div>
        </div>
        <div className="presets">
          <button onClick={() => { setThreadFriction(0.15); setBearingFriction(0.15); }}>Dry, steel (0.15)</button>
          <button onClick={() => { setThreadFriction(0.10); setBearingFriction(0.10); }}>Lubricated (0.10)</button>
          <button onClick={() => { setThreadFriction(0.20); setBearingFriction(0.20); }}>Galvanized (0.20)</button>
        </div>
      </div>

      <div className="form-section">
        <h3>Torque / Preload</h3>
        <div className="row">
          <label className="radio-label">
            <input
              type="radio"
              checked={useTorqueInput}
              onChange={() => setUseTorqueInput(true)}
            />
            Input Torque → Calculate Preload
          </label>
          <label className="radio-label">
            <input
              type="radio"
              checked={!useTorqueInput}
              onChange={() => setUseTorqueInput(false)}
            />
            Input Preload → Calculate Torque
          </label>
        </div>
        {useTorqueInput ? (
          <div className="field">
            <label>Applied Torque (N·m)</label>
            <input
              type="number"
              value={appliedTorque}
              onChange={(e) => setAppliedTorque(parseFloat(e.target.value) || 0)}
              step="any"
            />
          </div>
        ) : (
          <div className="field">
            <label>Target Preload (N)</label>
            <input
              type="number"
              value={targetPreload}
              onChange={(e) => setTargetPreload(parseFloat(e.target.value) || 0)}
              step="any"
            />
          </div>
        )}
      </div>

      <button className="solve-btn" onClick={handleSolve}>Calculate Joint</button>

      {results && <BoltResultsDisplay results={results} />}
    </div>
  );
}

function BoltResultsDisplay({ results }: { results: BoltResults }) {
  const fmt = (n: number, decimals = 4): string => {
    if (Math.abs(n) < 1e-10) return '0';
    if (Math.abs(n) > 1e6 || (Math.abs(n) < 1e-4 && n !== 0)) return n.toExponential(3);
    return n.toFixed(decimals);
  };

  const fmtArea = (a: number): string => {
    const mm2 = a * 1e6;
    return `${mm2.toFixed(3)} mm²`;
  };

  const fmtStiffness = (k: number): string => {
    const MN_m = k / 1e6;
    return `${fmt(MN_m, 2)} MN/m`;
  };

  const sfColor = (sf: number): string => {
    if (sf < 1) return 'sf-critical';
    if (sf < 1.5) return 'sf-warning';
    return 'sf-ok';
  };

  return (
    <div className="bolt-results">
      <h3>Results</h3>

      {results.warnings.length > 0 && (
        <div className="warnings">
          {results.warnings.map((w, i) => (
            <div key={i} className="warning-item">{w}</div>
          ))}
        </div>
      )}

      <div className="results-summary">
        <div className="summary-card">
          <span className="label">Preload (Fi)</span>
          <span className="value">{fmt(results.preloadFromTorque, 1)} N</span>
        </div>
        <div className="summary-card">
          <span className="label">Required Torque</span>
          <span className="value">{fmt(results.torqueFromPreload, 2)} N·m</span>
        </div>
        <div className="summary-card">
          <span className="label">Bolt Stress</span>
          <span className="value">{fmt(results.boltStress / 1e6, 1)} MPa</span>
        </div>
      </div>

      <div className="results-summary">
        <div className={`summary-card ${sfColor(results.safetyFactorYield)}`}>
          <span className="label">SF Yield</span>
          <span className="value">{fmt(results.safetyFactorYield, 2)}</span>
        </div>
        <div className={`summary-card ${sfColor(results.safetyFactorSeparation)}`}>
          <span className="label">SF Separation</span>
          <span className="value">{fmt(results.safetyFactorSeparation, 2)}</span>
        </div>
        <div className={`summary-card ${sfColor(results.safetyFactorFatigue)}`}>
          <span className="label">SF Fatigue</span>
          <span className="value">{fmt(results.safetyFactorFatigue, 2)}</span>
        </div>
      </div>

      <h4>Thread Geometry</h4>
      <table className="results-table">
        <tbody>
          <tr><td>Tensile Stress Area (At)</td><td>{fmtArea(results.tensileStressArea)}</td></tr>
          <tr><td>Minor Diameter (dr)</td><td>{(results.minorDiameter * 1000).toFixed(4)} mm</td></tr>
          <tr><td>Pitch Diameter (dp)</td><td>{(results.pitchDiameter * 1000).toFixed(4)} mm</td></tr>
          <tr><td>Lead Angle (λ)</td><td>{(results.leadAngle * 180 / Math.PI).toFixed(2)}°</td></tr>
        </tbody>
      </table>

      <h4>Joint Stiffness</h4>
      <table className="results-table">
        <tbody>
          <tr><td>Bolt Stiffness (kb)</td><td>{fmtStiffness(results.boltStiffness)}</td></tr>
          <tr><td>Member Stiffness (km)</td><td>{fmtStiffness(results.memberStiffness)}</td></tr>
          <tr><td>Stiffness Ratio (C = kb/(kb+km))</td><td>{(results.stiffnessRatio * 100).toFixed(1)}%</td></tr>
          <tr><td>Load on Bolt (C × Fext)</td><td>{fmt(results.loadBolt, 1)} N</td></tr>
          <tr><td>Load Relieved from Members</td><td>{fmt(results.loadMember, 1)} N</td></tr>
        </tbody>
      </table>

      <h4>Resultant Forces</h4>
      <table className="results-table">
        <tbody>
          <tr><td>Resultant Bolt Load</td><td>{fmt(results.resultantBoltLoad, 1)} N</td></tr>
          <tr><td>Resultant Member Load</td><td>{fmt(results.resultantMemberLoad, 1)} N</td></tr>
          <tr><td>Member Stress</td><td>{fmt(results.memberStress / 1e6, 1)} MPa</td></tr>
        </tbody>
      </table>
    </div>
  );
}
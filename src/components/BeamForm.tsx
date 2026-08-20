import { useState } from 'react';
import type { BeamModel, Load, Support, SupportType } from '../beam/types';
import './BeamForm.css';

interface BeamFormProps {
  model: BeamModel;
  onChange: (model: BeamModel) => void;
  onSolve: () => void;
  error: string | null;
}

let idCounter = 0;
const genId = () => `id-${++idCounter}`;

export function BeamForm({ model, onChange, onSolve, error }: BeamFormProps) {
  const [activeTab, setActiveTab] = useState<'beam' | 'supports' | 'loads'>('beam');

  const updateProperties = (key: keyof BeamModel['properties'], value: number) => {
    onChange({ ...model, properties: { ...model.properties, [key]: value } });
  };

  const addSupport = () => {
    const newSupport: Support = {
      id: genId(),
      position: model.properties.length / 2,
      type: 'pin',
    };
    onChange({ ...model, supports: [...model.supports, newSupport] });
  };

  const updateSupport = (id: string, field: keyof Support, value: number | SupportType) => {
    onChange({
      ...model,
      supports: model.supports.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    });
  };

  const removeSupport = (id: string) => {
    onChange({ ...model, supports: model.supports.filter((s) => s.id !== id) });
  };

  const addLoad = () => {
    const newLoad: Load = {
      id: genId(),
      type: 'point',
      position: model.properties.length / 2,
      magnitude: -1000,
    };
    onChange({ ...model, loads: [...model.loads, newLoad] });
  };

  const updateLoad = (id: string, field: keyof Load, value: number | string) => {
    onChange({
      ...model,
      loads: model.loads.map((l) =>
        l.id === id ? { ...l, [field]: value } : l
      ),
    });
  };

  const removeLoad = (id: string) => {
    onChange({ ...model, loads: model.loads.filter((l) => l.id !== id) });
  };

  return (
    <div className="beam-form">
      <div className="tabs">
        <button
          className={activeTab === 'beam' ? 'active' : ''}
          onClick={() => setActiveTab('beam')}
        >
          Beam Properties
        </button>
        <button
          className={activeTab === 'supports' ? 'active' : ''}
          onClick={() => setActiveTab('supports')}
        >
          Supports ({model.supports.length})
        </button>
        <button
          className={activeTab === 'loads' ? 'active' : ''}
          onClick={() => setActiveTab('loads')}
        >
          Loads ({model.loads.length})
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeTab === 'beam' && (
        <div className="form-section">
          <h3>Beam Section & Material</h3>
          <div className="field">
            <label>Beam Length (m)</label>
            <input
              type="number"
              value={model.properties.length}
              onChange={(e) => updateProperties('length', parseFloat(e.target.value) || 0)}
              min={0}
              step="any"
            />
          </div>
          <div className="field">
            <label>Modulus of Elasticity, E (Pa)</label>
            <input
              type="number"
              value={model.properties.elasticity}
              onChange={(e) => updateProperties('elasticity', parseFloat(e.target.value) || 0)}
              min={0}
              step="any"
            />
            <div className="presets">
              <button onClick={() => updateProperties('elasticity', 200e9)}>Steel (200 GPa)</button>
              <button onClick={() => updateProperties('elasticity', 70e9)}>Aluminum (70 GPa)</button>
              <button onClick={() => updateProperties('elasticity', 30e9)}>Wood (30 GPa)</button>
            </div>
          </div>
          <div className="field">
            <label>Moment of Inertia, I (m⁴)</label>
            <input
              type="number"
              value={model.properties.inertia}
              onChange={(e) => updateProperties('inertia', parseFloat(e.target.value) || 0)}
              min={0}
              step="any"
            />
            <div className="presets">
              <button onClick={() => updateProperties('inertia', 8.33e-6)}>W200×100 (8.33e-6)</button>
              <button onClick={() => updateProperties('inertia', 1.2e-4)}>W310×158 (1.2e-4)</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supports' && (
        <div className="form-section">
          <h3>Supports</h3>
          <p className="hint">Position is measured from the left end of the beam.</p>
          {model.supports.map((s) => (
            <div key={s.id} className="row">
              <div className="field">
                <label>Position (m)</label>
                <input
                  type="number"
                  value={s.position}
                  onChange={(e) => updateSupport(s.id, 'position', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={model.properties.length}
                  step="any"
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  value={s.type}
                  onChange={(e) => updateSupport(s.id, 'type', e.target.value as SupportType)}
                >
                  <option value="pin">Pin (v=0)</option>
                  <option value="roller">Roller (v=0)</option>
                  <option value="fixed">Fixed (v=0, θ=0)</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <button className="remove-btn" onClick={() => removeSupport(s.id)}>✕</button>
            </div>
          ))}
          <button className="add-btn" onClick={addSupport}>+ Add Support</button>
        </div>
      )}

      {activeTab === 'loads' && (
        <div className="form-section">
          <h3>Loads</h3>
          <p className="hint">Downward forces are negative. Clockwise moments are positive.</p>
          {model.loads.map((l) => (
            <div key={l.id} className="row load-row">
              <div className="field">
                <label>Type</label>
                <select
                  value={l.type}
                  onChange={(e) => updateLoad(l.id, 'type', e.target.value)}
                >
                  <option value="point">Point Force</option>
                  <option value="distributed">Distributed Load</option>
                  <option value="moment">Moment</option>
                </select>
              </div>
              <div className="field">
                <label>Position (m)</label>
                <input
                  type="number"
                  value={l.position}
                  onChange={(e) => updateLoad(l.id, 'position', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={model.properties.length}
                  step="any"
                />
              </div>
              {l.type === 'distributed' && (
                <div className="field">
                  <label>End Position (m)</label>
                  <input
                    type="number"
                    value={l.endPosition ?? l.position}
                    onChange={(e) => updateLoad(l.id, 'endPosition', parseFloat(e.target.value) || 0)}
                    min={0}
                    max={model.properties.length}
                    step="any"
                  />
                </div>
              )}
              <div className="field">
                <label>
                  {l.type === 'moment' ? 'Moment (N·m)' : l.type === 'distributed' ? 'Start w (N/m)' : 'Force (N)'}
                </label>
                <input
                  type="number"
                  value={l.magnitude}
                  onChange={(e) => updateLoad(l.id, 'magnitude', parseFloat(e.target.value) || 0)}
                  step="any"
                />
              </div>
              {l.type === 'distributed' && (
                <div className="field">
                  <label>End w (N/m)</label>
                  <input
                    type="number"
                    value={l.endMagnitude ?? l.magnitude}
                    onChange={(e) => updateLoad(l.id, 'endMagnitude', parseFloat(e.target.value) || 0)}
                    step="any"
                  />
                </div>
              )}
              <button className="remove-btn" onClick={() => removeLoad(l.id)}>✕</button>
            </div>
          ))}
          <button className="add-btn" onClick={addLoad}>+ Add Load</button>
        </div>
      )}

      <button className="solve-btn" onClick={onSolve}>
        Solve Beam
      </button>
    </div>
  );
}
import { useState } from 'react'
import { BeamForm } from './components/BeamForm'
import { Diagrams } from './components/Diagrams'
import { solveBeam } from './beam/solver'
import type { BeamModel, BeamResults } from './beam/types'
import { BoltCalculator } from './components/BoltCalculator'
import type { BoltResults } from './bolt/types'
import './App.css'

type CalculatorType = 'beam' | 'bolt'

const defaultModel: BeamModel = {
  properties: {
    length: 6,
    elasticity: 200e9,
    inertia: 8.33e-6,
  },
  supports: [
    { id: 's1', position: 0, type: 'pin' },
    { id: 's2', position: 6, type: 'roller' },
  ],
  loads: [
    { id: 'l1', type: 'point', position: 3, magnitude: -10000 },
  ],
}

function App() {
  const [activeCalc, setActiveCalc] = useState<CalculatorType>('beam')

  // Beam state
  const [model, setModel] = useState<BeamModel>(defaultModel)
  const [results, setResults] = useState<BeamResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Bolt state
  const [boltResults, setBoltResults] = useState<BoltResults | null>(null)

  const handleSolve = () => {
    try {
      const res = solveBeam(model)
      setResults(res)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred while solving.')
      setResults(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Engineering Calculator</h1>
        <p className="subtitle">Structural & Mechanical Engineering Tools</p>
        <nav className="calc-nav">
          <button
            className={activeCalc === 'beam' ? 'active' : ''}
            onClick={() => setActiveCalc('beam')}
          >
            🔧 Beam Analysis
          </button>
          <button
            className={activeCalc === 'bolt' ? 'active' : ''}
            onClick={() => setActiveCalc('bolt')}
          >
            ⚙️ Bolt & Fastener Joint
          </button>
        </nav>
      </header>

      <div className="app-body">
        {activeCalc === 'beam' ? (
          <>
            <aside className="sidebar">
              <BeamForm
                model={model}
                onChange={setModel}
                onSolve={handleSolve}
                error={error}
              />
            </aside>
            <main className="main-content">
              {results ? (
                <Diagrams results={results} model={model} />
              ) : (
                <div className="placeholder">
                  <div className="placeholder-icon">📐</div>
                  <h2>Ready to Solve</h2>
                  <p>Configure your beam properties, supports, and loads on the left, then click <strong>Solve Beam</strong> to generate diagrams and reactions.</p>
                  <div className="placeholder-features">
                    <div className="feature">
                      <span className="feature-icon">📊</span>
                      <span>Shear Force Diagram</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📈</span>
                      <span>Bending Moment Diagram</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📏</span>
                      <span>Deflection Curve</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">🔧</span>
                      <span>Support Reactions</span>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          <>
            <aside className="sidebar">
              <BoltCalculator
                results={boltResults}
                onResults={setBoltResults}
              />
            </aside>
            <main className="main-content">
              {boltResults ? null : (
                <div className="placeholder">
                  <div className="placeholder-icon">⚙️</div>
                  <h2>Bolt & Fastener Joint Calculator</h2>
                  <p>Configure thread specs, material, joint geometry, and torque/preload on the left, then click <strong>Calculate Joint</strong> to compute preload, joint stiffness, and safety factors.</p>
                  <div className="placeholder-features">
                    <div className="feature">
                      <span className="feature-icon">🔩</span>
                      <span>Torque ↔ Preload</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📐</span>
                      <span>Thread Geometry</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📊</span>
                      <span>Joint Stiffness</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">🛡️</span>
                      <span>Safety Factors</span>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  )
}

export default App

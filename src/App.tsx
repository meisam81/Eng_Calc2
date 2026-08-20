import { useState } from 'react'
import { BeamForm } from './components/BeamForm'
import { Diagrams } from './components/Diagrams'
import { solveBeam } from './beam/solver'
import type { BeamModel, BeamResults } from './beam/types'
import './App.css'

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
  const [model, setModel] = useState<BeamModel>(defaultModel)
  const [results, setResults] = useState<BeamResults | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        <p className="subtitle">Beam Analysis Tool — Shear, Moment & Deflection Diagrams</p>
      </header>

      <div className="app-body">
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
      </div>
    </div>
  )
}

export default App

import { Buffer } from 'buffer'
globalThis.Buffer = Buffer
import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:24,fontFamily:'monospace',background:'#fff1f2',minHeight:'100vh'}}>
          <h2 style={{color:'#dc2626'}}>Error al cargar GIVAMIC</h2>
          <pre style={{color:'#7f1d1d',fontSize:13,whiteSpace:'pre-wrap'}}>
            {this.state.error?.message}

{this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

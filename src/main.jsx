import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './styles/liquid-glass.css'
import PrototypeErrorBoundary from './components/prototype/PrototypeErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrototypeErrorBoundary>
      <App />
    </PrototypeErrorBoundary>
  </StrictMode>,
)

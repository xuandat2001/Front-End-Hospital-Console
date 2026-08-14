import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './styles/liquid-glass.css'
import './styles/center-pill-nav.css'
import './styles/reference-sidebar.css'
import './styles/breadcrumbs.css'
import './styles/global-content-dropdown.css'
import { applyThemeClass } from './utils/theme.js'

applyThemeClass()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { getInitialTheme } from './lib/ui-store'
import './index.css'

// Apply the theme before the first paint to avoid a flash of the wrong theme.
document.documentElement.dataset.theme = getInitialTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

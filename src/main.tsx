import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { getInitialTheme } from './lib/ui-store'
import { reloadOnServiceWorkerUpdate } from './lib/sw-update'
import './index.css'

// Apply the theme before the first paint to avoid a flash of the wrong theme.
document.documentElement.dataset.theme = getInitialTheme()

reloadOnServiceWorkerUpdate()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

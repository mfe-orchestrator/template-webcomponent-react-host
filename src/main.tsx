// configure() must run at the very top of the entry point, synchronously, before
// anything loads a microfrontend. It is idempotent.
import { configure } from '@mfe-orchestrator-hub/client'

// The environment is optional. When VITE_MFE_ENVIRONMENT is unset, or set to an
// empty value, the key is left out of configure() entirely — never passed as an
// empty string — and the backend resolves the environment from the domain the
// page is served from.
const environment = import.meta.env.VITE_MFE_ENVIRONMENT?.trim()

configure({
  backendUrl: import.meta.env.VITE_MFE_BACKEND_URL,
  projectId: import.meta.env.VITE_MFE_PROJECT_ID,
  ...(environment ? { environment } : {})
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

import React, { useEffect, useState } from 'react'
import { globalVariables, identities, manifest } from '@mfe-orchestrator-hub/client'
import MicrofrontendLoader from './MicrofrontendLoader'
import type { MicrofrontendEntry } from '@mfe-orchestrator-hub/client'

const App: React.FC = () => {
  const [microfrontends, setMicrofrontends] = useState<MicrofrontendEntry[]>([])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const ids = identities()

  useEffect(() => {
    Promise.all([manifest(), globalVariables()])
      .then(([data, vars]) => {
        setMicrofrontends(data.microfrontends ?? [])
        setVariables(vars)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="App">
      <h1>Web Component host</h1>
      <p>
        This host resolves its microfrontends through the orchestrator: it never
        knows, and never chooses, which version it is served.
      </p>

      {/*
        Example microfrontend. Change "example-remote" to one of your slugs, and
        the element name to whatever custom element that microfrontend registers.
      */}
      <MicrofrontendLoader slug="example-remote">
        <microfrontend-web-component />
      </MicrofrontendLoader>

      <section>
        <h2>Environment</h2>
        {error ? (
          <p className="warn">{error}</p>
        ) : (
          <>
            <ul>
              {microfrontends.map(mfe => (
                <li key={mfe.slug}>
                  <strong>{mfe.name}</strong> ({mfe.slug}) — served version {mfe.version}
                </li>
              ))}
            </ul>
            <ul>
              {Object.entries(variables).map(([key, value]) => (
                <li key={key}>
                  {key} = {value}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="ids">
          session {ids.sessionId} · device {ids.deviceId}
        </p>
      </section>
    </div>
  )
}

export default App

import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { remoteUrl } from '@mfe-orchestrator/client'

export interface MicrofrontendLoaderProps extends React.PropsWithChildren {
  /** Slug of the microfrontend in the orchestrator. */
  slug: string
  /**
   * Web component builds that externalise React expect it on the window. Leave
   * this on unless your microfrontend bundles its own copy.
   */
  exposeReactGlobals?: boolean
  /**
   * 'module' for the ES build, undefined for the UMD build (a classic script).
   * Match whatever your remote uploads to the orchestrator.
   */
  scriptType?: 'module'
  loadingPlaceholder?: React.ReactNode
  errorPlaceholder?: (message: string) => React.ReactNode
}

/**
 * Loads a web component microfrontend and renders whatever custom element it
 * registers.
 *
 * The URL comes from remoteUrl(slug) and is used verbatim: the host does not
 * choose the version it gets and must not rebuild or trim that URL.
 */
export const MicrofrontendLoader: React.FC<MicrofrontendLoaderProps> = ({
  slug,
  children,
  exposeReactGlobals = true,
  scriptType,
  loadingPlaceholder = <div>Loading…</div>,
  errorPlaceholder = message => <div className="warn">{message}</div>
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let script: HTMLScriptElement | undefined
    let cancelled = false

    if (exposeReactGlobals) {
      ;(window as unknown as Record<string, unknown>)['React'] = React
      ;(window as unknown as Record<string, unknown>)['ReactDOM'] = ReactDOM
    }

    setLoading(true)
    setError(null)

    remoteUrl(slug)
      .then(url => {
        if (cancelled) return
        script = document.createElement('script')
        script.src = url
        script.async = true
        if (scriptType) script.type = scriptType
        script.onload = () => setLoading(false)
        script.onerror = () => {
          setLoading(false)
          setError(`Failed to load "${slug}" from ${url}`)
        }
        document.head.appendChild(script)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setLoading(false)
        setError(e.message)
      })

    return () => {
      cancelled = true
      if (script && script.parentNode) script.parentNode.removeChild(script)
    }
  }, [slug, exposeReactGlobals, scriptType])

  if (loading) return <>{loadingPlaceholder}</>
  if (error) return <>{errorPlaceholder(error)}</>
  return <>{children}</>
}

export default MicrofrontendLoader

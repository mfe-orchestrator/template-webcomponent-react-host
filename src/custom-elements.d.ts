import type * as React from 'react'

/**
 * Custom elements registered by the frontends this host loads.
 * Add one entry per element you render.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'frontend-web-component': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}

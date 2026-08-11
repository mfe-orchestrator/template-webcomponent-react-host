import type * as React from 'react'

/**
 * Custom elements registered by the microfrontends this host loads.
 * Add one entry per element you render.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'microfrontend-web-component': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}

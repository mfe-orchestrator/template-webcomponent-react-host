# Web Component & React — host template

Starter template for the [MFE Orchestrator](https://github.com/mfe-orchestrator), listed in the
marketplace as `webcomponent-host-react`. Web Component + React 19, wired as a **host**.

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io) 12 (pinned in `packageManager`; `corepack enable` picks it up)

> [!NOTE]
> The client SDK is published as `@mfe-orchestrator-hub/client` and this template depends on it at
> `^0.1.0`. A caret on a `0.x` version is deliberately narrow: it accepts `0.1.x`
> only, **not** `0.2.0`. The SDK is new and parts of its API are still settling, so that is the
> intended level of caution — the cost is that you have to widen this range yourself when the SDK
> moves to `0.2.0`, otherwise `pnpm install` fails to resolve it.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build into dist/
```

## Project structure

```
.
├── .github/workflows/build-and-deploy.yml   # build + upload + Docker image
├── Dockerfile                               # standalone nginx deploy
├── nginx/no-cache.conf
├── index.html
├── src/
│   ├── App.tsx                              # shell, loads the example microfrontend
│   ├── MicrofrontendLoader.tsx              # resolves a slug and injects the script
│   ├── custom-elements.d.ts                 # JSX types for the custom elements
│   ├── index.css
│   ├── main.tsx                             # configure() lives here
│   ├── telemetry.ts                         # Application Insights, when the environment asks for it
│   └── vite-env.d.ts
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── vite.config.ts
```

## How the orchestrator is wired in

**The host never decides which version it gets.** It hands over the identities it holds and uses
the URL it receives, verbatim. Which version that URL points at — stable, canary, whatever — is
decided by the backend. Nothing in this repo parses a version, builds a URL by hand, or knows that
canaries exist.

**`configure()` runs at the very top of `src/main.tsx`, synchronously, before anything loads a
microfrontend:**

```ts
import { configure } from '@mfe-orchestrator-hub/client'

const environment = import.meta.env.VITE_MFE_ENVIRONMENT?.trim()

configure({
  backendUrl: import.meta.env.VITE_MFE_BACKEND_URL,
  projectId: import.meta.env.VITE_MFE_PROJECT_ID,
  ...(environment ? { environment } : {})
})
```

`backendUrl` and `projectId` are required, `environment` is not. When `VITE_MFE_ENVIRONMENT` is
unset or empty the key is left out of `configure()` altogether — the host never passes an empty
string — and the backend resolves the environment from the domain the page is served from, out of
the domains declared for each environment in the console. The spread is there for exactly that: it
is the difference between "no environment" and "an environment whose name is the empty string".

**Then each microfrontend is loaded by slug:**

```tsx
<MicrofrontendLoader slug="your-microfrontend-slug">
  <your-custom-element />
</MicrofrontendLoader>
```

`MicrofrontendLoader` calls `remoteUrl(slug)`, which returns the URL the backend resolved, already
pinned to a version, and injects it as a script. The SDK also exposes `manifest()`,
`globalVariables()` and `identities()`, all used in this template.

## Application Insights

The host starts [Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/javascript-sdk)
when its environment has a **global variable** named `APPLICATIONINSIGHTS_CONNECTION_STRING`. Set it
in the console, on each environment you want monitored, to the connection string of that
environment's Application Insights resource. The connection string only allows ingestion, so it is
fine in a browser.

Without the variable nothing happens: `src/telemetry.ts` loads `@microsoft/applicationinsights-web`
with a dynamic `import()`, so the SDK is a chunk of its own that is never downloaded, and the page
behaves exactly as before.

With it, the host initialises the SDK once and tracks:

- page views, the first one and every route change (`enableAutoRouteTracking`);
- unhandled exceptions, of the host and of every remote;
- `fetch` and XHR calls as dependencies, with W3C (`traceparent`, `tracestate`) and classic
  (`Request-Id`, `Request-Context`) correlation headers, so a backend that reports to Application
  Insights joins the same end-to-end transaction;
- browser timings (page load, network, DOM processing).

Everything is reported under the cloud role name `ROLE_NAME` (`webcomponent-host-react`): rename it in
`src/telemetry.ts` after your host, so it is told apart from the backends in the application map.

**Correlation with backends.** Correlation headers go to same-origin calls only, by default. To
correlate the calls to a backend on another host, add that host to `CORRELATED_HOSTS` in
`src/telemetry.ts` (`'api.example.com'`, or `'*.example.com'`), and make sure the backend's CORS
allows the request headers `traceparent`, `tracestate`, `Request-Id` and `Request-Context`:
otherwise the browser preflight fails and the call with it.

**Remotes.** The instance is published on `window.appInsights` once loaded, and remotes use that one
instead of bundling their own SDK. Exceptions, calls and page views of a remote are already
tracked; for custom telemetry:

```ts
window.appInsights?.trackEvent({ name: 'checkout-completed' }, { items: 3 })
window.appInsights?.trackException({ exception: error })
```

Web component microfrontends are plain scripts evaluated in this same page, so `window.appInsights`
is the host's instance for them too.

The optional chaining matters: `window.appInsights` is not there when the environment has no
connection string, nor before the SDK has finished loading, and a call made then is simply skipped.
In a TypeScript remote, declare the slice it uses, so it needs no dependency on the SDK:

```ts
declare global {
  interface Window {
    appInsights?: {
      trackEvent(event: { name: string }, properties?: Record<string, unknown>): void
      trackException(exception: { exception: Error }, properties?: Record<string, unknown>): void
    }
  }
}
```

## Environment variables

Copy `.env.example` to `.env` and fill it in. Vite injects them at build time.

| variable | required | what it is |
| --- | --- | --- |
| `VITE_MFE_BACKEND_URL` | yes | orchestrator backend, including the `/api` suffix |
| `VITE_MFE_PROJECT_ID` | yes | id of your project in the orchestrator |
| `VITE_MFE_ENVIRONMENT` | no | environment slug, ex. `DEV`. Omit it to let the backend resolve the environment from the domain |

`.env` is gitignored. Never commit real values.

## Build output

`pnpm build` writes a plain static site to `dist/`: `index.html` plus hashed assets. There is no
federation entry, and the marketplace entry for this template declares none.

## Deploying

### Upload to the orchestrator

`.github/workflows/build-and-deploy.yml` builds the app and uploads `dist/` with
[`mfe-orchestrator/github-action`](https://github.com/mfe-orchestrator/github-action). It runs on
any pushed tag, or manually via *Run workflow*.

Configure these once, in the repository settings:

| kind | name | value |
| --- | --- | --- |
| secret | `MICROFRONTEND_ORCHESTRATOR_API_KEY` | your orchestrator API key |
| variable | `MICROFRONTEND_SLUG` | the slug of this host in the orchestrator |
| variable | `MICROFRONTEND_ORCHESTRATOR_DOMAIN` | your console URL, optional, defaults to `https://console.mfe-orchestrator.dev` |

The API key is a **secret**, never a variable and never a literal in the workflow file. If you
prefer hardcoding the two per project values instead of using repository variables, replace the
expressions in the `env:` block at the top of the workflow.

### Standalone deploy

A host is consumable as a remote, but it is also an application in its own right, so the same
workflow builds and pushes an nginx image to `ghcr.io/<owner>/<repo>`. `nginx/no-cache.conf` serves
`index.html` for any route and marks the entry files as never cacheable, so a redeploy is picked up
immediately.

```bash
docker build -t my-host .
docker run -p 8080:80 my-host
```

## Notes

- There is no Module Federation here, and no `remoteEntry.js`. A web component microfrontend is a plain script that registers a custom element, so the host only needs the URL the orchestrator resolved. `MicrofrontendLoader` asks `remoteUrl(slug)` for it, injects a `<script>`, and renders the element once it has loaded.
- Builds that externalise React expect `window.React`, `window.ReactDOM` (`react-dom` together with `react-dom/client`, where React 19 keeps `createRoot`) and `window.ReactJSXRuntime`. `MicrofrontendLoader` sets all three before injecting the script; turn that off with `exposeReactGlobals={false}` if your microfrontend bundles its own copy.
- Pass `scriptType="module"` when the microfrontend uploads its ES build. Leave it unset for the UMD build, which loads as a classic script.

## License

MIT

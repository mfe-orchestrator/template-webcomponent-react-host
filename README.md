# Web Component & React — host template

Starter template for the [MFE Orchestrator](https://github.com/mfe-orchestrator), listed in the
marketplace as `webcomponent-host-react`. Web Component + React 19, wired as a **host**.

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io) 10 or newer

> [!IMPORTANT]
> `pnpm install` currently fails with a 404 on `@mfe-orchestrator-hub/client`: the client SDK is not
> published to a registry yet. That single dependency is the only thing missing — everything
> else in this template installs and builds. Until it is published, either wait for it or point
> the dependency at a local checkout of the SDK.
>
> The range is `^0.1.0`. A caret on a `0.x` version is deliberately narrow: it accepts `0.1.x`
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

configure({
  backendUrl: import.meta.env.VITE_MFE_BACKEND_URL,
  projectId: import.meta.env.VITE_MFE_PROJECT_ID,
  environment: import.meta.env.VITE_MFE_ENVIRONMENT
})
```

**Then each microfrontend is loaded by slug:**

```tsx
<MicrofrontendLoader slug="your-microfrontend-slug">
  <your-custom-element />
</MicrofrontendLoader>
```

`MicrofrontendLoader` calls `remoteUrl(slug)`, which returns the URL the backend resolved, already
pinned to a version, and injects it as a script. The SDK also exposes `manifest()`,
`globalVariables()` and `identities()`, all used in this template.

## Environment variables

Copy `.env.example` to `.env` and fill it in. Vite injects them at build time.

| variable | what it is |
| --- | --- |
| `VITE_MFE_BACKEND_URL` | orchestrator backend, including the `/api` suffix |
| `VITE_MFE_PROJECT_ID` | id of your project in the orchestrator |
| `VITE_MFE_ENVIRONMENT` | environment slug, ex. `DEV` |

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
| variable | `ORCHESTRATOR_DOMAIN` | your console URL, optional, defaults to `https://console.mfe-orchestrator.dev` |

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
- Builds that externalise React expect `window.React` / `window.ReactDOM`. `MicrofrontendLoader` sets both before injecting the script; turn that off with `exposeReactGlobals={false}` if your microfrontend bundles its own copy.
- Pass `scriptType="module"` when the microfrontend uploads its ES build. Leave it unset for the UMD build, which loads as a classic script.

## License

MIT

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MFE_BACKEND_URL: string
  readonly VITE_MFE_PROJECT_ID: string
  readonly VITE_MFE_ENVIRONMENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

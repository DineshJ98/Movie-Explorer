/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_TOKEN: string
  readonly VITE_TMDB_IMAGE_BASE: string
  readonly VITE_TMDB_API_ORIGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

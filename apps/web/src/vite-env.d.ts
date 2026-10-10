/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CARRO_KIOSK?: string;
  readonly VITE_TV_KIOSK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

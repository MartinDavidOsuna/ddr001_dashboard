/// <reference types="vite/client" />
declare const __PLATFORM_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_CONSTRUCTION_DATA_MODE?: 'api' | 'mock'
}


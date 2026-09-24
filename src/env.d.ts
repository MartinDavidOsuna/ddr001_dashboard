/// <reference types="vite/client" />
declare const __PLATFORM_VERSION__: string
declare const __BUILD_COMMIT__: string
declare const __BUILD_DATE__: string

interface ImportMetaEnv {
  readonly VITE_CONSTRUCTION_DATA_MODE?: 'api' | 'mock'
}


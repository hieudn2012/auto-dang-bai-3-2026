/// <reference types="vite-plugin-electron/electron-env" />

import { UserInfo } from './types'

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  api: {
    getCurrentTime: () => Promise<any>
    openProfile: (id: number) => Promise<any>
    checkLive: ({ accounts }: { accounts: string[] }) => Promise<any>
    openDialogFolder: () => Promise<string>,
    createProductFolder: (parentFolder: string, productName: string) => Promise<string>,
    loadProductInfo: (productFolderPath: string) => Promise<{ cap: string, link: string }>,
    openFolder: (path) => Promise<any>,
    saveProductInfo: ({ cap, link, path }: { cap: string, link: string, path: string }) => Promise<any>,
    moveAllFilesFromFolderAtoFolderB: (from: string, to: string) => Promise<any>,
    threadsProfileOpen: (id: number) => Promise<any>,
    threadsPost: ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => Promise<any>,
    saveMainConfig: (config: MainConfig) => Promise<any>,
    loadMainConfig: () => Promise<MainConfig | null>,
    randomFolderNotUsed: () => Promise<{ name: string, path: string }>,
    getFolderInfo: (path: string) => Promise<{ cap: string, link: string }>,
    clickPostButton: (info: UserInfo) => Promise<any>,
    clickEditLatestPostButton: (info: UserInfo) => Promise<any>,
  }
}

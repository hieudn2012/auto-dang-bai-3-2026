import { MainConfig, UserInfo } from "electron/types";

type WindownInstance = typeof window & {
  api: {
    getCurrentTime: () => Promise<any>
    openProfile: (id: number) => Promise<any>
    checkLive: ({ accounts }: { accounts: string[] }) => Promise<any>
    openDialogFolder: () => Promise<string>,
    createProductFolder: (parentFolder: string, productName: string) => Promise<string>,
    loadProductInfo: (productFolderPath: string) => Promise<{ cap: string, link: string }>,
    openFolder: (path: string) => Promise<any>,
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

export const windowInstance: WindownInstance = window as WindownInstance;
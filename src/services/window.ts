import { ScheduleItem } from "electron/features/job";
import { MainConfig, UserInfo } from "electron/types";
import { LogItem } from "electron/features/event";
import { BulkToggleDismissButtonParams } from "electron/features/instagram";
import { RegisterNewAccountParams } from "electron/features/register";
import { Product } from "electron/features/product";
import { MoveData } from "electron/features/foder";
import { MoveFolderParams } from "electron/features/threads-folder";
import { FanpageLinkParams } from "electron/features/fanpage";

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
    threadsProfileOpen: (id: number, index: number) => Promise<any>,
    threadsPost: ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => Promise<any>,
    saveMainConfig: (config: MainConfig) => Promise<any>,
    loadMainConfig: () => Promise<MainConfig | null>,
    randomFolderNotUsed: (exclude: string[]) => Promise<{ name: string, path: string }>,
    getFolderInfo: (path: string) => Promise<{ cap: string, link: string }>,
    clickPostButton: (info: UserInfo) => Promise<any>,
    clickEditLatestPostButton: (info: UserInfo) => Promise<any>,
    saveHistoryTxt: ({ profile_id, folder }: { profile_id: number, folder: string }) => Promise<any>,
    setupNewAccount: (info: { ws: string, username: string }) => Promise<any>,
    checkLiveAccounts: (info: { ws: string, accounts: string[], batchSize?: number }) => Promise<{ liveAccounts: string[], deadAccounts: string[] }>,
    getReportNames: () => Promise<string[]>,
    getReportByReportName: (reportName: string) => Promise<any>,
    saveTelegramToken: (token: string) => Promise<void>,
    getTelegramToken: () => Promise<string | null>,
    saveTelegramChatId: (chatId: string) => Promise<void>,
    getTelegramChatId: () => Promise<string | null>,
    sendTelegramMessage: (message: string) => Promise<any>,
    sendReportToTelegram: (reportName: string, reportData: any) => Promise<void>,
    testTelegramConnection: () => Promise<boolean>,
    getBotInfo: () => Promise<any>,
    checkValidCaptionOrLink: (path: string) => Promise<any>,
    addJobs: (items: ScheduleItem[]) => Promise<any>,
    clearJobs: () => Promise<any>,
    getQueue: () => Promise<any>,
    onLog: (callback: (log: LogItem) => void) => void,
    removeLogListener: (callback: (log: LogItem) => void) => void,
    updateProfileGroup: (profileId: number, groupId: number) => Promise<any>,
    updateProfileProxy: (profileIds: number[], data: string) => Promise<any>,
    bulkToggleDismissButton: (params: BulkToggleDismissButtonParams) => Promise<any>,
    registerNewAccounts: (params: RegisterNewAccountParams) => Promise<any>,
    openProfileFolder: (profileId: number) => Promise<any>,
    createEmptyProduct: () => Promise<Product>,
    saveProduct: (product: Product) => Promise<any>,
    getProductFolder: (folderPath: string) => Promise<Product>,
    getAffAmzLink: (params: { ws: string, links: string[], numberToGet: number }) => Promise<string>,
    generateAmazonCaptions: (folder: string) => Promise<string>,
    getAllFolder: (rootPath: string) => Promise<{ folder: string, defaultLink: string }[]>,
    moveDataToFolder: (data: MoveData) => Promise<any>,
    moveFolder: (params: MoveFolderParams) => Promise<any>,
    getFanpageLinks: (params: FanpageLinkParams) => Promise<string>
  }
}

export const windowInstance: WindownInstance = window as WindownInstance;
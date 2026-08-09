import { ScheduleItem } from "electron/features/job";
import { MainConfig } from "electron/types";
import { LogItem } from "electron/features/event";
import { BulkToggleDismissButtonParams } from "electron/features/instagram";
import { RegisterNewAccountParams } from "electron/features/register";
import { Product } from "electron/features/product";
import { FolderData, MoveData } from "electron/features/foder";
import { MoveFolderParams } from "electron/features/threads-folder";
import { FanpageLinkParams } from "electron/features/fanpage";
import { ClickEditLatestPostButtonParams, PostParams, SetupNewAccountParams } from "electron/features/threads-profile";
import { DeletePostOptions } from "electron/features/threads-delete";
import { ReportResult } from "electron/features/report";
import { GenerateCaptionsParams } from "electron/features/gemini";
import { CaptureProductImageParams } from "electron/features/amz";
import { ChangeProfileInfoParams, GenerateProfileParams, ProfileResult } from "electron/features/profile";
import { Android } from "electron/features/android";

type WindownInstance = typeof window & {
  api: {
    getCurrentTime: () => Promise<any>
    openProfile: (id: number) => Promise<any>
    checkLive: ({ accounts }: { accounts: string[] }) => Promise<any>
    openDialogFolder: (mode?: 'directory' | 'file') => Promise<string>,
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
    randomQuoteFolderNotUsed: (exclude: string[]) => Promise<{ name: string, path: string }>,
    getFolderInfo: (path: string) => Promise<{ cap: string, link: string }>,
    clickPostButton: (info: PostParams) => Promise<any>,
    clickEditLatestPostButton: (info: ClickEditLatestPostButtonParams) => Promise<any>,
    saveHistoryTxt: ({ profile_id, folder }: { profile_id: number, folder: string }) => Promise<any>,
    setupNewAccount: (info: SetupNewAccountParams) => Promise<any>,
    checkLiveAccounts: (info: { ws: string, accounts: string[], batchSize?: number }) => Promise<{ liveAccounts: string[], deadAccounts: string[] }>,
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
    getAffAmzLink: (params: { ws: string, links: string[], numberToGet: number, linkMode: 'amz' | 'shopee', isGlobal: boolean }) => Promise<string>,
    generateCaptions: (params: GenerateCaptionsParams) => Promise<string>,
    getAllFolder: (rootPath: string) => Promise<FolderData[]>,
    moveDataToFolder: (data: MoveData) => Promise<any>,
    moveFolder: (params: MoveFolderParams) => Promise<any>,
    getFanpageLinks: (params: FanpageLinkParams) => Promise<string>,
    saveSexyCaption: (data: string) => Promise<any>,
    saveSexyLink: (data: string) => Promise<any>,
    loadSexyContent: () => Promise<{ caption: string, link: string }>,
    deletePost: (params: DeletePostOptions) => Promise<any>,
    getReportNamesV2: () => Promise<string[]>,
    getReportByName: (reportName: string) => Promise<ReportResult>,
    captureProductImage: (params: CaptureProductImageParams) => Promise<any>,
    generateProfile: (params: GenerateProfileParams) => Promise<any>,
    getProfiles: () => Promise<ProfileResult>,
    changeProfileInfo: (params: ChangeProfileInfoParams) => Promise<any>,
    deleteOldestReportNames: () => Promise<void>,
    getAndroidList: () => Promise<Android[]>,
    openAndroid: (android: Android) => Promise<string>,
    closeAndroid: (android: Android) => Promise<string>,
    randomMuMuName: (android: Android) => Promise<string>,
    assignAccountsToAndroids: (androids: Android[]) => Promise<{
      assigned: number
      remaining: number
      outputPath: string
      items: string[]
    }>,
    assignProxiesToAndroids: (androids: Android[]) => Promise<{
      assigned: number
      proxyCount: number
      outputPath: string
      items: string[]
    }>,
    setupProxiesOnAndroids: (androids: Android[]) => Promise<{
      total: number
      success: number
      failed: number
      results: { index: string; name: string; ok: boolean; error?: string }[]
    }>,
    autoRegisterAccountsOnAndroids: (androids: Android[]) => Promise<{
      total: number
      success: number
      failed: number
      results: { index: string; name: string; ok: boolean; error?: string }[]
    }>,
    exportAccountsFromOutput: () => Promise<{
      count: number
      exportPath: string
      items: string[]
    }>,
    connectAllRunningAndroids: () => Promise<{
      total: number
      success: number
      failed: number
      results: {
        index: string
        name: string
        ok: boolean
        serial?: string
        error?: string
      }[]
    }>,
    openThreadsAppOnAndroids: (androids: Android[]) => Promise<{
      total: number
      success: number
      failed: number
      results: { index: string; name: string; ok: boolean; error?: string }[]
    }>,
    fullSetupOnAndroids: (androids: Android[]) => Promise<{
      total: number
      success: number
      failed: number
      results: { index: string; name: string; ok: boolean; error?: string }[]
    }>,
    uploadFilesToPostOnAndroids: (items: { android: Android; folder: string }[]) => Promise<{
      total: number
      success: number
      failed: number
      results: { index: string; name: string; ok: boolean; error?: string; fileCount?: number }[]
    }>,
    checkAccountViews: (params: {
      ws: string
      groupId: number
      profiles: string[]
      reportName: string
    }) => Promise<{ reportPath: string; reportFileName: string }>,
    listCheckViewsReports: () => Promise<string[]>,
    getCheckViewsReport: (fileName: string) => Promise<{
      fileName: string
      items: {
        profile: string
        postUrl: string
        views: number
        like: number
        comment: number
        share: number
        send: number
      }[]
      totalRows: number
      totalProfiles: number
      totalViews: number
      avgViews: number
      totalLikes: number
      totalComments: number
      totalShares: number
      totalSends: number
    }>,
  }
}

export const windowInstance: WindownInstance = window as WindownInstance;
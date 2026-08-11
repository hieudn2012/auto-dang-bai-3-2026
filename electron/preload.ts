import { ipcRenderer, contextBridge, Product } from 'electron'
import { History, InvokeChannel, MainConfig, UserInfo } from './types'
import { ScheduleItem } from './features/job'
import { RegisterNewAccountParams } from './features/register'
import { MoveData } from './features/foder'
import { MoveFolderParams } from './features/threads-folder'
import { FanpageLinkParams } from './features/fanpage'
import { DeletePostOptions } from './features/threads-delete'
import { GenerateCaptionsParams } from './features/gemini'
import { CaptureProductImageParams } from './features/amz'
import { ChangeProfileInfoParams, GenerateProfileParams } from './features/profile'
import { Android } from './features/android'

const invoke = ipcRenderer.invoke as <T extends InvokeChannel>(channel: T, ...args: unknown[]) => Promise<ReturnType<typeof ipcRenderer.invoke>>

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, listener)
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('api', {
  getCurrentTime: () => invoke(InvokeChannel.GET_CURRENT_TIME),
  openProfile: (id: number, index: number) => invoke(InvokeChannel.OPEN_PROFILE, id, index),
  checkLive: (accounts: string[]) => invoke(InvokeChannel.CHECK_LIVE, accounts),
  openDialogFolder: (mode?: 'directory' | 'file') => invoke(InvokeChannel.OPEN_DIALOG_FOLDER, mode),
  createProductFolder: (parentFolder: string, productName: string) => invoke(InvokeChannel.CREATE_PRODUCT_FOLDER, parentFolder, productName),
  loadProductInfo: (productFolderPath: string) => invoke(InvokeChannel.LOAD_PRODUCT_INFO, productFolderPath),
  openFolder: (path: string) => invoke(InvokeChannel.OPEN_FOLDER, path),
  saveProductInfo: (info: { cap: string, link: string }) => invoke(InvokeChannel.SAVE_PRODUCT_INFO, info),
  moveAllFilesFromFolderAtoFolderB: (from: string, to: string) => invoke(InvokeChannel.MOVE_ALL_FILES_FROM_FOLDER_A_TO_FOLDER_B, from, to),
  threadsProfileOpen: (id: number, index: number) => invoke(InvokeChannel.THREADS_PROFILE_OPEN, id, index),
  threadsPost: ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => invoke(InvokeChannel.THREADS_POST, wsUrl, username, folder),
  saveMainConfig: (config: MainConfig) => invoke(InvokeChannel.SAVE_MAIN_CONFIG, config),
  loadMainConfig: () => invoke(InvokeChannel.LOAD_MAIN_CONFIG),
  randomFolderNotUsed: (exclude: string[] = []) => invoke(InvokeChannel.RANDOM_FOLDER_NOT_USED, exclude),
  randomQuoteFolderNotUsed: (exclude: string[] = []) => invoke(InvokeChannel.RANDOM_QUOTE_FOLDER_NOT_USED, exclude),
  getFolderInfo: (path: string) => invoke(InvokeChannel.GET_FOLDER_INFO, path),
  clickPostButton: (info: UserInfo) => invoke(InvokeChannel.CLICK_POST_BUTTON, info),
  clickEditLatestPostButton: (info: UserInfo) => invoke(InvokeChannel.CLICK_EDIT_LATEST_POST_BUTTON, info),
  saveHistoryTxt: ({ profile_id, folder }: History) => invoke(InvokeChannel.SAVE_HISTORY_TXT, profile_id, folder),
  setupNewAccount: (info: { ws: string }) => invoke(InvokeChannel.SETUP_NEW_ACCOUNT, info),
  checkLiveAccounts: (accounts: string[]) => invoke(InvokeChannel.CHECK_LIVE_ACCOUNTS, accounts),
  saveTelegramToken: (token: string) => invoke(InvokeChannel.SAVE_TELEGRAM_TOKEN, token),
  getTelegramToken: () => invoke(InvokeChannel.GET_TELEGRAM_TOKEN),
  saveTelegramChatId: (chatId: string) => invoke(InvokeChannel.SAVE_TELEGRAM_CHAT_ID, chatId),
  getTelegramChatId: () => invoke(InvokeChannel.GET_TELEGRAM_CHAT_ID),
  sendTelegramMessage: (message: string) => invoke(InvokeChannel.SEND_TELEGRAM_MESSAGE, message),
  sendReportToTelegram: (reportName: string, reportData: any) => invoke(InvokeChannel.SEND_REPORT_TO_TELEGRAM, reportName, reportData),
  testTelegramConnection: () => invoke(InvokeChannel.TEST_TELEGRAM_CONNECTION),
  getBotInfo: () => invoke(InvokeChannel.GET_BOT_INFO),
  checkValidCaptionOrLink: (path: string) => invoke(InvokeChannel.CHECK_VALID_CAPTION_OR_LINK, path),
  addJobs: (items: ScheduleItem[]) => invoke(InvokeChannel.ADD_JOBS, items),
  clearJobs: () => invoke(InvokeChannel.CLEAR_JOBS),
  getQueue: () => invoke(InvokeChannel.GET_QUEUE),
  onLog: (callback: (log: { username: string, message: string }) => void) => {
    ipcRenderer.on('log', (_, log) => callback(log))
  },
  removeLogListener: (callback: (log: { username: string, message: string }) => void) => {
    ipcRenderer.removeListener('log', (_, log) => callback(log))
  },
  updateProfileGroup: (profileId: number, groupId: number) => invoke(InvokeChannel.UPDATE_PROFILE_GROUP, profileId, groupId),
  updateProfileProxy: (profileIds: number[], data: string) => invoke(InvokeChannel.UPDATE_PROFILE_PROXY, profileIds, data),
  bulkToggleDismissButton: (wss: string[]) => invoke(InvokeChannel.BULK_TOGGLE_DISMISS_BUTTON, wss),
  registerNewAccounts: (params: RegisterNewAccountParams) => invoke(InvokeChannel.REGISTER_NEW_ACCOUNTS, params),
  openProfileFolder: (profileId: number) => invoke(InvokeChannel.OPEN_PROFILE_FOLDER, profileId),
  createEmptyProduct: () => invoke(InvokeChannel.CREATE_EMPTY_PRODUCT),
  saveProduct: (product: Product) => invoke(InvokeChannel.SAVE_PRODUCT, product),
  getProductFolder: (folderPath: string) => invoke(InvokeChannel.GET_PRODUCT_FOLDER, folderPath),
  getAffAmzLink: (params: { ws: string, links: string[], numberToGet: number, linkMode: 'amz' | 'shopee' }) => invoke(InvokeChannel.GET_AFF_AMZ_LINK, params),
  generateCaptions: (params: GenerateCaptionsParams) => invoke(InvokeChannel.GENERATE_CAPTIONS, params),
  getAllFolder: (rootPath: string) => invoke(InvokeChannel.GET_ALL_FOLDER, rootPath),
  moveDataToFolder: (data: MoveData) => invoke(InvokeChannel.MOVE_DATA_TO_FOLDER, data),
  moveFolder: (params: MoveFolderParams) => invoke(InvokeChannel.MOVE_FOLDER, params),
  getFanpageLinks: (params: FanpageLinkParams) => invoke(InvokeChannel.GET_FANPAGE_LINKS, params),
  saveSexyCaption: (data: string) => invoke(InvokeChannel.SAVE_SEXY_CAPTION, data),
  saveSexyLink: (data: string) => invoke(InvokeChannel.SAVE_SEXY_LINK, data),
  loadSexyContent: () => invoke(InvokeChannel.LOAD_SEXY_CONTENT),
  deletePost: (params: DeletePostOptions) => invoke(InvokeChannel.DELETE_POST, params),
  getReportNamesV2: () => invoke(InvokeChannel.GET_REPORT_NAMES_V2),
  getReportByName: (reportName: string) => invoke(InvokeChannel.GET_REPORT_BY_NAME, reportName),
  captureProductImage: (params: CaptureProductImageParams) => invoke(InvokeChannel.CAPTURE_PRODUCT_IMAGE, params),
  generateProfile: (params: GenerateProfileParams) => invoke(InvokeChannel.GENERATE_PROFILE, params),
  getProfiles: () => invoke(InvokeChannel.GET_PROFILES),
  changeProfileInfo: (params: ChangeProfileInfoParams) => invoke(InvokeChannel.CHANGE_PROFILE_INFO, params),
  deleteOldestReportNames: () => invoke(InvokeChannel.DELETE_OLDEST_REPORT_NAMES),
  getAndroidList: () => invoke(InvokeChannel.GET_ANDROID_LIST),
  openAndroid: (android: Android) => invoke(InvokeChannel.OPEN_ANDROID, android),
  closeAndroid: (android: Android) => invoke(InvokeChannel.CLOSE_ANDROID, android),
  randomMuMuName: (android: Android) => invoke(InvokeChannel.RANDOM_MUMU_NAME, android),
  randomDeviceIdentity: (android: Android) => invoke(InvokeChannel.RANDOM_DEVICE_IDENTITY, android),
  randomDeviceIdentityOnAndroids: (androids: Android[]) =>
    invoke(InvokeChannel.RANDOM_DEVICE_IDENTITY_ON_ANDROIDS, androids),
  assignAccountsToAndroids: (androids: Android[]) => invoke(InvokeChannel.ASSIGN_ACCOUNTS_TO_ANDROIDS, androids),
  assignProxiesToAndroids: (androids: Android[]) => invoke(InvokeChannel.ASSIGN_PROXIES_TO_ANDROIDS, androids),
  setupProxiesOnAndroids: (androids: Android[]) => invoke(InvokeChannel.SETUP_PROXIES_ON_ANDROIDS, androids),
  autoRegisterAccountsOnAndroids: (androids: Android[]) =>
    invoke(InvokeChannel.AUTO_REGISTER_ACCOUNTS_ON_ANDROIDS, androids),
  exportAccountsFromOutput: () => invoke(InvokeChannel.EXPORT_ACCOUNTS_FROM_OUTPUT),
  connectAllRunningAndroids: () => invoke(InvokeChannel.CONNECT_ALL_RUNNING_ANDROIDS),
  openThreadsAppOnAndroids: (androids: Android[]) =>
    invoke(InvokeChannel.OPEN_THREADS_APP_ON_ANDROIDS, androids),
  fullSetupOnAndroids: (androids: Android[]) =>
    invoke(InvokeChannel.FULL_SETUP_ON_ANDROIDS, androids),
  createPostOnAndroids: (items: { android: Android; folder: string }[]) =>
    invoke(InvokeChannel.CREATE_POST_ON_ANDROIDS, items),
  editLatestPostOnAndroids: (items: { android: Android; folder: string }[]) =>
    invoke(InvokeChannel.EDIT_LATEST_POST_ON_ANDROIDS, items),
  quoteLatestPostOnAndroids: (items: { android: Android; folder: string }[]) =>
    invoke(InvokeChannel.QUOTE_LATEST_POST_ON_ANDROIDS, items),
  loadAndroidNotes: () => invoke(InvokeChannel.LOAD_ANDROID_NOTES),
  saveAndroidNotes: (notes: Record<string, string>) =>
    invoke(InvokeChannel.SAVE_ANDROID_NOTES, notes),
  checkAccountViews: (params: { ws: string; groupId: number; profiles: string[]; reportName: string }) =>
    invoke(InvokeChannel.CHECK_ACCOUNT_VIEWS, params),
  listCheckViewsReports: () => invoke(InvokeChannel.LIST_CHECK_VIEWS_REPORTS),
  getCheckViewsReport: (fileName: string) => invoke(InvokeChannel.GET_CHECK_VIEWS_REPORT, fileName),
});

contextBridge.exposeInMainWorld('sendToRenderer', (channel: string, data: unknown) => {
  ipcRenderer.send(channel, data)
})

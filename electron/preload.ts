import { ipcRenderer, contextBridge } from 'electron'
import { History, InvokeChannel, MainConfig, UserInfo } from './types'

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
  openDialogFolder: () => invoke(InvokeChannel.OPEN_DIALOG_FOLDER),
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
  getFolderInfo: (path: string) => invoke(InvokeChannel.GET_FOLDER_INFO, path),
  clickPostButton: (info: UserInfo) => invoke(InvokeChannel.CLICK_POST_BUTTON, info),
  clickEditLatestPostButton: (info: UserInfo) => invoke(InvokeChannel.CLICK_EDIT_LATEST_POST_BUTTON, info),
  saveHistoryTxt: ({ profile_id, folder }: History) => invoke(InvokeChannel.SAVE_HISTORY_TXT, profile_id, folder),
  setupNewAccount: (info: { ws: string }) => invoke(InvokeChannel.SETUP_NEW_ACCOUNT, info),
  checkLiveAccounts: (accounts: string[]) => invoke(InvokeChannel.CHECK_LIVE_ACCOUNTS, accounts),
  getReportByReportName: (reportName: string) => invoke(InvokeChannel.GET_REPORT_BY_REPORT_NAME, reportName),
  saveTelegramToken: (token: string) => invoke(InvokeChannel.SAVE_TELEGRAM_TOKEN, token),
  getTelegramToken: () => invoke(InvokeChannel.GET_TELEGRAM_TOKEN),
  saveTelegramChatId: (chatId: string) => invoke(InvokeChannel.SAVE_TELEGRAM_CHAT_ID, chatId),
  getTelegramChatId: () => invoke(InvokeChannel.GET_TELEGRAM_CHAT_ID),
  sendTelegramMessage: (message: string) => invoke(InvokeChannel.SEND_TELEGRAM_MESSAGE, message),
  sendReportToTelegram: (reportName: string, reportData: any) => invoke(InvokeChannel.SEND_REPORT_TO_TELEGRAM, reportName, reportData),
  testTelegramConnection: () => invoke(InvokeChannel.TEST_TELEGRAM_CONNECTION),
  getBotInfo: () => invoke(InvokeChannel.GET_BOT_INFO),
})

contextBridge.exposeInMainWorld('sendToRenderer', (channel: string, data: unknown) => {
  ipcRenderer.send(channel, data)
})

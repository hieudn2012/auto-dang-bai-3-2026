import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { InvokeChannel } from './types'
import { handleSearchTop } from './features/x-search-top'
import { handleCheckLive } from './features/x-check-live'
import { createProductFolder, getFolderInfo, loadProductInfo, moveAllFilesFromFolderAtoFolderB, openDialogFolder, openFolder, randomFolderNotUsed, saveProductInfo } from './features/threads-folder'
import { clickEditLatestPostButton, clickPostButton, openThreadsProfile, threadsPost } from './features/threads-profile'
import { initConfigFile, loadMainConfig, saveHistoryTxt, saveMainConfig } from './features/common'
// Suppress macOS text input context warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

    // Update global reference
    ; (global as any).mainWindow = win;

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open DevTools automatically in development
    // win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

const handle = ipcMain.handle as <T extends InvokeChannel>(channel: T, listener: (...args: any[]) => Promise<any> | any) => void

// Đăng ký IPC handler
handle(InvokeChannel.GET_CURRENT_TIME, async () => {
  console.log('get-current-time')
})

handle(InvokeChannel.OPEN_PROFILE, async (_event, id) => {
  // await openProfile(id);
  // await handleLogin();
  await handleSearchTop();
})

handle(InvokeChannel.CHECK_LIVE, async (_event, accounts) => {
  await handleCheckLive(accounts);
})

handle(InvokeChannel.OPEN_DIALOG_FOLDER, async () => {
  return openDialogFolder();
})

handle(InvokeChannel.CREATE_PRODUCT_FOLDER, async (_event, parentFolder, productName) => {
  return createProductFolder(parentFolder, productName);
})

handle(InvokeChannel.LOAD_PRODUCT_INFO, async (_event, productFolderPath) => {
  return loadProductInfo(productFolderPath);
})

handle(InvokeChannel.OPEN_FOLDER, async (_event, path) => {
  return openFolder(path);
})

handle(InvokeChannel.SAVE_PRODUCT_INFO, async (_event, info) => {
  return saveProductInfo(info);
})

handle(InvokeChannel.MOVE_ALL_FILES_FROM_FOLDER_A_TO_FOLDER_B, async (_event, from, to) => {
  return moveAllFilesFromFolderAtoFolderB(from, to);
})

handle(InvokeChannel.THREADS_PROFILE_OPEN, async (_event, id, index) => {
  return openThreadsProfile(id, index);
})

handle(InvokeChannel.THREADS_POST, async (event, wsUrl, username, folder) => {
  await threadsPost({ wsUrl, username, folder, event });
})

handle(InvokeChannel.SAVE_MAIN_CONFIG, async (_event, config) => {
  return saveMainConfig(config);
})

handle(InvokeChannel.LOAD_MAIN_CONFIG, async () => {
  return loadMainConfig();
})

handle(InvokeChannel.RANDOM_FOLDER_NOT_USED, async (_event, exclude) => {
  return randomFolderNotUsed(exclude);
})

handle(InvokeChannel.GET_FOLDER_INFO, async (_event, path) => {
  return getFolderInfo(path);
})

handle(InvokeChannel.CLICK_POST_BUTTON, async (_event, info) => {
  return clickPostButton(info);
})

handle(InvokeChannel.CLICK_EDIT_LATEST_POST_BUTTON, async (_event, info) => {
  return clickEditLatestPostButton(info);
})

handle(InvokeChannel.SAVE_HISTORY_TXT, async (_event, profile_id, folder) => {
  return saveHistoryTxt({ profile_id, folder });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

export function sendToRenderer<T>(channel: string, data: T) {
  if (win && win.webContents) {
    win.webContents.send(channel, data);
  }
}

app.whenReady().then(async () => {
  await initConfigFile();
  createWindow();
})

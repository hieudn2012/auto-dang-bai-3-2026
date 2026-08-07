import 'dotenv/config'
import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { InvokeChannel } from './types'
import {
  createProductFolder,
  getFolderInfo,
  loadProductInfo,
  moveAllFilesFromFolderAtoFolderB,
  moveFolder,
  openDialogFolder,
  openFolder,
  openProfileFolder,
  randomFolderNotUsed,
  randomQuoteFolderNotUsed,
  saveProductInfo
} from './features/threads-folder'
import { openProfile, updateProfileGroup } from './features/ixbrowser-api'
import { checkLiveAccounts, clickEditLatestPostButton, clickPostButton, setupNewAccount } from './features/threads-profile'
import { initConfigFile, loadMainConfig, saveHistoryTxt, saveMainConfig } from './features/common'
import { checkValidCaptionOrLink } from './features/caption'
import { addJobs, handleClearJob, handleGetQueue } from './features/job'
import { deleteOldestReportNames, getReportByName, getReportNamesV2 } from './features/report'
import { updateProfileProxy } from './features/proxy'
import { bulkToggleDismissButton } from './features/instagram'
import { registerNewAccounts } from './features/register'
import { sendMessage } from './features/event'
import { createEmptyProduct, getProductFolder, saveProduct } from './features/product'
import { captureProductImage, getAffAmzLink } from './features/amz'
import { generateCaptions } from './features/gemini'
import { getAllFolder, moveDataToFolder } from './features/foder'
import { init } from './init'
import { getFanpageLinks } from './features/fanpage'
import { loadSexyContent, saveSexyCaption, saveSexyLink } from './features/file'
import { getAffShopeeLink } from './features/shopee'
import { deletePost } from './features/threads-delete'
import { changeProfileInfo, generateProfile, getProfiles } from './features/profile'
import { assignAccountsToAndroids, assignProxiesToAndroids, autoRegisterAccountsOnAndroids, closeAndroid, connectAllRunningAndroids, exportAccountsFromOutput, getAndroidList, openAndroid, openThreadsAppOnAndroids, randomMuMuName, setupProxiesOnAndroids } from './features/android'
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
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
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

handle(InvokeChannel.THREADS_PROFILE_OPEN, async (_event, id) => {
  try {
    await openProfile(id);
  } catch (error) {
    console.log(error);
    const message = error instanceof Error ? error.message : String(error);
    sendMessage(_event, {
      id,
      username: '',
      message: message,
    });
  }
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

handle(InvokeChannel.RANDOM_QUOTE_FOLDER_NOT_USED, async (_event, exclude) => {
  return randomQuoteFolderNotUsed(exclude);
})

handle(InvokeChannel.GET_FOLDER_INFO, async (_event, path) => {
  return getFolderInfo(path);
})

handle(InvokeChannel.CLICK_POST_BUTTON, async (event, info) => {
  return clickPostButton(info, event);
})

handle(InvokeChannel.CLICK_EDIT_LATEST_POST_BUTTON, async (event, info) => {
  return clickEditLatestPostButton(info, event);
})

handle(InvokeChannel.SAVE_HISTORY_TXT, async (_event, profile_id, folder) => {
  return saveHistoryTxt({ profile_id, folder });
})

handle(InvokeChannel.SETUP_NEW_ACCOUNT, async (event, info) => {
  return setupNewAccount(info, event);
})

handle(InvokeChannel.CHECK_LIVE_ACCOUNTS, async (_event, accounts) => {
  return checkLiveAccounts(accounts);
})

handle(InvokeChannel.CHECK_VALID_CAPTION_OR_LINK, async (_event, path) => {
  return checkValidCaptionOrLink(path);
})

handle(InvokeChannel.ADD_JOBS, async (event, items) => {
  return addJobs(items, event);
})

handle(InvokeChannel.CLEAR_JOBS, async () => {
  return handleClearJob();
})

handle(InvokeChannel.GET_QUEUE, async () => {
  return handleGetQueue();
})

handle(InvokeChannel.UPDATE_PROFILE_GROUP, async (_event, profileId, groupId) => {
  return updateProfileGroup(profileId, groupId);
})

handle(InvokeChannel.UPDATE_PROFILE_PROXY, async (_event, profileIds, data) => {
  return updateProfileProxy(profileIds, data);
})

handle(InvokeChannel.BULK_TOGGLE_DISMISS_BUTTON, async (_event, wss) => {
  return bulkToggleDismissButton(wss);
})

handle(InvokeChannel.REGISTER_NEW_ACCOUNTS, async (_event, params) => {
  return registerNewAccounts(params, _event);
})

handle(InvokeChannel.OPEN_PROFILE_FOLDER, async (_event, profileId) => {
  return openProfileFolder(profileId);
})

handle(InvokeChannel.CREATE_EMPTY_PRODUCT, async () => {
  return createEmptyProduct();
})

handle(InvokeChannel.SAVE_PRODUCT, async (_event, product) => {
  return saveProduct(product);
})

handle(InvokeChannel.GET_PRODUCT_FOLDER, async (_event, folderPath) => {
  return getProductFolder(folderPath);
})

handle(InvokeChannel.GET_AFF_AMZ_LINK, async (_event, params) => {
  const linkMode = params.linkMode || 'amz';
  return linkMode === 'shopee' ? getAffShopeeLink(params) : getAffAmzLink(params);
})

handle(InvokeChannel.GENERATE_CAPTIONS, async (_event, data) => {
  try {
    return await generateCaptions(data);
  } catch (error) {
    throw String(error); // Convert error to string for IPC
  }
})

handle(InvokeChannel.GET_ALL_FOLDER, async (_event, rootPath) => {
  return getAllFolder(rootPath);
})

handle(InvokeChannel.MOVE_DATA_TO_FOLDER, async (_event, data) => {
  return moveDataToFolder(data);
})

handle(InvokeChannel.MOVE_FOLDER, async (_event, params) => {
  return moveFolder(params);
})

handle(InvokeChannel.GET_FANPAGE_LINKS, async (_event, params) => {
  return getFanpageLinks(params);
})

handle(InvokeChannel.SAVE_SEXY_CAPTION, async (_event, data) => {
  return saveSexyCaption(data);
})

handle(InvokeChannel.SAVE_SEXY_LINK, async (_event, data) => {
  return saveSexyLink(data);
})

handle(InvokeChannel.LOAD_SEXY_CONTENT, async () => {
  return loadSexyContent();
})

handle(InvokeChannel.DELETE_POST, async (event, params) => {
  return deletePost(params, event);
})

handle(InvokeChannel.GET_REPORT_NAMES_V2, async () => {
  return getReportNamesV2();
});

handle(InvokeChannel.GET_REPORT_BY_NAME, async (_event, reportName) => {
  return getReportByName(reportName);
});

handle(InvokeChannel.CAPTURE_PRODUCT_IMAGE, async (_event, params) => {
  return captureProductImage(params);
});

handle(InvokeChannel.GENERATE_PROFILE, async (_event, params) => {
  return generateProfile(params);
});

handle(InvokeChannel.GET_PROFILES, async () => {
  return getProfiles();
});

handle(InvokeChannel.CHANGE_PROFILE_INFO, async (_event, params) => {
  return changeProfileInfo(params, _event);
});

handle(InvokeChannel.DELETE_OLDEST_REPORT_NAMES, async () => {
  return deleteOldestReportNames();
});

handle(InvokeChannel.GET_ANDROID_LIST, async () => {
  return getAndroidList();
});

handle(InvokeChannel.OPEN_ANDROID, async (_event, android) => {
  return openAndroid(android);
});

handle(InvokeChannel.CLOSE_ANDROID, async (_event, android) => {
  return closeAndroid(android);
});

handle(InvokeChannel.RANDOM_MUMU_NAME, async (_event, android) => {
  return randomMuMuName(android);
});

handle(InvokeChannel.ASSIGN_ACCOUNTS_TO_ANDROIDS, async (_event, androids) => {
  return assignAccountsToAndroids(androids);
});

handle(InvokeChannel.ASSIGN_PROXIES_TO_ANDROIDS, async (_event, androids) => {
  return assignProxiesToAndroids(androids);
});

handle(InvokeChannel.SETUP_PROXIES_ON_ANDROIDS, async (_event, androids) => {
  return setupProxiesOnAndroids(androids);
});

handle(InvokeChannel.AUTO_REGISTER_ACCOUNTS_ON_ANDROIDS, async (event, androids) => {
  return autoRegisterAccountsOnAndroids(androids, event);
});

handle(InvokeChannel.EXPORT_ACCOUNTS_FROM_OUTPUT, async () => {
  return exportAccountsFromOutput();
});

handle(InvokeChannel.CONNECT_ALL_RUNNING_ANDROIDS, async () => {
  return connectAllRunningAndroids();
});

handle(InvokeChannel.OPEN_THREADS_APP_ON_ANDROIDS, async (_event, androids) => {
  return openThreadsAppOnAndroids(androids);
});

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
  await init();
  // startServer();
  createWindow();
})

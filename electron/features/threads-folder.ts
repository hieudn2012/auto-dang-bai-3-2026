// change working folder
import { dialog, shell } from 'electron';
import fs from 'node:fs';
import { getHistoryTxt, loadMainConfig } from './common';
import { FolderInfo } from 'electron/types';

export const openDialogFolder = async () => {
  const folderPath = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return folderPath ? folderPath[0] : '';
};

// create product folder
export const createProductFolder = async (parentFolder: string, productName: string) => {
  const productFolderPath = `${parentFolder}/${productName}`;
  fs.mkdirSync(productFolderPath);

  // create cap.txt
  fs.writeFileSync(`${productFolderPath}/cap.txt`, '');

  // create link.txt
  fs.writeFileSync(`${productFolderPath}/link.txt`, '');

  return productFolderPath;
};

// load product info
export const loadProductInfo = async (productFolderPath: string) => {
  const cap = fs.readFileSync(`${productFolderPath}/cap.txt`, 'utf-8');
  const link = fs.readFileSync(`${productFolderPath}/link.txt`, 'utf-8');
  return { cap, link };
}

// open folder
export const openFolder = async (folderPath: string) => {
  shell.openPath(folderPath);
}

// save product info
export const saveProductInfo = async ({ cap, link, path }: { path: string, cap: string, link: string }) => {
  fs.writeFileSync(`${path}/cap.txt`, cap);
  fs.writeFileSync(`${path}/link.txt`, link);
}

// move all file from folder A to folder B
export const moveAllFilesFromFolderAtoFolderB = async (from: string, to: string) => {
  const files = fs.readdirSync(from);
  files.forEach((file) => {
    fs.renameSync(`${from}/${file}`, `${to}/${file}`);
  });
}

// random folder
export const randomFolderNotUsed = async (exclude: string[] = []): Promise<{ name: string, path: string }> => {
  // get working folder
  const config = await loadMainConfig();
  const history = await getHistoryTxt();

  // get all folder in working folder
  const folders = fs.readdirSync(config?.workingDir || '');

  const isMac = process.platform === 'darwin';
  const matchPath = isMac ? '/' : '\\';

  // get all folder not in history
  const foldersNotInHistory = folders.filter(folder => {
    const folderPath = `${config?.workingDir}${matchPath}${folder}`;
    return (
      !history.some(item => item.folder === folderPath) &&
      !exclude.includes(folderPath)
    );
  });

  // random folder not in history
  const randomFolderName = foldersNotInHistory[Math.floor(Math.random() * foldersNotInHistory.length)];
  return {
    name: randomFolderName,
    path: `${config?.workingDir}${matchPath}${randomFolderName}`
  };
}

// get folder info
export const getFolderInfo = async (path: string): Promise<FolderInfo> => {
  const isMac = process.platform === 'darwin';
  const matchPath = isMac ? '/' : '\\';
  const cap = fs.readFileSync(`${path}${matchPath}cap.txt`, 'utf8');
  const link = fs.readFileSync(`${path}${matchPath}link.txt`, 'utf8');

  return {
    cap,
    link,
  }
}
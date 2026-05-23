// change working folder
import { dialog, shell } from 'electron';
import fs from 'node:fs';
import { loadMainConfig } from './common';
import { FolderInfo } from 'electron/types';
import nodePath from 'node:path';
import { getRandomFolder } from './foder';

export const openDialogFolder = async () => {
  const folderPath = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });
  return folderPath ? folderPath[0] : '';
};

// create product folder
export const createProductFolder = async (parentFolder: string, productName: string) => {
  const productFolderPath = nodePath.join(parentFolder, productName);
  fs.mkdirSync(productFolderPath);

  // create cap.txt
  fs.writeFileSync(nodePath.join(productFolderPath, 'cap.txt'), '');

  // create link.txt
  fs.writeFileSync(nodePath.join(productFolderPath, 'link.txt'), '');

  return productFolderPath;
};

// load product info
export const loadProductInfo = async (productFolderPath: string) => {
  const cap = fs.readFileSync(nodePath.join(productFolderPath, 'cap.txt'), 'utf-8');
  const link = fs.readFileSync(nodePath.join(productFolderPath, 'link.txt'), 'utf-8');
  return { cap, link };
}

// open folder
export const openFolder = async (folderPath: string) => {
  shell.openPath(folderPath);
}

export const openProfileFolder = async (profileId: number) => {
  const config = await loadMainConfig();
  const profilePath = nodePath.join(config?.profileDir || '', String(profileId));
  if (!fs.existsSync(profilePath)) {
    await fs.promises.mkdir(profilePath, { recursive: true });
  }
  shell.openPath(profilePath);
}

// save product info
export const saveProductInfo = async ({ cap, link, path }: { path: string, cap: string, link: string }) => {
  fs.writeFileSync(nodePath.join(path, 'cap.txt'), cap);
  fs.writeFileSync(nodePath.join(path, 'link.txt'), link);
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
  const randomFolder = getRandomFolder(config?.workingDir || '', exclude);
  return {
    name: randomFolder.split('/').pop() || '',
    path: randomFolder
  };
}

// get folder info
export const getFolderInfo = async (path: string): Promise<FolderInfo> => {
  const cap = fs.readFileSync(nodePath.join(path, 'cap.txt'), 'utf8');
  const link = fs.readFileSync(nodePath.join(path, 'link.txt'), 'utf8');

  return {
    cap,
    link,
  }
}
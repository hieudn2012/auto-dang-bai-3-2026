// change working folder
import { dialog, shell } from 'electron';
import fs from 'node:fs';
import { loadMainConfig } from './common';
import { FolderInfo } from 'electron/types';
import nodePath from 'node:path';
import { getRandomFolder } from './foder';

export const openDialogFolder = async (mode: 'directory' | 'file' = 'directory') => {
  const selected = dialog.showOpenDialogSync({
    properties: [mode === 'file' ? 'openFile' : 'openDirectory'],
    filters:
      mode === 'file'
        ? [
            { name: 'Text files', extensions: ['txt'] },
            { name: 'All files', extensions: ['*'] },
          ]
        : undefined,
  });
  return selected ? selected[0] : '';
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
    name: nodePath.basename(randomFolder),
    path: randomFolder
  };
}

// random quote folder
export const randomQuoteFolderNotUsed = async (exclude: string[] = []): Promise<{ name: string, path: string }> => {
  // get quote working folder
  const config = await loadMainConfig();
  const randomFolder = getRandomFolder(config?.quoteWorkingDir || '', exclude);
  return {
    name: nodePath.basename(randomFolder),
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

export interface MoveFolderParams {
  froms: string[];
  to: string;
}
// cut folder to another place
export const moveFolder = async ({ froms, to }: MoveFolderParams) => {
  froms.forEach((from) => {
    const folderName = nodePath.basename(from);
    const newPath = nodePath.join(to, folderName);
    try {
      fs.renameSync(from, newPath);
    } catch (error) {
      console.error(`Error moving folder from ${from} to ${newPath}:`, error);
    }
  });
}
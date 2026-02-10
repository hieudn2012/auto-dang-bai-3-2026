// change working folder
import { dialog, shell } from 'electron';
import fs from 'node:fs';

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

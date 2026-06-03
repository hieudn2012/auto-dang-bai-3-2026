import fs from 'node:fs';
import path from 'node:path';
import { isHistoryExists } from './history';

export interface MoveData {
  data: string;
  folder: string;
  fileName: string;
  type?: 'cap' | 'link';
}

export const getRandomFolder = (
  rootPath: string,
  excludeFolders: string[] = [],
  retry = 0,
  maxRetry = 5
): string => {
  if (!rootPath) {
    console.error('Root path is undefined or empty');
    return '';
  }

  try {
    const folders = fs.readdirSync(rootPath);

    const validFolders = folders.filter(
      folder => folder !== '.DS_Store' && folder !== 'desktop.ini' && !excludeFolders.includes(path.join(rootPath, folder))
    );

    if (validFolders.length === 0) {
      console.error('No valid folders found in:', rootPath);
      return '';
    }

    const randomFolder =
      validFolders[Math.floor(Math.random() * validFolders.length)];

    const finalPath = path.join(rootPath, randomFolder);

    const isExists = isHistoryExists(finalPath);

    if (isExists) {
      if (retry >= maxRetry) {
        console.error('Max retry reached:', maxRetry);
        return '';
      }

      return getRandomFolder(rootPath, excludeFolders, retry + 1, maxRetry);
    }

    return finalPath;
  } catch (error) {
    console.error('Error reading folder:', rootPath, error);
    return '';
  }
};

// get all folder in root path
export interface FolderData {
  folder: string;
  defaultLink: string;
  totalLink: number;
  totalCap: number;
  imgs: string[];
  realProductImage: string;
}

export const getAllFolder = (rootPath: string): FolderData[] => {
  try {
    const folders = fs.readdirSync(rootPath);
    const data = folders.filter(folder => folder !== '.DS_Store' && folder !== 'desktop.ini');
    return data.map((folder) => {
      // get link.txt in folder
      const linkPath = path.join(rootPath, folder, 'link.txt');
      console.log(`Reading folder: ${folder}...`);

      let totalLink = 0;
      let totalCap = 0;
      let defaultLink = '';
      if (fs.existsSync(linkPath)) {
        const linkData = fs.readFileSync(linkPath, 'utf-8');
        const normalizedData = linkData.replace(/\r\n/g, '\n');
        const links = normalizedData.split('\n').filter(link => link.trim().length > 0);
        totalLink = links.length;
        if (links.length > 0) {
          defaultLink = links[0]; // Lấy link đầu tiên làm defaultLink
        }
      }

      const capPath = path.join(rootPath, folder, 'cap.txt');
      if (fs.existsSync(capPath)) {
        const capData = fs.readFileSync(capPath, 'utf-8').trim();
        const caps = capData.split('\n\n\n\n').filter(cap => cap.trim().length > 0);
        totalCap = caps.length;
      }

      // get all img in folder
      const imgs: string[] = [];
      const files = fs.readdirSync(path.join(rootPath, folder));
      files.forEach(file => {
        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
          // convert to base64 to view in img tag
          const imgPath = path.join(rootPath, folder, file);
          const imgData = fs.readFileSync(imgPath);
          const imgBase64 = imgData.toString('base64');
          imgs.push(`data:image/jpeg;base64,${imgBase64}`);
        }
      });

      // get real product image in folder/real_product/img.png
      const realProductImagePath = path.join(rootPath, folder, 'real_product', 'img.png');
      let realProductImage = '';
      if (fs.existsSync(realProductImagePath)) {
        // convert to base64 to view in img tag
        const imgData = fs.readFileSync(realProductImagePath);
        const imgBase64 = imgData.toString('base64');
        realProductImage = `data:image/jpeg;base64,${imgBase64}`;
      }

      return ({
        folder: path.join(rootPath, folder),
        defaultLink: defaultLink,
        totalLink: totalLink,
        totalCap: totalCap,
        imgs,
        realProductImage,
      });
    });
  } catch (error) {
    console.error('Error reading folder:', rootPath, error);
    return [];
  }
};

export const moveDataToFolder = ({ data, folder, fileName }: MoveData): void => {
  try {
    const folderPath = path.join(folder, fileName);
    fs.writeFileSync(folderPath, data);
  } catch (error) {
    console.error('Error moving data to folder:', error);
    throw error;
  }
}

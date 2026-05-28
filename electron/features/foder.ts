import fs from 'node:fs';
import path from 'node:path';
import { isHistoryExists } from './history';

export interface MoveData {
  data: string;
  folder: string;
  fileName: string;
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
export const getAllFolder = (rootPath: string): { folder: string, defaultLink: string, totalLink: number, totalCap: number }[] => {
  try {
    const folders = fs.readdirSync(rootPath);
    const data = folders.filter(folder => folder !== '.DS_Store' && folder !== 'desktop.ini');
    return data.map((folder) => {
      // get link.txt in folder
      const linkPath = path.join(rootPath, folder, 'link.txt');
      console.log(linkPath, 'linkPath');

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

      return ({
        folder: path.join(rootPath, folder),
        defaultLink: defaultLink,
        totalLink: totalLink,
        totalCap: totalCap,
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

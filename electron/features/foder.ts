import fs from 'node:fs';
import path from 'node:path';
import { isHistoryExists } from './history';

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
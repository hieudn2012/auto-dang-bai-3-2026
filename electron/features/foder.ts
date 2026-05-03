import fs from 'node:fs';
import path from 'node:path';

// ignore .DS_Store and desktop.ini
export const getRandomFolder = (rootPath: string) => {
  if (!rootPath) {
    console.error('Root path is undefined or empty');
    return '';
  }
  
  try {
    const folders = fs.readdirSync(rootPath);
    const validFolders = folders.filter(folder => folder !== '.DS_Store' && folder !== 'desktop.ini');
    
    if (validFolders.length === 0) {
      console.error('No valid folders found in:', rootPath);
      return '';
    }
    
    const randomFolder = validFolders[Math.floor(Math.random() * validFolders.length)];
    return path.join(rootPath, randomFolder);
  } catch (error) {
    console.error('Error reading folder:', rootPath, error);
    return '';
  }
}
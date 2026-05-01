import * as fs from 'fs';
import { loadMainConfig } from './common';

export const checkValidCaptionOrLink = async () => {
  const config = await loadMainConfig();
  const workingDir = config?.workingDir || '';

  // get all folder in workingDir
  const folders = fs.readdirSync(workingDir);
  // ignore '.DS_Store' and 'desktop.ini'
  const filteredFolders = folders.filter((folder) => !folder.startsWith('.') && folder !== 'desktop.ini');
  const captionResult: any[] = [];
  const linkResult: any[] = [];


  for (const folder of filteredFolders) {
    const captionFile = `${workingDir}/${folder}/cap.txt`;
    const caption = fs.readFileSync(captionFile, 'utf-8');
    console.log(caption);

    const linkFile = `${workingDir}/${folder}/link.txt`;
    const link = fs.readFileSync(linkFile, 'utf-8');
    console.log(link);

    const captionValidation = checkValid(caption, `${workingDir}/${folder}`);
    const linkValidation = checkValid(link, `${workingDir}/${folder}`);
    
    captionResult.push(captionValidation);
    linkResult.push(linkValidation);
  }

  return {
    captionResult,
    linkResult,
    captionErrorCount: captionResult.filter((item) => !item.isValid).length,
    linkErrorCount: linkResult.filter((item) => !item.isValid).length,
  };
};

const checkValid = (data: string, path: string) => {
  // Normalize line endings to handle both Windows (\r\n) and Unix (\n)
  const normalizedData = data.replace(/\r\n/g, '\n');
  const errors: string[] = [];
  // Rule 1: Caption should not be empty or just whitespace
  if (!normalizedData || normalizedData.trim().length === 0) {
    errors.push("Data cannot be empty");
    return { isValid: false, errors, path };
  }

  // Rule 2: Caption should not contain excessive consecutive empty lines (more than 4)
  const emptyLineGroups = normalizedData.match(/\n{5,}/g);
  if (emptyLineGroups) {
    errors.push("Data contains too many consecutive empty lines (max 4 allowed)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    path,
    totalItems: normalizedData.split('\n\n\n\n').length,
  };
}

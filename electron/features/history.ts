import { app } from "electron";
import path from "path";
import fs from "node:fs";

interface HistoryItem {
  profile_id: number;
  folder: string;
}

export const saveHistory = (item: HistoryItem) => {
  const appConfig = app.getPath('userData');
  const historyPath = path.join(appConfig, 'history2.txt');  

  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, '');
  }

  // get history from file history.txt
  const historyTxt = fs.readFileSync(historyPath, 'utf8');
  // add 1 line new line
  fs.writeFileSync(historyPath, `${historyTxt}\n${item.profile_id} || ${item.folder}`);
}

export const getHistory = () => {
  const appConfig = app.getPath('userData');
  const historyPath = path.join(appConfig, 'history2.txt');

  if (!fs.existsSync(historyPath)) {
    return '';
  }
  const historyTxt = fs.readFileSync(historyPath, 'utf8');
  return historyTxt;
}

export const isHistoryExists = (folder: string) => {
  const history = getHistory();
  return history.includes(folder);
}
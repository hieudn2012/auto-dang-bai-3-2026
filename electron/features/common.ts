import { app } from "electron";
import { History, MainConfig } from "electron/types";
import fs from 'node:fs';

// wait random from to ms
export const waitRandom = async (from: number, to: number) => {
  const ms = Math.floor(Math.random() * (to - from + 1) + from);
  await new Promise(resolve => setTimeout(resolve, ms));
}

// save main config
export const saveMainConfig = async (config: MainConfig) => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // save config to file config.json
  fs.writeFileSync(`${appConfig}/config.json`, JSON.stringify(config));
  return true;
}

// get main config
export const loadMainConfig = async (): Promise<MainConfig | null> => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get config from file config.json
  const config = fs.readFileSync(`${appConfig}/config.json`, 'utf8');
  if (config) {
    return JSON.parse(config);
  }
  return null;
}

// get history txt
export const getHistoryTxt = async (): Promise<History[]> => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get history from file history.txt
  const history = fs.readFileSync(`${appConfig}/history.txt`, 'utf8');
  if (!history) {
    return [];
  }
  // convert to History Array
  const historyArray = history.split('\n').map(item => {
    const [profile_id, folder] = item.split('||');
    return { profile_id: parseInt(profile_id), folder };
  });
  return historyArray;
}

// init config file
export const initConfigFile = async () => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // create config file if not exists
  if (!fs.existsSync(`${appConfig}/config.json`)) {
    fs.writeFileSync(`${appConfig}/config.json`, JSON.stringify({ workingDir: '' }));
  }

  // create history file if not exists
  if (!fs.existsSync(`${appConfig}/history.txt`)) {
    fs.writeFileSync(`${appConfig}/history.txt`, '');
  }
}
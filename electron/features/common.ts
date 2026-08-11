import { app } from "electron";
import { History, MainConfig } from "electron/types";
import { trim } from "lodash";
import fs from 'node:fs';
import path from "node:path";

// wait random from to ms
export const waitRandom = async (from: number, to: number) => {
  const ms = Math.floor(Math.random() * (to - from + 1) + from);
  await new Promise(resolve => setTimeout(resolve, ms));
}

// save main config
export const saveMainConfig = async (config: MainConfig) => {
  const currentConfig = await loadMainConfig() || {};
  // get app config in system
  const appConfig = app.getPath('userData');
  // save config to file config.json
  fs.writeFileSync(path.join(appConfig, 'config.json'), JSON.stringify({ ...currentConfig, ...config }));
  return true;
}

// get main config
export const loadMainConfig = async (): Promise<MainConfig | null> => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get config from file config.json
  const config = fs.readFileSync(path.join(appConfig, 'config.json'), 'utf8');

  // create history2.txt if not exists
  if (!fs.existsSync(path.join(appConfig, 'history2.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'history2.txt'), '');
  }

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
  const history = fs.readFileSync(path.join(appConfig, 'history.txt'), 'utf8');
  if (!history) {
    return [];
  }
  // convert to History Array
  const historyArray = history.split('\n').map(item => {
    const [profile_id, folder] = item.split('||');
    return { profile_id: trim(profile_id), folder: trim(folder) };
  });

  // return ignore folder start .
  return historyArray.filter(item => !item.folder.startsWith('.'));
}

// init config file
export const initConfigFile = async () => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // create config file if not exists
  if (!fs.existsSync(path.join(appConfig, 'config.json'))) {
    fs.writeFileSync(path.join(appConfig, 'config.json'), JSON.stringify({ workingDir: '' }));
  }

  // create history file if not exists
  if (!fs.existsSync(path.join(appConfig, 'history.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'history.txt'), '');
  }

  if (!fs.existsSync(path.join(appConfig, 'history2.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'history2.txt'), '');
  }

  // create sexy-caption file if not exists
  if (!fs.existsSync(path.join(appConfig, 'sexy-cap.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'sexy-cap.txt'), '');
  }

  // create sexy-link file if not exists
  if (!fs.existsSync(path.join(appConfig, 'sexy-link.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'sexy-link.txt'), '');
  }

  // create folder reports if not exists
  if (!fs.existsSync(path.join(appConfig, 'reports'))) {
    fs.mkdirSync(path.join(appConfig, 'reports'));
  }

  // create folder check-views if not exists
  if (!fs.existsSync(path.join(appConfig, 'check-views'))) {
    fs.mkdirSync(path.join(appConfig, 'check-views'));
  }
}

// save history txt, add 1 line new line
export const saveHistoryTxt = async ({ profile_id, folder }: { profile_id: number, folder: string }) => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get history from file history.txt
  const historyTxt = fs.readFileSync(path.join(appConfig, 'history.txt'), 'utf8');
  // add 1 line new line
  fs.writeFileSync(path.join(appConfig, 'history.txt'), `${historyTxt}\n${profile_id} || ${folder}`);
}

// save report txt
export const saveReportTxt = async ({ reportName, note, id, status, username }: { reportName: string, note: string, id: number, status: string, username: string }) => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // create report file if not exists
  if (!fs.existsSync(path.join(appConfig, 'report.txt'))) {
    fs.writeFileSync(path.join(appConfig, 'report.txt'), '');
  }
  // get report from file report.txt
  const reportTxt = fs.readFileSync(path.join(appConfig, 'report.txt'), 'utf8');
  // add 1 line new line
  // id || username || create_at || status || note || reportName
  const date = new Date().toLocaleString();
  fs.writeFileSync(path.join(appConfig, 'report.txt'), `${reportTxt}\n${id} || ${username} || ${date} || ${status} || ${note} || ${reportName}`);
}

const ANDROID_NOTES_FILE = 'android-notes.txt';

/** Load android notes from userData/android-notes.txt (lines: index||note) */
export const loadAndroidNotes = async (): Promise<Record<string, string>> => {
  const file = path.join(app.getPath('userData'), ANDROID_NOTES_FILE);
  if (!fs.existsSync(file)) return {};

  const map: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('||');
    if (sep < 0) continue;
    const index = trimmed.slice(0, sep).trim();
    const note = trimmed.slice(sep + 2).replace(/\\n/g, '\n');
    if (index) map[index] = note;
  }
  return map;
};

/** Save android notes to userData/android-notes.txt */
export const saveAndroidNotes = async (notes: Record<string, string>) => {
  const file = path.join(app.getPath('userData'), ANDROID_NOTES_FILE);
  const lines = Object.entries(notes)
    .map(([index, note]) => [index, (note || '').trim()] as const)
    .filter(([, note]) => note.length > 0)
    .sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b))
    .map(([index, note]) => `${index}||${note.replace(/\r?\n/g, '\\n')}`);

  fs.writeFileSync(file, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
  return { path: file, count: lines.length };
};

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// save sexy-caption to file
export const saveSexyCaption = async (data: string) => {
  const appConfig = app.getPath('userData');
  const filePath = path.join(appConfig, 'sexy-cap.txt');
  fs.writeFileSync(filePath, data.trim());
}

// save sexy-link to file
export const saveSexyLink = async (data: string) => {
  const appConfig = app.getPath('userData');
  const filePath = path.join(appConfig, 'sexy-link.txt');
  fs.writeFileSync(filePath, data.trim());
}

export const cutSexyCaption = () => {
  const appConfig = app.getPath('userData');
  const filePath = path.join(appConfig, 'sexy-cap.txt');
  const data = fs.readFileSync(filePath, 'utf-8').trim();
  const [caption, ...rest] = data.split('\n\n\n\n');
  const newData = rest.join('\n\n\n\n').trim();
  fs.writeFileSync(filePath, newData);
  return caption.trim();
}

export const cutSexyLink = () => {
  const appConfig = app.getPath('userData');
  const filePath = path.join(appConfig, 'sexy-link.txt');
  const data = fs.readFileSync(filePath, 'utf-8').trim();
  const [link, ...rest] = data.split('\n').filter(line => line.trim() !== '');
  const newData = rest.join('\n').trim();
  fs.writeFileSync(filePath, newData);
  return link.trim();
}

export const loadSexyContent = () => {
  const appConfig = app.getPath('userData');
  const capPath = path.join(appConfig, 'sexy-cap.txt');
  const linkPath = path.join(appConfig, 'sexy-link.txt');
  const caption = fs.existsSync(capPath) ? fs.readFileSync(capPath, 'utf-8').trim() : '';
  const link = fs.existsSync(linkPath) ? fs.readFileSync(linkPath, 'utf-8').trim() : '';
  return { caption, link };
}

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type ReportStatus = 'failed' | 'completed';
export type ReportType = 'post' | 'quote' | 'edit' | 'setup-new-account';
export interface ReportItem {
  userId: number;
  username: string;
  status: ReportStatus;
  description: string;
  reportName: string;
  type: ReportType;
  create_at?: string;
}

export interface ReportResult {
  results: ReportItem[];
  totalFailed: number;
  totalCompleted: number;
  failedItems: ReportItem[];
}

export const saveReport = async (reportItem: ReportItem) => {
  const { userId, username, status, description, reportName, type } = reportItem;
  const appConfig = app.getPath('userData');
  const create_at = new Date().toISOString();
  const newReportLine = `${userId} || ${username} || ${create_at} || ${status} || ${description} || ${reportName} || ${type}\n`;
  // create report file if not exist in folder reports
  if (!fs.existsSync(`${appConfig}/reports/${reportName}.txt`)) {
    fs.writeFileSync(`${appConfig}/reports/${reportName}.txt`, '', 'utf8');
  }
  fs.appendFileSync(`${appConfig}/reports/${reportName}.txt`, newReportLine, 'utf8');
}

export const getReportByName = async (reportName: string): Promise<ReportResult> => {
  const appConfig = app.getPath('userData');
  const reportFilePath = `${appConfig}/reports/${reportName}.txt`;
  if (!fs.existsSync(reportFilePath)) {
    return {
      results: [],
      totalFailed: 0,
      totalCompleted: 0,
      failedItems: [],
    };
  }
  const reportTxt = fs.readFileSync(reportFilePath, 'utf8');
  const reports = reportTxt.split('\n').filter(item => item.includes(' || '));
  const results = reports.map((item) => {
    const [userId, username, create_at, status, description, reportName, type] = item.split(' || ');
    return {
      userId: Number(userId),
      username,
      create_at,
      status: status as ReportStatus,
      description,
      reportName,
      type: type as ReportType
    }
  });
  const totalFailed = results.filter(item => item.status === 'failed').length;
  const totalCompleted = results.filter(item => item.status === 'completed').length;
  const failedItems = results.filter(item => item.status === 'failed');
  return {
    results,
    totalFailed,
    totalCompleted,
    failedItems,
  };
}

// get report names
export const getReportNamesV2 = async (): Promise<string[]> => {
  const appConfig = app.getPath('userData');
  const reportsFolderPath = `${appConfig}/reports`;
  if (!fs.existsSync(reportsFolderPath)) {
    return [];
  }
  const files = fs.readdirSync(reportsFolderPath);
  return files
    .filter(file => file.endsWith('.txt'))
    .map(file => {
      const filePath = `${reportsFolderPath}/${file}`;
      const stat = fs.statSync(filePath);
      const createdAt = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.ctimeMs;
      return { name: file.replace('.txt', ''), createdAt };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(item => item.name);
}

// delete 10 report names oldest
export const deleteOldestReportNames = async () => {
  const appConfig = app.getPath('userData');
  const reportsFolderPath = `${appConfig}/reports`;
  if (!fs.existsSync(reportsFolderPath)) {
    return;
  }
  const files = fs.readdirSync(reportsFolderPath);
  const oldestFiles = files.sort((a, b) => fs.statSync(path.join(reportsFolderPath, a)).birthtimeMs - fs.statSync(path.join(reportsFolderPath, b)).birthtimeMs).slice(0, 10);
  oldestFiles.forEach(file => {
    fs.unlinkSync(path.join(reportsFolderPath, file));
  });
}
import { app } from 'electron';
import fs from 'node:fs';

// TODO remove when new success
// get report by reportName
export const getReportByReportName = async (reportName: string) => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get report from file report.txt
  const reportTxt = fs.readFileSync(`${appConfig}/report.txt`, 'utf8');
  // find report by reportName
  const reports = reportTxt.split('\n').filter(item => item.includes(reportName));
  const results = reports.map((item) => {
    const [id, username, create_at, status, note, reportName] = item.split(' || ');
    return {
      id,
      username,
      create_at,
      status,
      note,
      reportName
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

// TODO remove when new success
// get report names
export const getReportNames = async () => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get report from file report.txt
  const reportTxt = fs.readFileSync(`${appConfig}/report.txt`, 'utf8');
  // find report by reportName
  const reports = reportTxt.split('\n').filter(item => item.includes(' || '));
  const reportNamesList = reports.map((item) => {
    const [_id, _username, _create_at, _status, _note, reportName] = item.split(' || ');
    return reportName;
  });
  // Remove duplicates and filter out empty values
  const uniqueReportNames = [...new Set(reportNamesList.filter(name => name && name.trim()))];
  return uniqueReportNames;
}

export type ReportStatus = 'failed' | 'completed';
export type ReportType = 'post' | 'quote' | 'edit';
interface ReportItem {
  userId: number;
  username: string;
  status: ReportStatus;
  description: string;
  reportName: string;
  type: ReportType;
}

interface ReportResult {
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
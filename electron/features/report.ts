import { app } from 'electron';
import fs from 'node:fs';

// get report by reportName
export const getReportByReportName = async (reportName: string) => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get report from file report.txt
  const reportTxt = fs.readFileSync(`${appConfig}/report.txt`, 'utf8');
  // find report by reportName
  const reports = reportTxt.split('\n').filter(item => item.includes(reportName));
  const results = reports.map((item)  => {
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

// get report names
export const getReportNames = async () => {
  // get app config in system
  const appConfig = app.getPath('userData');
  // get report from file report.txt
  const reportTxt = fs.readFileSync(`${appConfig}/report.txt`, 'utf8');
  // find report by reportName
  const reports = reportTxt.split('\n').filter(item => item.includes(' || '));
  const reportNamesList = reports.map((item)  => {
    const [_id, _username, _create_at, _status, _note, reportName] = item.split(' || ');
    return reportName;
  });
  // Remove duplicates and filter out empty values
  const uniqueReportNames = [...new Set(reportNamesList.filter(name => name && name.trim()))];
  return uniqueReportNames;
}
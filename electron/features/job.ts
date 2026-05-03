import { IpcMainEvent } from "electron";
import { autoPost } from "./auto";
import jobQueue from "./job-queue";

export interface ScheduleItem {
  id: string;
  runAt: number;
  enabled: boolean;
  groupId: number;
  groupName: string;
  mode: 'default' | 'affiliate';
  folder: string;
  jobType: 'auto-post' | 'auto-comment' | 'auto-like' | 'auto-share';
  batchSize: number;
  reportName: string;
}

export const addJobs = (items: ScheduleItem[], event: IpcMainEvent) => {
  for (const item of items) {
    jobQueue.add({
      id: item.id,
      runAt: item.runAt,
      data: item,
      event: event
    });
  }
};

export const handleRunJob = (job: ScheduleItem, event: IpcMainEvent) => {
  // TODO: xử lý job theo jobType
  switch (job.jobType) {
    case 'auto-post':
      autoPost(job, event);
      break;
    case 'auto-comment':
      // TODO: comment
      break;
    case 'auto-like':
      // TODO: like
      break;
    case 'auto-share':
      // TODO: share
      break;
  }
};

export const handleClearJob = () => {
  jobQueue.clear();
};

export const handleGetQueue = () => {
  return jobQueue.getQueue();
};

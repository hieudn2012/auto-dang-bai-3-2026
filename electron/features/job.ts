import jobQueue from "./job-queue";

export interface ScheduleItem {
  id: string;
  runAt: number;
  enabled: boolean;
  groupId: number;
  mode: 'default' | 'affiliate';
  folder: string;
  jobType: 'post' | 'comment' | 'like' | 'share';
}

export const addJobs = (items: ScheduleItem[]) => {
  for (const item of items) {
    jobQueue.add({
      id: item.id,
      runAt: item.runAt,
      data: item
    });
  }
};

export const handleRunJob = (job: ScheduleItem) => {
  // TODO: xử lý job theo jobType
  switch (job.jobType) {
    case 'post':
      // TODO: post bài
      break;
    case 'comment':
      // TODO: comment
      break;
    case 'like':
      // TODO: like
      break;
    case 'share':
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

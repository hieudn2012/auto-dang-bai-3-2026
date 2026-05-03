import { handleRunJob } from "./job";

interface Job {
  id: string;
  runAt: number;
  data: any;
}

class JobQueue {
  private queue: Job[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.queue = [];
    this.timer = null;
  }

  add(job: Job): void {
    this.queue.push(job);
    this.queue.sort((a, b) => a.runAt - b.runAt);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const nextJob = this.queue[0];
    const delay = Math.max(0, nextJob.runAt - Date.now());

    this.timer = setTimeout(() => {
      this.runJob(nextJob);
    }, delay);
  }

  private async runJob(job: Job): Promise<void> {
    handleRunJob(job.data);

    // remove job
    this.queue.shift();

    // chạy tiếp job tiếp theo
    this.scheduleNext();
  }

  getQueue(): Job[] {
    return [...this.queue];
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }
}

export default new JobQueue();

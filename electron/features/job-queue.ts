import { IpcMainEvent } from "electron";
import { handleRunJob } from "./job";

interface Job {
  id: string;
  runAt: number;
  data: any;
  event?: IpcMainEvent;
}

class JobQueue {
  private queue: Job[] = [];
  private timer: NodeJS.Timeout | null = null;
  private currentEvent: IpcMainEvent | null = null;

  constructor() {
    this.queue = [];
    this.timer = null;
  }

  setEvent(event: IpcMainEvent): void {
    this.currentEvent = event;
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
    // Use job's event if available, otherwise use currentEvent
    const event = job.event || this.currentEvent;
    
    if (event) {
      handleRunJob(job.data, event);
    } else {
      console.warn('No event available for job:', job.id);
    }

    // remove job
    this.queue.shift();

    // chạy tiếp job tiếp theo
    this.scheduleNext();
  }

  getQueue(): Omit<Job, 'event'>[] {
    return this.queue.map(({ event, ...job }) => job);
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

import { IpcMainEvent } from "electron";

export interface LogItem {
  id: number;
  username: string;
  message: string;
}

export enum EventName {
  LOG = 'log',
  TOAST = 'show-toast',
}

export const sendLog = (event: IpcMainEvent, arg: LogItem) => {
  event.sender.send(EventName.LOG, arg);
};

export const showToast = (event: IpcMainEvent, arg: LogItem) => {
  event.sender.send(EventName.TOAST, arg);
};

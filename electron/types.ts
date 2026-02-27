export enum InvokeChannel {
  GET_CURRENT_TIME = 'get-current-time',
  OPEN_PROFILE = 'open-profile',
  CHECK_LIVE = 'check-live',
  OPEN_DIALOG_FOLDER = 'open-dialog-folder',
  CREATE_PRODUCT_FOLDER = 'create-product-folder',
  LOAD_PRODUCT_INFO = 'load-product-info',
  OPEN_FOLDER = 'open-folder',
  SAVE_PRODUCT_INFO = 'save-product-info',
  MOVE_ALL_FILES_FROM_FOLDER_A_TO_FOLDER_B = 'move-all-files-from-folder-a-to-folder-b',
  THREADS_PROFILE_OPEN = 'threads-profile-open',
  THREADS_POST = 'threads-post',
  SAVE_MAIN_CONFIG = 'save-main-config',
  LOAD_MAIN_CONFIG = 'load-main-config',
  RANDOM_FOLDER_NOT_USED = 'random-folder-not-used',
  GET_FOLDER_INFO = 'get-folder-info',
  CLICK_POST_BUTTON = 'click-post-button',
  CLICK_EDIT_LATEST_POST_BUTTON = 'click-edit-latest-post-button',
  SAVE_HISTORY_TXT = 'save-history-txt',
}

export type MainConfig = {
  workingDir: string
}

export type History = {
  profile_id: string
  folder: string
}

export type FolderInfo = {
  cap: string
  link: string
}

export type UserInfo = {
  ws: string;
  username: string;
  folder: string;
  type: 'post' | 'quote';
}
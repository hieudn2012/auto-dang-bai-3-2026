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
  RANDOM_QUOTE_FOLDER_NOT_USED = 'random-quote-folder-not-used',
  GET_FOLDER_INFO = 'get-folder-info',
  CLICK_POST_BUTTON = 'click-post-button',
  CLICK_EDIT_LATEST_POST_BUTTON = 'click-edit-latest-post-button',
  SAVE_HISTORY_TXT = 'save-history-txt',
  SETUP_NEW_ACCOUNT = 'setup-new-account',
  CHECK_LIVE_ACCOUNTS = 'check-live-accounts',
  SAVE_TELEGRAM_TOKEN = 'save-telegram-token',
  GET_TELEGRAM_TOKEN = 'get-telegram-token',
  SAVE_TELEGRAM_CHAT_ID = 'save-telegram-chat-id',
  GET_TELEGRAM_CHAT_ID = 'get-telegram-chat-id',
  SEND_TELEGRAM_MESSAGE = 'send-telegram-message',
  SEND_REPORT_TO_TELEGRAM = 'send-report-to-telegram',
  TEST_TELEGRAM_CONNECTION = 'test-telegram-connection',
  GET_BOT_INFO = 'get-bot-info',
  CHECK_VALID_CAPTION_OR_LINK = 'check-valid-caption-or-link',
  ADD_JOBS = 'add-jobs',
  CLEAR_JOBS = 'clear-jobs',
  GET_QUEUE = 'get-queue',
  UPDATE_PROFILE_GROUP = 'update-profile-group',
  UPDATE_PROFILE_PROXY = 'update-profile-proxy',
  BULK_TOGGLE_DISMISS_BUTTON = 'bulk-toggle-dismiss-button',
  REGISTER_NEW_ACCOUNTS = 'register-new-accounts',
  OPEN_PROFILE_FOLDER = 'open-profile-folder',
  CREATE_EMPTY_PRODUCT = 'create-empty-product',
  SAVE_PRODUCT = 'save-product',
  GET_PRODUCT_FOLDER = 'get-product-folder',
  GET_AFF_AMZ_LINK = 'get-aff-amz-link',
  GENERATE_CAPTIONS = 'generate-amazon-captions',
  GET_ALL_FOLDER = 'get-all-folder',
  MOVE_DATA_TO_FOLDER = 'move-data-to-folder',
  MOVE_FOLDER = 'move-folder',
  GET_FANPAGE_LINKS = 'get-fanpage-links',
  SAVE_SEXY_CAPTION = 'save-sexy-caption',
  SAVE_SEXY_LINK = 'save-sexy-link',
  LOAD_SEXY_CONTENT = 'load-sexy-content',
  DELETE_POST = 'delete-post',
  GET_REPORT_NAMES_V2 = 'get-report-names-v2',
  GET_REPORT_BY_NAME = 'get-report-by-name',
  CAPTURE_PRODUCT_IMAGE = 'capture-product-image',
  GENERATE_PROFILE = 'generate-profile',
  GET_PROFILES = 'get-profiles',
  CHANGE_PROFILE_INFO = 'change-profile-info',
  DELETE_OLDEST_REPORT_NAMES = 'delete-oldest-report-names',
  GET_ANDROID_LIST = 'get-android-list',
  OPEN_ANDROID = 'open-android',
  CLOSE_ANDROID = 'close-android',
  RANDOM_MUMU_NAME = 'random-mumu-name',
  ASSIGN_ACCOUNTS_TO_ANDROIDS = 'assign-accounts-to-androids',
}

export type MainConfig = {
  workingDir?: string
  quoteWorkingDir?: string
  profileDir?: string
  linkPost?: string
  caption?: string
  proxy?: string
  captions?: {
    label: string
    value: string
  }[]
  profile?: {
    groupId?: number
    mode?: 'default' | 'affiliate'
  },
  gemini?: {
    apiKey?: string
    prompt?: string
    model?: string
    lang?: string
    propmts?: { label: string, value: string }[];
  },
  macId?: string
  wsUrl?: string,
  android?: {
    inputAccount?: string,
    outputAccount?: string,
  }
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
  id: number,
  ws: string;
  username: string;
  folder: string;
  type: 'post' | 'quote';
  reportName?: string;
  mode?: 'default' | 'affiliate';
}
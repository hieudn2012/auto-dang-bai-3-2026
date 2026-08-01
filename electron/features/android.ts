import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Android {
    android_version: string;
    created_timestamp: number;
    disk_size_bytes: number;
    error_code: number;
    hyperv_enabled: boolean;
    index: string;
    info_source: string;
    is_android_started: boolean;
    is_main: boolean;
    is_process_started: boolean;
    name: string;
    adb_host_ip?: string;
    adb_port?: number;
    pid?: number;
    main_wnd?: string;
    render_wnd?: string;
    player_state?: string;
}

const MUMU_MANAGER_PATH = 'C:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\MuMuManager.exe';
const MUMU_ADB_PATH = 'C:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\adb.exe';
const MUMU_MANAGER_INFO_COMMAND = 'info --vmindex all';

const run = async (cmd: string, { silent = false } = {}) => {
    const { stdout, stderr } = await execAsync(cmd);
    if (!silent) {
        if (stdout) console.log(stdout.trim());
        if (stderr) console.log(stderr.trim());
    }
    return stdout;
};

const runMuMu = (args: string) => run(`"${MUMU_MANAGER_PATH}" ${args}`);

export const getAndroidList = async () => {
    const stdout = await run(`"${MUMU_MANAGER_PATH}" ${MUMU_MANAGER_INFO_COMMAND}`, {
        silent: true,
    });
    const data = JSON.parse(stdout);
    console.log(data, 'data');
    // MuMu trả object {"0": {...}, "1": {...}} -> array
    return Object.entries(data).map(([key, value]) => ({
        ...(value as Android),
        index: (value as Android).index ?? key,
    }));
};


export const getAndroid = async (index: number) => {
    const list = await getAndroidList();
    const android = list.find((item) => String(item.index) === String(index));
    if (!android) throw new Error(`Android index ${index} not found`);
    if (!(android as Android).is_android_started) throw new Error(`Android index ${index} is not started`);
    return android;
};

export const openAndroid = (android: Android) => runMuMu(`control -v ${android.index} launch`);
export const closeAndroid = (android: Android) => runMuMu(`control -v ${android.index} shutdown`);

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { loadMainConfig } from './common';

const execAsync = promisify(exec);

const ACCOUNT_FILE = 'account.txt';

export interface AndroidAccount {
    username: string;
    password: string;
    twoFa: string;
    cookies: string;
    raw: string; // user||password||2fa||cookies
}

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
    account?: AndroidAccount | null;
}

const MUMU_MANAGER_PATH = 'C:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\MuMuManager.exe';
const MUMU_ADB_PATH = 'C:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\adb.exe';
const MUMU_VMS_PATH = 'C:\\Program Files\\Netease\\MuMuPlayer\\vms';
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

// info RPC hay cache name cũ khi instance đang chạy — đọc playerName từ config mới đúng
const getPlayerNameFromConfig = async (index: string, androidVersion = '15.0') => {
    try {
        const configPath = join(
            MUMU_VMS_PATH,
            `MuMuPlayerGlobal-${androidVersion}-${index}`,
            'configs',
            'extra_config.json'
        );
        const raw = await fs.readFile(configPath, 'utf8');
        const cfg = JSON.parse(raw) as { playerName?: string };
        return cfg.playerName || null;
    } catch {
        return null;
    }
};

/** Đọc outputAccount/account.txt -> Map<name, AndroidAccount> */
const loadAssignedAccountsByName = async (): Promise<Map<string, AndroidAccount>> => {
    const map = new Map<string, AndroidAccount>();
    try {
        const config = await loadMainConfig();
        const outputDir = config?.android?.outputAccount;
        if (!outputDir) return map;

        const raw = await fs.readFile(join(outputDir, ACCOUNT_FILE), 'utf8');
        for (const line of raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
            const sep = line.indexOf('--');
            if (sep <= 0) continue;
            const name = line.slice(0, sep);
            const accountRaw = line.slice(sep + 2);
            const [username = '', password = '', twoFa = '', ...cookieParts] = accountRaw.split('||');
            map.set(name, {
                username,
                password,
                twoFa,
                cookies: cookieParts.join('||'),
                raw: accountRaw,
            });
        }
    } catch {
        // chưa có file / chưa set folder -> bỏ qua
    }
    return map;
};

export const getAndroidList = async () => {
    const stdout = await run(`"${MUMU_MANAGER_PATH}" ${MUMU_MANAGER_INFO_COMMAND}`, {
        silent: true,
    });
    const data = JSON.parse(stdout) as Record<string, Android>;
    const accountByName = await loadAssignedAccountsByName();

    // MuMu trả object {"0": {...}, "1": {...}} -> array + merge account theo name
    return Promise.all(
        Object.entries(data).map(async ([key, value]) => {
            const index = value.index ?? key;
            const playerName = await getPlayerNameFromConfig(index, value.android_version);
            const name = playerName || value.name;
            return {
                ...value,
                index,
                name,
                account: accountByName.get(name) || null,
            };
        })
    );
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

export const randomMuMuName = async (androidOrIndex: Android | string | number) => {
    const index =
        typeof androidOrIndex === 'object' ? androidOrIndex.index : androidOrIndex;
    const list = await getAndroidList();
    const android = list.find((item) => String(item.index) === String(index));
    if (!android) throw new Error(`Android index ${index} not found`);
    const randomName = `${Math.random().toString(36).substring(2, 15)}_${android.index}`;
    await runMuMu(`rename -v ${android.index} -n "${randomName}"`);
    return randomName;
};

/**
 * Gán account từ inputAccount/account.txt cho list android đã chọn (theo thứ tự).
 * Input:  user||password||2fa||cookies
 * Output: name--user||password||2fa||cookies  (append vào outputAccount/account.txt)
 * Sau khi gán: xóa các line đã dùng khỏi input.
 */
export const assignAccountsToAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const config = await loadMainConfig();
    const inputDir = config?.android?.inputAccount;
    const outputDir = config?.android?.outputAccount;
    if (!inputDir) throw new Error('Chưa set thư mục Input Account');
    if (!outputDir) throw new Error('Chưa set thư mục Output Account');

    const inputPath = join(inputDir, ACCOUNT_FILE);
    const outputPath = join(outputDir, ACCOUNT_FILE);

    let inputRaw = '';
    try {
        inputRaw = await fs.readFile(inputPath, 'utf8');
    } catch {
        throw new Error(`Không đọc được file: ${inputPath}`);
    }

    const inputLines = inputRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (inputLines.length < androids.length) {
        throw new Error(
            `Không đủ account: cần ${androids.length}, còn ${inputLines.length} trong input`
        );
    }

    // Lấy name mới nhất (playerName) theo index
    const latestList = await getAndroidList();
    const assignedLines: string[] = [];
    for (let i = 0; i < androids.length; i++) {
        const selected = androids[i];
        const latest = latestList.find((item) => item.index === selected.index) || selected;
        const accountLine = inputLines[i];
        assignedLines.push(`${latest.name}--${accountLine}`);
    }

    await fs.mkdir(outputDir, { recursive: true });
    let outputRaw = '';
    try {
        outputRaw = await fs.readFile(outputPath, 'utf8');
    } catch {
        outputRaw = '';
    }
    const outputExisting = outputRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const nextOutput = [...outputExisting, ...assignedLines];
    await fs.writeFile(outputPath, nextOutput.join('\n') + (nextOutput.length ? '\n' : ''), 'utf8');

    const remainingInput = inputLines.slice(androids.length);
    await fs.writeFile(
        inputPath,
        remainingInput.join('\n') + (remainingInput.length ? '\n' : ''),
        'utf8'
    );

    return {
        assigned: assignedLines.length,
        remaining: remainingInput.length,
        outputPath,
        items: assignedLines,
    };
};

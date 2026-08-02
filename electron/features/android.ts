import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { promisify } from 'util';
import { loadMainConfig } from './common';

const execAsync = promisify(exec);

const ACCOUNT_FILE = 'account.txt';

export interface AndroidAccount {
    username: string;
    password: string;
    twoFa: string;
    cookies: string;
    proxyPath: string;
    raw: string; // user|password|2fa|cookies|proxyPath
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

const MUMU_MANAGER_PATH = 'D:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\MuMuManager.exe';
const MUMU_ADB_PATH = 'D:\\Program Files\\Netease\\MuMuPlayer\\nx_main\\adb.exe';
const MUMU_VMS_PATH = 'D:\\Program Files\\Netease\\MuMuPlayer\\vms';
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

/** Parse accountRaw: user||password||2fa||cookies[||proxyPath] */
const parseAccountRaw = (accountRaw: string): Omit<AndroidAccount, 'raw'> => {
    const parts = accountRaw.split('|');
    const username = parts[0] || '';
    const password = parts[1] || '';
    const twoFa = parts[2] || '';
    if (parts.length >= 5) {
        return {
            username,
            password,
            twoFa,
            cookies: parts.slice(3, -1).join('|'),
            proxyPath: parts[parts.length - 1] || '',
        };
    }
    return {
        username,
        password,
        twoFa,
        cookies: parts.slice(3).join('|'),
        proxyPath: '',
    };
};

const buildAccountRaw = (account: Omit<AndroidAccount, 'raw'>) => {
    const base = `${account.username}|${account.password}|${account.twoFa}|${account.cookies}`;
    return account.proxyPath ? `${base}|${account.proxyPath}` : base;
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
            const parsed = parseAccountRaw(accountRaw);
            map.set(name, {
                ...parsed,
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
 * Input:  user|password|2fa|cookies|proxyPath
 * Output: name--user|password|2fa|cookies|proxyPath  (append vào outputAccount/account.txt)
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

/**
 * Gán proxy (.yml) từ proxyFolder cho android đã chọn (theo thứ tự).
 * Output line: name--user|password|2fa|cookies|proxyPath
 * Nếu số yml < số selected thì lặp lại (cycle).
 */
export const assignProxiesToAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const config = await loadMainConfig();
    const outputDir = config?.android?.outputAccount;
    const proxyDir = config?.android?.proxyFolder;
    if (!outputDir) throw new Error('Chưa set thư mục Output Account');
    if (!proxyDir) throw new Error('Chưa set thư mục Proxy Folder');

    let proxyFiles: string[] = [];
    try {
        const entries = await fs.readdir(proxyDir);
        proxyFiles = entries
            .filter((name) => name.toLowerCase().endsWith('.yml') || name.toLowerCase().endsWith('.yaml'))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((name) => join(proxyDir, name));
    } catch {
        throw new Error(`Không đọc được thư mục proxy: ${proxyDir}`);
    }
    if (!proxyFiles.length) throw new Error('Không có file .yml trong Proxy Folder');

    const outputPath = join(outputDir, ACCOUNT_FILE);
    let outputRaw = '';
    try {
        outputRaw = await fs.readFile(outputPath, 'utf8');
    } catch {
        throw new Error(`Không đọc được file: ${outputPath}`);
    }

    const outputLines = outputRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const lineByName = new Map<string, { index: number; line: string }>();
    outputLines.forEach((line, index) => {
        const sep = line.indexOf('--');
        if (sep <= 0) return;
        lineByName.set(line.slice(0, sep), { index, line });
    });

    const latestList = await getAndroidList();
    const updated: string[] = [];
    const nextLines = [...outputLines];

    for (let i = 0; i < androids.length; i++) {
        const selected = androids[i];
        const latest = latestList.find((item) => item.index === selected.index) || selected;
        const existing = lineByName.get(latest.name);
        if (!existing) {
            throw new Error(`Android "${latest.name}" chưa có account trong output`);
        }

        const accountRaw = existing.line.slice(existing.line.indexOf('--') + 2);
        const parsed = parseAccountRaw(accountRaw);
        const proxyPath = proxyFiles[i % proxyFiles.length];
        const nextRaw = buildAccountRaw({ ...parsed, proxyPath });
        const nextLine = `${latest.name}--${nextRaw}`;
        nextLines[existing.index] = nextLine;
        updated.push(nextLine);
    }

    await fs.writeFile(outputPath, nextLines.join('\n') + (nextLines.length ? '\n' : ''), 'utf8');

    return {
        assigned: updated.length,
        proxyCount: proxyFiles.length,
        outputPath,
        items: updated,
    };
};

const getAdbSerial = (android: Android) => {
    if (!android.adb_host_ip || !android.adb_port) {
        throw new Error(`Android index ${android.index} chưa có ADB address`);
    }
    return `${android.adb_host_ip}:${android.adb_port}`;
};

const connectAndroid = async (android: Android) => {
    const serial = getAdbSerial(android);
    await run(`"${MUMU_ADB_PATH}" connect ${serial}`);
    return serial;
};

// install apk app
export const installApk = async (android: Android, apkPath: string) => {
    const androidInstance = await getAndroid(Number(android.index));
    const serial = await connectAndroid(androidInstance);
    await run(`"${MUMU_ADB_PATH}" -s ${serial} install -r "${apkPath}"`);
};

// remove apk app
export const removeApk = async (android: Android, packageName: string) => {
    const androidInstance = await getAndroid(Number(android.index));
    const serial = await connectAndroid(androidInstance);
    try {
        await run(`"${MUMU_ADB_PATH}" -s ${serial} uninstall ${packageName}`);
    } catch (error: any) {
        const msg = `${error?.stdout || ''}${error?.stderr || ''}${error?.message || ''}`;
        if (msg.includes('DELETE_FAILED_INTERNAL_ERROR') || msg.includes('not installed')) {
            console.log(`Package ${packageName} chưa cài, bỏ qua`);
            return;
        }
        throw error;
    }
};

// open app — resolve launcher component rồi am start -n (một số app không mở được bằng -p)
const openApp = async (android: Android, packageName: string) => {
    const androidInstance = await getAndroid(Number(android.index));
    const serial = await connectAndroid(androidInstance);
    const resolveOut = await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${packageName}`,
        { silent: true }
    );
    const component = (resolveOut || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .pop();

    if (component && component.includes('/')) {
        await run(`"${MUMU_ADB_PATH}" -s ${serial} shell am start -n ${component}`);
        return;
    }

    // fallback
    await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`
    );
};

// copy file to android
const copyFileToAndroid = async (android: Android, filePath: string) => {
    const androidInstance = await getAndroid(Number(android.index));
    const serial = await connectAndroid(androidInstance);
    await run(`"${MUMU_ADB_PATH}" -s ${serial} push "${filePath}" /sdcard/Download/`);
};

const CLASH_META_PACKAGE = 'com.github.metacubex.clash.meta';
const CLASH_META_APK = 'C:\\AndroidAppData\\apk\\clash-meta.apk';
const THREADS_PACKAGE = 'com.instagram.barcelona';

// setup proxy trên 1 android (cần account.proxyPath)
export const setupProxy = async (android: Android, account?: AndroidAccount | null) => {
    const acc = account || android.account;
    if (!acc?.proxyPath) {
        throw new Error(`Android index ${android.index} chưa có proxyPath`);
    }

    const androidInstance = await getAndroid(Number(android.index));
    await removeApk(androidInstance, CLASH_META_PACKAGE);
    await installApk(androidInstance, CLASH_META_APK);

    // open clash meta app
    await openApp(androidInstance, CLASH_META_PACKAGE);

    await sleep(3000);
    const serial = await connectAndroid(androidInstance);

    // touch 452 894 Allow notifications
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 452 894`);
    await sleep(1000);

    // tapp 466 510 Profile
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 466 510`);
    await sleep(1000);

    // tap 835 105 add profile
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 835 105`);
    await sleep(1000);

    // tap 481 219 import file
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 481 219`);
    await sleep(1000);

    // tap 466 834 Select file
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 466 834`);
    await sleep(1000);

    // tap 838 228 more import
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 838 228`);
    await sleep(1000);

    // tap 458 1536 import
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 458 1536`);
    await sleep(1000);

    if (Number(android.index) % 2 === 0) {
        // tap 217 669 select yml file
        await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 217 669`);
        await sleep(1000);
    } else {
        // tap 685 651 select yml file
        await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 685 651`);
        await sleep(1000);
    }

    // tap 60 102 back
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 60 102`);
    await sleep(1000);

    // tap 835 102 save
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 835 102`);
    await sleep(1000);

    // tap 397 230 select profile
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 397 230`);
    await sleep(1000);

    // tap 70 99 back
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 70 99`);
    await sleep(1000);

    // tap 418 302 start proxy
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 418 302`);
    await sleep(1000);

    // tap 763 1043 confirm
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 763 1043`);
    await sleep(1000);

    // close app
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell am force-stop ${CLASH_META_PACKAGE}`);
};

/** Setup proxy đồng thời, mỗi android cách nhau 8 giây khi start */
export const setupProxiesOnAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 8000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!android.account?.proxyPath) {
                throw new Error('Chưa gán proxyPath');
            }
            await setupProxy(android, android.account);
            return { index: android.index, name: android.name, ok: true as const };
        } catch (error) {
            return {
                index: selected.index,
                name: selected.name,
                ok: false as const,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });

    const results = await Promise.all(tasks);

    return {
        total: androids.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
};

// auto register account on android
const escapeAdbText = (text: string) =>
    text
        .replace(/\\/g, '\\\\')
        .replace(/ /g, '%s')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/&/g, '\\&')
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>')
        .replace(/\|/g, '\\|')
        .replace(/;/g, '\\;')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');

export const autoRegisterAccountOnAndroid = async (
    android: Android,
    account?: AndroidAccount | null
) => {
    const androidInstance = await getAndroid(Number(android.index));
    const acc = account || androidInstance.account;
    if (!acc?.username || !acc?.password) {
        throw new Error(`Android index ${android.index} chưa có username/password`);
    }

    // mở Clash Meta rồi bật proxy
    await openApp(androidInstance, CLASH_META_PACKAGE);
    await sleep(2000);
    const serial = await connectAndroid(androidInstance);

    // tap 463 309 start proxy
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 463 309`);
    await sleep(3000);

    // go home
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input keyevent 3`);
    await sleep(1000);

    // open threads app
    await openApp(androidInstance, THREADS_PACKAGE);
    await sleep(5000);

    // tap 379 918 login with instagram
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 379 918`);
    await sleep(3000);

    // tap 395 711 username
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 395 711`);
    await sleep(1000);

    // input username
    await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell input text ${escapeAdbText(acc.username)}`
    );
    await sleep(1000);

    // tap 415 845 password
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 415 845`);
    await sleep(1000);

    // input password
    await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell input text ${escapeAdbText(acc.password)}`
    );
    await sleep(1000);

    // tap 424 983 submit
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 424 983`);
    await sleep(5000);

    // tap 460 1550 next pubic profile
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 460 1550`);
    await sleep(3000);

    // tap 437 1420 confirm and join threads
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 437 1420`);
    await sleep(20000);

    // tap 455 1000 allow notifications
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 455 850`);
    await sleep(1000);

    // tap 449 1550 follow all
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input tap 449 1550`);
    await sleep(10000);

    // lướt feed trong ~1 phút
    // const scrollUntil = Date.now() + 60_000;
    // while (Date.now() < scrollUntil) {
    //     // swipe up: giữa màn hình
    //     await run(`"${MUMU_ADB_PATH}" -s ${serial} shell input swipe 450 1300 450 400 500`);
    //     await sleep(1500 + Math.floor(Math.random() * 1500));
    // }
};

/** Auto register đồng thời, mỗi android cách nhau 8 giây khi start */
export const autoRegisterAccountsOnAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 8000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!android.account?.username || !android.account?.password) {
                throw new Error('Chưa gán account');
            }
            await autoRegisterAccountOnAndroid(android, android.account);
            return { index: android.index, name: android.name, ok: true as const };
        } catch (error) {
            return {
                index: selected.index,
                name: selected.name,
                ok: false as const,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });

    const results = await Promise.all(tasks);

    return {
        total: androids.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
};

// copy file to camera — rename khi push (vd: test.png -> IMG_20260802_185230.png)
const copyFileToCamera = async (
    android: Android,
    filePath: string,
    newFileName?: string
) => {
    const serial = await connectAndroid(android);
    const ext = extname(filePath) || '.jpg';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const targetName = newFileName || `IMG_${stamp}${ext}`;
    const remotePath = `/sdcard/DCIM/Camera/${targetName}`;

    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell mkdir -p /sdcard/DCIM/Camera`);
    await run(`"${MUMU_ADB_PATH}" -s ${serial} push "${filePath}" "${remotePath}"`);
    // refresh gallery
    await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${remotePath}"`,
        { silent: true }
    ).catch(() => undefined);

    return remotePath;
};

// delete all files in camera
const deleteAllFilesInCamera = async (android: Android) => {
    const serial = await connectAndroid(android);
    await run(`"${MUMU_ADB_PATH}" -s ${serial} shell rm -rf /sdcard/DCIM/Camera/*`);
};

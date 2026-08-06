import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { remote } from 'webdriverio';
import { loadMainConfig } from './common';

type AppiumDriver = WebdriverIO.Browser;

const execAsync = promisify(exec);

const ACCOUNT_FILE = 'account.txt';
const EXPORT_FILE = 'export.txt';
const PROXY_PLACEHOLDER = '##proxy##';

export interface AndroidAccount {
    username: string;
    password: string;
    twoFa: string;
    cookies: string;
    raw: string;
    // 51.79.132.48:8022:qqk61:o0xji -> address:port:username:password
    // chưa gán thì ##proxy##
    proxy: string;
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

/** Parse accountRaw: user|password|2fa|cookies[|proxy] — proxy ##proxy## coi như chưa gán */
const parseAccountRaw = (accountRaw: string): Omit<AndroidAccount, 'raw'> => {
    const parts = accountRaw.split('|');
    const username = parts[0] || '';
    const password = parts[1] || '';
    const twoFa = parts[2] || '';
    if (parts.length >= 5) {
        const proxyRaw = parts[parts.length - 1] || '';
        return {
            username,
            password,
            twoFa,
            cookies: parts.slice(3, -1).join('|'),
            proxy: normalizeProxy(proxyRaw),
        };
    }
    return {
        username,
        password,
        twoFa,
        cookies: parts.slice(3).join('|'),
        proxy: '',
    };
};

const normalizeProxy = (proxy: string) => {
    const value = (proxy || '').trim();
    if (!value || value === PROXY_PLACEHOLDER) return '';
    return value;
};

/** true nếu đã gán proxy thật (không phải placeholder) */
export const hasAssignedProxy = (proxy?: string | null) => {
    const value = normalizeProxy(proxy || '');
    return value.split(':').length >= 4;
};

const buildAccountRaw = (account: Omit<AndroidAccount, 'raw'>) => {
    const proxy = normalizeProxy(account.proxy) || PROXY_PLACEHOLDER;
    return `${account.username}|${account.password}|${account.twoFa}|${account.cookies}|${proxy}`;
};

/** Giữ 1 dòng / name (name--...). Line sau ghi đè line trước — hết duplicate. */
const mergeAccountOutputLines = (existing: string[], upserts: string[] = []): string[] => {
    const result: string[] = [];
    const indexByName = new Map<string, number>();

    const apply = (line: string) => {
        const sep = line.indexOf('--');
        if (sep <= 0) {
            result.push(line);
            return;
        }
        const name = line.slice(0, sep);
        const idx = indexByName.get(name);
        if (idx === undefined) {
            indexByName.set(name, result.length);
            result.push(line);
            return;
        }
        result[idx] = line;
    };

    for (const line of existing) apply(line);
    for (const line of upserts) apply(line);
    return result;
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
 * Input:  user|password|2fa|cookies[|proxy]
 * Output: name--user|password|2fa|cookies|proxy  (append/ghi đè theo name, không duplicate)
 * proxy là optional, nếu không có thì để ##proxy##
 * Sau khi gán: xóa các line đã dùng khỏi input. Name đã có trong output thì ghi đè.
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
        const parsed = parseAccountRaw(inputLines[i]);
        // chưa có proxy thật -> ghi ##proxy##
        assignedLines.push(`${latest.name}--${buildAccountRaw(parsed)}`);
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
    // name đã có thì ghi đè, đồng thời xóa duplicate name--
    const nextOutput = mergeAccountOutputLines(outputExisting, assignedLines);
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
 * Gán proxy từ proxyFolder/proxy.txt cho android đã chọn (theo thứ tự).
 * Mỗi dòng: address:port:username:password  (vd: 51.79.132.48:8022:qqk61:o0xji)
 * Output line: name--user|password|2fa|cookies|proxy
 * Thay ##proxy## (hoặc proxy cũ) bằng proxy mới. Cycle nếu thiếu.
 */
export const assignProxiesToAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const config = await loadMainConfig();
    const outputDir = config?.android?.outputAccount;
    const proxyDir = config?.android?.proxyFolder;
    if (!outputDir) throw new Error('Chưa set thư mục Output Account');
    if (!proxyDir) throw new Error('Chưa set thư mục Proxy Folder');

    const proxyFilePath = join(proxyDir, 'proxy.txt');
    let proxyLines: string[] = [];
    try {
        const raw = await fs.readFile(proxyFilePath, 'utf8');
        proxyLines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    } catch {
        throw new Error(`Không đọc được file: ${proxyFilePath}`);
    }
    if (!proxyLines.length) throw new Error('proxy.txt không có dòng proxy nào');

    const invalid = proxyLines.find((line) => !hasAssignedProxy(line));
    if (invalid) {
        throw new Error(`Sai format proxy (cần address:port:user:pass): ${invalid}`);
    }

    const outputPath = join(outputDir, ACCOUNT_FILE);
    let outputRaw = '';
    try {
        outputRaw = await fs.readFile(outputPath, 'utf8');
    } catch {
        throw new Error(`Không đọc được file: ${outputPath}`);
    }

    const outputLines = mergeAccountOutputLines(
        outputRaw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
    );

    const lineByName = new Map<string, string>();
    for (const line of outputLines) {
        const sep = line.indexOf('--');
        if (sep <= 0) continue;
        lineByName.set(line.slice(0, sep), line);
    }

    const latestList = await getAndroidList();
    const updated: string[] = [];

    for (let i = 0; i < androids.length; i++) {
        const selected = androids[i];
        const latest = latestList.find((item) => item.index === selected.index) || selected;
        const existing = lineByName.get(latest.name);
        if (!existing) {
            throw new Error(`Android "${latest.name}" chưa có account trong output`);
        }

        const accountRaw = existing.slice(existing.indexOf('--') + 2);
        const parsed = parseAccountRaw(accountRaw);
        const proxy = proxyLines[i % proxyLines.length];
        const nextLine = `${latest.name}--${buildAccountRaw({ ...parsed, proxy })}`;
        updated.push(nextLine);
    }

    const nextLines = mergeAccountOutputLines(outputLines, updated);
    await fs.writeFile(outputPath, nextLines.join('\n') + (nextLines.length ? '\n' : ''), 'utf8');

    return {
        assigned: updated.length,
        proxyCount: proxyLines.length,
        outputPath,
        items: updated,
    };
};

/**
 * Đọc outputAccount/account.txt -> ghi export.txt
 * Bỏ name-- và field proxy → còn user|password|2fa|cookies
 */
export const exportAccountsFromOutput = async () => {
    const config = await loadMainConfig();
    const outputDir = config?.android?.outputAccount;
    if (!outputDir) throw new Error('Chưa set thư mục Output Account');

    const inputPath = join(outputDir, ACCOUNT_FILE);
    const exportPath = join(outputDir, EXPORT_FILE);

    let raw = '';
    try {
        raw = await fs.readFile(inputPath, 'utf8');
    } catch {
        throw new Error(`Không đọc được file: ${inputPath}`);
    }

    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const exported: string[] = [];
    for (const line of lines) {
        const sep = line.indexOf('--');
        const accountRaw = sep > 0 ? line.slice(sep + 2) : line;
        const parsed = parseAccountRaw(accountRaw);
        if (!parsed.username && !parsed.password) continue;
        exported.push(
            `${parsed.username}|${parsed.password}|${parsed.twoFa}|${parsed.cookies}`
        );
    }

    await fs.writeFile(
        exportPath,
        exported.join('\n') + (exported.length ? '\n' : ''),
        'utf8'
    );

    return {
        count: exported.length,
        exportPath,
        items: exported,
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

// install apk app (hỗ trợ .apk và .xapk)
export const installApk = async (android: Android, apkPath: string) => {
    const androidInstance = await getAndroid(Number(android.index));
    const serial = await connectAndroid(androidInstance);

    const lower = apkPath.toLowerCase();
    if (lower.endsWith('.xapk')) {
        const extractDir = join(tmpdir(), `xapk-install-${Date.now()}`);
        const zipCopy = join(extractDir, 'app.zip');
        await fs.mkdir(extractDir, { recursive: true });
        try {
            await fs.copyFile(apkPath, zipCopy);
            await run(
                `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipCopy.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force"`,
                { silent: true }
            );
            const entries = await fs.readdir(extractDir);
            const apkFiles = entries
                .filter((name) => name.toLowerCase().endsWith('.apk'))
                .map((name) => join(extractDir, name));
            if (!apkFiles.length) throw new Error(`XAPK không chứa file .apk: ${apkPath}`);

            // ưu tiên base apk (không phải config.*.apk)
            const baseApk =
                apkFiles.find((p) => {
                    const name = p.replace(/^.*[\\/]/, '');
                    return !name.toLowerCase().startsWith('config.');
                }) || apkFiles[0];

            await run(`"${MUMU_ADB_PATH}" -s ${serial} install -r "${baseApk}"`);
        } finally {
            await fs.rm(extractDir, { recursive: true, force: true }).catch(() => undefined);
        }
        return;
    }

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

const THREADS_PACKAGE = 'com.instagram.barcelona';

/** Setup proxy đồng thời, mỗi android cách nhau 8 giây khi start */
export const setupProxiesOnAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 3000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!hasAssignedProxy(android.account?.proxy)) {
                throw new Error('Chưa gán proxy');
            }
            const [address, port, username, password] = android.account!.proxy.split(':');
            await setupProxyOnAndroid(android, {
                address,
                port,
                username,
                password,
            });
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

    const serial = await connectAndroid(androidInstance);

    // open threads app (proxy đã setup qua College Proxy trước đó)
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

async function fillIfExists(driver: AppiumDriver, selector: string, value: string) {
    const [el] = await driver.$$(selector);
    if (!el) return false;
    const visible = await el.isDisplayed().catch(() => false);
    if (!visible) return false;
    await el.click();
    await el.clearValue().catch(() => {});
    await el.setValue(value);
    console.log(`filled ${selector} = ${value}`);
    return true;
}

/** Poll button android:id/button1 theo text đến khi hiện rồi click. */
async function clickButtonByText(driver: AppiumDriver, text: string, { timeoutMs = 30000, intervalMs = 1000 } = {}) {
    await driver.setTimeout({ implicit: 0 });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const buttons = await driver.$$("id:android:id/button1");
        for (const btn of buttons) {
            const visible = await btn.isDisplayed().catch(() => false);
            if (!visible) continue;
            const t = (await btn.getText().catch(() => "")).trim();
            if (t !== text) continue;
            await btn.click();
            console.log(`clicked: android:id/button1 text="${text}"`);
            return true;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await driver.pause(Math.min(intervalMs, remaining));
    }
    console.log(`timeout waiting for button text="${text}"`);
    return false;
}

interface SetupProxyParams {
    address: string;
    port: string;
    username: string;
    password: string;
}

export const setupProxyOnAndroid = async (android: Android, params: SetupProxyParams) => {
    const driver = await remote({
        protocol: "http",
        hostname: "127.0.0.1",
        port: 4723,
        path: "/",
        logLevel: "warn",
        capabilities: {
            platformName: "Android",
            "appium:automationName": "UiAutomator2",
            "appium:udid": getAdbSerial(android),
            "appium:appPackage": "com.cell47.College_Proxy",
            "appium:appActivity": ".user_interface.MainActivity",
            "appium:noReset": true,
            "appium:forceAppLaunch": true,
        },
    });
    try {
        await driver.setTimeout({ implicit: 0 });

        const addressSel = "id:com.cell47.College_Proxy:id/editText_address";
        const formDeadline = Date.now() + 20000;
        let formReady = false;
        while (Date.now() < formDeadline) {
            const [address] = await driver.$$(addressSel);
            if (address && (await address.isDisplayed().catch(() => false))) {
                formReady = true;
                break;
            }
            await driver.pause(1000);
        }
        if (!formReady) throw new Error("Main form (editText_address) not found");

        await fillIfExists(driver, addressSel, params.address);
        await fillIfExists(driver, "id:com.cell47.College_Proxy:id/editText_port", params.port);
        await fillIfExists(driver, "id:com.cell47.College_Proxy:id/editText_username", params.username);
        await fillIfExists(driver, "id:com.cell47.College_Proxy:id/editText_password", params.password);

        const [startBtn] = await driver.$$("id:com.cell47.College_Proxy:id/proxy_start_button");
        if (startBtn && (await startBtn.isDisplayed().catch(() => false))) {
            await startBtn.click();
            console.log("clicked: proxy_start_button");
        }

        // confirm VPN / START SERVICE
        await clickButtonByText(driver, "START SERVICE", { timeoutMs: 15000, intervalMs: 1000 });
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};


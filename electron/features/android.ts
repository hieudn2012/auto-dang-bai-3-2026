import { exec, execFile } from 'child_process';
import { IpcMainEvent } from 'electron';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import { promisify } from 'util';
import { remote } from 'webdriverio';
import { loadMainConfig } from './common';
import { sendMessage } from './event';
import { getMediaInFolder } from './foder';

type AppiumDriver = WebdriverIO.Browser;

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

interface SetupProxyParams {
    address: string;
    port: string;
    username: string;
    password: string;
}

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const ACCOUNT_FILE = 'account.txt';
const EXPORT_FILE = 'export.txt';
const PROXY_PLACEHOLDER = '##proxy##';
const THREADS_PACKAGE = 'com.instagram.barcelona';
const ADB_TIMEOUT_MS = 45_000;

const ROOT = process.env.ROOT || 'D:';
const MUMU_MANAGER_PATH = `${ROOT}\\Program Files\\Netease\\MuMuPlayer\\nx_main\\MuMuManager.exe`;
const MUMU_ADB_PATH = `${ROOT}\\Program Files\\Netease\\MuMuPlayer\\nx_main\\adb.exe`;
const MUMU_VMS_PATH = `${ROOT}\\Program Files\\Netease\\MuMuPlayer\\vms`;
const MUMU_MANAGER_INFO_COMMAND = 'info --vmindex all';

const run = async (cmd: string, { silent = false, timeout = ADB_TIMEOUT_MS } = {}) => {
    const { stdout, stderr } = await execAsync(cmd, {
        maxBuffer: 20 * 1024 * 1024,
        timeout,
        windowsHide: true,
    });
    if (!silent) {
        if (stdout) console.log(stdout.trim());
        if (stderr) console.log(stderr.trim());
    }
    return stdout;
};

const runMuMu = (args: string) => run(`"${MUMU_MANAGER_PATH}" ${args}`);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Full component — tránh relative ".handleractivity" bị resolve sai trên một số MuMu/adb */
const THREADS_SHARE_COMPONENT =
    'com.instagram.barcelona/com.instagram.barcelona.handleractivity.BarcelonaShareHandlerActivity';

type UploadedMedia = {
    localPath: string;
    remotePath: string;
    remoteName: string;
    mime: string;
    mediaId: string;
    contentUri: string;
};

const getMimeType = (filePath: string) => {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.webp':
            return 'image/webp';
        case '.gif':
            return 'image/gif';
        case '.heic':
            return 'image/heic';
        case '.mp4':
            return 'video/mp4';
        case '.mov':
            return 'video/quicktime';
        case '.webm':
            return 'video/webm';
        default:
            return 'application/octet-stream';
    }
};

const isVideoMime = (mime: string) => mime.startsWith('video/');

const mediaCollectionUri = (mime: string) =>
    isVideoMime(mime)
        ? 'content://media/external/video/media'
        : 'content://media/external/images/media';

/**
 * Tên file ASCII trên Android — alpha để Gallery sắp video trước, ảnh sau:
 * a00.mp4, a01.mp4, … rồi b00.jpg, b01.jpg, …
 */
const safeRemoteFileName = (filePath: string, index: number) => {
    const ext = extname(filePath).toLowerCase() || '.bin';
    const prefix = isVideoMime(getMimeType(filePath)) ? 'a' : 'b';
    return `${prefix}${String(index).padStart(2, '0')}${ext}`;
};

/** adb với argv — tránh lỗi quote/Unicode path trên Windows */
const adbFile = async (
    serial: string,
    args: string[],
    { silent = true, timeout = ADB_TIMEOUT_MS } = {}
) => {
    const { stdout, stderr } = await execFileAsync(MUMU_ADB_PATH, ['-s', serial, ...args], {
        maxBuffer: 20 * 1024 * 1024,
        timeout,
        windowsHide: true,
    });
    if (!silent) {
        if (stdout) console.log(String(stdout).trim());
        if (stderr) console.log(String(stderr).trim());
    }
    return String(stdout || '');
};

const adbFileSoft = async (serial: string, args: string[], timeout = ADB_TIMEOUT_MS) => {
    try {
        return await adbFile(serial, args, { timeout });
    } catch (error: any) {
        const out = `${error?.stdout || ''}${error?.stderr || ''}`;
        if (out.includes('_id=') || out.includes('Broadcast completed') || out.includes('file pushed')) {
            return out;
        }
        throw error;
    }
};

const queryMediaIdByName = async (serial: string, collection: string, remoteName: string) => {
    // Một câu lệnh shell duy nhất để giữ nguyên quotes
    const cmd =
        `content query --uri ${collection} --projection _id ` +
        `--where "_display_name='${remoteName}'"`;
    const out = await adbFileSoft(serial, ['shell', cmd]);
    return out.match(/_id=(\d+)/)?.[1] || null;
};

const grantThreadsMediaPermission = async (serial: string) => {
    const grants = [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
    ];
    for (const perm of grants) {
        await adbFileSoft(serial, ['shell', 'pm', 'grant', THREADS_PACKAGE, perm]).catch(() => '');
    }
};

/**
 * Xoá toàn bộ media trên Android trước khi upload (file + MediaStore),
 * để Gallery chỉ còn file vừa push.
 */
const clearAllAndroidMedia = async (serial: string, log: (msg: string) => void) => {
    log('Clearing all media on Android...');

    // Folder media thường gặp + thư mục upload của app
    await adbFileSoft(serial, [
        'shell',
        'rm -rf /sdcard/ThreadsPost' +
            ' /sdcard/DCIM/* /sdcard/Pictures/* /sdcard/Movies/* /sdcard/Download/* /sdcard/Camera/*' +
            ' /storage/emulated/0/DCIM/* /storage/emulated/0/Pictures/*' +
            ' /storage/emulated/0/Movies/* /storage/emulated/0/Download/*' +
            ' 2>/dev/null; true',
    ]).catch(() => '');

    // Quét xoá file ảnh/video còn sót
    await adbFileSoft(serial, [
        'shell',
        "find /sdcard /storage/emulated/0 -type f" +
            " \\( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp'" +
            " -o -iname '*.gif' -o -iname '*.heic' -o -iname '*.bmp'" +
            " -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.webm' -o -iname '*.mkv'" +
            " -o -iname '*.3gp' -o -iname '*.avi' -o -iname '*.m4v' \\)" +
            ' -delete 2>/dev/null; true',
    ]).catch(() => '');

    // Xoá entry MediaStore để Gallery không còn cache cũ
    for (const uri of [
        'content://media/external/images/media',
        'content://media/external/video/media',
        'content://media/external/file',
    ]) {
        await adbFileSoft(serial, ['shell', `content delete --uri ${uri}`]).catch(() => '');
    }

    await sleep(600);
    log('Android media cleared');
};

/**
 * Gallery Threads sort theo ngày (mới → cũ), không theo tên.
 * Video cần date cao hơn ảnh để hiện trước.
 */
const mediaSortDateSec = (mime: string, index: number) => {
    const now = Math.floor(Date.now() / 1000);
    return isVideoMime(mime) ? now + 100 + index : now - 100 + index;
};

/**
 * Push file PC → /sdcard/ThreadsPost/<port>/ + MediaStore content:// URI
 */
const pushFileToAndroidMedia = async (
    serial: string,
    port: number | string,
    localPath: string,
    index: number
): Promise<UploadedMedia> => {
    await fs.access(localPath);
    const mime = getMimeType(localPath);
    const remoteName = safeRemoteFileName(localPath, index);
    const remoteDir = `/sdcard/ThreadsPost/${port}`;
    const remotePath = `${remoteDir}/${remoteName}`;
    const collection = mediaCollectionUri(mime);
    const dateSec = mediaSortDateSec(mime, index);
    const dateTakenMs = dateSec * 1000;

    const tmpLocal = join(tmpdir(), remoteName);
    await fs.copyFile(localPath, tmpLocal);

    try {
        await adbFile(serial, ['shell', 'mkdir', '-p', remoteDir]);
        await adbFile(serial, ['push', tmpLocal, remotePath], { silent: false });

        // mtime file → MediaScanner / Gallery ưu tiên video (date cao hơn)
        await adbFileSoft(serial, [
            'shell',
            `touch -d @${dateSec} "${remotePath}" 2>/dev/null || touch "${remotePath}"`,
        ]).catch(() => '');

        const fileUri = `file://${remotePath}`;
        await adbFileSoft(serial, [
            'shell',
            'am',
            'broadcast',
            '-a',
            'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
            '-d',
            fileUri,
        ]);
        await sleep(300);

        await adbFileSoft(serial, [
            'shell',
            `content insert --uri ${collection}` +
                ` --bind _data:s:${remotePath}` +
                ` --bind mime_type:s:${mime}` +
                ` --bind _display_name:s:${remoteName}` +
                ` --bind date_added:i:${dateSec}` +
                ` --bind date_modified:i:${dateSec}` +
                ` --bind datetaken:i:${dateTakenMs}`,
        ]).catch(() => '');

        let mediaId: string | null = null;
        let contentUri = '';
        for (let attempt = 0; attempt < 8; attempt++) {
            mediaId = await queryMediaIdByName(serial, collection, remoteName);
            if (mediaId) {
                contentUri = `${collection}/${mediaId}`;
                break;
            }
            mediaId = await queryMediaIdByName(serial, 'content://media/external/file', remoteName);
            if (mediaId) {
                contentUri = `content://media/external/file/${mediaId}`;
                break;
            }
            await sleep(350);
        }

        if (!mediaId || !contentUri) {
            throw new Error(`MediaStore id not found for ${remoteName}`);
        }

        // Ép lại date sau scan (scanner hay ghi đè theo mtime/now)
        await adbFileSoft(serial, [
            'shell',
            `content update --uri ${contentUri}` +
                ` --bind date_added:i:${dateSec}` +
                ` --bind date_modified:i:${dateSec}` +
                ` --bind datetaken:i:${dateTakenMs}`,
        ]).catch(() => '');

        return { localPath, remotePath, remoteName, mime, mediaId, contentUri };
    } finally {
        await fs.unlink(tmpLocal).catch(() => undefined);
    }
};

/** am start argv (không wildcard mime). */
const amStart = (serial: string, amArgs: string[], timeoutMs: number) =>
    adbFile(serial, ['shell', 'am', ...amArgs], { silent: false, timeout: timeoutMs });

const createAppiumDriver = async (serial: string) =>
    remote({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 4723,
        path: '/',
        logLevel: 'warn',
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:udid': serial,
            'appium:noReset': true,
            'appium:autoGrantPermissions': true,
        },
    });

async function waitForXpath(
    driver: AppiumDriver,
    xpath: string,
    { timeoutMs = 15000, intervalMs = 500 } = {}
) {
    await driver.setTimeout({ implicit: 0 });
    const deadline = Date.now() + timeoutMs;
    const selector = `xpath:${xpath}`;
    while (Date.now() < deadline) {
        const [el] = await driver.$$(selector);
        if (el) {
            const visible = await el.isDisplayed().catch(() => false);
            if (visible) return el;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await driver.pause(Math.min(intervalMs, remaining));
    }
    return null;
}

/**
 * Appium: Gallery → chọn media theo thứ tự video → ảnh → Done.
 * Dùng khi MuMu am không hỗ trợ SEND_MULTIPLE/--clip.
 */
const attachMediaViaAppiumGallery = async (
    serial: string,
    totalMedia: number,
    log: (msg: string) => void
) => {
    const driver = await createAppiumDriver(serial);
    try {
        log('Appium: waiting for New thread composer...');
        const composerReady = await waitForXpath(
            driver,
            '//*[@resource-id="new_thread_screen_gallery_button" or @resource-id="new_thread_screen_composer"]',
            { timeoutMs: 20000 }
        );
        if (!composerReady) throw new Error('Composer / Gallery button not found');

        log('Appium: open Gallery...');
        const galleryOpened =
            (await clickByXpath(driver, '//*[@resource-id="new_thread_screen_gallery_button"]', {
                timeoutMs: 8000,
                intervalMs: 500,
            })) ||
            (await clickByXpath(driver, '//*[@content-desc="Gallery"]', {
                timeoutMs: 5000,
                intervalMs: 500,
            }));
        if (!galleryOpened) throw new Error('Cannot tap Gallery button');

        await driver.pause(1200);
        const gridReady = await waitForXpath(
            driver,
            '//*[@resource-id="com.instagram.barcelona:id/gallery_picker_grid_item_container"]',
            { timeoutMs: 15000 }
        );
        if (!gridReady) throw new Error('Gallery picker grid not found');

        const cells = await driver.$$(
            'xpath://*[@resource-id="com.instagram.barcelona:id/gallery_picker_grid_item_container" and string-length(@content-desc) > 0]'
        );

        type CellInfo = {
            el: WebdriverIO.Element;
            desc: string;
            recent: boolean;
            selected: boolean;
            kind: number; // 0 video, 1 photo, 2 other
        };
        const kindOf = (desc: string) =>
            /video\s+thumbnail/i.test(desc) ? 0 : /photo\s+thumbnail/i.test(desc) ? 1 : 2;

        const infos: CellInfo[] = [];
        for (const el of cells) {
            const desc = (await el.getAttribute('content-desc')) || '';
            if (!/thumbnail/i.test(desc)) continue;
            infos.push({
                el,
                desc,
                recent: /seconds ago|minute ago|minutes ago/i.test(desc),
                selected: /\d+\s+of\s+\d+\s+selected/i.test(desc),
                kind: kindOf(desc),
            });
        }

        const recent = infos.filter((i) => i.recent);
        const pool = (recent.length >= totalMedia ? recent : infos)
            .slice()
            // Video trước, ảnh sau — thứ tự chọn = thứ tự gắn vào thread
            .sort((a, b) => a.kind - b.kind || a.desc.localeCompare(b.desc));
        const targets = pool.slice(0, totalMedia);

        if (!targets.length) throw new Error('No gallery thumbnails to select');

        // Bỏ chọn sẵn (từ SEND) rồi chọn lại đúng thứ tự video → ảnh
        for (const item of targets) {
            if (!item.selected) continue;
            await item.el.click();
            await driver.pause(350);
            item.selected = false;
            log(`Deselected: ${item.desc}`);
        }

        log(`Appium: selecting ${targets.length}/${totalMedia} (video → photo)...`);
        for (const item of targets) {
            await item.el.click();
            await driver.pause(450);
            log(`Selected: ${item.desc}`);
        }

        const done =
            (await clickByXpath(driver, '//*[@text="Done"]', { timeoutMs: 8000, intervalMs: 400 })) ||
            (await clickByXpath(driver, '//*[@content-desc="Done"]', {
                timeoutMs: 4000,
                intervalMs: 400,
            }));
        if (!done) throw new Error('Done button not found in gallery');

        await driver.pause(1000);
        log('Appium: Gallery Done — media attached to thread');
        return true;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

/**
 * Mở Threads New thread với media:
 * 1) am SEND file đầu (mở composer) — MuMu không hỗ trợ multi-URI
 * 2) nếu >1 file: Appium Gallery chọn đủ N media vừa push → Done
 */
const openThreadsComposerWithMedia = async (
    serial: string,
    items: UploadedMedia[],
    log: (msg: string) => void
) => {
    if (!items.length) throw new Error('No media to share');

    await grantThreadsMediaPermission(serial);

    const primary = items[0];
    log(`SEND ${primary.contentUri} (${basename(primary.localPath)})`);

    const out = await amStart(
        serial,
        [
            'start',
            '-W',
            '-a',
            'android.intent.action.SEND',
            '-t',
            isVideoMime(primary.mime) ? 'video/mp4' : primary.mime,
            '-n',
            THREADS_SHARE_COMPONENT,
            '--eu',
            'android.intent.extra.STREAM',
            primary.contentUri,
            '--grant-read-uri-permission',
            '-f',
            '0x10000001',
        ],
        25_000
    );

    if (/Error type|does not exist|Exception/i.test(out)) {
        throw new Error(out.trim());
    }

    log(out.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' | ') || 'SEND ok');
    await sleep(1200);

    if (items.length === 1) {
        return { mode: 'send' as const };
    }

    try {
        await attachMediaViaAppiumGallery(serial, items.length, log);
        return { mode: 'send_plus_appium_gallery' as const };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log(`Appium gallery failed: ${msg}`);
        throw new Error(`Multi-media attach failed: ${msg}`);
    }
};

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

const normalizeProxy = (proxy: string) => {
    const value = (proxy || '').trim();
    if (!value || value === PROXY_PLACEHOLDER) return '';
    return value;
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

/** Gõ text qua adb (tránh Appium UnicodeIME lỗi ký tự đặc biệt). */
const typeTextViaAdb = async (serial: string, value: string) => {
    await run(
        `"${MUMU_ADB_PATH}" -s ${serial} shell input text ${escapeAdbText(value)}`,
        { silent: true }
    );
    console.log(`typed: ${value}`);
};

/** Poll xpath đến khi hiện rồi click. */
async function clickByXpath(
    driver: AppiumDriver,
    xpath: string,
    { timeoutMs = 30000, intervalMs = 1000 } = {}
) {
    await driver.setTimeout({ implicit: 0 });
    const deadline = Date.now() + timeoutMs;
    const selector = `xpath:${xpath}`;

    while (Date.now() < deadline) {
        const [el] = await driver.$$(selector);
        if (el) {
            const visible = await el.isDisplayed().catch(() => false);
            if (visible) {
                await el.click();
                console.log(`clicked: ${xpath}`);
                return true;
            }
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        await driver.pause(Math.min(intervalMs, remaining));
    }
    console.log(`timeout waiting for ${xpath}`);
    return false;
}

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
async function clickButtonByText(
    driver: AppiumDriver,
    text: string,
    { timeoutMs = 30000, intervalMs = 1000 } = {}
) {
    await driver.setTimeout({ implicit: 0 });
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const buttons = await driver.$$('id:android:id/button1');
        for (const btn of buttons) {
            const visible = await btn.isDisplayed().catch(() => false);
            if (!visible) continue;
            const t = (await btn.getText().catch(() => '')).trim();
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

/** true nếu đã gán proxy thật (không phải placeholder) */
export const hasAssignedProxy = (proxy?: string | null) => {
    const value = normalizeProxy(proxy || '');
    return value.split(':').length >= 4;
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

/** ADB connect tất cả Android đang running (is_android_started). */
export const connectAllRunningAndroids = async () => {
    const list = await getAndroidList();
    const running = list.filter((item) => item.is_android_started);

    const results = await Promise.all(
        running.map(async (android) => {
            try {
                const serial = await connectAndroid(android);
                return {
                    index: android.index,
                    name: android.name,
                    serial,
                    ok: true as const,
                };
            } catch (error) {
                return {
                    index: android.index,
                    name: android.name,
                    ok: false as const,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        })
    );

    return {
        total: running.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
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

export const setupProxyOnAndroid = async (android: Android, params: SetupProxyParams) => {
    const driver = await remote({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 4723,
        path: '/',
        logLevel: 'warn',
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:udid': getAdbSerial(android),
            'appium:appPackage': 'com.cell47.College_Proxy',
            'appium:appActivity': '.user_interface.MainActivity',
            'appium:noReset': true,
            'appium:forceAppLaunch': true,
        },
    });
    try {
        await driver.setTimeout({ implicit: 0 });

        const addressSel = 'id:com.cell47.College_Proxy:id/editText_address';
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
        if (!formReady) throw new Error('Main form (editText_address) not found');

        await fillIfExists(driver, addressSel, params.address);
        await fillIfExists(driver, 'id:com.cell47.College_Proxy:id/editText_port', params.port);
        await fillIfExists(driver, 'id:com.cell47.College_Proxy:id/editText_username', params.username);
        await fillIfExists(driver, 'id:com.cell47.College_Proxy:id/editText_password', params.password);

        const [startBtn] = await driver.$$('id:com.cell47.College_Proxy:id/proxy_start_button');
        if (startBtn && (await startBtn.isDisplayed().catch(() => false))) {
            await startBtn.click();
            console.log('clicked: proxy_start_button');
        }

        // confirm VPN / START SERVICE
        await clickButtonByText(driver, 'START SERVICE', { timeoutMs: 15000, intervalMs: 1000 });
    } catch (error) {
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

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

export const autoRegisterAccountOnAndroid = async (
    android: Android,
    account: AndroidAccount | null | undefined,
    event: IpcMainEvent
) => {
    const androidInstance = await getAndroid(Number(android.index));
    const acc = account || androidInstance.account;
    const key = androidInstance.name;
    if (!acc?.username || !acc?.password) {
        throw new Error(`Android index ${android.index} chưa có username/password`);
    }

    const serial = await connectAndroid(androidInstance);

    const driver = await remote({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 4723,
        path: '/',
        logLevel: 'warn',
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:udid': serial,
            'appium:noReset': true,
        },
    });

    try {
        sendMessage(event, { username: key, message: 'Đang nhập username...' });
        await clickByXpath(
            driver,
            '//android.view.View[@content-desc="Username, email or mobile number"]'
        );
        await driver.pause(400);
        await typeTextViaAdb(serial, acc.username);

        sendMessage(event, { username: key, message: 'Đang nhập password...' });
        await clickByXpath(driver, '//android.view.View[@content-desc="Password"]');
        await driver.pause(400);
        await typeTextViaAdb(serial, acc.password);

        sendMessage(event, { username: key, message: 'Đang click Log in...' });
        await clickByXpath(driver, '//android.view.View[@content-desc="Log in"]');
        await driver.pause(1000);

        sendMessage(event, { username: key, message: 'Register success ✅' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendMessage(event, { username: key, message: `Register thất bại ❌ ${message}` });
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

/** Auto register đồng thời, mỗi android cách nhau 8 giây khi start */
export const autoRegisterAccountsOnAndroids = async (
    androids: Android[],
    event: IpcMainEvent
) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!android.account?.username || !android.account?.password) {
                throw new Error('Chưa gán account');
            }
            await autoRegisterAccountOnAndroid(android, android.account, event);
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

export const openThreadsAppOnAndroid = async (android: Android, event: IpcMainEvent) => {
    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const serial = await connectAndroid(androidInstance);

    const driver = await remote({
        protocol: 'http',
        hostname: '127.0.0.1',
        port: 4723,
        path: '/',
        logLevel: 'warn',
        capabilities: {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:udid': serial,
            'appium:noReset': true,
        },
    });

    try {
        sendMessage(event, { username: key, message: 'Đang mở Threads...' });
        await driver.execute('mobile: activateApp', { appId: THREADS_PACKAGE });
        console.log('opened Threads');

        sendMessage(event, { username: key, message: 'Đang chờ nút Log in with Instagram...' });
        const clicked = await clickByXpath(
            driver,
            '//android.widget.TextView[@resource-id="ig_text"]',
            { timeoutMs: 60000, intervalMs: 1500 }
        );
        if (!clicked) {
            throw new Error('Timeout chờ nút Log in with Instagram (60s)');
        }
        await driver.pause(3000);
        sendMessage(event, { username: key, message: 'Open Threads success ✅' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendMessage(event, { username: key, message: `Open Threads thất bại ❌ ${message}` });
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

/** Open Threads + tap Login with Instagram, mỗi android cách nhau 3 giây khi start */
export const openThreadsAppOnAndroids = async (androids: Android[], event: IpcMainEvent) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            const android = await getAndroid(Number(selected.index));
            await openThreadsAppOnAndroid(android, event);
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

/** Full setup 1 máy: proxy → open Threads → register */
export const fullSetupOnAndroid = async (android: Android, event: IpcMainEvent) => {
    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const acc = androidInstance.account;

    if (!hasAssignedProxy(acc?.proxy)) {
        throw new Error('Chưa gán proxy');
    }
    if (!acc?.username || !acc?.password) {
        throw new Error('Chưa gán account');
    }

    try {
        sendMessage(event, { username: key, message: 'Full setup: setup proxy...' });
        const [address, port, username, password] = acc.proxy.split(':');
        await setupProxyOnAndroid(androidInstance, { address, port, username, password });

        sendMessage(event, { username: key, message: 'Full setup: open Threads...' });
        await openThreadsAppOnAndroid(androidInstance, event);

        sendMessage(event, { username: key, message: 'Full setup: register...' });
        await autoRegisterAccountOnAndroid(androidInstance, acc, event);

        sendMessage(event, { username: key, message: 'Full setup success ✅' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendMessage(event, { username: key, message: `Full setup thất bại ❌ ${message}` });
        throw error;
    }
};

/** Full setup đồng thời: proxy → Threads → register, mỗi android cách nhau 3s */
export const fullSetupOnAndroids = async (androids: Android[], event: IpcMainEvent) => {
    if (!androids.length) throw new Error('Chưa chọn Android nào');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 3000);
        try {
            const android = await getAndroid(Number(selected.index));
            await fullSetupOnAndroid(android, event);
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

/**
 * Upload media từ PC → New thread (Threads) trên 1 Android.
 *
 * Flow:
 * 0) Xoá hết media cũ trên Android (file + MediaStore)
 * 1) Copy temp ASCII → adb push /sdcard/ThreadsPost/<port>/
 * 2) MediaStore insert/query → content:// URI
 * 3) pm grant READ_MEDIA_* cho Threads
 * 4) am start -W BarcelonaShareHandlerActivity (SEND)
 * 5) nếu >1 file: Appium Gallery chọn đủ media → Done
 */
export const uploadFilesToPost = async (
    android: Android,
    folder: string,
    event?: IpcMainEvent
) => {
    const files = getMediaInFolder(folder);
    if (!files.length) throw new Error('Không tìm thấy file trong folder');

    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const serial = await connectAndroid(androidInstance);
    const port = androidInstance.adb_port;
    if (!port) throw new Error(`Android index ${androidInstance.index} chưa có adb_port`);

    const log = (message: string) => {
        console.log(`[uploadFilesToPost][${key}] ${message}`);
        if (event) sendMessage(event, { username: key, message });
    };

    await clearAllAndroidMedia(serial, log);

    // Push ảnh trước, video sau → mtime video mới hơn → Gallery (newest first) hiện video trước
    const filesForPush = [...files].sort((a, b) => {
        const av = isVideoMime(getMimeType(a)) ? 1 : 0;
        const bv = isVideoMime(getMimeType(b)) ? 1 : 0;
        return av - bv;
    });

    log(`Uploading ${filesForPush.length} file(s) to Threads...`);

    const uploaded: UploadedMedia[] = [];
    for (let i = 0; i < filesForPush.length; i++) {
        const localPath = filesForPush[i];
        log(`Push (${i + 1}/${filesForPush.length}): ${basename(localPath)}`);
        const item = await pushFileToAndroidMedia(serial, port, localPath, i);
        uploaded.push(item);
        log(`MediaStore OK → ${item.contentUri} (${item.remoteName})`);
        await sleep(400);
    }

    // SEND / Appium: video trước, ảnh sau
    uploaded.sort(
        (a, b) => Number(isVideoMime(b.mime)) - Number(isVideoMime(a.mime)) || a.remoteName.localeCompare(b.remoteName)
    );

    log(`Opening Threads composer with ${uploaded.length} media...`);
    const shareResult = await openThreadsComposerWithMedia(serial, uploaded, log);

    await sleep(1200);
    log(`Done (${shareResult.mode}) — check New thread on device`);

    return {
        index: androidInstance.index,
        name: key,
        serial,
        port,
        mode: shareResult.mode,
        files: uploaded,
    };
};

export type UploadFilesToPostItem = {
    android: Android;
    folder: string;
};

/** Upload media → New thread trên nhiều Android (stagger 2s) */
export const uploadFilesToPostOnAndroids = async (
    items: UploadFilesToPostItem[],
    event?: IpcMainEvent
) => {
    if (!items.length) throw new Error('Chưa chọn Android nào');

    const tasks = items.map(async (item, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            if (!item.folder) throw new Error('Chưa gán folder');
            const result = await uploadFilesToPost(item.android, item.folder, event);
            return {
                index: result.index,
                name: result.name,
                ok: true as const,
                fileCount: result.files.length,
            };
        } catch (error) {
            return {
                index: item.android.index,
                name: item.android.name,
                ok: false as const,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });

    const results = await Promise.all(tasks);

    return {
        total: items.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
};

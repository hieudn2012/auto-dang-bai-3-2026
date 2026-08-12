import { exec, execFile } from 'child_process';
import { IpcMainEvent } from 'electron';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { promisify } from 'util';
import { remote } from 'webdriverio';
import { loadMainConfig } from './common';
import { sendMessage } from './event';
import { getMediaInFolder } from './foder';
import { getRandomCaption, getRandomLink } from './caption';

type AppiumDriver = WebdriverIO.Browser;

export interface AndroidAccount {
    username: string;
    password: string;
    twoFa: string;
    cookies: string;
    raw: string;
    // 51.79.132.48:8022:qqk61:o0xji -> address:port:username:password
    // unset → ##proxy##
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
    brand?: string | null;
    model?: string | null;
    imei?: string | null;
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
 * ASCII filename on Android — alpha so Gallery can sort video before image:
 * a00.mp4, a01.mp4, ... then b00.jpg, b01.jpg, ...
 */
const safeRemoteFileName = (filePath: string, index: number) => {
    const ext = extname(filePath).toLowerCase() || '.bin';
    const prefix = isVideoMime(getMimeType(filePath)) ? 'a' : 'b';
    return `${prefix}${String(index).padStart(2, '0')}${ext}`;
};

/** adb via argv — avoid quote/Unicode path issues on Windows */
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
    // Single shell command to preserve quotes
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
 * Delete all media on Android before upload (files + MediaStore),
 * so Gallery only shows the files just pushed.
 */
const clearAllAndroidMedia = async (serial: string, log: (msg: string) => void) => {
    log('Clearing all media on Android...');

    // Common media folders + app upload dir
    await adbFileSoft(serial, [
        'shell',
        'rm -rf /sdcard/ThreadsPost' +
        ' /sdcard/DCIM/* /sdcard/Pictures/* /sdcard/Movies/* /sdcard/Download/* /sdcard/Camera/*' +
        ' /storage/emulated/0/DCIM/* /storage/emulated/0/Pictures/*' +
        ' /storage/emulated/0/Movies/* /storage/emulated/0/Download/*' +
        ' 2>/dev/null; true',
    ]).catch(() => '');

    // Sweep leftover image/video files
    await adbFileSoft(serial, [
        'shell',
        "find /sdcard /storage/emulated/0 -type f" +
        " \\( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp'" +
        " -o -iname '*.gif' -o -iname '*.heic' -o -iname '*.bmp'" +
        " -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.webm' -o -iname '*.mkv'" +
        " -o -iname '*.3gp' -o -iname '*.avi' -o -iname '*.m4v' \\)" +
        ' -delete 2>/dev/null; true',
    ]).catch(() => '');

    // Clear MediaStore entries so Gallery has no stale cache
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
 * Threads Gallery sorts by date (newest → oldest), not by name.
 * Video needs a higher date than image to appear first.
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

    // Unique per device/run — avoid race when many Androids push a00/b00 at once
    const tmpLocal = join(
        tmpdir(),
        `threads-${port}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}${extname(localPath).toLowerCase() || '.bin'}`
    );
    await fs.copyFile(localPath, tmpLocal);

    try {
        await adbFile(serial, ['shell', 'mkdir', '-p', remoteDir]);
        await adbFile(serial, ['push', tmpLocal, remotePath], { silent: false });

        // file mtime → MediaScanner / Gallery prefer video (higher date)
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

        // Re-apply date after scan (scanner often overwrites with mtime/now)
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
 * In an open composer: Gallery → select video first, then image → Done.
 * Reuses the current Appium session (does not create a new one).
 */
const selectMediaInGallery = async (
    driver: AppiumDriver,
    totalMedia: number,
    log: (msg: string) => void
) => {
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
        .sort((a, b) => a.kind - b.kind || a.desc.localeCompare(b.desc));
    const targets = pool.slice(0, totalMedia);

    if (!targets.length) throw new Error('No gallery thumbnails to select');

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
};

// info RPC may cache stale name while instance is running — read playerName from config
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

/** Read phone brand/model/imei from MuMu customer_config.json (setting.phone). */
const getBrandModelFromConfig = async (index: string, androidVersion = '15.0') => {
    try {
        const configPath = join(
            MUMU_VMS_PATH,
            `MuMuPlayerGlobal-${androidVersion}-${index}`,
            'configs',
            'customer_config.json'
        );
        const raw = await fs.readFile(configPath, 'utf8');
        const cfg = JSON.parse(raw) as {
            setting?: {
                phone?: { brand?: string; model?: string; manufacturer?: string; imei?: string };
            };
            phone?: { brand?: string; model?: string; imei?: string };
        };
        const phone = cfg.setting?.phone || cfg.phone;
        const brand = String(phone?.brand || '').trim();
        const model = String(phone?.model || '').trim();
        const imei = String(phone?.imei || '').trim();
        return {
            brand: brand || null,
            model: model || null,
            imei: imei || null,
        };
    } catch {
        return { brand: null, model: null, imei: null };
    }
};

const normalizeProxy = (proxy: string) => {
    const value = (proxy || '').trim();
    if (!value || value === PROXY_PLACEHOLDER) return '';
    return value;
};

/** Parse accountRaw: user|password|2fa|cookies[|proxy] — ##proxy## means unassigned */
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

/** Keep 1 line per name (name--...). Later lines overwrite earlier — no duplicates. */
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

/** Read outputAccount/account.txt -> Map<name, AndroidAccount> */
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
        // missing file / folder not set -> skip
    }
    return map;
};

const getAdbSerial = (android: Android) => {
    if (!android.adb_host_ip || !android.adb_port) {
        throw new Error(`Android index ${android.index} has no ADB address`);
    }
    return `${android.adb_host_ip}:${android.adb_port}`;
};

const connectAndroid = async (android: Android) => {
    const serial = getAdbSerial(android);
    await run(`"${MUMU_ADB_PATH}" connect ${serial}`);
    return serial;
};

/**
 * Escape a single char for `adb shell input text` (argv via execFile — no Windows % env expansion).
 * Spaces must NOT use %s here; use KEYCODE_SPACE instead.
 */
const escapeAdbChar = (ch: string) => {
    if (/[\\'"&<>|;()#*]/.test(ch)) return `\\${ch}`;
    return ch;
};

const randomTypingDelayMs = (ch: string) => {
    if (ch === ' ' || ch === '\n') return 90 + Math.floor(Math.random() * 140);
    if (/[.,!?;:]/.test(ch)) return 120 + Math.floor(Math.random() * 180);
    return 35 + Math.floor(Math.random() * 85);
};

/**
 * Type text char-by-char via adb (human-like), not paste.
 * Fixes Windows cmd eating `%s` when spaces were encoded that way.
 */
const typeTextViaAdb = async (serial: string, value: string) => {
    const text = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text) return;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === ' ') {
            await adbFile(serial, ['shell', 'input', 'keyevent', '62']); // SPACE
        } else if (ch === '\n') {
            await adbFile(serial, ['shell', 'input', 'keyevent', '66']); // ENTER
        } else if (ch === '\t') {
            await adbFile(serial, ['shell', 'input', 'keyevent', '61']); // TAB
        } else {
            // One char per call — realistic typing; execFile avoids cmd % expansion
            await adbFile(serial, ['shell', 'input', 'text', escapeAdbChar(ch)]);
        }

        await sleep(randomTypingDelayMs(ch));
    }

    console.log(`typed (${text.length} chars): ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
};

const pressEnterViaAdb = async (serial: string) => {
    await adbFile(serial, ['shell', 'input', 'keyevent', '66']);
};

/** Paste text (more reliable than input text for URLs with : / ? &). */
const pasteTextViaClipboard = async (driver: AppiumDriver, serial: string, value: string) => {
    const base64 = Buffer.from(value, 'utf8').toString('base64');
    await driver.setClipboard(base64, 'plaintext');
    await adbFile(serial, ['shell', 'input', 'keyevent', '279']); // KEYCODE_PASTE
    console.log(`pasted: ${value}`);
};

/** Force-stop and reopen Threads (cold start). */
const reloadThreadsFresh = async (driver: AppiumDriver, log: (msg: string) => void) => {
    log('Reload Threads (terminate → activate)...');
    await driver.execute('mobile: terminateApp', { appId: THREADS_PACKAGE }).catch(() => undefined);
    await sleep(800);
    await driver.execute('mobile: activateApp', { appId: THREADS_PACKAGE });
    await driver.pause(3500);
};

/** Swipe up so profile feed content moves up (reveals buttons covered by tab bar). */
const swipeProfileUp = async (driver: AppiumDriver, serial: string) => {
    try {
        const { width, height } = await driver.getWindowSize();
        await driver.execute('mobile: swipeGesture', {
            left: Math.floor(width * 0.2),
            top: Math.floor(height * 0.35),
            width: Math.floor(width * 0.6),
            height: Math.floor(height * 0.4),
            direction: 'up',
            percent: 0.45,
        });
    } catch {
        // Fallback via adb (coords work on typical MuMu window)
        await adbFile(serial, ['shell', 'input', 'swipe', '540', '1400', '540', '900', '350']).catch(
            () => undefined
        );
    }
};

/**
 * Click xpath; if covered / not clickable, swipe up and retry.
 * Use for profile feed actions (Repost, etc.) hidden under bottom tabs.
 */
async function clickByXpathWithScroll(
    driver: AppiumDriver,
    serial: string,
    xpath: string,
    log: (msg: string) => void,
    { timeoutMs = 25000, maxSwipes = 5 } = {}
) {
    await driver.setTimeout({ implicit: 0 });
    const deadline = Date.now() + timeoutMs;
    const selector = `xpath:${xpath}`;
    let swipes = 0;

    while (Date.now() < deadline) {
        const [el] = await driver.$$(selector);
        if (el) {
            const visible = await el.isDisplayed().catch(() => false);
            if (visible) {
                try {
                    // Prefer center click; fails / no-op when covered by tab bar
                    await el.click();
                    console.log(`clicked: ${xpath}`);
                    return true;
                } catch (error) {
                    log(`Click blocked, will scroll: ${error instanceof Error ? error.message : error}`);
                }
            }
        }

        if (swipes >= maxSwipes) break;
        swipes += 1;
        log(`Scroll to reveal ${xpath} (${swipes}/${maxSwipes})...`);
        await swipeProfileUp(driver, serial);
        await driver.pause(700);
    }

    console.log(`timeout waiting/scrolling for ${xpath}`);
    return false;
}

/** Poll xpath until visible, then click. */
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
    await el.clearValue().catch(() => { });
    await el.setValue(value);
    console.log(`filled ${selector} = ${value}`);
    return true;
}

/** Poll android:id/button1 by text until visible, then click. */
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

/** true if a real proxy is assigned (not the placeholder) */
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

    // MuMu returns object {"0": {...}, "1": {...}} -> array + merge account by name
    return Promise.all(
        Object.entries(data).map(async ([key, value]) => {
            const index = value.index ?? key;
            const androidVersion = value.android_version || '15.0';
            const [playerName, device] = await Promise.all([
                getPlayerNameFromConfig(index, androidVersion),
                getBrandModelFromConfig(index, androidVersion),
            ]);
            const name = playerName || value.name;
            return {
                ...value,
                index,
                name,
                brand: device.brand,
                model: device.model,
                imei: device.imei,
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

const PHONE_PRESETS: { brand: string; model: string; manufacturer: string }[] = [
    // Samsung
    { brand: 'Samsung', model: 'Galaxy A14', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A15', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A23', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A24', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A34', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A54', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy A55', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy M14', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy M34', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S21', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S22', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S23', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S23 FE', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S24', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy S24 Ultra', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy Z Flip5', manufacturer: 'Samsung' },
    { brand: 'Samsung', model: 'Galaxy Z Fold5', manufacturer: 'Samsung' },
    // Xiaomi / Redmi / POCO
    { brand: 'Xiaomi', model: '13', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: '13T', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: '14', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: '14T', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi 12', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi 13C', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi Note 11', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi Note 12', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi Note 12 Pro', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi Note 13', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'Redmi Note 13 Pro', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'POCO X5', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'POCO X6', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'POCO F5', manufacturer: 'Xiaomi' },
    { brand: 'Xiaomi', model: 'POCO M6 Pro', manufacturer: 'Xiaomi' },
    // Google
    { brand: 'Google', model: 'Pixel 6a', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 7', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 7a', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 7 Pro', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 8', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 8a', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 8 Pro', manufacturer: 'Google' },
    { brand: 'Google', model: 'Pixel 9', manufacturer: 'Google' },
    // OPPO
    { brand: 'OPPO', model: 'A58', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'A78', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'A98', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'Reno8', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'Reno10', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'Reno11', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'Find X5', manufacturer: 'OPPO' },
    { brand: 'OPPO', model: 'Find X6', manufacturer: 'OPPO' },
    // vivo
    { brand: 'vivo', model: 'Y22', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'Y27', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'Y36', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'V25', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'V27', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'V29', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'X90', manufacturer: 'vivo' },
    { brand: 'vivo', model: 'X100', manufacturer: 'vivo' },
    // OnePlus
    { brand: 'OnePlus', model: 'Nord CE 2', manufacturer: 'OnePlus' },
    { brand: 'OnePlus', model: 'Nord CE 3', manufacturer: 'OnePlus' },
    { brand: 'OnePlus', model: 'Nord 3', manufacturer: 'OnePlus' },
    { brand: 'OnePlus', model: '11', manufacturer: 'OnePlus' },
    { brand: 'OnePlus', model: '12', manufacturer: 'OnePlus' },
    { brand: 'OnePlus', model: '12R', manufacturer: 'OnePlus' },
    // Realme
    { brand: 'Realme', model: 'C53', manufacturer: 'realme' },
    { brand: 'Realme', model: 'C55', manufacturer: 'realme' },
    { brand: 'Realme', model: 'C67', manufacturer: 'realme' },
    { brand: 'Realme', model: '10', manufacturer: 'realme' },
    { brand: 'Realme', model: '11', manufacturer: 'realme' },
    { brand: 'Realme', model: '11 Pro', manufacturer: 'realme' },
    { brand: 'Realme', model: '12 Pro', manufacturer: 'realme' },
    { brand: 'Realme', model: 'GT Neo 5', manufacturer: 'realme' },
    // Huawei / Honor
    { brand: 'Huawei', model: 'nova 10', manufacturer: 'HUAWEI' },
    { brand: 'Huawei', model: 'nova 11', manufacturer: 'HUAWEI' },
    { brand: 'Huawei', model: 'nova 12', manufacturer: 'HUAWEI' },
    { brand: 'Huawei', model: 'P60', manufacturer: 'HUAWEI' },
    { brand: 'Huawei', model: 'Mate 50', manufacturer: 'HUAWEI' },
    { brand: 'Honor', model: 'X8', manufacturer: 'HONOR' },
    { brand: 'Honor', model: 'X9a', manufacturer: 'HONOR' },
    { brand: 'Honor', model: '90', manufacturer: 'HONOR' },
    { brand: 'Honor', model: 'Magic5', manufacturer: 'HONOR' },
    // Motorola
    { brand: 'Motorola', model: 'moto g54', manufacturer: 'motorola' },
    { brand: 'Motorola', model: 'moto g84', manufacturer: 'motorola' },
    { brand: 'Motorola', model: 'moto edge 40', manufacturer: 'motorola' },
    { brand: 'Motorola', model: 'moto edge 50', manufacturer: 'motorola' },
    // Sony
    { brand: 'Sony', model: 'Xperia 1 V', manufacturer: 'Sony' },
    { brand: 'Sony', model: 'Xperia 5 V', manufacturer: 'Sony' },
    { brand: 'Sony', model: 'Xperia 10 V', manufacturer: 'Sony' },
    // Nothing / Asus / Tecno / Infinix
    { brand: 'Nothing', model: 'Phone (1)', manufacturer: 'Nothing' },
    { brand: 'Nothing', model: 'Phone (2)', manufacturer: 'Nothing' },
    { brand: 'Nothing', model: 'Phone (2a)', manufacturer: 'Nothing' },
    { brand: 'Asus', model: 'Zenfone 10', manufacturer: 'asus' },
    { brand: 'Asus', model: 'ROG Phone 7', manufacturer: 'asus' },
    { brand: 'Tecno', model: 'Spark 20', manufacturer: 'TECNO' },
    { brand: 'Tecno', model: 'Camon 20', manufacturer: 'TECNO' },
    { brand: 'Infinix', model: 'Hot 40', manufacturer: 'INFINIX' },
    { brand: 'Infinix', model: 'Note 30', manufacturer: 'INFINIX' },
    // TCL / Nokia
    { brand: 'Tcl', model: 'Alcatel 1', manufacturer: 'TCL' },
    { brand: 'Tcl', model: '40 SE', manufacturer: 'TCL' },
    { brand: 'Nokia', model: 'G22', manufacturer: 'HMD Global' },
    { brand: 'Nokia', model: 'G42', manufacturer: 'HMD Global' },
    { brand: 'Nokia', model: 'X30', manufacturer: 'HMD Global' },
];

/**
 * MuMu IMEI format: 15 digits like 869874033636000
 * = prefix 86987403 + 7 random digits (no Luhn).
 */
const generateRandomImei = () => {
    const prefix = '86987403';
    const rand = Math.floor(Math.random() * 10_000_000);
    return `${prefix}${String(rand).padStart(7, '0')}`;
};

const customerConfigPath = (index: string, androidVersion = '15.0') =>
    join(MUMU_VMS_PATH, `MuMuPlayerGlobal-${androidVersion}-${index}`, 'configs', 'customer_config.json');

const writePhoneIdentityToConfig = async (
    index: string,
    androidVersion: string,
    phone: { brand: string; model: string; manufacturer: string; imei: string }
) => {
    const configPath = customerConfigPath(index, androidVersion);
    const raw = await fs.readFile(configPath, 'utf8');
    const cfg = JSON.parse(raw) as Record<string, any>;
    if (!cfg.setting) cfg.setting = {};
    if (!cfg.setting.phone) cfg.setting.phone = {};
    cfg.setting.phone.brand = phone.brand;
    cfg.setting.phone.model = phone.model;
    cfg.setting.phone.manufacturer = phone.manufacturer;
    cfg.setting.phone.imei = phone.imei;
    await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf8');
};

const setSimulationProp = (index: string | number, key: string, value: string) =>
    runMuMu(`simulation -v ${index} -sk ${key} -sv "${value.replace(/"/g, '\\"')}"`);

/**
 * Randomize MuMu phone identity: brand + model + imei
 * via MuMuManager simulation + customer_config.json
 */
export const randomDeviceIdentity = async (androidOrIndex: Android | string | number) => {
    const index =
        typeof androidOrIndex === 'object' ? String(androidOrIndex.index) : String(androidOrIndex);
    const list = await getAndroidList();
    const android = list.find((item) => String(item.index) === index);
    if (!android) throw new Error(`Android index ${index} not found`);

    const androidVersion = android.android_version || '15.0';
    const preset = PHONE_PRESETS[Math.floor(Math.random() * PHONE_PRESETS.length)];
    const imei = generateRandomImei();

    await setSimulationProp(index, 'brand', preset.brand);
    await setSimulationProp(index, 'model', preset.model);
    await setSimulationProp(index, 'imei', imei);

    try {
        await writePhoneIdentityToConfig(index, androidVersion, { ...preset, imei });
    } catch (error) {
        console.warn('Failed to sync customer_config.json phone identity:', error);
    }

    return {
        index,
        name: android.name,
        brand: preset.brand,
        model: preset.model,
        imei,
    };
};

/** Random device identity for multiple Androids */
export const randomDeviceIdentityOnAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('No Android selected');

    const results = [];
    for (const android of androids) {
        try {
            const identity = await randomDeviceIdentity(android);
            results.push({ ...identity, ok: true as const });
        } catch (error) {
            results.push({
                index: android.index,
                name: android.name,
                ok: false as const,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return {
        total: androids.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
    };
};

/**
 * Assign accounts from inputAccount/account.txt to selected androids (in order).
 * Input:  user|password|2fa|cookies[|proxy]
 * Output: name--user|password|2fa|cookies|proxy  (append/overwrite by name, no duplicates)
 * proxy is optional; if missing use ##proxy##
 * After assign: remove used lines from input. Existing names in output are overwritten.
 */
export const assignAccountsToAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('No Android selected');

    const config = await loadMainConfig();
    const inputDir = config?.android?.inputAccount;
    const outputDir = config?.android?.outputAccount;
    if (!inputDir) throw new Error('Input Account folder is not set');
    if (!outputDir) throw new Error('Output Account folder is not set');

    const inputPath = join(inputDir, ACCOUNT_FILE);
    const outputPath = join(outputDir, ACCOUNT_FILE);

    let inputRaw = '';
    try {
        inputRaw = await fs.readFile(inputPath, 'utf8');
    } catch {
        throw new Error(`Cannot read file: ${inputPath}`);
    }

    const inputLines = inputRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (inputLines.length < androids.length) {
        throw new Error(
            `Not enough accounts: need ${androids.length}, only ${inputLines.length} left in input`
        );
    }

    // Get latest name (playerName) by index
    const latestList = await getAndroidList();
    const assignedLines: string[] = [];
    for (let i = 0; i < androids.length; i++) {
        const selected = androids[i];
        const latest = latestList.find((item) => item.index === selected.index) || selected;
        const parsed = parseAccountRaw(inputLines[i]);
        // no real proxy yet -> write ##proxy##
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
    // overwrite existing name and remove duplicate name--
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
 * Assign proxies from proxyFolder/proxy.txt to selected androids (in order).
 * Each line: address:port:username:password  (e.g. 51.79.132.48:8022:qqk61:o0xji)
 * Output line: name--user|password|2fa|cookies|proxy
 * Replace ##proxy## (or old proxy) with the new one. Cycle if not enough lines.
 */
export const assignProxiesToAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('No Android selected');

    const config = await loadMainConfig();
    const outputDir = config?.android?.outputAccount;
    const proxyDir = config?.android?.proxyFolder;
    if (!outputDir) throw new Error('Output Account folder is not set');
    if (!proxyDir) throw new Error('Proxy Folder is not set');

    const proxyFilePath = join(proxyDir, 'proxy.txt');
    let proxyLines: string[] = [];
    try {
        const raw = await fs.readFile(proxyFilePath, 'utf8');
        proxyLines = raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    } catch {
        throw new Error(`Cannot read file: ${proxyFilePath}`);
    }
    if (!proxyLines.length) throw new Error('proxy.txt has no proxy lines');

    const invalid = proxyLines.find((line) => !hasAssignedProxy(line));
    if (invalid) {
        throw new Error(`Invalid proxy format (need address:port:user:pass): ${invalid}`);
    }

    const outputPath = join(outputDir, ACCOUNT_FILE);
    let outputRaw = '';
    try {
        outputRaw = await fs.readFile(outputPath, 'utf8');
    } catch {
        throw new Error(`Cannot read file: ${outputPath}`);
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
            throw new Error(`Android "${latest.name}" has no account in output`);
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
 * Read outputAccount/account.txt -> write export.txt
 * Strip name-- and proxy field → leave user|password|2fa|cookies
 */
export const exportAccountsFromOutput = async () => {
    const config = await loadMainConfig();
    const outputDir = config?.android?.outputAccount;
    if (!outputDir) throw new Error('Output Account folder is not set');

    const inputPath = join(outputDir, ACCOUNT_FILE);
    const exportPath = join(outputDir, EXPORT_FILE);

    let raw = '';
    try {
        raw = await fs.readFile(inputPath, 'utf8');
    } catch {
        throw new Error(`Cannot read file: ${inputPath}`);
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

/** ADB-connect all running Androids (is_android_started). */
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

// install apk (supports .apk and .xapk)
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
            if (!apkFiles.length) throw new Error(`XAPK contains no .apk file: ${apkPath}`);

            // prefer base apk (not config.*.apk)
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
            console.log(`Package ${packageName} not installed, skip`);
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

/** Setup proxies in parallel; stagger each android start by 8s */
export const setupProxiesOnAndroids = async (androids: Android[]) => {
    if (!androids.length) throw new Error('No Android selected');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 3000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!hasAssignedProxy(android.account?.proxy)) {
                throw new Error('Proxy not assigned');
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
        throw new Error(`Android index ${android.index} has no username/password`);
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
        sendMessage(event, { username: key, message: 'Entering username...' });
        await clickByXpath(
            driver,
            '//android.view.View[@content-desc="Username, email or mobile number"]'
        );
        await driver.pause(400);
        await typeTextViaAdb(serial, acc.username);

        sendMessage(event, { username: key, message: 'Entering password...' });
        await clickByXpath(driver, '//android.view.View[@content-desc="Password"]');
        await driver.pause(400);
        await typeTextViaAdb(serial, acc.password);

        sendMessage(event, { username: key, message: 'Clicking Log in...' });
        await clickByXpath(driver, '//android.view.View[@content-desc="Log in"]');
        await driver.pause(1000);

        sendMessage(event, { username: key, message: 'Register success ✅' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendMessage(event, { username: key, message: `Register failed ❌ ${message}` });
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

/** Auto-register in parallel; stagger each android start by 8s */
export const autoRegisterAccountsOnAndroids = async (
    androids: Android[],
    event: IpcMainEvent
) => {
    if (!androids.length) throw new Error('No Android selected');

    const tasks = androids.map(async (selected, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            const android = await getAndroid(Number(selected.index));
            if (!android.account?.username || !android.account?.password) {
                throw new Error('Account not assigned');
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
        sendMessage(event, { username: key, message: 'Opening Threads...' });
        await driver.execute('mobile: activateApp', { appId: THREADS_PACKAGE });
        console.log('opened Threads');

        sendMessage(event, { username: key, message: 'Waiting for Log in with Instagram button...' });
        const clicked = await clickByXpath(
            driver,
            '//android.widget.TextView[@resource-id="ig_text"]',
            { timeoutMs: 60000, intervalMs: 1500 }
        );
        if (!clicked) {
            throw new Error('Timeout waiting for Log in with Instagram button (60s)');
        }
        await driver.pause(3000);
        sendMessage(event, { username: key, message: 'Open Threads success ✅' });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendMessage(event, { username: key, message: `Open Threads failed ❌ ${message}` });
        console.error(error);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

/** Open Threads + tap Login with Instagram; stagger each android start by 3s */
export const openThreadsAppOnAndroids = async (androids: Android[], event: IpcMainEvent) => {
    if (!androids.length) throw new Error('No Android selected');

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

/** Full setup for one device: proxy → open Threads → register */
export const fullSetupOnAndroid = async (android: Android, event: IpcMainEvent) => {
    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const acc = androidInstance.account;

    if (!hasAssignedProxy(acc?.proxy)) {
        throw new Error('Proxy not assigned');
    }
    if (!acc?.username || !acc?.password) {
        throw new Error('Account not assigned');
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
        sendMessage(event, { username: key, message: `Full setup failed ❌ ${message}` });
        throw error;
    }
};

/** Full setup in parallel: proxy → Threads → register; stagger each android by 3s */
export const fullSetupOnAndroids = async (androids: Android[], event: IpcMainEvent) => {
    if (!androids.length) throw new Error('No Android selected');

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
 * Create a new Threads post on one Android.
 *
 * Flow:
 * 0) Clear old media + push files to device
 * 1) Appium: open Threads → Create → type caption
 * 2) Appium: Gallery → select video → image → Done → Post
 */
export const createPost = async (
    android: Android,
    folder: string,
    event?: IpcMainEvent
) => {
    const files = getMediaInFolder(folder);
    if (!files.length) throw new Error('No media files found in folder');

    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const serial = await connectAndroid(androidInstance);
    const port = androidInstance.adb_port;
    if (!port) throw new Error(`Android index ${androidInstance.index} has no adb_port`);

    const log = (message: string) => {
        console.log(`[createPost][${key}] ${message}`);
        if (event) sendMessage(event, { username: key, message });
    };

    await clearAllAndroidMedia(serial, log);

    // Push images first, video last → newer video mtime → Gallery (newest first) shows video first
    const filesForPush = [...files].sort((a, b) => {
        const av = isVideoMime(getMimeType(a)) ? 1 : 0;
        const bv = isVideoMime(getMimeType(b)) ? 1 : 0;
        return av - bv;
    });

    log(`Pushing ${filesForPush.length} file(s) to device...`);

    const uploaded: UploadedMedia[] = [];
    for (let i = 0; i < filesForPush.length; i++) {
        const localPath = filesForPush[i];
        log(`Push (${i + 1}/${filesForPush.length})`);
        const item = await pushFileToAndroidMedia(serial, port, localPath, i);
        uploaded.push(item);
        log(`MediaStore OK → ${item.contentUri} (${item.remoteName})`);
        await sleep(400);
    }

    await grantThreadsMediaPermission(serial);

    const driver = await createAppiumDriver(serial);
    try {
        log('Open Threads → Create...');
        await driver.execute('mobile: activateApp', { appId: THREADS_PACKAGE });
        await driver.pause(3000);

        const createOpened = await clickByXpath(
            driver,
            '//android.view.View[@resource-id="barcelona_tab_create"]/android.view.View[2]',
            { timeoutMs: 20000, intervalMs: 800 }
        );
        if (!createOpened) throw new Error('Cannot open Create / New thread');
        await driver.pause(1000);

        const caption = getRandomCaption(folder);
        if (caption) {
            log(`Caption typed (${caption.length} chars)`);
            await pasteTextViaClipboard(driver, serial, caption);
            await driver.pause(800);
        }

        log(`Attach ${uploaded.length} media via Gallery (no SEND)...`);
        await selectMediaInGallery(driver, uploaded.length, log);

        await sleep(1200);
        log('Done (appium_gallery) — check New thread on device');

        //android.widget.TextView[@resource-id="ig_text" and @text="Post"]
        const post = await clickByXpath(driver, '//android.widget.TextView[@resource-id="ig_text" and @text="Post"]');
        if (!post) throw new Error('Cannot tap Post');
        await driver.pause(1500);

        return {
            index: androidInstance.index,
            name: key,
            serial,
            port,
            mode: 'appium_gallery' as const,
            files: uploaded,
        };
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

export type CreatePostItem = {
    android: Android;
    folder: string;
};

/** Create new post on multiple Androids (stagger 2s) */
export const createPostOnAndroids = async (
    items: CreatePostItem[],
    event?: IpcMainEvent
) => {
    if (!items.length) throw new Error('No Android selected');

    const tasks = items.map(async (item, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            if (!item.folder) throw new Error('Folder not assigned');
            const result = await createPost(item.android, item.folder, event);
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

/**
 * Edit the latest post on profile:
 * 1) Reload Threads (cold start)
 * 2) Profile tab
 * 3) More (latest post)
 * 4) Edit
 * 5) Enter new line + paste link
 * 6) Post
 */
export const editLatestPost = async (
    android: Android,
    folder: string,
    event?: IpcMainEvent
) => {
    const link = getRandomLink(folder);
    if (!link) throw new Error('No link found in folder (link.txt)');

    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const serial = await connectAndroid(androidInstance);

    const log = (message: string) => {
        console.log(`[editLatestPost][${key}] ${message}`);
        if (event) sendMessage(event, { username: key, message });
    };

    const driver = await createAppiumDriver(serial);
    try {
        await reloadThreadsFresh(driver, log);

        log('Open Profile tab...');
        const profileOpened = await clickByXpath(
            driver,
            '//android.view.View[@resource-id="barcelona_tab_profile"]/android.view.View[2]',
            { timeoutMs: 25000, intervalMs: 800 }
        );
        if (!profileOpened) throw new Error('Cannot open Profile tab');
        await driver.pause(2000);

        log('Open more menu (latest post)...');
        const moreOpened = await clickByXpath(
            driver,
            '//android.view.View[@resource-id="feed_post_action_menu_button"]/android.widget.Button',
            { timeoutMs: 20000, intervalMs: 800 }
        );
        if (!moreOpened) throw new Error('Cannot tap more menu on latest post');
        await driver.pause(1000);

        log('Tap Edit...');
        const editOpened =
            (await clickByXpath(
                driver,
                '//android.widget.ScrollView/android.view.View[2]/android.view.View[3]/android.view.View[@resource-id="BdsListCell"]/android.widget.Button',
                { timeoutMs: 10000, intervalMs: 500 }
            )) ||
            (await clickByXpath(driver, '//*[@text="Edit"]', { timeoutMs: 5000, intervalMs: 400 }));
        if (!editOpened) throw new Error('Cannot tap Edit');
        await driver.pause(1500);

        log(`Append link on new line: ${link}`);
        await pressEnterViaAdb(serial);
        await sleep(300);
        await pasteTextViaClipboard(driver, serial, `Product link: ${link}`);
        await driver.pause(800);

        log('Tap Post...');
        const posted = await clickByXpath(
            driver,
            '//android.widget.TextView[@resource-id="ig_text" and @text="Post"]',
            { timeoutMs: 15000, intervalMs: 500 }
        );
        if (!posted) throw new Error('Cannot tap Post');
        await driver.pause(1500);

        log('Edit post success ✅');
        return {
            index: androidInstance.index,
            name: key,
            serial,
            link,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Edit post failed ❌ ${message}`);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

export type EditLatestPostItem = {
    android: Android;
    folder: string;
};

/** Edit latest post on multiple Androids (stagger 2s) */
export const editLatestPostOnAndroids = async (
    items: EditLatestPostItem[],
    event?: IpcMainEvent
) => {
    if (!items.length) throw new Error('No Android selected');

    const tasks = items.map(async (item, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            if (!item.folder) throw new Error('Folder not assigned');
            const result = await editLatestPost(item.android, item.folder, event);
            return {
                index: result.index,
                name: result.name,
                ok: true as const,
                link: result.link,
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

const pushFolderMedia = async (
    serial: string,
    port: number | string,
    folder: string,
    log: (msg: string) => void
) => {
    const files = getMediaInFolder(folder);
    if (!files.length) throw new Error('No media files found in folder');

    await clearAllAndroidMedia(serial, log);

    const filesForPush = [...files].sort((a, b) => {
        const av = isVideoMime(getMimeType(a)) ? 1 : 0;
        const bv = isVideoMime(getMimeType(b)) ? 1 : 0;
        return av - bv;
    });

    log(`Pushing ${filesForPush.length} file(s) to device...`);
    const uploaded: UploadedMedia[] = [];
    for (let i = 0; i < filesForPush.length; i++) {
        const localPath = filesForPush[i];
        log(`Push (${i + 1}/${filesForPush.length})`);
        const item = await pushFileToAndroidMedia(serial, port, localPath, i);
        uploaded.push(item);
        log(`MediaStore OK → ${item.contentUri} (${item.remoteName})`);
        await sleep(400);
    }

    await grantThreadsMediaPermission(serial);
    return uploaded;
};

/**
 * Quote/repost the latest profile post:
 * 1) Reload Threads (cold start)
 * 2) Profile tab
 * 3) Repost on latest post
 * 4) Quote
 * 5) Caption
 * 6) Upload media via Gallery
 * 7) Post
 */
export const quoteLatestPost = async (
    android: Android,
    folder: string,
    event?: IpcMainEvent
) => {
    const androidInstance = await getAndroid(Number(android.index));
    const key = androidInstance.name;
    const serial = await connectAndroid(androidInstance);
    const port = androidInstance.adb_port;
    if (!port) throw new Error(`Android index ${androidInstance.index} has no adb_port`);

    const log = (message: string) => {
        console.log(`[quoteLatestPost][${key}] ${message}`);
        if (event) sendMessage(event, { username: key, message });
    };

    const uploaded = await pushFolderMedia(serial, port, folder, log);

    const driver = await createAppiumDriver(serial);
    try {
        await reloadThreadsFresh(driver, log);

        log('Open Profile tab...');
        const profileOpened = await clickByXpath(
            driver,
            '//android.view.View[@resource-id="barcelona_tab_profile"]/android.view.View[2]',
            { timeoutMs: 25000, intervalMs: 800 }
        );
        if (!profileOpened) throw new Error('Cannot open Profile tab');
        await driver.pause(2000);

        // Tap center of first FeedPostRow to open post detail
        const postXpath =
            '(//android.view.View[@resource-id="IgLazyColumn"]/android.view.View[@resource-id="FeedPostRow"])[1]';
        const postEl = await driver.$(`xpath:${postXpath}`);
        await postEl.waitForDisplayed({ timeout: 20000 });
        const loc = await postEl.getLocation();
        const size = await postEl.getSize();
        const cx = Math.floor(loc.x + size.width / 2);
        const cy = Math.floor(loc.y + size.height / 2);
        log(`Tap first post center @ (${cx},${cy}) size=${size.width}x${size.height}`);
        try {
            await driver.execute('mobile: clickGesture', { x: cx, y: cy });
        } catch {
            await adbFile(serial, ['shell', 'input', 'tap', String(cx), String(cy)]);
        }
        await driver.pause(2000);

        // First post actions are often under the bottom tab bar — scroll into view first
        log('Scroll profile to reveal Repost...');
        await swipeProfileUp(driver, serial);
        await driver.pause(600);

        log('Tap Repost on latest post...');
        const repostOpened = await clickByXpathWithScroll(
            driver,
            serial,
            '//android.widget.Button[@content-desc="Repost"]',
            log,
            { timeoutMs: 25000, maxSwipes: 5 }
        );
        if (!repostOpened) throw new Error('Cannot tap Repost on latest post');
        await driver.pause(1000);

        log('Tap Quote...');
        const quoteOpened = await clickByXpath(
            driver,
            '//android.widget.TextView[@resource-id="ig_text" and @text="Quote"]',
            { timeoutMs: 15000, intervalMs: 500 }
        );
        if (!quoteOpened) throw new Error('Cannot tap Quote');
        await driver.pause(1500);

        const caption = getRandomCaption(folder);
        if (caption) {
            log(`Caption typed (${caption.length} chars)`);
            await pasteTextViaClipboard(driver, serial, caption);
            await driver.pause(800);
        }

        log(`Attach ${uploaded.length} media via Gallery...`);
        await selectMediaInGallery(driver, uploaded.length, log);
        await driver.pause(800);

        log('Tap Post...');
        const posted = await clickByXpath(
            driver,
            '//android.widget.TextView[@resource-id="ig_text" and @text="Post"]',
            { timeoutMs: 15000, intervalMs: 500 }
        );
        if (!posted) throw new Error('Cannot tap Post');
        await driver.pause(1500);

        log('Quote/repost success ✅');
        return {
            index: androidInstance.index,
            name: key,
            serial,
            port,
            fileCount: uploaded.length,
            files: uploaded,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Quote/repost failed ❌ ${message}`);
        throw error;
    } finally {
        await driver.deleteSession().catch(() => undefined);
    }
};

export type QuoteLatestPostItem = {
    android: Android;
    folder: string;
};

/** Quote/repost latest post on multiple Androids (stagger 2s) */
export const quoteLatestPostOnAndroids = async (
    items: QuoteLatestPostItem[],
    event?: IpcMainEvent
) => {
    if (!items.length) throw new Error('No Android selected');

    const tasks = items.map(async (item, i) => {
        if (i > 0) await sleep(i * 2000);
        try {
            if (!item.folder) throw new Error('Folder not assigned');
            const result = await quoteLatestPost(item.android, item.folder, event);
            return {
                index: result.index,
                name: result.name,
                ok: true as const,
                fileCount: result.fileCount,
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

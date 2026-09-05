import fs from 'node:fs/promises';
import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process'
import { loadMainConfig, waitRandom } from "./common";
import fsSync from "node:fs";
import os from 'os'
import path from "node:path";
import { IpcMainEvent } from "electron";
import { getRandomCaption, getRandomLink } from "./caption";
import { sendLog, sendMessage } from "./event";
import { cutSexyCaption, cutSexyLink } from './file';
import { ReportType, saveReport } from './report';
import { Lang } from '@/screens/Schedule';

export function getScreenSize() {
  const platform = os.platform()

  // 🪟 WINDOWS
  if (platform === 'win32') {
    const output = execSync(
      'powershell -command "Add-Type -AssemblyName System.Windows.Forms; ' +
      '[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; ' +
      '[System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height"'
    )
      .toString()
      .trim()
      .split(/\s+/)

    return {
      width: Number(output[0]),
      height: Number(output[1]),
    }
  }

  // 🍎 macOS
  if (platform === 'darwin') {
    const output = execSync(
      `osascript -e 'tell application "Finder" to get bounds of window of desktop'`
    )
      .toString()
      .trim()

    const [, , width, height] = output.split(',').map(Number)

    return { width, height }
  }

  // 🐧 LINUX
  if (platform === 'linux') {
    const output = execSync(`xdpyinfo | grep dimensions`)
      .toString()
      .match(/(\d+)x(\d+)/)

    if (!output) throw new Error('Cannot detect screen size')

    return {
      width: Number(output[1]),
      height: Number(output[2]),
    }
  }

  throw new Error('Unsupported OS')
}

const { width: SCREEN_W, height: SCREEN_H } = getScreenSize()

const WIN_W = 800
const WIN_H = 500

const GAP = 0 // có thể = 10 nếu muốn hở

const COLS = Math.floor(SCREEN_W / (WIN_W + GAP))
const ROWS = Math.floor(SCREEN_H / (WIN_H + GAP))

const MAX_SLOTS = COLS * ROWS

// 3008 / 800 = 3 (mỗi hàng 3 browser)

export function calcFlowPosition(index: number) {
  const slot = index % MAX_SLOTS   // 🔥 quay vòng

  const col = slot % COLS
  const row = Math.floor(slot / COLS)

  const x = col * (WIN_W + GAP)
  const y = row * (WIN_H + GAP)

  return {
    x,
    y,
    width: WIN_W,
    height: WIN_H,
    slot, // (optional) debug
  }
}

export interface PostParams {
  id: number,
  ws: string,
  username: string,
  folder: string,
  type: ReportType,
  mode: 'default' | 'affiliate',
  captionData: string;
  reportName: string;
  isAuto: boolean;
  enableQuoteLink?: boolean;
}

const POST_BUTTON_SELECTOR = 'div.xc26acl';
const LATEST_POST_SELECTOR = 'div.x1a6qonq.x6ikm8r.x10wlt62.xj0a0fe.x126k92a.x6prxxf.x7r5mf7'
const REPOST_BUTTON_SELECTOR = `div.x4vbgl9 svg[aria-label="Repost"]`
const QUOTE_BUTTON_SELECTOR = `svg[aria-label="Quote"]`
const MODAL_SELECTOR = 'div.x1n2onr6.x1ja2u2z.x1afcbsf.x78zum5.xdt5ytf.x1a2a7pz.x71s49j.x1plvlek.xryxfnj.x5hsz1j.x1u6grsq.x1mkrjbl.x4hg4is'
const TEXT_AREA_CAPTION = 'div[aria-label="Empty text field. Type to compose a new post."]'
const POST_BUTTON_SUBMIT = 'div.xc26acl.x6s0dn4.x78zum5.xl56j7k.x6ikm8r.x10wlt62.xf7dkkf.xv54qhq.xlyipyv.xw2npq5'
const MORE_BUTTON_SELECTOR = 'div.xkqq1k2.x91jh78.x1xkn691.x4oqio7.x1qx5ct2.xw4jnvo svg[aria-label="More"]'

const WAIT_FOR_UI_MS = 60_000;

/** Lấy 1 link bất kỳ từ file và xoá dòng đó */
const takeAndRemoveQuoteLink = (filePath: string): string => {
  if (!fsSync.existsSync(filePath)) {
    throw new Error(`File quote link không tồn tại: ${filePath}`);
  }

  const lines = fsSync
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("File quote link đã hết link");
  }

  const index = Math.floor(Math.random() * lines.length);
  const [picked] = lines.splice(index, 1);
  fsSync.writeFileSync(filePath, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");
  return picked;
};

export const clickPostButton = async (params: PostParams, event: IpcMainEvent, attempt = 1): Promise<boolean> => {
  const {
    id,
    ws,
    username,
    folder,
    type = 'quote',
    mode = 'default',
    reportName,
    isAuto,
    enableQuoteLink,
  } = params;
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | null = null;

  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: ws,
      defaultViewport: null,
    });
    // send event to renderer
    sendMessage(event, { id, username, message: 'Đang đăng bài...' });

    // open new tab
    const page = await browser.newPage();

    // close all pages and keep only this page
    const pages = await browser.pages();
    for (const p of pages) {
      if (p !== page) {
        await p.close();
      }
    }

    let link = `https://threads.com/@${username}`;
    if (type === 'quote' && enableQuoteLink) {
      const config = await loadMainConfig();
      const quoteLinkFile = config?.quoteLinkFile?.trim();
      if (!quoteLinkFile) {
        throw new Error('Chưa cấu hình quoteLinkFile trong Settings');
      }
      link = takeAndRemoveQuoteLink(quoteLinkFile);
      sendMessage(event, { id, username, message: `Quote link: ${link}` });
    }

    await page.goto(link);
    await waitRandom(5000, 10000);

    // move mouse
    await page.mouse.move(100, 200, {
      steps: 20,
    });

    // keyboard press escape
    await page.keyboard.press('Escape');
    await waitRandom(1000, 2000);

    if (type === 'post') {
      const els = await page.$$(POST_BUTTON_SELECTOR);
      let postButton = null;

      for (const el of els) {
        const text = await page.evaluate(e => e?.textContent?.trim(), el);
        if (text === 'Post' || text === 'Đăng') {
          postButton = el;
          break;
        }
      }

      if (!postButton) {
        throw new Error('Không tìm thấy nút "Post"');
      }
      await postButton.click();
    }

    if (type === 'quote') {
      // scroll to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await waitRandom(2000, 4000);

      if (!enableQuoteLink) {
        // Đợi DOM load
        await page.waitForSelector(LATEST_POST_SELECTOR, { timeout: 10000 });

        // find first div with class x1a6qonq x6ikm8r x10wlt62 xj0a0fe x126k92a x6prxxf x7r5mf7 and click
        const firstDiv = await page.$(LATEST_POST_SELECTOR);
        if (!firstDiv) {
          throw new Error('Không tìm thấy bài viết mới nhất');
        }
        await firstDiv.click();
        await waitRandom(2000, 4000);
      }

      const repostSvg = await page.$(REPOST_BUTTON_SELECTOR);
      if (!repostSvg) {
        throw new Error('Không tìm thấy nút "Repost"');
      }
      await repostSvg.click();
      await waitRandom(1000, 2000);
      await repostSvg.click();
      await waitRandom(1000, 2000);
      await repostSvg.click();
      await waitRandom(1000, 2000);
      await waitRandom(3000, 5000);

      const quoteButton = await page.$(QUOTE_BUTTON_SELECTOR);
      if (!quoteButton) {
        throw new Error('Không tìm thấy nút "Quote"');
      }
      await quoteButton.click();
      await waitRandom(3000, 5000);
    }

    sendMessage(event, { id, username, message: 'Đang tải media...' });
    const isUploadSuccess = await uploadMedia({ page, username, folder, mode });
    if (!isUploadSuccess) {
      throw new Error('Kết nối internet có thể không ổn định, tải media thất bại');
    }
    await waitRandom(3000, 5000);

    // find div with class x1n2onr6 x1ja2u2z x1afcbsf x78zum5 xdt5ytf x1a2a7pz x71s49j x1plvlek xryxfnj x5hsz1j x1u6grsq x1mkrjbl x4hg4is
    const modal = await page.$(MODAL_SELECTOR);

    if (!modal) {
      throw new Error('Không tìm thấy modal caption');
    }
    // find div aria-label="Empty text field. Type to compose a new post." and click
    const textArea = await modal.$(TEXT_AREA_CAPTION);
    if (!textArea) {
      throw new Error('Không tìm thấy textarea caption');
    }

    if (textArea) {
      await textArea.click();
      await waitRandom(1000, 2000);
      sendMessage(event, { id, username, message: 'Đang nhập caption...' });
      const caption = mode === 'affiliate' ? getRandomCaption(folder) : cutSexyCaption();
      await page.keyboard.type(caption, { delay: 100 });
    }
    // in modal find div with class xc26acl x6s0dn4 x78zum5 xl56j7k x6ikm8r x10wlt62 xf7dkkf xv54qhq xlyipyv xw2npq5
    const postButton = await modal.$(POST_BUTTON_SUBMIT);
    if (!postButton) {
      throw new Error('Không tìm thấy nút "Post"');
    }
    await postButton.click();
    await page.waitForFunction(
      () => [...document.querySelectorAll('div.html-div')]
        .some(el => el.textContent === 'Posted'),
      { timeout: WAIT_FOR_UI_MS }
    );
    sendMessage(event, { id, username, message: type === 'post' ? 'Đăng bài thành công ✅' : 'Trích dẫn thành công ✅' });
    saveReport({
      reportName,
      description: type === 'post' ? 'Post completed ✅' : 'Quote completed ✅',
      userId: id,
      status: 'completed',
      username,
      type,
    });
    return true;
  } catch (error) {
    console.error(error);
    const subMsg = type === 'post' ? 'Đăng bài viết' : 'Trích dẫn';
    const message = error instanceof Error ? error.message : `${subMsg} thất bại ❌`;
    sendMessage(event, { id, username, message: message });
    saveReport({
      reportName,
      description: message,
      userId: id,
      status: 'failed',
      username,
      type,
    });
    if (isAuto && browser) {
      await browser.close().catch(() => { });
    }
    return false;
  } finally {
    if (browser) {
      await browser.disconnect().catch(() => { });
    }
  }
}

export interface SetupNewAccountParams {
  id: number,
  ws: string,
  username: string,
  isAuto: boolean,
  reportName: string,
}

const getCurrentTab = async (browser: Browser): Promise<Page> => {
  const pages = await browser.pages();
  const usable = pages.filter((p) => {
    try {
      const url = p.url();
      return Boolean(url) && !url.startsWith('devtools://') && !url.startsWith('chrome-extension://');
    } catch {
      return false;
    }
  });

  const page =
    usable.find((p) => {
      const url = p.url();
      return url.includes('instagram.com') || url.includes('threads.com');
    }) ??
    usable.find((p) => {
      const url = p.url();
      return url !== 'about:blank' && !url.startsWith('chrome://');
    }) ??
    usable[0] ??
    pages[0];

  if (!page) {
    throw new Error('Không tìm thấy tab hiện tại');
  }

  try {
    await page.bringToFront();
  } catch {
    /* ignore */
  }
  return page;
};

/** Click 1 lần trên page nếu thấy text (ưu tiên exact trên button / aria-label / text node). */
const tryClickByTextOnPage = async (page: Page, text: string): Promise<boolean> => {
  return page.evaluate((needle) => {
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const want = normalize(needle);

    const isVisible = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.pointerEvents !== 'none'
      );
    };

    const clickableOf = (el: HTMLElement) =>
      (el.closest('button, a, [role="button"], div[role="button"], [tabindex]') as HTMLElement | null) ||
      el;

    const candidates = Array.from(
      document.querySelectorAll(
        'button, a, [role="button"], div[role="button"], span[role="button"], [tabindex="0"]',
      ),
    ) as HTMLElement[];

    let best: HTMLElement | null = null;
    let bestScore = 0;

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const aria = normalize(el.getAttribute('aria-label') || '');
      const inner = normalize(el.innerText || '');
      let score = 0;
      if (aria === want || inner === want) score = 1000;
      else if (want.length > 10 && (inner.includes(want) || aria.includes(want)) && inner.length < want.length + 40) {
        score = 200;
      }
      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }

    // Fallback: text node đúng chữ → lấy parent clickable
    if (!best) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (normalize(node.textContent || '') !== want) continue;
        const parent = node.parentElement as HTMLElement | null;
        const target = parent ? clickableOf(parent) : null;
        if (isVisible(target)) {
          best = target;
          break;
        }
      }
    }

    if (!best) return false;
    best.scrollIntoView({ block: 'center', inline: 'center' });
    best.click();
    return true;
  }, text);
};

type PageRef = { page: Page };

/**
 * Chờ + click text trên mọi tab (OAuth IG hay mở tab mới).
 * Heartbeat `onWait` mỗi ~3s để UI không “im” khi đang chờ.
 */
const waitAndClickByText = async (
  browser: Browser,
  pageRef: PageRef,
  texts: string | string[],
  opts: {
    timeout?: number;
    onWait?: (elapsedSec: number, lookingFor: string) => void;
  } = {},
) => {
  const needles = Array.isArray(texts) ? texts : [texts];
  const lookingFor = needles.join('" / "');
  const timeout = opts.timeout ?? 120_000;
  const start = Date.now();
  let lastBeat = -1;

  while (Date.now() - start < timeout) {
    const elapsedSec = Math.floor((Date.now() - start) / 1000);
    if (opts.onWait && elapsedSec !== lastBeat && elapsedSec % 3 === 0) {
      lastBeat = elapsedSec;
      opts.onWait(elapsedSec, lookingFor);
    }

    try {
      const pages = await browser.pages();
      for (const p of pages) {
        try {
          const url = p.url();
          if (!url || url.startsWith('devtools://') || url.startsWith('chrome-extension://')) {
            continue;
          }
          for (const needle of needles) {
            const clicked = await tryClickByTextOnPage(p, needle);
            if (clicked) {
              pageRef.page = p;
              await p.bringToFront().catch(() => { });
              return needle;
            }
          }
        } catch {
          // tab navigated / context destroyed — thử lại
        }
      }
    } catch {
      // browser tạm lỗi — thử lại
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`Timeout ${timeout / 1000}s — không thấy nút "${lookingFor}"`);
};

/** Setup Threads trên profile mobile — dùng tab hiện tại (giữ fingerprint). */
export const setupNewAccountMobile = async ({
  id,
  ws,
  username,
  isAuto,
  reportName,
}: SetupNewAccountParams, event: IpcMainEvent) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  const msg = (message: string) => sendMessage(event, { id, username, message });

  try {
    const pageRef: PageRef = { page: await getCurrentTab(browser) };

    // Step 1: mở threads.com/login
    msg('Mobile setup [1/5]: mở threads.com/login…');
    await pageRef.page.goto('https://www.threads.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Step 2: tìm + click "Join with Instagram"
    msg('Mobile setup [2/5]: chờ "Join with Instagram"…');
    await waitAndClickByText(browser, pageRef, 'Join with Instagram', {
      onWait: (s, t) => msg(`Mobile setup [2/5]: chờ "${t}"… (${s}s)`),
    });
    msg('Mobile setup [2/5]: đã click "Join with Instagram" ✅');

    // Step 3: chờ nút "Next" rồi click (quét mọi tab)
    msg('Mobile setup [3/5]: chờ nút "Next"…');
    await waitAndClickByText(browser, pageRef, ['Next', 'Continue'], {
      onWait: (s, t) => msg(`Mobile setup [3/5]: chờ "${t}"… (${s}s)`),
    });
    msg('Mobile setup [3/5]: đã click "Next" ✅');

    // Chờ UI bước Join hiện ra
    msg('Mobile setup: chờ 5s trước bước Join Threads…');
    await waitRandom(5000, 5000);

    // Step 4: chờ nút "Join Threads" rồi click
    msg('Mobile setup [4/5]: chờ nút "Join Threads"…');
    await waitAndClickByText(browser, pageRef, 'Join Threads', {
      onWait: (s, t) => msg(`Mobile setup [4/5]: chờ "${t}"… (${s}s)`),
    });
    msg('Mobile setup [4/5]: đã click "Join Threads" ✅');

    // Step 5: chờ 10s => done
    msg('Mobile setup [5/5]: chờ 10s…');
    await waitRandom(10000, 10000);

    msg('Setup new account mobile success ✅');
    sendLog(event, { id, username, message: `Setup new account mobile success cho ${id}` });
    saveReport({
      reportName,
      description: 'Setup new account mobile success ✅',
      userId: id,
      status: 'completed',
      username,
      type: 'setup-new-account',
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Setup new account mobile failed ❌';
    msg(message);
    sendLog(event, { id, username, message: `Setup new account mobile failed cho ${id}` });
    saveReport({
      reportName,
      description: message,
      userId: id,
      status: 'failed',
      username,
      type: 'setup-new-account',
    });
  } finally {
    if (isAuto) {
      await browser?.close().catch(() => { });
    }
    if (browser) {
      await browser?.disconnect().catch(() => { });
    }
  }
};

export const setupNewAccount = async ({
  id,
  ws,
  username,
  isAuto,
  reportName,
}: SetupNewAccountParams, event: IpcMainEvent) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // open new tab
    const page = await browser.newPage();
    await page.goto(`https://threads.com/login`);
    await waitRandom(5000, 10000);

    sendMessage(event, { id, username, message: 'Đang setup account...' });

    // find continue button with class x78zum5 xdt5ytf x1iyjqo2 x1cy8zhl x106a9eq
    const continueButton = await page.$('div.x78zum5.xdt5ytf.x1iyjqo2.x1cy8zhl.x106a9eq');
    if (!continueButton) {
      throw new Error('Không tìm thấy nút "Continue with Instagram"');
    }
    await continueButton.click();
    sendMessage(event, { id, username, message: 'Đang click "Continue with Instagram"...' });
    await waitRandom(10000, 20000);

    // find div with class x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const nextButton = await page.$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');
    if (!nextButton) {
      throw new Error('Không tìm thấy nút "Next public profile"');
    }
    await nextButton.click();
    sendMessage(event, { id, username, message: 'Đang click "Next public profile"...' });
    await waitRandom(10000, 20000);

    // find join div x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const joinButtons = await page.$$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');
    if (!joinButtons?.[1]) {
      throw new Error('Không tìm thấy nút "Join Threads"');
    }
    await joinButtons[1].click();
    sendMessage(event, { id, username, message: 'Đang click "Join Threads", chờ vào trang profile...' });
    await waitRandom(10000, 20000);

    // find post button x1i10hfl x1ypdohk xdl72j9 x2lah0s x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x2lwn1j xeuugli xexx8yu xyri2b x18d9i69 x1c1uobl x1n2onr6 x16tdsg8 x1hl2dhg xggy1nq x1ja2u2z x1t137rt x1q0g3np x1lku1pv x1a2a7pz x6s0dn4 x9f619 x3nfvp2 x1s688f xl56j7k x87ps6o xuxw1ft xc9qbxq x193iq5w x1g2r6go x12w9bfk x11xpdln xz4gly6 x19kf12q x9dqhi0 xz6dhga x79t38 x1qv9dbp x121z25r x16qb05n xi7iut8 x1dm3dyd x1pv694p x13fuv20 x18b5jzi x1q0q8m5 x1t7ytsu x178xt8z x1lun4ml xso031l xpilrb4 xw2npq5
    const postButton = await page.$('div.x1i10hfl.x1ypdohk.xdl72j9.x2lah0s.x3ct3a4.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1lku1pv.x1a2a7pz.x6s0dn4.x9f619.x3nfvp2.x1s688f.xl56j7k.x87ps6o.xuxw1ft.xc9qbxq.x193iq5w.x1g2r6go.x12w9bfk.x11xpdln.xz4gly6.x19kf12q.x9dqhi0.xz6dhga.x79t38.x1qv9dbp.x121z25r.x16qb05n.xi7iut8.x1dm3dyd.x1pv694p.x13fuv20.x18b5jzi.x1q0q8m5.x1t7ytsu.x178xt8z.x1lun4ml.xso031l.xpilrb4.xw2npq5');
    if (!postButton) {
      throw new Error('Chưa vào được trang profile ❌');
    }

    // scroll auto 5s
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      await page.evaluate(() => {
        window.scrollBy(0, 100);
      });
      await waitRandom(1000, 2000);
    }

    sendMessage(event, { id, username, message: 'Setup new account success ✅' });
    sendLog(event, { id, username, message: `Setup new account success cho ${id}` });
    saveReport({
      reportName,
      description: 'Setup new account success ✅',
      userId: id,
      status: 'completed',
      username,
      type: 'setup-new-account',
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Setup new account failed ❌';
    sendMessage(event, { id, username, message });
    sendLog(event, { id, username, message: `Setup new account failed cho ${id}` });
    saveReport({
      reportName,
      description: message,
      userId: id,
      status: 'failed',
      username,
      type: 'setup-new-account',
    });
  } finally {
    if (isAuto) {
      await browser?.close().catch(() => { });
    }
    if (browser) {
      await browser?.disconnect().catch(() => { });
    }
  }
}

// upload media
export const uploadMedia = async ({
  page,
  // username,
  folder,
  mode,
}: {
  page: Page,
  username: string,
  folder: string,
  mode: 'default' | 'affiliate'
}): Promise<boolean> => {
  await waitRandom(5000, 10000);

  let isVideoUploaded = false;
  let isImageUploaded = false;

  const waitForUploadSuccess = async (
    timeoutMs = 180 * 1000,
    intervalMs = 3000
  ): Promise<boolean> => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (isVideoUploaded || isImageUploaded) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return false;
  };

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    if (url.includes('rupload_igvideo') && status === 200) {
      console.log('Video uploaded successfully!');
      isVideoUploaded = true;
    }
    if (url.includes('rupload_igphoto') && status === 200) {
      console.log('Image uploaded successfully!');
      isImageUploaded = true;
    }
  });

  // find input type = file
  const inputFile = await page.$('input[type="file"]');
  if (!inputFile) {
    throw new Error('Cannot find input file selector');
  }

  const uploadImage = async () => {
    // filter only image files
    const images = await fs.readdir(folder);
    const imageFiles = images.filter(image => image.endsWith('.avif') || image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.png') || image.endsWith('.webp'));
    // upload all image files
    for (const image of imageFiles) {
      const imagePath = path.join(folder, image);
      await (inputFile as any).uploadFile(imagePath);
      await waitRandom(3000, 5000);
    }
  }

  const uploadVideo = async () => {
    // get all videos in folder
    const videos = await fs.readdir(folder);
    // filter only video files
    const videoFiles = videos.filter(video => video.endsWith('.mp4') || video.endsWith('.mov') || video.endsWith('.webm'));
    // upload all video files

    for (const video of videoFiles) {
      const filePath = path.join(folder, video);
      await (inputFile as any).uploadFile(filePath);
      await waitRandom(3000, 5000);
    }
  }

  if (mode === 'default') {
    await uploadImage();
    await uploadVideo();
  }

  if (mode === 'affiliate') {
    await uploadVideo();
    await uploadImage();
  }

  const success = await waitForUploadSuccess();
  return success;
}


export interface ClickEditLatestPostButtonParams {
  ws: string,
  username: string,
  reportName: string,
  id: number,
  folder: string,
  mode: 'default' | 'affiliate',
  isAuto: boolean;
  lang: Lang;
  isTag: boolean;
}

export const clickEditLatestPostButton = async ({
  ws,
  username,
  reportName,
  id,
  mode,
  folder,
  isAuto,
  lang,
  isTag,
}: ClickEditLatestPostButtonParams, event: IpcMainEvent): Promise<boolean> => {
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | null = null;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: ws,
      defaultViewport: null,
    });
    // Lấy tất cả tabs
    // const pages = await browser.pages();

    // let targetPage: Page | null = null;

    // // logs all urls
    // for (const page of pages) {
    //   // find page with url contains threads.com
    //   if (page.url().includes('threads.com')) {
    //     targetPage = page;
    //     break;
    //   }
    // }

    // // Chọn tab cuối cùng
    // const page = targetPage || pages[pages.length - 1];
    // await page.bringToFront();

    // open new tab
    const page = await browser.newPage();

    // close all pages and keep only this page
    const pages = await browser.pages();
    for (const p of pages) {
      if (p !== page) {
        await p.close();
      }
    }

    await page.goto(`https://threads.com/@${username}`);
    await waitRandom(5000, 10000);

    // Keyboard press escape
    await page.keyboard.press('Escape');
    await waitRandom(1000, 2000);

    // scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitRandom(2000, 4000);

    sendMessage(event, { id, username, message: 'Đang tìm bài viết mới nhất...' });

    // find first div with class x1a6qonq x6ikm8r x10wlt62 xj0a0fe x126k92a x6prxxf x7r5mf7 and click
    const latestPost = await page.$(LATEST_POST_SELECTOR);
    if (!latestPost) {
      throw new Error('Không tìm thấy bài viết mới nhất');
    }
    sendMessage(event, { id, username, message: 'Đang click bài viết mới nhất...' });
    await latestPost.click();
    await waitRandom(2000, 4000);

    // scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitRandom(2000, 4000);

    const moreBtn = await page.$(MORE_BUTTON_SELECTOR);

    if (!moreBtn) {
      throw new Error('Không tìm thấy nút "Xem thêm"');
    }
    await moreBtn.click();
    await waitRandom(1000, 2000);
    await moreBtn.click();
    await waitRandom(1000, 2000);
    await moreBtn.click();
    await waitRandom(3000, 5000);

    sendMessage(event, { id, username, message: 'Đang edit...' });

    // find span with content = "Edit post" in div with class xtsvl71 x1u6grsq x181y1b3 x4hg4is xf6vlc6
    const editSpans = await page.$$('div.xtsvl71.x1u6grsq.x181y1b3.x4hg4is.xf6vlc6 span');
    let editSpan = null;
    for (const span of editSpans) {
      const text = await page.evaluate(el => el.textContent?.trim(), span);
      if (text === 'Edit' || text === 'Chỉnh sửa') {
        editSpan = span;
        break;
      }
    }

    if (!editSpan) {
      throw new Error('Không tìm thấu nút "Chỉnh sửa"');
    }
    await editSpan.click();
    await waitRandom(5000, 10000);
    // enter
    await page.keyboard.press('Enter');
    await waitRandom(1000, 3000);
    // keyboard link

    // link post split \n and random link
    let linkPost = '';
    if (mode === 'default') {
      linkPost = `${cutSexyLink()}`;
    } else {
      const prefix = lang === 'vi' ? 'Mua ở đây: ' : 'Product link 👉 ';
      const link = getRandomLink(folder);
      if (!link) {
        throw new Error('Không tìm thấy link sản phẩm, vui lòng thêm link mới');
      }
      linkPost = `${prefix}${link}`;
    }
    await page.keyboard.type(linkPost, { delay: 100 });
    await waitRandom(1000, 2000);
    await page.keyboard.press('Enter');
    await waitRandom(1000, 2000);
    if (lang === 'en' && mode === 'affiliate' && isTag) {
      const suffix = '#ad #CommissionsEarned';
      await page.keyboard.type(suffix, { delay: 100 });
      await waitRandom(1000, 2000);
    }

    // find div with class = xc26acl x6s0dn4 x78zum5 xl56j7k x6ikm8r x10wlt62 xf7dkkf xv54qhq xlyipyv xw2npq5
    const doneBtn = await page.$(POST_BUTTON_SUBMIT);
    if (!doneBtn) {
      throw new Error('Không tìm thấy nút "Done"');
    }
    await doneBtn.click();
    await waitRandom(1000, 3000);

    await page.waitForFunction(
      () => [...document.querySelectorAll('div.html-div')]
        .some(el => el.textContent === 'Edited'),
      { timeout: WAIT_FOR_UI_MS }
    );
    sendMessage(event, { id, username, message: 'Edit completed ✅' });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chỉnh sửa bài viết thất bại ❌';
    sendMessage(event, { id, username, message });
    saveReport({
      reportName,
      description: message,
      userId: id,
      status: 'failed',
      username,
      type: 'edit',
    });
    if (isAuto && browser) {
      await browser.close().catch(() => { });
    }
    return false;
  } finally {
    if (browser) {
      await browser.disconnect().catch(() => { });
    }
  }
}

// focus threads tab
export const focusThreadsTab = async ({
  ws,
}: {
  ws: string,
}) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  // Lấy tất cả tabs
  const pages = await browser.pages();

  let targetPage: Page | null = null;

  // logs all urls
  for (const page of pages) {
    // find page with url contains threads.com
    if (page.url().includes('threads.com')) {
      targetPage = page;
      break;
    }
  }

  // Chọn tab cuối cùng
  const page = targetPage || pages[pages.length - 1];
  await page.bringToFront();

  await browser.disconnect();
}

// check live accounts
export const checkLiveAccounts = async ({
  ws,
  accounts,
  batchSize = 10,
}: {
  ws: string,
  accounts: string[],
  batchSize?: number,
}) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    const liveAccounts: string[] = [];
    const deadAccounts: string[] = [];

    // chia batch 10 accounts
    const batches = [];

    for (let i = 0; i < accounts.length; i += batchSize) {
      batches.push(accounts.slice(i, i + batchSize));
    }

    // xử lý từng batch
    for (const batch of batches) {
      // tạo các tasks với staggered start times
      const tasks = batch.map(async (user, index) => {
        // delay staggered: mỗi user cách nhau 1s
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * index));
        }

        const page = await browser.newPage();

        try {
          await page.goto(`https://threads.com/@${user}`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });

          await waitRandom(5000, 10000);

          const content = await page.content();

          const isLive = !content.includes(
            "Not all who wander are lost, but this page is"
          );

          if (isLive) {
            liveAccounts.push(user);
          } else {
            deadAccounts.push(user);
          }
        } catch (err) {
          console.log(`Error with user ${user}`, err);
        } finally {
          await page.close();
        }
      });

      // chạy tất cả tasks song song
      await Promise.all(tasks);
      console.log(`✅ Done batch (${batch.length} accounts)`);
    }

    return {
      liveAccounts,
      deadAccounts,
    }
  } finally {
    await browser.disconnect();
  }
}

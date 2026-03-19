import axios from "axios";
import fs from 'node:fs/promises';
import puppeteer, { Page } from 'puppeteer';
import { execSync } from 'child_process'
import { waitRandom } from "./common";
import os from 'os'
import path from "node:path";
import { matchPath } from "react-router-dom";

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

export const openThreadsProfile = async (id: number, index: number) => {
  // const { x, y, width, height } = calcFlowPosition(index)
  await axios.post(`http://127.0.0.1:53200/api/v2/profile-open`, {
    profile_id: id,
    // args: [
    //   `--window-size=${width},${height}`,
    //   `--window-position=${x},${y}`,
    //   '--no-first-run',
    //   '--disable-infobars',
    //   '--disable-gpu',
    // ]
  })
  return true
}

export const threadsPost = async ({
  wsUrl,
  username,
  folder,
  event
}: {
  wsUrl: string,
  username: string,
  folder: string,
  event: Electron.IpcMainEvent,
}) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null,
  });

  // open new tab
  const page = await browser.newPage();
  await page.goto(`https://threads.com/@${username}`);


  const els = await page.$$('div.xc26acl');

  for (const el of els) {
    const text = await page.evaluate(e => e.textContent.trim(), el);
    if (text === 'Post' || text === 'Đăng') {
      await el.click();
      break;
    }
  }

  await waitRandom(3000, 5000);

  // keyboard type "What's new?" with delay
  await page.keyboard.type("What's new?", { delay: 100 });
  await waitRandom(3000, 5000);

  // find input type = file
  const inputFile = await page.$('input[type="file"]');
  console.log(inputFile);


  // image/avif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm
  if (inputFile) {
    // get all videos in folder
    const videos = await fs.readdir(folder);

    // filter only video files
    const videoFiles = videos.filter(video => video.endsWith('.mp4') || video.endsWith('.mov') || video.endsWith('.webm'));
    console.log(folder, 'folder');
    console.log(videoFiles);
    // upload all video files
    for (const video of videoFiles) {
      await inputFile.uploadFile(`${folder}/${video}`);
      await waitRandom(3000, 5000);
    }

    // filter only image files
    const imageFiles = videos.filter(video => video.endsWith('.avif') || video.endsWith('.jpg') || video.endsWith('.jpeg') || video.endsWith('.png') || video.endsWith('.webp'));
    console.log(imageFiles);
    // upload all image files
    for (const image of imageFiles) {
      await inputFile.uploadFile(`${folder}/${image}`);
      await waitRandom(3000, 5000);
    }
  }

  await waitRandom(3000, 5000);
  await page.$$eval('[role="dialog"]', dialogs => {
    for (const dialog of dialogs) {
      const postBtn = Array.from(
        dialog.querySelectorAll('[role="button"]')
      ).find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.textContent?.trim() === 'Post'
      );

      if (postBtn) {
        postBtn.click();
        return;
      }
    }
  });
  event.sender.send('show-toast', { type: 'success', message: 'Đăng bài thành công!' });


  browser.disconnect();
}

export const clickPostButton = async ({
  ws,
  username,
  folder,
  type = 'quote',
}: {
  ws: string,
  username: string,
  folder: string,
  type: 'post' | 'quote',
}) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

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

  if (type === 'post') {
    const els = await page.$$('div.xc26acl');

    for (const el of els) {
      const text = await page.evaluate(e => e.textContent.trim(), el);
      if (text === 'Post' || text === 'Đăng') {
        await el.click();
        break;
      }
    }
  }

  if (type === 'quote') {
    const repostSvg = await page.$(
      'div.x4vbgl9 svg[aria-label="Repost"]'
    )

    if (repostSvg) {
      await repostSvg.click();
      await waitRandom(3000, 5000);
      const spans = await page.$$('div.x17zd0t2 span')

      for (const span of spans) {
        const text = await span.evaluate(el => el.textContent?.trim())
        if (text === 'Quote' || text === 'Trích dẫn') {
          await span.click()
          break
        }
      }

    }
  }

  await uploadMedia({ page, username, folder });
  await browser.disconnect();
}

// upload media
export const uploadMedia = async ({
  page,
  username,
  folder,
}: {
  page: Page,
  username: string,
  folder: string,
}) => {
  if (page) {
    await page.bringToFront();
    await waitRandom(5000, 10000);

    // find input type = file
    const inputFile = await page.$('input[type="file"]');
    console.log(inputFile);
    // get all videos in folder
    const videos = await fs.readdir(folder);
    // filter only video files
    const videoFiles = videos.filter(video => video.endsWith('.mp4') || video.endsWith('.mov') || video.endsWith('.webm'));
    console.log(folder, 'folder');
    console.log(videoFiles);
    // upload all video files

    for (const video of videoFiles) {
      const filePath = path.join(folder, video);
      await (inputFile as any).uploadFile(filePath);
      await waitRandom(3000, 5000);
    }

    // filter only image files
    const images = await fs.readdir(folder);
    const imageFiles = images.filter(image => image.endsWith('.avif') || image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.png') || image.endsWith('.webp'));
    console.log(imageFiles);
    // upload all image files
    for (const image of imageFiles) {
      const imagePath = path.join(folder, image);
      await (inputFile as any).uploadFile(imagePath);
      await waitRandom(3000, 5000);
    }
  }
}

export const clickEditLatestPostButton = async ({
  ws,
  username,
}: {
  ws: string,
  username: string,
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
    console.log(page.url());
    // find page with url contains threads.com
    if (page.url().includes('threads.com')) {
      targetPage = page;
      break;
    }
  }

  // Chọn tab cuối cùng
  const page = targetPage || pages[pages.length - 1];
  await page.bringToFront();

  // Đợi DOM load
  await page.waitForSelector('div.x1c1b4dv', { timeout: 10000 });

  // Tìm svg aria-label="More" nằm trong div.x1c1b4dv
  const moreBtn = await page.$(
    'div.x1c1b4dv svg[aria-label="More"]'
  );
  const moreBtnVn = await page.$(
    'div.x1c1b4dv svg[aria-label="Xem thêm"]'
  );

  if (moreBtn) {
    await moreBtn.click();
  }
  if (moreBtnVn) {
    await moreBtnVn.click();
  }
  await waitRandom(3000, 5000);

  await page.waitForSelector('div.x17zd0t2');


  const editBtn = await page.evaluateHandle(() => {
    const divs = document.querySelectorAll('div.x17zd0t2');

    for (const div of divs) {
      const span = div.querySelector('span');
      if (span?.textContent?.trim() === 'Edit' || span?.textContent?.trim() === 'Chỉnh sửa') {
        return div; // click container
      }
    }
    return null;
  });

  if (editBtn) {
    await (editBtn as any).click();
  }


  await browser.disconnect();
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
    console.log(page.url());
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


import fs from 'node:fs/promises';
import puppeteer, { Page } from 'puppeteer';
import { execSync } from 'child_process'
import { loadMainConfig, saveReportTxt, waitRandom } from "./common";
import os from 'os'
import path from "node:path";
import { IpcMainEvent } from "electron";
import { getRandomCap, getRandomCaption, getRandomLink } from "./caption";
import { showToast } from "./event";

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
  type: 'post' | 'quote',
  mode: 'default' | 'affiliate',
  captionData: string;
}

export const clickPostButton = async ({
  id,
  ws,
  username,
  folder,
  type = 'quote',
  mode = 'default',
  captionData,
}: PostParams, event: IpcMainEvent) => {
  const config = await loadMainConfig();
  const caption = mode === 'affiliate' ? getRandomCaption(folder) : getRandomCap(captionData || config?.caption || '') || '';
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // send event to renderer
    showToast(event, { id, username, message: 'Đang đăng bài...' });

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

    showToast(event, { id, username, message: 'Đang tải media...' });
    await uploadMedia({ page, username, folder, mode });
    await waitRandom(3000, 5000);

    // find div with class x6s0dn4 x17zd0t2 x78zum5 x47corl x10l6tqk x13vifvy
    const textArea = await page.$('div.x6s0dn4.x17zd0t2.x78zum5.x47corl.x10l6tqk.x13vifvy');
    if (textArea) {
      await textArea.click();
      await waitRandom(1000, 2000);
      showToast(event, { id, username, message: 'Đang nhập caption...' });
      await page.keyboard.type(caption, { delay: 100 });
    }

    // find div modal with class x1n2onr6 x1ja2u2z x1afcbsf x78zum5 xdt5ytf x1a2a7pz x71s49j x1plvlek xryxfnj x5hsz1j x1u6grsq x1mkrjbl x4hg4is
    const modal = await page.$('div.x1n2onr6.x1ja2u2z.x1afcbsf.x78zum5.xdt5ytf.x1a2a7pz.x71s49j.x1plvlek.xryxfnj.x5hsz1j.x1u6grsq.x1mkrjbl.x4hg4is');
    // in modal find div with class xc26acl x6s0dn4 x78zum5 xl56j7k x6ikm8r x10wlt62 xf7dkkf xv54qhq xlyipyv xw2npq5
    if (modal) {
      const postButton = await modal.$('div.xc26acl.x6s0dn4.x78zum5.xl56j7k.x6ikm8r.x10wlt62.xf7dkkf.xv54qhq.xlyipyv.xw2npq5');
      if (postButton) {
        await postButton.click();
        await waitRandom(5000, 10000);
        // send event to main process
        showToast(event, { id, username, message: 'Post completed ✅' });
      }
    }
  } catch (error) {
    console.error(error);
    showToast(event, { id, username, message: 'Post failed ❌' });
  } finally {
    await browser.disconnect();
  }
}

export interface SetupNewAccountParams {
  id: number,
  ws: string,
  username: string,
}

export const setupNewAccount = async ({
  id,
  ws,
  username,
}: SetupNewAccountParams, event: IpcMainEvent) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // open new tab
    let page = await browser.newPage();
    await page.goto(`https://threads.com/login`);
    await waitRandom(5000, 10000);

    // check page
    let pageContent = '';
    let retryCount = 0;
    let currentPage = page;

    while (retryCount < 3) {
      try {
        pageContent = await currentPage.content();

        // Kiểm tra mất kết nối hoặc content rỗng
        if (!pageContent || pageContent.trim() === '') {
          console.log('Page content is empty, possible internet connection issue');
          throw new Error('Empty page content');
        }

        // Kiểm tra lỗi 429
        if (pageContent.includes('HTTP ERROR 429')) {
          console.log('HTTP ERROR 429 detected, retrying...');
          throw new Error('HTTP ERROR 429');
        }

        // Nếu không có lỗi, break ra khỏi vòng lặp
        break;

      } catch (error: any) {
        console.log(`Retry ${retryCount + 1}: ${error.message}`);

        // Đóng tab hiện tại nếu có
        if (currentPage && currentPage !== page) {
          await currentPage.close();
        }

        // Tạo tab mới và thử lại
        currentPage = await browser.newPage();
        await currentPage.goto(`https://threads.com/login`);
        await waitRandom(5000, 10000);

        retryCount++;

        // Nếu đã thử 3 lần vẫn thất bại
        if (retryCount >= 3) {
          console.error('Failed to load page after 3 retries');
          showToast(event, { id, username, message: 'Không thể tải trang sau 3 lần thử lại' });
          return;
        }
      }
    }

    // Gán lại page nếu đã tạo page mới
    if (currentPage !== page) {
      page = currentPage;
    }

    showToast(event, { id, username, message: 'Đang setup account...' });

    // find span with "Continue with Instagram"
    const spans = await page.$$('span');
    let continueWithInstagram = null;
    for (const span of spans) {
      const text = await page.evaluate(el => el.textContent?.trim(), span);
      if (text === 'Continue with Instagram') {
        continueWithInstagram = span;
        showToast(event, { id, username, message: 'Đang click "Continue with Instagram"...' });
      }
    }

    if (continueWithInstagram) {
      await continueWithInstagram.click();
      await waitRandom(20000, 30000);
    }

    // find div with class x6s0dn4 x78zum5 x1iyjqo2 xyqm7xq x109j2v6 x1hhzuzn x1x5flf6
    const divWithClass = await page.$('div.x6s0dn4.x78zum5.x1iyjqo2.xyqm7xq.x109j2v6.x1hhzuzn.x1x5flf6');
    if (divWithClass) {
      await divWithClass.click();
      await waitRandom(20000, 30000);
    }

    // find div with class x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const nextButton = await page.$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');

    if (nextButton) {
      await nextButton.click();
      await waitRandom(20000, 30000);
      showToast(event, { id, username, message: 'Đang click "Next" lần 1...' });
    }

    // find divs with class x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const divs = await page.$$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');

    // each div with content = "Join Threads" then click
    for (const div of divs) {
      const text = await page.evaluate(el => el.textContent?.trim(), div);
      if (text === 'Join Threads') {
        await div.click();
        await waitRandom(5000, 10000);
        showToast(event, { id, username, message: 'Setup new account success ✅' });
      }
    }
  } catch (error) {
    console.error(error);
    showToast(event, { id, username, message: 'Setup new account failed ❌' });
  } finally {
    await browser.disconnect();
  }
}

// upload media
export const uploadMedia = async ({
  page,
  username,
  folder,
  mode,
}: {
  page: Page,
  username: string,
  folder: string,
  mode: 'default' | 'affiliate'
}) => {
  if (page) {
    await page.bringToFront();
    await waitRandom(5000, 10000);

    // find input type = file
    const inputFile = await page.$('input[type="file"]');

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
  }
}


interface ClickEditLatestPostButtonParams {
  ws: string,
  username: string,
  reportName: string,
  id: number,
  folder: string,
  mode: 'default' | 'affiliate',
}

export const clickEditLatestPostButton = async ({
  ws,
  username,
  reportName,
  id,
  mode,
  folder,
}: ClickEditLatestPostButtonParams, event: IpcMainEvent) => {
  const config = await loadMainConfig();
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });
  try {
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

    // Đợi DOM load
    await page.waitForSelector('div.x1c1b4dv', { timeout: 10000 });

    // Tìm svg aria-label="More" nằm trong div.x1c1b4dv
    const moreBtn = await page.$(
      'div.x1c1b4dv svg[aria-label="More"]'
    );
    const moreBtnVn = await page.$(
      'div.x1c1b4dv svg[aria-label="Xem thêm"]'
    );

    await moreBtn?.click();
    await moreBtnVn?.click();
    await waitRandom(3000, 5000);

    await page.waitForSelector('div.x17zd0t2');


    showToast(event, { id, username, message: 'Đang edit...' });
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

    await (editBtn as any).click();
    await waitRandom(5000, 10000);
    // enter
    await page.keyboard.press('Enter');
    await waitRandom(1000, 3000);
    // keyboard link

    // link post split \n and random link
    let linkPost = '';
    if (mode === 'default') {
      const links = config?.linkPost?.split('\n') || [];
      linkPost = links[Math.floor(Math.random() * links.length)];
    } else {
      linkPost = getRandomLink(folder);
    }
    await page.keyboard.type(`Product link 👉: ${linkPost}`, { delay: 100 });
    await waitRandom(1000, 3000);

    // find div second with class xc26acl x6s0dn4 x78zum5 xl56j7k x6ikm8r x10wlt62 xf7dkkf xv54qhq xlyipyv xw2npq5
    const divs = await page.$$('div.xc26acl.x6s0dn4.x78zum5.xl56j7k.x6ikm8r.x10wlt62.xf7dkkf.xv54qhq.xlyipyv.xw2npq5');
    const secondDiv = divs[1];
    await secondDiv?.click();
    await waitRandom(1000, 3000);

    showToast(event, { id, username, message: 'Edit completed ✅' });

    if (reportName) {
      saveReportTxt({
        reportName,
        note: 'Edit completed',
        id,
        status: 'completed',
        username,
      });
    }
  } catch (error) {
    console.log(error);
    showToast(event, { id, username, message: 'Edit failed ❌' });
    if (reportName) {
      saveReportTxt({
        reportName,
        note: 'Edit failed',
        id,
        status: 'failed',
        username,
      });
    }
  } finally {
    await browser.disconnect();
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

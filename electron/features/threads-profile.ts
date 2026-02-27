import axios from "axios";
import fs from 'node:fs/promises';
import puppeteer, { Page } from 'puppeteer';
import { waitRandom } from "./common";

export const openThreadsProfile = async (id: number) => {
  return axios.post(`http://127.0.0.1:53200/api/v2/profile-open`, { profile_id: id })
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

  // closes all pages
  const pages = await browser.pages();

  // close all and keep only first page
  for (let i = 1; i < pages.length; i++) {
    await pages[i].close();
  }

  // open new tab
  const page = await browser.newPage();
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
    console.log(videoFiles);
    // upload all video files
    for (const video of videoFiles) {
      await (inputFile as any).uploadFile(`${folder}/${video}`);
      await waitRandom(3000, 5000);
    }

    // filter only image files
    const images = await fs.readdir(folder);
    const imageFiles = images.filter(image => image.endsWith('.avif') || image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.png') || image.endsWith('.webp'));
    console.log(imageFiles);
    // upload all image files
    for (const image of imageFiles) {
      await (inputFile as any).uploadFile(`${folder}/${image}`);
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

  // Chọn tab cuối cùng
  const page = pages[pages.length - 1];
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

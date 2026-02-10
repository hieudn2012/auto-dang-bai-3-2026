import axios from "axios";
import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { waitRandom } from "./common";

export const openThreadsProfile = async (id: number) => {
  axios.post(`http://127.0.0.1:53200/api/v2/profile-open`, { profile_id: id })
}

export const threadsPost = async ({
  wsUrl,
  username,
  folder
}: {
  wsUrl: string,
  username: string,
  folder: string,
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
    if (text === 'Post') {
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


  browser.disconnect();
}

import puppeteer from "puppeteer";
import { waitRandom } from "./common";
import { sendMessage } from "./event";

export interface DeletePostOptions {
  ws: string;
  user_id: number;
  username: string;
}

export const deleteOnePost = async ({ ws, user_id, username, retryCount }: DeletePostOptions & { retryCount: number }, event: Electron.IpcMainEvent) => {
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
  sendMessage(event, {
    username,
    message: `Navigating to profile... ⏳(${retryCount})`,
    id: user_id,
  });
  await waitRandom(3000, 5000);

  try {
    const isFirst = await page.waitForSelector(
      'xpath=//*[@id="barcelona-page-layout"]/div/div/div[2]/div/div[1]/div[5]/div[2]/div/div[2]/div/div/section[2]/div/div[3]/div[normalize-space()="Create" or normalize-space()="Done"]',
      { timeout: 5000 }
    );
    const moreBtn = await page.$(
      'div.xkqq1k2.x91jh78.x1xkn691.x4oqio7.x1qx5ct2.xw4jnvo svg[aria-label="More"]'
    );
    if (isFirst && !moreBtn) {
      sendMessage(event, {
        username,
        message: `✅ ✅ ✅ ✅ Finish ✅(${retryCount})`,
        id: user_id,
      });
      browser.close();
      return 'Done';
    }

  } catch (error) {
    // If the "Create" button is not found, it means there are posts to delete
  }

  try {
    const moreBtn = await page.$(
      'div.xkqq1k2.x91jh78.x1xkn691.x4oqio7.x1qx5ct2.xw4jnvo svg[aria-label="More"]'
    );
    if (!moreBtn) {
      throw new Error('More button not found');
    }
    await moreBtn.click();
    await waitRandom(2000, 5000);

    const deleteBtn = await page.waitForSelector(
      'xpath=//div[@role="menuitem"]//span[text()="Delete"]'
    );
    if (!deleteBtn) {
      throw new Error('Delete button not found');
    }
    await deleteBtn.click();
    await waitRandom(2000, 3000);

    await page.keyboard.press('Tab');
    await waitRandom(500, 2000);
    await page.keyboard.press('Enter');

    await waitRandom(5000, 10000);
    sendMessage(event, {
      username,
      message: `Post deleted successfully ✅(${retryCount})`,
      id: user_id,
    });
    return 'Continued';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendMessage(event, {
      username,
      message: `Failed to delete post: ${message} ❌ (${retryCount})`,
      id: user_id,
    });
    return 'Failed';
  }
}

export const deletePost = async ({ ws, user_id, username }: DeletePostOptions, event: Electron.IpcMainEvent) => {
  const maxRetries = 20;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    const result = await deleteOnePost({ ws, user_id, username, retryCount }, event);
    if (result === 'Done') {
      break;
    }
    retryCount++;
  }
} 
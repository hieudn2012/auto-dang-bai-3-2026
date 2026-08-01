import puppeteer from "puppeteer";
import { clipboard } from "electron";
import { waitRandom } from "./common";
import path from "path";
import fs from "fs";

interface GetAffAmzLinkParams {
  ws: string;
  links: string[];
  numberToGet: number;
  isGlobal: boolean;
}

export const getAffAmzLink = async ({ ws, links, numberToGet = 20, isGlobal = false }: GetAffAmzLinkParams) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // open new tab
    const call = async (link: string) => {
      const data: string[] = [];
      const page = await browser.newPage();
      await page.goto(link);
      const button = await page.$("#amzn-ss-get-link-button");
      await button?.click();
      if (!button) {
        throw Error('Button get link not found')
      }
      await waitRandom(2000, 3000);

      if (!isGlobal) {
        // button id amzn-ss-ga-switch
        const buttonGaSwitch = await page.$("#amzn-ss-ga-switch");
        // get class value
        const classValue = await buttonGaSwitch?.evaluate(el => el.getAttribute('class'));
        console.log('classValue', classValue);
        if (classValue?.includes('a-active')) {
          // in buttonGaSwitch, find div with class a-switch a-declarative and get position and click to position
          const divSwitch = await buttonGaSwitch?.$('div.a-switch.a-declarative');
          if (divSwitch) {
            await divSwitch.scrollIntoView();
            await divSwitch.click();
          }
        }
        await waitRandom(1000, 2000);
      }

      page.on("response", async (response: any) => {
        const url = response.url();

        if (url.includes("getShortUrl")) {
          const res = JSON.parse(await response.text())
          const value = res.shortUrl;
          data.push(value);
        }
      });

      for (let i = 0; i < numberToGet; i++) {
        // button id amzn-ss-copy-affiliate-link-btn-announce
        const btnCopyAffLink = await page.$("#amzn-ss-copy-affiliate-link-btn-announce");
        await btnCopyAffLink?.click();
        await waitRandom(3000, 4000);
      }
      const resultString = data.join("\n").trim();
      page?.close();
      return resultString;
    }
    let allLinks = '';
    for (const link of links) {
      const list = await call(link);
      allLinks += list + '\n\n';
    }
    const resultString = allLinks.trim();
    clipboard.writeText(resultString);
    return resultString;
  } catch (error) {
    console.error(error);
    return "";
  }
}

export interface CaptureProductImageParams {
  ws: string;
  items: {
    url: string;
    folderPath: string;
  }[];
}

export const captureProductImage = async ({ ws, items }: CaptureProductImageParams) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    const call = async (item: { url: string; folderPath: string }) => {
      const page = await browser.newPage();
      await page.goto(item.url);
      await page.waitForSelector("#imageBlock");

      // data-csa-c-content-id = mediaBlock-primaryView-desktop
      const element = await page.$('[data-csa-c-content-id="mediaBlock-primaryView-desktop"]');
      // productTitle
      const title = await page.$('#productTitle');
      const titleText = await title?.evaluate(el => el.textContent?.trim());

      if (element) {
        // save file in folder/real_product/img.png
        const folderPath = path.join(item.folderPath, 'real_product');
        fs.mkdirSync(folderPath, { recursive: true });
        const filePath = `${path.join(folderPath, 'img')}.png` as const;
        await element.screenshot({ path: filePath });
      }

      if (titleText) {
        const titlePath = path.join(item.folderPath, 'real_product', 'title.txt');
        fs.writeFileSync(titlePath, titleText);
      }
      page.close();
    }

    // chia mỗi batch 10 item chạy 1 lúc, mỗi item khởi chạy cách nhau 3s (không chờ từng item xong)
    const batchSize = 10;
    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const promises = batch.map((item, idx) => (async () => {
        await sleep(idx * 3000);
        return call(item);
      })());
      await Promise.all(promises);
    }
  } catch (error) {
    console.error(error);
  }
}
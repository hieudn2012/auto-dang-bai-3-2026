import puppeteer from "puppeteer";
import { clipboard } from "electron";
import { waitRandom } from "./common";

interface GetAffAmzLinkParams {
  ws: string;
  links: string[];
  numberToGet: number;
}

export const getAffAmzLink = async ({ ws, links, numberToGet = 20 }: GetAffAmzLinkParams) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // open new tab
    const call = async (link: string) => {
      const data = [];
      const page = await browser.newPage();
      await page.goto(link);

      for (let i = 0; i < numberToGet; i++) {
        // button id amzn-ss-get-link-button
        const button = await page.$("#amzn-ss-get-link-button");
        if (button) {
          await button.click();
          await waitRandom(1000, 2000);
          // get value text area amzn-ss-text-shortlink-textarea
          const textarea = await page.$("#amzn-ss-text-shortlink-textarea");
          const value = await textarea?.evaluate(el => el.textContent);
          // esc keyboard
          await page.keyboard.press('Escape');
          console.log(value, i);
          if (value) {
            data.push(value);
          }
        }
      }
      const resultString = data.join("\n").trim();
      page.close();
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
  } finally {
    await browser.disconnect();
  }
}
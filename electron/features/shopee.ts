import puppeteer from "puppeteer";
import { clipboard } from "electron";
import { waitRandom } from "./common";

interface GetAffAmzLinkParams {
  ws: string;
  links: string[];
  numberToGet: number;
}

export const getAffShopeeLink = async ({ ws, links, numberToGet = 20 }: GetAffAmzLinkParams) => {
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
      await waitRandom(3000, 4000);

      for (let i = 0; i < numberToGet; i++) {
        //find button with class ant-btn mkt-btn get-link-btn ant-btn-primary
        const button = await page.$("button.ant-btn.mkt-btn.get-link-btn.ant-btn-primary");
        if (button) {
          await button.click();
          await waitRandom(200, 400);
          // get value text area ant-input ant-input-disabled
          const textarea = await page.$("textarea.ant-input.ant-input-disabled");
          const value = await textarea?.evaluate(el => el.textContent);
          console.log(value, i);
          if (value) {
            data.push(value);
          }
          // reload page
          await page.reload();
          await waitRandom(3000, 4000);
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
  }
}
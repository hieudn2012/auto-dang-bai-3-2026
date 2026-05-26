import puppeteer from "puppeteer";
import { waitRandom } from "./common";

export interface FanpageLinkParams {
  pages: string;
  ws: string;
}

export const getFanpageLinks = async ({ pages, ws }: FanpageLinkParams) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  const pageList = pages.trim().split('\n').map(link => link.trim()).filter(link => link);
  const results: string[] = [];

  const handlePage = async (link: string) => {
    const page = await browser.newPage();
    try {
      await page.goto(link);
      await waitRandom(4000, 6000);
      // scroll to bottom smoothly
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2), { behavior: 'smooth' });
      await waitRandom(1000, 2000);
      // scroll to bottom again
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2), { behavior: 'smooth' });
      await waitRandom(1000, 2000);
      // scroll to bottom again
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 2), { behavior: 'smooth' });
      await waitRandom(1000, 2000);

      // get 5 items with class xabvvm4 xeyy32k x1ia1hqs x1a2w583 x6ikm8r x10wlt62
      const items = await page.$$('.xabvvm4.xeyy32k.x1ia1hqs.x1a2w583.x6ikm8r.x10wlt62');
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        // find share button by aria-label = Send this to friends or post it on your profile.
        const shareBtn = await item.$('[aria-label="Send this to friends or post it on your profile."]');
        
        await shareBtn?.click();
        await waitRandom(2000, 3000);

        // find span with text "Copy link"
        const element = await page.waitForSelector(
          'xpath///span[contains(text(),"Copy link")]'
        );
        await element?.click();
        await waitRandom(1000, 2000);
        const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
        results.push(copiedUrl);
      }
    } catch (error) {
      console.log(error);
    } finally {
      await page.close();
    }
  }

  for (const pageLink of pageList) {
    await handlePage(pageLink);
  }

  await browser.disconnect();
  return results.filter(link => link).join('\n');
}
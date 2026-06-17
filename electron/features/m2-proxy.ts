import puppeteer from "puppeteer";
import { loadMainConfig, waitRandom } from "./common";

export const bulkChangeM2Proxy = async () => {
  const config = await loadMainConfig();
  const ws = config?.wsUrl;
  if (!ws) {
    console.error('❌ No WebSocket URL found in config');
    return;
  }
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto('https://m2proxy.com/dashboard');
  await waitRandom(5000, 10000);

  //input[@class='grid-checkAll']
  const checkAllInput = await page.$('input.grid-checkAll');
  if (checkAllInput) {
    await checkAllInput.click();
  }

  // .btn.btn-outline-danger.shadow-none.rounded-0.w-100.btn-changeip-multiple
  const changeIpButton = await page.$('.btn.btn-outline-danger.shadow-none.rounded-0.w-100.btn-changeip-multiple');
  if (changeIpButton) {
    await changeIpButton.click();
  }
  await waitRandom(5000, 10000);

  // button[class='btn btn-blue']
  const applyButton = await page.$('button.btn.btn-blue');
  if (applyButton) {
    await applyButton.click();
  }
  await waitRandom(5000, 10000);
  await page.close().catch(() => { });
  await browser.disconnect().catch(() => { });
}
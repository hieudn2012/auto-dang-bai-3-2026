import puppeteer, { Browser } from 'puppeteer';
import { waiting } from './waiting';

const handleCheck = async (account: string, browser: Browser) => {
  try {
    // // Mở tab mới
    const page = await browser.newPage();
    await page.goto(`https://x.com/${account}`);
    await waiting(5);
    const susEl = await page.$('[data-testid="empty_state_header_text"]');
    if (susEl) {
      console.log(`Account ${account} đã bị suspend`)
    } else {
      console.log(`Account ${account} vẫn còn hoạt động`)
    }
    await page.close(); // Đóng tab hiện tại khi hoàn
  } catch (error) {
    console.log(error);
  }
}

const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export const handleCheckLive = async ({ accounts }: { accounts: string[] }) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://127.0.0.1:15582/devtools/browser/0913d3de-a8c4-4734-8836-74c88d2be7b0',
    defaultViewport: null,
  });

  const batches = chunkArray(accounts, 4);

  for (const batch of batches) {
    console.log(`▶️ Checking batch:`, batch);

    await Promise.all(
      batch.map(account => handleCheck(account, browser))
    );

    // nghỉ giữa batch để né rate limit
    await new Promise(r => setTimeout(r, 5000));
  }

  await browser.disconnect();
}


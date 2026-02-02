import puppeteer from 'puppeteer';

export const handleSearchTop = async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://127.0.0.1:15582/devtools/browser/0913d3de-a8c4-4734-8836-74c88d2be7b0',
    defaultViewport: null,
  });

  // // Mở tab mới
  const page = await browser.newPage();

  await page.goto('https://x.com/search?q=norafawn96&src=typed_query&f=top', {
    waitUntil: 'networkidle2'
  });

  const el = await page.$('[data-testid="empty_state_header_text"]');

  if (el) {
    console.log('User đã bị ẩn search top')
  } else {
    console.log('User vẫn còn search top, check tiếp coi có suspend không')
    await page.goto('https://x.com/norafawn96', {
      waitUntil: 'networkidle2'
    });
    const susEl = await page.$('[data-testid="empty_state_header_text"]');
    if (susEl) {
      console.log('Account đã bị suspend')
    } else {
      console.log('Account vẫn còn search ra')

      for (let index = 0; index < 4; index++) {
        const views = await page.$(
          (`::-p-xpath(/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div/div[${index + 1}]/div/div/article/div/div/div[2]/div[2]/div[4]/div/div/div[4]/a/div/div[2]/span)`)
        );
        const likes = await page.$(`::-p-xpath(/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div/div[${index + 1}]/div/div/article/div/div/div[2]/div[2]/div[4]/div/div/div[3]/button/div/div[2]/span/span/span)`)
        const reposts = await page.$(`::-p-xpath(/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div/div[${index + 1}]/div/div/article/div/div/div[2]/div[2]/div[4]/div/div/div[2]/button/div/div[2]/span/span/span)`)
        const replies = await page.$(`::-p-xpath(/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div/div[${index + 1}]/div/div/article/div/div/div[2]/div[2]/div[4]/div/div/div[1]/button/div/div[2]/span/span/span)`)
        const link = await page.$(
          (`::-p-xpath(/html/body/div[1]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div/div[${index + 1}]/div/div/article/div/div/div[2]/div[2]/div[4]/div/div/div[4]/a)`)
        );

        const viewValue = await page.evaluate(el => el?.innerText, views) || 0;
        const likeValue = await page.evaluate(el => el?.innerText, likes) || 0;
        const repostValue = await page.evaluate(el => el?.innerText, reposts) || 0;
        const replyValue = await page.evaluate(el => el?.innerText, replies) || 0;
        const href = await page.evaluate(el => el?.href, link) || 0;
        console.log(replyValue, repostValue, likeValue, viewValue);
        console.log(href.replace('/analytics', ''));
      }
    }
  }
}


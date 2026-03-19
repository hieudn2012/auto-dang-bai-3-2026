import puppeteer from 'puppeteer';

const wait = (timer: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, timer * 1000);
  })
}

export const handleLogin = async () => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://127.0.0.1:15582/devtools/browser/0913d3de-a8c4-4734-8836-74c88d2be7b0',
    defaultViewport: null,
  });

  // // Mở tab mới
  const page = await browser.newPage();

  await page.goto('https://x.com/i/flow/login', {
    waitUntil: 'networkidle2'
  });

  const inputXpath = `::-p-xpath(//div[@id='layers']/div[@class='css-175oi2r r-aqfbo4 r-zchlnj r-1d2f490 r-1xcajam r-12vffkv']/div[@class='css-175oi2r r-12vffkv']/div[@class='css-175oi2r r-12vffkv']/div[@class='css-175oi2r r-1p0dtai r-1adg3ll r-1d2f490 r-bnwqim r-zchlnj r-ipm5af']/div[@class='r-1oszu61 r-1niwhzg r-vqxq0j r-deolkf r-1mlwlqe r-eqz5dr r-1ebb2ja r-crgep1 r-ifefl9 r-bcqeeo r-t60dpp r-13wfysu r-417010 r-1p0dtai r-1adg3ll r-1d2f490 r-bnwqim r-zchlnj r-ipm5af']/div[@class='css-175oi2r r-1pz39u2 r-16y2uox r-1wbh5a2']/div[@class='css-175oi2r r-1ny4l3l r-18u37iz r-1pi2tsx r-1777fci r-1xcajam r-ipm5af r-g6jmlv r-1awozwy']/div[@class='css-175oi2r r-1wbh5a2 r-htvplk r-1udh08x r-1867qdf r-kwpbio r-rsyp9y r-1pjcn9w r-1279nm1']/div[@class='css-175oi2r r-kemksi r-16y2uox r-1wbh5a2']/div[@class='css-175oi2r r-1pz39u2 r-16y2uox r-1wbh5a2']/div[@class='css-175oi2r r-1ny4l3l r-6koalj r-16y2uox r-kemksi r-1wbh5a2']/div[@class='css-175oi2r r-16y2uox r-1wbh5a2 r-f8sm7e r-13qz1uu r-1ye8kvj']/div[@class='css-175oi2r r-16y2uox r-1wbh5a2 r-1dqxon3']/div[@class='css-175oi2r']/div[@class='css-175oi2r r-ywje51 r-nllxps r-jxj0sb r-1fkl15p r-16wqof']/div[@class='css-175oi2r r-1mmae3n r-1e084wi r-13qz1uu']/label[@class='css-175oi2r r-1roi411 r-z2wwpe r-rs99b7 r-18u37iz']/div[@class='css-175oi2r r-16y2uox r-1wbh5a2']/div[@class='css-175oi2r r-18u37iz r-1pi2tsx r-1wtj0ep r-u8s1d r-13qz1uu'])`

  const el = await page.waitForSelector(inputXpath, {
    visible: true,
    timeout: 15000
  });

  await el?.click();
  await wait(2);


  await page.keyboard.type('kaaaymichell888', { delay: 100 }); // Types slower, like a user
  await wait(2)
  await page.keyboard.press('Tab');
  await wait(4)
  await page.keyboard.type('vIljEGZrcr1169', { delay: 100 });
  await wait(2)
  await page.keyboard.press('Tab');
  await wait(2)
  await page.keyboard.press('Tab');
  await wait(2)
  await page.keyboard.press('Tab');
  await wait(2)
}


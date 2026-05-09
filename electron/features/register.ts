import { IpcMainEvent } from "electron";
import puppeteer from "puppeteer";
import { saveReportTxt, waitRandom } from "./common";
import { sendLog } from "./event";
import { getOpenedProfileList, openProfile } from "./ixbrowser-api";
import { toggleDismissButton } from "./instagram";

export interface SetupNewAccountParams {
  ws: string,
  username: string,
}

export interface RegisterNewAccountParams {
  profiles: {
    id: number,
    username: string,
  }[]
  batch: number
  reportName: string
}

const setupNewAccount = async ({
  ws,
  username,
}: SetupNewAccountParams, event: IpcMainEvent) => {

  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // open new tab
    const page = await browser.newPage();
    await page.goto(`https://threads.com/login`);
    await waitRandom(5000, 10000);

    event.sender.send('show-toast', {
      message: 'Đang setup account...',
      type: 'info',
      username,
    });

    // find i with aria-label="Instagram"
    const iWithAriaLabel = await page.$('i[aria-label="Instagram"]');
    if (iWithAriaLabel) {
      await iWithAriaLabel.click();
      await waitRandom(20000, 30000);
    } else {
      throw new Error('Cannot find Instagram button');
    }

    // find div with class x6s0dn4 x78zum5 x1iyjqo2 xyqm7xq x109j2v6 x1hhzuzn x1x5flf6
    const divWithClass = await page.$('div.x6s0dn4.x78zum5.x1iyjqo2.xyqm7xq.x109j2v6.x1hhzuzn.x1x5flf6');
    if (divWithClass) {
      await divWithClass.click();
      await waitRandom(20000, 30000);
    }

    // find div with class x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const nextButton = await page.$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');

    if (nextButton) {
      await nextButton.click();
      await waitRandom(20000, 30000);
      event.sender.send('show-toast', {
        message: 'Đang click "Next" lần 1...',
        type: 'info',
        username,
      });
    } else {
      throw new Error('Cannot find Next button');
    }

    // find divs with class x1d90nhi xwajptj x560nyf xixxii4 xh8yej3 x1vjfegm x1y8xhbf x1ss9l1f
    const divs = await page.$$('div.x1d90nhi.xwajptj.x560nyf.xixxii4.xh8yej3.x1vjfegm.x1y8xhbf.x1ss9l1f');

    // each div with content = "Join Threads" then click
    let hasText = false;
    for (const div of divs) {
      const text = await page.evaluate(el => el.textContent?.trim(), div);
      if (text === 'Join Threads') {
        await div.click();
        await waitRandom(5000, 10000);
        event.sender.send('show-toast', {
          message: 'Setup new account success ✅',
          type: 'success',
          username,
        });
        hasText = true;
      }
    }

    // thêm hành động scroll smooth + move chuột trong vòng 15 giây
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      await page.mouse.move(Math.random() * 1000, Math.random() * 1000);
      // scroll
      await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 100);
      });
      await waitRandom(1000, 2000);
    }


    if (!hasText) {
      throw new Error('Cannot find Join Threads button');
    }
  } catch (error) {
    event.sender.send('show-toast', {
      message: 'Setup new account failed ❌',
      type: 'error',
      username,
    });
    throw error;
  } finally {
    await browser.disconnect();
  }
}

export const registerNewAccounts = async ({ profiles, batch, reportName }: RegisterNewAccountParams, event: IpcMainEvent) => {
  try {
    // Chia profileIds thành các batch
    const batchSize = batch || 5; // Mặc định 5 profile mỗi batch
    const batches = [];

    for (let i = 0; i < profiles.length; i += batchSize) {
      batches.push(profiles.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const currentBatch = batches[batchIndex];

      sendLog(event, {
        username: '',
        message: `Đang xử lý batch ${batchIndex + 1}/${batches.length} với ${currentBatch.length} tài khoản`,
      });

      // open profile
      for (let index = 0; index < currentBatch.length; index++) {
        try {
          await openProfile(currentBatch[index].id);
        } catch (error) {
          saveReportTxt({
            reportName,
            note: 'Open profile failed',
            id: currentBatch[index].id,
            status: 'failed',
            username: currentBatch[index].username,
          });
        }
      }

      // get profile ws opened
      const openedProfiles = await getOpenedProfileList();
      await waitRandom(5000, 7000);


      // dismiss button instagram
      for (let index = 0; index < currentBatch.length; index++) {
        const profile = currentBatch[index];
        // TODO: Implement registration logic for each profile
        const openedProfile = openedProfiles.find((p) => p.profile_id === profile.id);
        if (openedProfile) {
          toggleDismissButton({ ws: openedProfile.ws });
        }
      }
      await waitRandom(5000, 10000);

      // setup main - chạy đồng thời
      const setupPromises = currentBatch.map(async (profile) => {
        const openedProfile = openedProfiles.find((p) => p.profile_id === profile.id);
        if (openedProfile) {
          try {
            await setupNewAccount({ ws: openedProfile.ws, username: profile.username }, event);
          } catch (error) {
            console.log(`Setup new account failed for profile ${profile.username}`, error);
            saveReportTxt({
              reportName,
              note: 'Setup new account failed',
              id: profile.id,
              status: 'failed',
              username: profile.username,
            });
          }
          await waitRandom(500, 1000);
        }
      });

      await Promise.allSettled(setupPromises);


      // Đợi giữa các batch để tránh rate limit
      if (batchIndex < batches.length - 1) {
        sendLog(event, {
          username: '',
          message: `Batch ${batchIndex + 1} hoàn thành, đợi 10 giây trước batch tiếp theo...`,
        });
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log('Bulk registration completed', profiles.length);
    sendLog(event, {
      username: '',
      message: `Đăng ký hàng loạt hoàn thành! Đã xử lý ${profiles.length} tài khoản`,
    });

  } catch (error) {
    console.error('Bulk registration error:', error);
    sendLog(event, {
      username: '',
      message: 'Đăng ký hàng loạt thất bại',
    });
  }
}

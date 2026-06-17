import { IpcMainEvent } from "electron";
import { saveReportTxt, waitRandom } from "./common";
import { sendLog } from "./event";
import { getOpenedProfileList, openProfile } from "./ixbrowser-api";
import { toggleDismissButton } from "./instagram";
import { setupNewAccount } from "./threads-profile";

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
        id: 0,
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
            await setupNewAccount({ id: profile.id, ws: openedProfile.ws, username: profile.username, isAuto: false, reportName }, event);
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
          id: 0,
          username: '',
          message: `Batch ${batchIndex + 1} hoàn thành, đợi 10 giây trước batch tiếp theo...`,
        });
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    console.log('Bulk registration completed', profiles.length);
    sendLog(event, {
      id: 0,
      username: '',
      message: `Đăng ký hàng loạt hoàn thành! Đã xử lý ${profiles.length} tài khoản`,
    });

  } catch (error) {
    console.error('Bulk registration error:', error);
    sendLog(event, {
      id: 0,
      username: '',
      message: 'Đăng ký hàng loạt thất bại',
    });
  }
}

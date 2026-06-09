import { ScheduleItem } from "./job";
import { closeProfile, getOpenedProfileList, getProfileList, openProfile } from "./ixbrowser-api";
import { loadMainConfig, waitRandom } from "./common";
import { clickEditLatestPostButton, clickPostButton } from "./threads-profile";
import { IpcMainEvent } from "electron";
import { getRandomFolder } from "./foder";
import { sendLog } from "./event";

const waitFor = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

async function runWithDelay(promises: (() => Promise<boolean>)[], delaySeconds: number) {
  const running: Promise<boolean>[] = [];
  for (let i = 0; i < promises.length; i++) {
    if (i > 0) await waitFor(delaySeconds);
    running.push(promises[i]());
  }
  return Promise.all(running);
}

// auto post
export const autoPost = async (item: ScheduleItem, event: IpcMainEvent) => {
  const config = await loadMainConfig();
  const captions = config?.captions || [];
  const mapFolder: Record<string, string> = {};
  const mapQuoteFolder: Record<string, string> = {};
  const excludedFolders: string[] = [];


  // get profile list
  const profiles = await getProfileList(item.groupId);
  sendLog(event, {
    username: '',
    message: `Tìm thấy ${profiles.length} profiles`,
  });

  // split profiles into batches
  const batches = [];
  for (let i = 0; i < profiles.length; i += item.batchSize) {
    batches.push(profiles.slice(i, i + item.batchSize));
  }
  sendLog(event, {
    username: '',
    message: `Chia thành ${batches.length} batch`,
  });

  // open each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    sendLog(event, {
      username: '',
      message: `Bắt đầu xử lý batch ${batchIndex + 1}/${batches.length} với ${batch.length} profiles`,
    });

    // Open profiles in batch
    for (const profile of batch) {
      try {
        await openProfile(profile.profile_id);
        sendLog(event, {
          username: profile.name,
          message: `Đã mở profile ${profile.profile_id}`,
        });
      } catch (error) {
        sendLog(event, {
          username: profile.name,
          message: `Lỗi khi mở profile ${profile.profile_id}: ${error}`,
        });
      }
    }

    // For post
    sendLog(event, {
      username: '',
      message: `Chờ ${5000 / 1000}-${10000 / 1000}s trước khi đăng bài`,
    });
    await waitRandom(5000, 10000);

    const profileOpened = await getOpenedProfileList();
    sendLog(event, {
      username: '',
      message: `Có ${profileOpened.length} profiles đang mở`,
    });

    const errorIds: number[] = [];

    const ddTest = async (type: 'post' | 'quote') => {
      const postProfileIds: number[] = [];
      const postTasks: (() => Promise<boolean>)[] = [];
      for (const profile of batch) {
        const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
        const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
        if (isOpened && profileInfo) {
          const randomFolder = type === 'post' ? getRandomFolder(item.folder, excludedFolders) : getRandomFolder(item.quoteFolder, excludedFolders);
          excludedFolders.push(randomFolder);
          if (type === 'post') {
            mapFolder[profile.profile_id] = randomFolder;
          } else {
            mapQuoteFolder[profile.profile_id] = randomFolder;
          }
          postProfileIds.push(profile.profile_id);
          postTasks.push(async () => {
            const success = await clickPostButton({
              id: profile.profile_id,
              ws: profileInfo.ws,
              username: profile.name,
              folder: randomFolder,
              type: type,
              mode: item.mode,
              captionData: captions.find(cap => cap.label === item.captionLabel)?.value || '',
              reportName: item.reportName,
              isAuto: true,
            }, event);
            sendLog(event, {
              username: profile.name,
              message: success
                ? `Đã bắt đầu đăng bài cho profile ${profile.profile_id}`
                : `Lỗi khi đăng bài cho profile ${profile.profile_id}`,
            });
            return success;
          });
        } else {
          errorIds.push(profile.profile_id);
          sendLog(event, {
            username: profile.name,
            message: `Profile ${profile.profile_id} không mở được, bỏ qua đăng bài`,
          });
        }
      }

      const postResults = await runWithDelay(postTasks, 3);
      postResults.forEach((result, index) => {
        const profileId = postProfileIds[index];
        if (!result && !errorIds.includes(profileId)) errorIds.push(profileId);
      });

      sendLog(event, {
        username: '',
        message: `Đã đăng bài cho ${postTasks.length - postResults.filter(r => !r).length}/${batch.length} profiles trong batch ${batchIndex + 1}`,
      });

      const editProfileIds: number[] = [];
      const editTasks: (() => Promise<boolean>)[] = [];
      for (const profile of batch) {
        if (type === 'post' && errorIds.includes(profile.profile_id)) continue;
        const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
        const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
        if (isOpened && profileInfo) {
          editProfileIds.push(profile.profile_id);
          editTasks.push(async () => {
            const success = await clickEditLatestPostButton({
              ws: profileInfo.ws,
              username: profile.name,
              folder: type === 'post' ? mapFolder[profile.profile_id] : mapQuoteFolder[profile.profile_id],
              mode: item.mode,
              reportName: item.reportName,
              id: profile.profile_id,
              isAuto: true,
            }, event);
            sendLog(event, {
              username: profile.name,
              message: success
                ? `Đã bắt đầu sửa bài cho profile ${profile.profile_id}`
                : `Lỗi khi sửa bài cho profile ${profile.profile_id}`,
            });
            return success;
          });
        }
      }

      const editResults = await runWithDelay(editTasks, 0.5);
      editResults.forEach((result, index) => {
        const profileId = editProfileIds[index];
        if (!result && !errorIds.includes(profileId)) errorIds.push(profileId);
      });

      sendLog(event, {
        username: '',
        message: `Đã sửa bài cho ${editTasks.length - editResults.filter(r => !r).length}/${batch.length} profiles trong batch ${batchIndex + 1}`,
      });

      await waitRandom(3000, 5000);
    }

    await ddTest('post');
    await ddTest('quote');

    // close profiles
    let closeCount = 0;
    for (const profile of batch.filter(p => !errorIds.includes(p.profile_id))) {
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        try {
          await closeProfile(profileInfo.profile_id);
          closeCount++;
          sendLog(event, {
            username: profile.name,
            message: `Đã đóng profile ${profile.profile_id}`,
          });
        } catch (error) {
          sendLog(event, {
            username: profile.name,
            message: `Lỗi khi đóng profile ${profile.profile_id}: ${error}`,
          });
        }
      }
    }

    sendLog(event, {
      username: '',
      message: `Đã đóng ${closeCount}/${batch.length} profiles. Hoàn thành batch ${batchIndex + 1}/${batches.length}`,
    });
  }

  sendLog(event, {
    username: '',
    message: `Hoàn thành auto post cho tất cả ${batches.length} batches`,
  });
}


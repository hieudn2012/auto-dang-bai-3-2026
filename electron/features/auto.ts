import { ScheduleItem } from "./job";
import { closeProfile, getOpenedProfileList, getProfileList, openProfile } from "./ixbrowser-api";
import { loadMainConfig, waitRandom } from "./common";
import { clickEditLatestPostButton, clickPostButton } from "./threads-profile";
import { IpcMainEvent } from "electron";
import { getRandomFolder } from "./foder";
import { sendLog } from "./event";

// auto post
export const autoPost = async (item: ScheduleItem, event: IpcMainEvent) => {
  const config = await loadMainConfig();
  const captions = config?.captions || [];

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
          username: profile.username,
          message: `Đã mở profile ${profile.profile_id}`,
        });
      } catch (error) {
        sendLog(event, {
          username: profile.username,
          message: `Lỗi khi mở profile ${profile.profile_id}: ${error}`,
        });
      }
    }

    // For post
    sendLog(event, {
      username: '',
      message: `Chờ ${5000/1000}-${10000/1000}s trước khi đăng bài`,
    });
    await waitRandom(5000, 10000);
    
    const profileOpened = await getOpenedProfileList();
    sendLog(event, {
      username: '',
      message: `Có ${profileOpened.length} profiles đang mở`,
    });

    let postCount = 0;
    for (const profile of batch) {
      // check if profile is opened
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        try {
          clickPostButton({
            ws: profileInfo.ws,
            username: profile.username,
            folder: getRandomFolder(item.folder),
            type: 'post',
            mode: item.mode,
            captionData: captions.find(cap => cap.label === item.captionLabel)?.value || '',
          }, event);
          postCount++;
          sendLog(event, {
            username: profile.username,
            message: `Đã bắt đầu đăng bài cho profile ${profile.profile_id}`,
          });
          await waitRandom(500, 2000);
        } catch (error) {
          sendLog(event, {
            username: profile.username,
            message: `Lỗi khi đăng bài cho profile ${profile.profile_id}: ${error}`,
          });
        }
      } else {
        sendLog(event, {
          username: profile.username,
          message: `Profile ${profile.profile_id} không mở được, bỏ qua đăng bài`,
        });
      }
    }
    
    sendLog(event, {
      username: '',
      message: `Đã đăng bài cho ${postCount}/${batch.length} profiles trong batch ${batchIndex + 1}`,
    });

    sendLog(event, {
      username: '',
      message: `Chờ ${60000/1000}-${80000/1000}s sau khi đăng bài`,
    });
    await waitRandom(60000, 80000);

    // For Edit
    let editCount = 0;
    for (const profile of batch) {
      // check if profile is opened
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        try {
          clickEditLatestPostButton({
            ws: profileInfo.ws,
            username: profile.username,
            folder: getRandomFolder(item.folder),
            mode: item.mode,
            reportName: item.reportName,
            id: profile.profile_id,
          }, event);
          editCount++;
          sendLog(event, {
            username: profile.username,
            message: `Đã bắt đầu sửa bài cho profile ${profile.profile_id}`,
          });
          await waitRandom(500, 2000);
        } catch (error) {
          sendLog(event, {
            username: profile.username,
            message: `Lỗi khi sửa bài cho profile ${profile.profile_id}: ${error}`,
          });
        }
      } else {
        sendLog(event, {
          username: profile.username,
          message: `Profile ${profile.profile_id} không mở được, bỏ qua sửa bài`,
        });
      }
    }
    
    sendLog(event, {
      username: '',
      message: `Đã sửa bài cho ${editCount}/${batch.length} profiles trong batch ${batchIndex + 1}`,
    });

    sendLog(event, {
      username: '',
      message: `Chờ ${60000/1000}-${80000/1000}s sau khi sửa bài`,
    });
    await waitRandom(60000, 80000);

    // close profiles
    let closeCount = 0;
    for (const profile of batch) {
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        try {
          await closeProfile(profileInfo.profile_id);
          closeCount++;
          sendLog(event, {
            username: profile.username,
            message: `Đã đóng profile ${profile.profile_id}`,
          });
        } catch (error) {
          sendLog(event, {
            username: profile.username,
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


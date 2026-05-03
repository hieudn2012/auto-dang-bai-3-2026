import { ScheduleItem } from "./job";
import { closeProfile, getOpenedProfileList, getProfileList, openProfile } from "./ixbrowser-api";
import { waitRandom } from "./common";
import { clickEditLatestPostButton, clickPostButton } from "./threads-profile";
import { IpcMainEvent } from "electron";
import { getRandomFolder } from "./foder";

// auto post
export const autoPost = async (item: ScheduleItem, event: IpcMainEvent) => {
  // get profile list
  const profiles = await getProfileList(item.groupId);

  // split profiles into batches
  const batches = [];
  for (let i = 0; i < profiles.length; i += item.batchSize) {
    batches.push(profiles.slice(i, i + item.batchSize));
  }

  // open each batch
  for (const batch of batches) {
    for (const profile of batch) {
      await openProfile(profile.profile_id);
    }

    // For post
    await waitRandom(5000, 10000);
    const profileOpened = await getOpenedProfileList();
    for (const profile of batch) {
      // check if profile is opened
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        clickPostButton({
          ws: profileInfo.ws,
          username: profile.username,
          folder: getRandomFolder(item.folder),
          type: 'post',
          mode: item.mode,
        }, event);
        await waitRandom(500, 2000);
      }
    }
    await waitRandom(60000, 80000);

    // For Edit
    for (const profile of batch) {
      // check if profile is opened
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        clickEditLatestPostButton({
          ws: profileInfo.ws,
          username: profile.username,
          folder: getRandomFolder(item.folder),
          mode: item.mode,
          reportName: '',
          id: profile.profile_id,
        }, event);
        await waitRandom(500, 2000);
      }
    }
    await waitRandom(60000, 80000);

    // close profiles
    for (const profile of batch) {
      const isOpened = profileOpened.some((p) => p.profile_id === profile.profile_id);
      const profileInfo = profileOpened.find((p) => p.profile_id === profile.profile_id);
      if (isOpened && profileInfo) {
        await closeProfile(profileInfo.profile_id);
        console.log(`Profile ${profile.profile_id} is closed`);
      }
    }
  }
}


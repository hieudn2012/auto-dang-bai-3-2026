import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { useGetNativeClientProfileOpenedList, useGetProfiles, useOpenProfile } from "@/services/profiles";
import { windowInstance } from "@/services/window";
import { UserInfo } from "electron/types";
import { find, map, split } from "lodash";
import { useState } from "react";
import { toast } from "react-toastify";
import { Group } from "./Group";

const shortName = (name: string) => {
  const maxLength = 10;
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.substring(0, maxLength / 2)}...${name.substring(name.length - maxLength / 2)}`;
}

type UserMap = {
  [key: string]: {
    profile_id: number;
    name: string;
    path: string;
    link: string;
    cap: string;
  };
}

const waitFor = (timer: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, timer * 1000);
  })
}

const Profiles = () => {
  const [group_id, setGroupId] = useState(0);
  const [{ data }] = useGetProfiles(group_id);
  const [{ data: openedList, refetch }] = useGetNativeClientProfileOpenedList();
  const [userMap, setUserMap] = useState<UserMap>({});
  const [open, setOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ cap: string, link: string, path: string, profile_id: number }>({ cap: '', link: '', path: '', profile_id: 0 });
  const [totalBrowsers, setTotalBrowsers] = useState(0);

  const handlePost = ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => {
    windowInstance.api.threadsPost({ wsUrl, username, folder });
  }

  const handleRandomFolder = async (profile_id: number) => {
    const { name, path } = await windowInstance.api.randomFolderNotUsed(
      map(userMap, (item) => item.path)
    );
    setUserMap(prev => ({ ...prev, [profile_id]: { profile_id, name, path } }));
  }

  const handleOpenFolder = async (path: string) => {
    await windowInstance.api.openFolder(path);
  }

  const handleShowInfo = async (path: string, profile_id: number) => {
    const { cap, link } = await windowInstance.api.getFolderInfo(path);
    setCurrentFolder({ cap, link, path, profile_id });
    setOpen(true);
  }

  const clickPostButton = async (info: UserInfo) => {
    await windowInstance.api.clickPostButton(info);
  }

  const clickEditLatestPostButton = async (info: UserInfo) => {
    await windowInstance.api.clickEditLatestPostButton(info);
  }

  const saveHistoryTxt = async ({ profile_id, folder }: { profile_id: number, folder: string }) => {
    await windowInstance.api.saveHistoryTxt({ profile_id, folder });
    toast.success('Đã đánh dấu lịch sử');
    setOpen(false);
  }

  const handleCopyLink = async (link: string) => {
    // list link split line
    const list = split(link, '\n');
    const threadsLink = find(list, (item) => item.includes(`https://threads-store`));
    if (threadsLink) {
      await navigator.clipboard.writeText(`✅ Link here: ${threadsLink}`);
      toast.success('Đã copy threads-store link');
    } else {
      toast.error('Không tìm thấy link threads-store');
      return;
    }
  }

  const handleRefetch = async () => {
    await refetch();
    map(userMap, async (userItem) => {
      const { cap, link } = await windowInstance.api.getFolderInfo(userItem.path);
      setUserMap(prev => ({ ...prev, [userItem.profile_id]: { ...userItem, cap, link } }));
    });
    toast.success('Đã lấy thông tin folder');
  }

  const bulkRandomProduct = async (ids: number[]) => {
    ids.forEach(async (id) => {
      await handleRandomFolder(id);
    });
  }

  const bulkSaveHistory = async (ids: number[]) => {
    ids.forEach(async (id) => {
      await saveHistoryTxt({ profile_id: id, folder: userMap?.[id]?.path });
    });
  }

  return (
    <Layout>
      <div>
        <div className="my-5 flex gap-2">
          <Button onClick={handleRefetch}>
            <i className="fa-solid fa-arrows-rotate"></i>
          </Button>
          <Button onClick={() => bulkRandomProduct(map(data?.data?.data?.data, (profile) => profile.profile_id))}>Random product</Button>
          <Button onClick={() => bulkSaveHistory(map(data?.data?.data?.data, (profile) => profile.profile_id))}>Save history</Button>
          <Group value={group_id} onChange={setGroupId} />
        </div>
        <table className="w-full table-auto border-collapse border border-gray-400">
          <thead className="text-left">
            <tr>
              <th className="border border-gray-300 p-4">Check</th>
              <th className="border border-gray-300 p-4">ID</th>
              <th className="border border-gray-300 p-4">Name</th>
              <th className="border border-gray-300 p-4">Opened</th>
              <th className="border border-gray-300 p-4">Config</th>
              <th className="border border-gray-300 p-4">Manual</th>
              <th className="border border-gray-300 p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {map(data?.data?.data?.data, (profile) => (
              <tr key={profile.profile_id}>
                <td className="border border-gray-300 p-4">
                  <input type="checkbox" className="w-6 h-6" />
                </td>
                <td className="border border-gray-300 p-4">{profile.profile_id}</td>
                <td className="border border-gray-300 p-4">{profile.name}</td>
                <td className="border border-gray-300 p-4">{openedList?.[profile.profile_id]?.open_time || 'N/A'}</td>
                <td className="border border-gray-300 p-4">
                  <div className="flex gap-1 items-center">
                    {shortName(userMap?.[profile.profile_id]?.name || 'N/A')}
                  </div>
                </td>
                <td className="border border-gray-300 p-4">
                  <div className="flex gap-1 flex-wrap">
                    <Button onClick={() => handleRandomFolder(profile.profile_id)}>
                      <i className="fa-solid fa-arrow-rotate-right"></i>
                    </Button>
                    <Button onClick={() => handleShowInfo(userMap?.[profile.profile_id]?.path, profile.profile_id)}>
                      <i className="fa-regular fa-eye"></i>
                    </Button>
                    <Button onClick={() => handleCopyLink(userMap?.[profile.profile_id]?.link)}>
                      <i className="fa-solid fa-link"></i>
                    </Button>
                    <Button onClick={() => clickPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: userMap?.[profile.profile_id]?.path, type: 'post' })}>
                      <i className="fa-solid fa-circle-play"></i>
                    </Button>
                    <Button onClick={() => clickPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: userMap?.[profile.profile_id]?.path, type: 'quote' })}>
                      <i className="fa-solid fa-retweet"></i>
                    </Button>
                    <Button
                      onClick={() =>
                        clickEditLatestPostButton({
                          ws: openedList?.[profile.profile_id]?.ws,
                          username: profile.name,
                          folder: userMap?.[profile.profile_id]?.path,
                          type: 'post',
                        })
                      }
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </Button>
                  </div>
                </td>
                <td className="border border-gray-300 p-4">
                  <div className="flex gap-1">
                    <OpenProfle id={profile.profile_id} total={totalBrowsers} onOpen={() => setTotalBrowsers(prev => prev + 1)} />
                    <Button
                      onClick={() =>
                        handlePost({
                          wsUrl: openedList?.[profile.profile_id]?.ws,
                          username: profile.name,
                          folder: ``,
                        })
                      }
                    >
                      <i className="fa-regular fa-circle-play"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <div className="p-4 flex flex-col gap-4">
          <div className="h-[400px]">
            <TextArea value={currentFolder.cap} />
          </div>
          <TextArea value={currentFolder.link} />
          <div className="flex gap-2">
            <Button onClick={() => handleOpenFolder(currentFolder.path)}>Mở folder</Button>
            <Button onClick={() => handleCopyLink(currentFolder.link)}>Copy link</Button>
            <Button onClick={() => saveHistoryTxt({ profile_id: currentFolder.profile_id, folder: currentFolder.path })}>Đánh dấu lịch sử</Button>
          </div>
        </div>
      </Dialog>
    </Layout>
  )
}

const OpenProfle = ({ id, total, onOpen }: { id: number, total: number, onOpen?: () => void }) => {
  const { mutate: openProfile, isPending: isOpenProfilePending } = useOpenProfile();
  return <Button onClick={() => { openProfile({ id, index: total }); onOpen?.() }} loading={isOpenProfilePending}><i className="fa-brands fa-chrome"></i></Button>
}

export default Profiles;
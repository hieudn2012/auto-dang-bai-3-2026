import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { useCloseProfile, useGetNativeClientProfileOpenedList, useGetProfiles, useOpenProfile } from "@/services/profiles";
import { windowInstance } from "@/services/window";
import { UserInfo } from "electron/types";
import { find, map, split } from "lodash";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Group } from "./Group";
import Input from "@/components/Input";
import ReportModal from "./Report";
import ScheduleModal from "./Schedule";

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
  const [group_id, setGroupId] = useState(-1);
  const [{ data }] = useGetProfiles(group_id);
  const [{ data: openedList, refetch }] = useGetNativeClientProfileOpenedList();
  const { mutate: openProfile } = useOpenProfile();
  const { mutate: closeProfile } = useCloseProfile();
  const [userMap, setUserMap] = useState<UserMap>({});
  const [open, setOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ cap: string, link: string, path: string, profile_id: number }>({ cap: '', link: '', path: '', profile_id: 0 });
  const [totalBrowsers, setTotalBrowsers] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchSize, setBatchSize] = useState(20);
  const [reportName, setReportName] = useState('');

  const handlePost = ({ wsUrl, username, folder }: { wsUrl: string, username: string, folder: string }) => {
    windowInstance.api.threadsPost({ wsUrl, username, folder });
  }

  const handleRandomFolder = async (profile_id: number) => {
    const currentPaths = map(userMap, (item) => item.path);
    const { name, path } = await windowInstance.api.randomFolderNotUsed(currentPaths);
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

  const setupNewAccount = async (ws: string, username: string) => {
    await windowInstance.api.setupNewAccount({ ws, username });
  }

  const handleCopyWs = async (ws: string) => {
    await navigator.clipboard.writeText(ws);
    toast.success('Đã copy WebSocket URL');
  }

  const handleBulkOpenProfile = async (ids: number[]) => {
    for (const id of ids) {
      openProfile({ id, index: 0 });
      await waitFor(3);
    }
  }

  const handleBulkClose = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (!!openedList?.[id]) {
        closeProfile({ profile_id: id });
        await waitFor(1);
      }
    }
  }

  const handleBulkPost = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (!!openedList?.[id]?.ws) {
        document.getElementById(`post-button-${id}`)?.click();
        await waitFor(0.2)
      }
    }
  }

  const handleBulkEdit = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (!!openedList?.[id]?.ws) {
        document.getElementById(`edit-folder-${id}`)?.click();
        await waitFor(0.2);
      }
    }
  }

  const handleBulkRandom = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (!!openedList?.[id]?.ws) {
        document.getElementById(`random-folder-${id}`)?.click();
        await waitFor(0.1);
      }
    }
  }


  const handleAutoPost = async (ids: number[]) => {
    await handleBulkOpenProfile(ids);
    await waitFor(10);
    toast.success('Đã mở profile.');

    const { data } = await refetch();
    await waitFor(5);
    toast.success('Đã refetch.');

    await handleBulkRandom(ids, data);
    await waitFor(10);
    toast.success('Đã random folder.');

    await handleBulkPost(ids, data);
    await waitFor(60);
    toast.success('Đã hoàn thành post.');

    await handleBulkEdit(ids, data);
    await waitFor(50);
    toast.success('Đã hoàn thành edit.');

    await handleBulkClose(ids, data);
    toast.success('Đã đóng profile.');
  }

  const handleBatch = async () => {
    const allSelectedIds = [...selectedIds];
    const batches: number[][] = [];

    // Split into batches
    for (let i = 0; i < allSelectedIds.length; i += batchSize) {
      batches.push(allSelectedIds.slice(i, i + batchSize));
    }

    console.log(`Processing ${allSelectedIds.length} users in ${batches.length} batches of max ${batchSize} users each`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} users:`, batch);

      // Set current batch
      await handleAutoPost(batch);


      // Wait between batches (optional cooldown)
      if (i < batches.length - 1) {
        console.log(`Batch ${i + 1} completed, waiting before next batch...`);
        await waitFor(10);
      }
    }

    toast.success(`Đã hoàn thành tất cả ${batches.length} batches với ${allSelectedIds.length} users`);
  }

  useEffect(() => {
    const handleToast = (_event: any, arg: any) => {
      const { type, message, username } = arg as { type: 'success' | 'error' | 'info', message: string, username?: string };
      const el = document.getElementById(`message-${username}`);
      el && (el.textContent = message);
    }

    //@ts-ignore
    window.ipcRenderer.on('show-toast', handleToast)

    return () => {
      //@ts-ignore
      window.ipcRenderer.off('show-toast', handleToast)
    }
  }, [])

  return (
    <Layout>
      <div>

        <div className="flex justify-between mb-2">
          <div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()}>
                <i className="fa-solid fa-arrows-rotate"></i>
              </Button>
              <Group value={group_id} onChange={setGroupId} />
            </div>
            <div className="flex gap-2 mt-2">
              <Button onClick={() => handleBulkOpenProfile(selectedIds)} tooltip="Open profile">
                <i className="fa-solid fa-folder-open"></i>
              </Button>
              <Button onClick={() => handleBulkRandom(selectedIds, openedList)} tooltip="Random">
                <i className="fa-solid fa-random"></i>
              </Button>
              <Button onClick={() => handleBulkPost(selectedIds, openedList)} tooltip="Post">
                <i className="fa-solid fa-paper-plane"></i>
              </Button>
              <Button onClick={() => handleBulkEdit(selectedIds, openedList)} tooltip="Edit">
                <i className="fa-solid fa-pen-to-square"></i>
              </Button>
              <Button onClick={() => handleBulkClose(selectedIds, openedList)} tooltip="Close">
                <i className="fa-solid fa-xmark"></i>
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-2 items-start">
              <Input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Report name" />
              <Input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
            </div>
            <Button onClick={handleBatch} tooltip="Batch">
              <i className="fa-solid fa-play"></i>
            </Button>
            <ReportModal reportName={reportName} />
            <ScheduleModal onSchedule={() => console.log('kaka')} />
          </div>
        </div>
        <table className="w-full table-auto border-collapse border border-gray-400 text-sm rounded-lg overflow-hidden">
          <thead className="text-left">
            <tr>
              <th className="border border-gray-300 p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" className="w-4 h-4"
                    checked={selectedIds.length === data?.data?.data?.data?.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(map(data?.data?.data?.data, (profile) => profile.profile_id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                  <span>Select all</span>
                </div>
              </th>
              <th className="border border-gray-300 p-4">Name</th>
              <th className="border border-gray-300 p-4">Info</th>
              <th className="border border-gray-300 p-4">Message</th>
              <th className="border border-gray-300 p-4">Manual</th>
              <th className="border border-gray-300 p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {map(data?.data?.data?.data, (profile, index) => (
              <tr key={profile.profile_id}>
                <td className="border border-gray-300 p-4">
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedIds.includes(profile.profile_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, profile.profile_id]);
                        } else {
                          setSelectedIds(selectedIds.filter((id) => id !== profile.profile_id));
                        }
                      }}
                    />
                    <p className="font-bold">{index + 1}</p>
                    <p>{profile.profile_id}</p>
                  </div>
                </td>
                <td className="border border-gray-300 p-4">
                  <div>
                    <p>{profile.name}</p>
                    <p className="text-xs">{`${profile.proxy_ip}:${profile.proxy_port}`}</p>
                  </div>
                </td>
                <td className="border border-gray-300 p-4">
                  <div>
                    <div>
                      {openedList?.[profile.profile_id]?.open_time ? (
                        <i className="fa-solid fa-check text-green-500"></i>
                      ) : (
                        <i className="fa-solid fa-xmark text-red-500"></i>
                      )}

                    </div>
                    <div className="text-xs">
                      {shortName(userMap?.[profile.profile_id]?.name || 'N/A')}
                    </div>
                  </div>
                </td>
                <td className="border border-gray-300 p-4">
                  <p id={`message-${profile.name}`}></p>
                </td>

                <td className="border border-gray-300 p-4">
                  <div className="flex gap-1 flex-wrap">
                    <Button id={`random-folder-${profile.profile_id}`} onClick={() => handleRandomFolder(profile.profile_id)} tooltip="Random folder">
                      <i className="fa-solid fa-arrow-rotate-right"></i>
                    </Button>
                    <Button onClick={() => handleShowInfo(userMap?.[profile.profile_id]?.path, profile.profile_id)} tooltip="Show info">
                      <i className="fa-regular fa-eye"></i>
                    </Button>
                    <Button onClick={() => handleCopyWs(openedList?.[profile.profile_id]?.ws || '')} tooltip="Copy ws">
                      <i className="fa-solid fa-copy"></i>
                    </Button>
                    <Button
                      id={`post-button-${profile.profile_id}`}
                      tooltip="Post"
                      onClick={() => clickPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: userMap?.[profile.profile_id]?.path, type: 'post' })}>
                      <i className="fa-solid fa-circle-play"></i>
                    </Button>
                    <Button onClick={() => clickPostButton({ ws: openedList?.[profile.profile_id]?.ws, username: profile.name, folder: userMap?.[profile.profile_id]?.path, type: 'quote' })} tooltip="Quote">
                      <i className="fa-solid fa-retweet"></i>
                    </Button>
                    <Button onClick={() => setupNewAccount(openedList?.[profile.profile_id]?.ws, profile.name)} tooltip="Setup new account">
                      <i className="fa-solid fa-user-plus"></i>
                    </Button>
                    <Button
                      id={`edit-folder-${profile.profile_id}`}
                      tooltip="Edit folder"
                      onClick={() =>
                        clickEditLatestPostButton({
                          ws: openedList?.[profile.profile_id]?.ws,
                          username: profile.name,
                          folder: userMap?.[profile.profile_id]?.path,
                          type: 'post',
                          id: profile.profile_id,
                          reportName,
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
                      tooltip="Post"
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
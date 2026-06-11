import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Layout from "@/components/Layout";
import Select from "@/components/Select";
import TextArea from "@/components/TextArea";
import {
  useCloseProfile,
  useGetNativeClientProfileOpenedList,
  useGetProfiles,
  useOpenProfile
} from "@/services/profiles";
import { windowInstance } from "@/services/window";
import { find, map, split } from "lodash";
import { useEffect, useState } from "react";
import { toast } from "@/components/ToastContainer";
import Input from "@/components/Input";
import Mode from "@/components/Mode";
import LoadingWraper from "@/components/LoadingWraper";
import { Group } from "@/components/Group";
import ProxyModal from "./ProxyModal";
import { ReportType } from "electron/features/report";
import { DeletePostOptions } from "electron/features/threads-delete";
import Switch from "@/components/Switch";
import { ProfileResult } from "electron/features/profile";
import { Lang } from "../Schedule";

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
    username: string;
    quotePath: string;
    quoteName: string;
  };
}

const waitFor = (timer: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('');
    }, timer * 1000);
  })
}

async function runWithDelay(promises: (() => Promise<any>)[], delaySeconds: number) {
  const running: Promise<any>[] = [];
  for (let i = 0; i < promises.length; i++) {
    if (i > 0) await waitFor(delaySeconds);
    running.push(promises[i]());
  }
  return Promise.all(running);
}

const Profiles = () => {
  const [group_id, setGroupId] = useState(-1);
  const [{ data, isPending, refetch: refetchProfiles }] = useGetProfiles(group_id);
  const [{ data: openedList, refetch: refetchOpenedList }] = useGetNativeClientProfileOpenedList();
  const { mutate: openProfile } = useOpenProfile();
  const { mutate: closeProfile } = useCloseProfile();
  const [userMap, setUserMap] = useState<UserMap>({});
  const [open, setOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ cap: string, link: string, path: string, profile_id: number }>({ cap: '', link: '', path: '', profile_id: 0 });
  const [totalBrowsers, setTotalBrowsers] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchSize, setBatchSize] = useState(20);
  const [reportName, setReportName] = useState('');
  const [mode, setMode] = useState<'default' | 'affiliate'>('affiliate');
  const [lang, setLang] = useState<Lang>('en');
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [isAuto, setIsAuto] = useState(false);
  const [profileResult, setProfileResult] = useState<ProfileResult>({});
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const profiles = data?.data?.data?.data || [];

  const handleRandomFolder = async (profile_id: number) => {
    const profile = profiles.find((p: any) => p.profile_id === profile_id);
    const currentPaths = map(userMap, (item) => item.path);
    const quoteCurrentPaths = map(userMap, (item) => item.quotePath);
    const { name, path } = await windowInstance.api.randomFolderNotUsed(currentPaths);
    const quoteFolder = await windowInstance.api.randomQuoteFolderNotUsed(quoteCurrentPaths);
    const newData = ({
      ...userMap, [profile_id]:
      {
        profile_id,
        name,
        path,
        username: profile.name,
        quotePath: quoteFolder.path,
        quoteName: quoteFolder.name
      }
    });
    setUserMap(newData);
    return newData;
  }

  const handleOpenFolder = async (path: string) => {
    await windowInstance.api.openFolder(path);
  }

  const handleRangeSelect = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    const allProfiles = data?.data?.data?.data || [];

    if (isNaN(start) || isNaN(end) || start < 1 || end > allProfiles.length || start > end) {
      toast.error('Invalid range. Please enter valid numbers.');
      return;
    }

    const rangeProfiles = allProfiles.slice(start - 1, end);
    const rangeIds = rangeProfiles.map((profile: any) => profile.profile_id);
    setSelectedIds(prev => [...new Set([...prev, ...rangeIds])]);
    setShowRangeModal(false);
    setRangeStart('');
    setRangeEnd('');
    toast.success(`Selected ${rangeIds.length} profiles from range ${start}-${end}`);
  }

  const handleShowInfo = async (path: string, profile_id: number) => {
    const { cap, link } = await windowInstance.api.getFolderInfo(path);
    setCurrentFolder({ cap, link, path, profile_id });
    setOpen(true);
  }

  const clickPostButton = async (id: number, type: ReportType, openList: any, usMap: UserMap) => {
    try {
      const data = {
        ws: openList?.[id]?.ws,
        username: usMap[id]?.username,
        folder: type === 'quote' ? usMap?.[id]?.quotePath : usMap?.[id]?.path,
        type,
        mode,
        id,
        isAuto,
        reportName,
        captionData: '',
      }
      await windowInstance.api.clickPostButton(data);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Post failed');
      return false;
    }
  }

  const clickEditLatestPostButton = async (id: number, opList: any, usMap: UserMap, type: ReportType) => {
    try {
      const data = {
        ws: opList?.[id]?.ws,
        username: usMap[id]?.username,
        folder: type === 'quote' ? usMap?.[id]?.quotePath : usMap?.[id]?.path,
        type: 'edit' as ReportType,
        id,
        reportName,
        mode,
        isAuto,
        captionData: '',
        lang: 'vi' as Lang
      }
      await windowInstance.api.clickEditLatestPostButton(data);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Edit failed');
      return false;
    }
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
    await windowInstance.api.saveMainConfig({ wsUrl: ws });
    toast.success('Đã copy WebSocket URL');
  }

  const handleGenerateProfile = async (sex: 'male' | 'female', id: number) => {
    await windowInstance.api.generateProfile({ sex, id });
    toast.success('Đã tạo profile mới');
  }

  const handleBulkOpenProfile = async (ids: number[]) => {
    for (const id of ids) {
      openProfile({ id, index: 0 });
      await waitFor(3);
    }
  }

  const handleBulkClose = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (openedList?.[id]) {
        closeProfile({ profile_id: id });
        await waitFor(1);
      }
    }
  }

  const handleBulkPost = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (openedList?.[id]?.ws) {
        clickPostButton(id, 'post', openedList, userMap);
        await waitFor(3)
      }
    }
  }

  const handleBulkQuote = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (openedList?.[id]?.ws) {
        clickPostButton(id, 'quote', openedList, userMap);
        await waitFor(3)
      }
    }
  }

  const handleBulkEdit = async (ids: number[], openedList: any, type: ReportType) => {
    for (const id of ids) {
      if (openedList?.[id]?.ws) {
        clickEditLatestPostButton(id, openedList, userMap, type);
        await waitFor(0.5);
      }
    }
  }

  const handleBulkRandom = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (openedList?.[id]?.ws) {
        const randomBtn = document.getElementById(`random-folder-${id}`);
        randomBtn?.click();
        await waitFor(0.1);
      }
    }
  }

  const handleBulkSetupNewAccount = async (ids: number[], openedList: any) => {
    for (const id of ids) {
      if (openedList?.[id]?.ws) {
        document.getElementById(`setup-new-account-${id}`)?.click();
        await waitFor(3);
      }
    }
  }

  const handleBulkToggleDismissButton = async (ids: number[], openedList: any) => {
    const wss = ids.map(id => openedList?.[id]?.ws).filter(ws => !!ws) || [];
    if (wss.length > 0) {
      await windowInstance.api.bulkToggleDismissButton({ wss: wss.map(ws => ({ ws })) });
      toast.success('Đã xử lý dismiss button cho các profile được chọn.');
    } else {
      toast.error('Không có profile nào đang mở để xử lý.');
    }
  }

  const handleDeletePost = (params: DeletePostOptions) => {
    windowInstance.api.deletePost(params);
  }

  const handleAutoPost = async (ids: number[]) => {
    const errorIds: number[] = [];
    await handleBulkOpenProfile(ids);
    await waitFor(2);
    toast.success('Đã mở profile.');

    const { data: openList } = await refetchOpenedList();
    await waitFor(10);
    toast.success('Đã refetch.');

    await handleBulkRandom(ids, openList);
    const usMap = {} as any;
    for (const id of ids) {
      const content = document.getElementById(`profile-info-${id}`)?.textContent || '';
      const [username, path, quotePath] = split(content, '||');
      usMap[id] = {
        path,
        username,
        quotePath
      }
    }

    await waitFor(5);
    toast.success('Đã random folder.');

    const postPromiseFactories = ids.map(id => () => clickPostButton(id, 'post', openList, usMap));
    const postResults = await runWithDelay(postPromiseFactories, 3);
    postResults.forEach((result, index) => {
      if (!result) errorIds.push(ids[index]);
    });
    toast.success(`Đã hoàn thành post.`);

    const editPostPromiseFactories = ids.filter(id => !errorIds.includes(id)).map(id => () => clickEditLatestPostButton(id, openList, usMap, 'post'));
    const editPostResults = await runWithDelay(editPostPromiseFactories, 0.5);
    editPostResults.forEach((result, index) => {
      if (!result) errorIds.push(ids[index]);
    });
    toast.success('Đã hoàn thành edit post.');

    const quotePromiseFactories = ids.map(id => () => clickPostButton(id, 'quote', openList, usMap));
    const quoteResults = await runWithDelay(quotePromiseFactories, 3);
    quoteResults.forEach((result, index) => {
      if (!result) errorIds.push(ids[index]);
    });
    toast.success('Đã hoàn thành quote.');

    const editLatestQuotePromiseFactories = ids.map(id => () => clickEditLatestPostButton(id, openList, usMap, 'quote'));
    const editLatestQuoteResults = await runWithDelay(editLatestQuotePromiseFactories, 0.5);
    editLatestQuoteResults.forEach((result, index) => {
      if (!result) errorIds.push(ids[index]);
    });
    toast.success('Đã hoàn thành edit quote.');

    await handleBulkClose(ids.filter(id => !errorIds.includes(id)), openList);
    toast.success('Đã đóng all profile.');
  }

  const handleBatch = async () => {
    if (!reportName) {
      toast.error('Vui lòng điền report name trước khi batch.');
      return;
    }
    const allSelectedIds = [...selectedIds];
    const batches: number[][] = [];

    // Split into batches
    for (let i = 0; i < allSelectedIds.length; i += batchSize) {
      batches.push(allSelectedIds.slice(i, i + batchSize));
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Set current batch
      await handleAutoPost(batch);

      // Wait between batches (optional cooldown)
      if (i < batches.length - 1) {
        await waitFor(10);
      }
    }

    toast.success(`Đã hoàn thành tất cả ${batches.length} batches với ${allSelectedIds.length} users`);
  }

  const handleLoadProfilesInfo = async () => {
    const profiles = await windowInstance.api.getProfiles();
    setProfileResult(profiles);
    toast.success('Đã tải thông tin profile');
  }

  const handleChangeProfileInfo = async (id: number) => {
    await windowInstance.api.changeProfileInfo({
      ws: openedList?.[id]?.ws,
      id,
      username: userMap[id]?.username,
    });
    toast.success('Đã thay đổi thông tin profile');
  }

  useEffect(() => {
    const handleToast = (_event: any, arg: any) => {
      const { message, id } = arg as { type: 'success' | 'error' | 'info', message: string, id?: number };
      const el = document.getElementById(`message-${id}`);
      el && (el.textContent = message);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.ipcRenderer.on('show-toast', handleToast)

    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      window.ipcRenderer.off('show-toast', handleToast)
    }
  }, [])

  useEffect(() => {
    const loadMainConfig = async () => {
      const mainConfig = await windowInstance.api.loadMainConfig();
      if (mainConfig?.profile?.groupId) {
        setGroupId(mainConfig.profile.groupId);
      }
    };
    loadMainConfig();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="fixed bg-white z-10 top-0 left-[116px] right-[56px]">
          <div>
            <div className="flex justify-between items-center px-2 py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <i className="fas fa-users text-blue-500 mr-3"></i>
                  Profile Management
                </h1>
                <p className="text-gray-600">
                  Quản lý và điều khiển các profile tài khoản mạng xã hội
                </p>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              {/* Left Controls */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => refetchOpenedList()} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white">
                    <i className="fa-solid fa-arrows-rotate mr-2"></i>
                    Refresh
                  </Button>
                  <div className="flex-1 min-w-[200px]">
                    <Group
                      value={group_id}
                      onChange={(value) => {
                        setGroupId(value);
                        windowInstance.api.saveMainConfig({ profile: { groupId: value } });
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Mode
                      value={mode}
                      onChange={setMode}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as Lang)}
                      options={[
                        { value: 'vi', label: 'Vietnamese' },
                        { value: 'en', label: 'English' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span>Auto</span>
                    </label>
                    <Switch enabled={isAuto} onChange={(enabled) => setIsAuto(enabled)} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleBulkOpenProfile(selectedIds)} tooltip="Open profile" className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-sm">
                    <i className="fa-solid fa-folder-open mr-1"></i>
                    Open
                  </Button>
                  <Button onClick={() => handleBulkRandom(selectedIds, openedList)} tooltip="Random" className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm">
                    <i className="fa-solid fa-random mr-1"></i>
                    Random
                  </Button>
                  <Button onClick={() => handleBulkPost(selectedIds, openedList)} tooltip="Post" className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm" disabled={!reportName}>
                    <i className="fa-solid fa-paper-plane mr-1"></i>
                    Post
                  </Button>
                  <Button onClick={() => handleBulkQuote(selectedIds, openedList)} tooltip="Quote" className="px-2 py-1 bg-pink-500 hover:bg-pink-600 text-white text-sm" disabled={!reportName}>
                    <i className="fa-solid fa-quote-right mr-1"></i>
                    Quote
                  </Button>
                  <Button onClick={() => handleBulkEdit(selectedIds, openedList, 'post')} tooltip="Edit" className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm" disabled={!reportName}>
                    <i className="fa-solid fa-pen-to-square mr-1"></i>
                    Edit Post
                  </Button>
                  <Button onClick={() => handleBulkEdit(selectedIds, openedList, 'quote')} tooltip="Edit" className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm" disabled={!reportName}>
                    <i className="fa-solid fa-pen-to-square mr-1"></i>
                    Edit Quote
                  </Button>
                  <Button onClick={() => handleBulkSetupNewAccount(selectedIds, openedList)} tooltip="Setup New Account" className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    <i className="fa-solid fa-user-plus mr-1"></i>
                    Setup
                  </Button>
                  <Button
                    onClick={() => setShowProxyModal(true)}
                    tooltip="Update Proxy"
                    className="px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white text-sm"
                    disabled={selectedIds.length === 0}
                  >
                    <i className="fa-solid fa-shield-alt mr-1"></i>
                    Proxy
                  </Button>
                  <Button onClick={() => handleBulkClose(selectedIds, openedList)} tooltip="Close" className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-sm">
                    <i className="fa-solid fa-xmark mr-1"></i>
                    Close
                  </Button>
                  <Button onClick={() => handleBulkToggleDismissButton(selectedIds, openedList)} tooltip="Toggle Dismiss Button" className="px-2 py-1 bg-pink-500 hover:bg-pink-600 text-white text-sm">
                    <i className="fa-solid fa-hand mr-1"></i>
                    Dismiss
                  </Button>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Report name"
                    className="w-40"
                  />
                  <Select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    options={[
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 5, label: '5' },
                      { value: 10, label: '10' },
                      { value: 20, label: '20' },
                      { value: 30, label: '30' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                    ]}
                    className="w-20"
                  />
                </div>
                <Button
                  onClick={handleBatch} tooltip="Batch"
                  disabled={!reportName}
                  className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  <i className="fa-solid fa-play mr-2"></i>
                  Batch
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-[200px]">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded"
                  checked={selectedIds.length === (data?.data?.data?.data?.length || 0)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(map(data?.data?.data?.data || [], (profile) => profile.profile_id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
                <span className="font-medium text-gray-700">
                  Select All ({selectedIds.length} selected)
                </span>
                <Button
                  onClick={() => setShowRangeModal(true)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <i className="fa-solid fa-list-ol mr-1"></i>
                  Select Range
                </Button>
                <Button
                  onClick={() => handleLoadProfilesInfo()}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <i className="fa-solid fa-download mr-1" />
                  Load Profiles Info
                </Button>
                <div>
                  <Select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as 'male' | 'female')}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                    ]}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Total: {data?.data?.data?.data?.length || 0} profiles
              </div>
            </div>
          </div>

          {/* Profile Grid */}
          <LoadingWraper loading={isPending}>
            {(() => {
              const allProfiles = data?.data?.data?.data || [];

              return (
                <>
                  <div className="divide-y divide-gray-200">
                    {map(allProfiles, (profile, index) => (
                      <div key={profile.profile_id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Selection & ID */}
                          <div className="lg:col-span-2 flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(profile.profile_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, profile.profile_id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== profile.profile_id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-semibold text-gray-900">#{index + 1}</div>
                              <div className="text-xs text-gray-500">ID: {profile.profile_id}</div>
                            </div>
                          </div>

                          {/* Profile Info */}
                          <div className="lg:col-span-3">
                            <div className="font-medium text-gray-900">{profile.name}</div>
                            <div className="text-sm text-gray-500">
                              <i className="fas fa-network-wired mr-1"></i>
                              {profile.proxy_ip}:{profile.proxy_port}
                            </div>
                            <div className="text-xs text-green-500">
                              {profileResult?.[profile.profile_id]?.username}
                              {` - `}
                              {profileResult?.[profile.profile_id]?.sex}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="lg:col-span-2">
                            <div className="flex items-center gap-2">
                              {openedList?.[profile.profile_id]?.open_time ? (
                                <div className="flex items-center text-green-600">
                                  <i className="fa-solid fa-check-circle mr-1"></i>
                                  <span className="text-sm">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-red-600">
                                  <i className="fa-solid fa-times-circle mr-1"></i>
                                  <span className="text-sm">Inactive</span>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {shortName(userMap?.[profile.profile_id]?.name || 'N/A')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {shortName(userMap?.[profile.profile_id]?.quoteName || 'N/A')}
                            </div>
                          </div>

                          {/* Message */}
                          <div className="lg:col-span-2">
                            <div id={`message-${profile.profile_id}`} className="text-sm text-gray-600 min-h-[20px]"></div>
                          </div>

                          {/* Manual Actions */}
                          <div className="lg:col-span-3">
                            <div className="flex flex-wrap gap-1">
                              <OpenProfle id={profile.profile_id} total={totalBrowsers} onOpen={() => setTotalBrowsers(prev => prev + 1)} />
                              <Button
                                id={`random-folder-${profile.profile_id}`}
                                onClick={() => handleRandomFolder(profile.profile_id)}
                                tooltip="Random folder"
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs"
                              >
                                <i className="fa-solid fa-arrow-rotate-right"></i>
                              </Button>
                              <Button
                                onClick={() => handleShowInfo(userMap?.[profile.profile_id]?.path, profile.profile_id)}
                                tooltip="Show info"
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs"
                              >
                                <i className="fa-regular fa-eye"></i>
                              </Button>
                              <Button
                                onClick={() => handleCopyWs(openedList?.[profile.profile_id]?.ws || '')}
                                tooltip="Copy ws"
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs"
                              >
                                <i className="fa-solid fa-copy"></i>
                              </Button>
                              <Button
                                id={`post-button-${profile.profile_id}`}
                                tooltip="Post"
                                onClick={() => clickPostButton(profile.profile_id, 'post', openedList, userMap)}
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs"
                                disabled={!reportName || !openedList?.[profile.profile_id]?.ws}
                              >
                                <i className="fa-solid fa-circle-play"></i>
                              </Button>
                              <Button
                                id={`quote-button-${profile.profile_id}`}
                                onClick={() => clickPostButton(profile.profile_id, 'quote', openedList, userMap)}
                                tooltip="Quote"
                                className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs"
                                disabled={!reportName || !openedList?.[profile.profile_id]?.ws}
                              >
                                <i className="fa-solid fa-retweet"></i>
                              </Button>
                              <Button
                                onClick={() => setupNewAccount(openedList?.[profile.profile_id]?.ws, profile.name)}
                                tooltip="Setup new account"
                                id={`setup-new-account-${profile.profile_id}`}
                                className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs"
                              >
                                <i className="fa-solid fa-user-plus"></i>
                              </Button>
                              <Button
                                id={`edit-folder-${profile.profile_id}`}
                                tooltip="Edit folder for post"
                                onClick={() => clickEditLatestPostButton(profile.profile_id, openedList, userMap, 'post')}
                                className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </Button>
                              <Button
                                id={`edit-folder-${profile.profile_id}`}
                                tooltip="Edit folder for quote"
                                onClick={() => clickEditLatestPostButton(profile.profile_id, openedList, userMap, 'quote')}
                                className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </Button>
                              <Button
                                tooltip="Open profile folder"
                                className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs"
                                onClick={() => windowInstance.api.openProfileFolder(profile.profile_id)}
                              >
                                <i className="fa-solid fa-folder-open"></i>
                              </Button>
                              <Button
                                tooltip="Generate profile"
                                className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs"
                                onClick={() => handleGenerateProfile(sex, profile.profile_id)}
                              >
                                <i className="fa-brands fa-hubspot"></i>
                              </Button>
                              <Button
                                tooltip="Change profile info"
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs"
                                onClick={() => handleChangeProfileInfo(profile.profile_id)}
                              >
                                <i className="fa-regular fa-address-book"></i>
                              </Button>
                              <Button
                                tooltip="Delete latest post"
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs"
                                onClick={() => handleDeletePost({ user_id: profile.profile_id, ws: openedList?.[profile.profile_id]?.ws, username: profile.name })}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </Button>
                              <p className="hidden" id={`profile-info-${profile.profile_id}`}>
                                {`${profile.name}||${userMap?.[profile.profile_id]?.path}||${userMap?.[profile.profile_id]?.quotePath}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </LoadingWraper>
        </div>
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

      {/* Range Selection Modal */}
      <Dialog open={showRangeModal} onClose={() => setShowRangeModal(false)} className="!max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Profiles by Range</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From (profile number)
                </label>
                <Input
                  type="number"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  placeholder="e.g., 1"
                  min="1"
                  max={data?.data?.data?.data?.length || 0}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To (profile number)
                </label>
                <Input
                  type="number"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  placeholder="e.g., 10"
                  min="1"
                  max={data?.data?.data?.data?.length || 0}
                  className="w-full"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Total profiles available: {data?.data?.data?.data?.length || 0}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRangeSelect}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Select Range
              </Button>
              <Button
                onClick={() => {
                  setShowRangeModal(false);
                  setRangeStart('');
                  setRangeEnd('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Proxy Modal */}
      <ProxyModal
        isOpen={showProxyModal}
        onClose={() => setShowProxyModal(false)}
        selectedIds={selectedIds}
        selectedCount={selectedIds.length}
        onSuccess={() => {
          refetchProfiles();
        }}
      />
    </Layout>
  )
}

const OpenProfle = ({ id, total, onOpen }: { id: number, total: number, onOpen?: () => void }) => {
  const { mutate: openProfile, isPending: isOpenProfilePending } = useOpenProfile();
  return <Button
    onClick={() => { openProfile({ id, index: total }); onOpen?.() }}
    loading={isOpenProfilePending}
    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs"
    tooltip="Open profile"
  >
    <i className="fa-brands fa-chrome"></i>
  </Button>
}

export default Profiles;

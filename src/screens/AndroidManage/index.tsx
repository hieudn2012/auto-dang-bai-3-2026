import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { Android } from "electron/features/android";
import { useCallback, useEffect, useMemo, useState } from "react";

const formatBytes = (bytes: number) => {
  if (!bytes) return "-";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

const AndroidManage = () => {
  const [androidList, setAndroidList] = useState<Android[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionIndex, setActionIndex] = useState<string | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<string[]>([]);
  const [inputAccount, setInputAccount] = useState("");
  const [outputAccount, setOutputAccount] = useState("");
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [proxyFolder, setProxyFolder] = useState("");

  const fetchAndroidList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await windowInstance.api.getAndroidList();
      setAndroidList(list);
      setSelectedIndexes((prev) =>
        prev.filter((index) => list.some((item) => item.index === index))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAndroidFolders = useCallback(async () => {
    const config = await windowInstance.api.loadMainConfig();
    setInputAccount(config?.android?.inputAccount || "");
    setOutputAccount(config?.android?.outputAccount || "");
    setProxyFolder(config?.android?.proxyFolder || "");
  }, []);

  useEffect(() => {
    fetchAndroidList();
    loadAndroidFolders();
  }, [fetchAndroidList, loadAndroidFolders]);

  useEffect(() => {
    const handleToast = (_event: unknown, arg: { username?: string; message?: string }) => {
      const { username, message } = arg || {};
      if (!username || message == null) return;
      const el = document.getElementById(`message-${username}`);
      if (el) el.textContent = message;
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.ipcRenderer.on('show-toast', handleToast);

    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      window.ipcRenderer.off('show-toast', handleToast);
    };
  }, []);

  const allSelected = useMemo(
    () => androidList.length > 0 && selectedIndexes.length === androidList.length,
    [androidList.length, selectedIndexes.length]
  );

  const selectedAndroids = useMemo(
    () => androidList.filter((item) => selectedIndexes.includes(item.index)),
    [androidList, selectedIndexes]
  );

  const toggleSelect = (index: string) => {
    setSelectedIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIndexes([]);
    else setSelectedIndexes(androidList.map((item) => item.index));
  };

  const saveAndroidFolder = async (
    key: "inputAccount" | "outputAccount" | "proxyFolder",
    folderPath: string
  ) => {
    const config = await windowInstance.api.loadMainConfig();
    await windowInstance.api.saveMainConfig({
      android: {
        ...config?.android,
        [key]: folderPath,
      },
    });
    if (key === "inputAccount") setInputAccount(folderPath);
    else if (key === "outputAccount") setOutputAccount(folderPath);
    else if (key === "proxyFolder") setProxyFolder(folderPath);
    toast.success("Đã lưu thư mục");
  };

  const handleSetFolder = async (key: "inputAccount" | "outputAccount" | "proxyFolder") => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (!folderPath) return;
    await saveAndroidFolder(key, folderPath);
  };

  const handleOpen = async (android: Android) => {
    setActionIndex(android.index);
    try {
      await windowInstance.api.openAndroid(android);
      await fetchAndroidList();
    } finally {
      setActionIndex(null);
    }
  };

  const handleClose = async (android: Android) => {
    setActionIndex(android.index);
    try {
      await windowInstance.api.closeAndroid(android);
      await fetchAndroidList();
    } finally {
      setActionIndex(null);
    }
  };

  const handleRandomName = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const newName = await windowInstance.api.randomMuMuName(android);
      toast.success(`Đã đổi tên: ${newName}`);
      await fetchAndroidList();
    } finally {
      setActionIndex(null);
    }
  };

  const handleSetupProxy = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.setupProxiesOnAndroids([android]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Setup proxy thất bại");
      } else {
        toast.success(`Đã setup proxy: ${android.name}`);
      }
      await fetchAndroidList();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Setup proxy thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleAutoRegister = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.autoRegisterAccountsOnAndroids([android]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Register thất bại");
      } else {
        toast.success(`Đã register: ${android.name}`);
      }
      await fetchAndroidList();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Register thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleOpenThreads = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.openThreadsAppOnAndroids([android]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Open Threads thất bại");
      } else {
        toast.success(`Đã mở Threads: ${android.name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Open Threads thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const runBulk = async (
    action: (android: Android) => Promise<void>,
    filter?: (android: Android) => boolean
  ) => {
    const targets = selectedAndroids.filter(filter || (() => true));
    if (targets.length === 0) {
      toast.error("Không có Android phù hợp trong danh sách chọn");
      return;
    }
    for (const android of targets) {
      setActionIndex(android.index);
      try {
        await action(android);
      } catch (error) {
        console.error(error);
        toast.error(`Lỗi tại index ${android.index}`);
      }
    }
    setActionIndex(null);
    await fetchAndroidList();
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Android Manage</h2>
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
            <Button
              onClick={() => setShowMoreActions(true)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Settings
            </Button>
            <Button
              disabled={!!actionIndex}
              onClick={async () => {
                try {
                  setActionIndex('connect-adb');
                  const result = await windowInstance.api.connectAllRunningAndroids();
                  if (result.total === 0) {
                    toast.error('Không có Android đang chạy');
                  } else if (result.failed > 0) {
                    toast.error(`ADB connect: ${result.success} ok, ${result.failed} lỗi`);
                  } else {
                    toast.success(`Đã ADB connect ${result.success} android`);
                  }
                } catch (error) {
                  console.error(error);
                  toast.error(error instanceof Error ? error.message : 'ADB connect thất bại');
                } finally {
                  setActionIndex(null);
                }
              }}
              className="px-3 py-1.5 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:opacity-50"
            >
              <i className="fa-solid fa-plug mr-1"></i>
              Connect ADB
            </Button>
            <Button
              onClick={fetchAndroidList}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <i className="fa-solid fa-rotate-right mr-1"></i>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">
            Selected: <b>{selectedIndexes.length}</b>
          </span>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Open selected"
            onClick={() =>
              runBulk(
                (android) => windowInstance.api.openAndroid(android).then(() => undefined),
                (android) => !android.is_android_started
              )
            }
            className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-play mr-1"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Close selected"
            onClick={() =>
              runBulk(
                (android) => windowInstance.api.closeAndroid(android).then(() => undefined),
                (android) => android.is_android_started
              )
            }
            className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-stop mr-1"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Random name selected"
            onClick={() =>
              runBulk(async (android) => {
                const newName = await windowInstance.api.randomMuMuName(android);
                toast.success(`Đã đổi tên: ${newName}`);
              })
            }
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-shuffle mr-1"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Assign accounts"
            onClick={async () => {
              try {
                setActionIndex('assign');
                // giữ thứ tự selectedIndexes (thứ tự chọn)
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.assignAccountsToAndroids(ordered);
                toast.success(
                  `Đã gán ${result.assigned} account, còn ${result.remaining} trong input`
                );
                await fetchAndroidList();
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Gán account thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-file-import mr-1"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Assign proxies"
            onClick={async () => {
              try {
                setActionIndex('assign-proxy');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.assignProxiesToAndroids(ordered);
                toast.success(
                  `Đã gán proxy cho ${result.assigned} account (${result.proxyCount} dòng trong proxy.txt)`
                );
                await fetchAndroidList();
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Gán proxy thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-network-wired mr-1"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some((item) => !item.is_android_started)
            }
            tooltip="Setup proxy selected"
            onClick={async () => {
              try {
                setActionIndex('setup-proxy');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.setupProxiesOnAndroids(ordered);
                if (result.failed > 0) {
                  toast.error(`Setup proxy: ${result.success} ok, ${result.failed} lỗi`);
                } else {
                  toast.success(`Đã setup proxy cho ${result.success} android`);
                }
                await fetchAndroidList();
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Setup proxy thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
          >
            <i className="fa-solid fa-bolt mr-1"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some((item) => !item.is_android_started)
            }
            tooltip="Open Threads selected"
            onClick={async () => {
              try {
                setActionIndex('open-threads');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.openThreadsAppOnAndroids(ordered);
                if (result.failed > 0) {
                  toast.error(`Open Threads: ${result.success} ok, ${result.failed} lỗi`);
                } else {
                  toast.success(`Đã mở Threads ${result.success} android`);
                }
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Open Threads thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
          >
            <i className="fa-regular fa-folder-open mr-1"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some((item) => !item.is_android_started)
            }
            tooltip="Auto register selected"
            onClick={async () => {
              try {
                setActionIndex('auto-register');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.autoRegisterAccountsOnAndroids(ordered);
                if (result.failed > 0) {
                  toast.error(`Register: ${result.success} ok, ${result.failed} lỗi`);
                } else {
                  toast.success(`Đã register ${result.success} android`);
                }
                await fetchAndroidList();
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Register thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
          >
            <i className="fa-solid fa-user-plus mr-1"></i>
          </Button>
        </div>

        <Dialog open={showMoreActions} onClose={() => setShowMoreActions(false)} className="!max-w-xl">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">More actions</h3>
              <Button
                onClick={() => setShowMoreActions(false)}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
              >
                <i className="fa-solid fa-xmark"></i>
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <i className="fas fa-folder text-blue-400 mr-1"></i>
                  Input Account
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Chọn thư mục input account"
                    value={inputAccount}
                    onChange={(e) => setInputAccount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSetFolder("inputAccount")}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <i className="fas fa-folder-open"></i>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <i className="fas fa-folder text-blue-400 mr-1"></i>
                  Output Account
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Chọn thư mục output account"
                    value={outputAccount}
                    onChange={(e) => setOutputAccount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSetFolder("outputAccount")}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <i className="fas fa-folder-open"></i>
                  </Button>
                  <Button
                    disabled={!!actionIndex || !outputAccount}
                    tooltip="Export account (bỏ name + proxy) → export.txt"
                    onClick={async () => {
                      try {
                        setActionIndex('export');
                        const result = await windowInstance.api.exportAccountsFromOutput();
                        toast.success(`Đã export ${result.count} account → export.txt`);
                      } catch (error) {
                        console.error(error);
                        toast.error(error instanceof Error ? error.message : 'Export thất bại');
                      } finally {
                        setActionIndex(null);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                  >
                    <i className="fas fa-file-export"></i>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <i className="fas fa-folder text-blue-400 mr-1"></i>
                  Proxy Folder
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Chọn thư mục proxy"
                    value={proxyFolder}
                    onChange={(e) => setProxyFolder(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSetFolder("proxyFolder")}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <i className="fas fa-folder-open"></i>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </Dialog>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Index</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Proxy</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ADB</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">PID</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Disk</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {androidList.map((item) => {
                const busy = actionIndex === item.index;
                const checked = selectedIndexes.includes(item.index);
                return (
                  <tr
                    key={item.index}
                    className={`hover:bg-gray-50 transition-colors ${checked ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item.index)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{item.index}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 min-w-[180px]">
                      <div id={`message-${item.name}`} className="text-sm text-gray-600 min-h-[20px]"></div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.account?.username || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="relative group inline-flex">
                        {item.account?.proxy ? (
                          <i className="fa-solid fa-circle-check text-green-500"></i>
                        ) : (
                          <i className="fa-solid fa-circle-xmark text-red-400"></i>
                        )}
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-all duration-200 group-hover:opacity-100">
                          {item.account?.proxy || "Chưa gán proxy"}
                          <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{item.android_version}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.is_android_started
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.is_android_started ? "Running" : "Stopped"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.adb_host_ip && item.adb_port
                        ? `${item.adb_host_ip}:${item.adb_port}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{item.pid ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatBytes(item.disk_size_bytes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={busy || item.is_android_started}
                          onClick={() => handleOpen(item)}
                          className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-play"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started}
                          onClick={() => handleClose(item)}
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-stop"></i>
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => handleRandomName(item)}
                          tooltip="Random name"
                          className="px-2 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-shuffle"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started || !item.account?.proxy}
                          onClick={() => handleSetupProxy(item)}
                          tooltip="Setup proxy"
                          className="px-2 py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-bolt"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started}
                          onClick={() => handleOpenThreads(item)}
                          tooltip="Open Threads"
                          className="px-2 py-1 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
                        >
                          <i className="fa-regular fa-folder-open"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !item.account?.username ||
                            !item.account?.password
                          }
                          onClick={() => handleAutoRegister(item)}
                          tooltip="Auto register"
                          className="px-2 py-1 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-user-plus"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && androidList.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                    No Android devices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AndroidManage;

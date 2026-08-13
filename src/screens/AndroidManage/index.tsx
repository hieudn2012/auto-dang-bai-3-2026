import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { Android } from "electron/features/android";
import { useCallback, useEffect, useMemo, useState } from "react";

type FolderMap = Record<
  string,
  {
    name: string;
    path: string;
    quoteName: string;
    quotePath: string;
  }
>;

const formatBytes = (bytes: number) => {
  if (!bytes) return "-";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

const shortName = (name: string) => {
  const maxLength = 14;
  if (!name || name.length <= maxLength) return name || "N/A";
  return `${name.slice(0, maxLength / 2)}...${name.slice(-maxLength / 2)}`;
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
  const [folderMap, setFolderMap] = useState<FolderMap>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [noteFilter, setNoteFilter] = useState("");
  const [editingNoteIndexes, setEditingNoteIndexes] = useState<string[] | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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

  const loadNotes = useCallback(async () => {
    try {
      const notes = await windowInstance.api.loadAndroidNotes();
      setNoteMap(notes || {});
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchAndroidList();
    loadAndroidFolders();
    loadNotes();
  }, [fetchAndroidList, loadAndroidFolders, loadNotes]);

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

  const filteredAndroidList = useMemo(() => {
    const q = noteFilter.trim().toLowerCase();
    if (!q) return androidList;
    return androidList.filter((item) =>
      (noteMap[item.index] || "").toLowerCase().includes(q)
    );
  }, [androidList, noteMap, noteFilter]);

  const allSelected = useMemo(
    () =>
      filteredAndroidList.length > 0 &&
      filteredAndroidList.every((item) => selectedIndexes.includes(item.index)),
    [filteredAndroidList, selectedIndexes]
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
    if (allSelected) {
      const visible = new Set(filteredAndroidList.map((item) => item.index));
      setSelectedIndexes((prev) => prev.filter((index) => !visible.has(index)));
    } else {
      setSelectedIndexes((prev) => {
        const next = new Set(prev);
        filteredAndroidList.forEach((item) => next.add(item.index));
        return [...next];
      });
    }
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

  const handleRandomFolder = async (androidIndex: string) => {
    const currentPaths = Object.values(folderMap).map((item) => item.path).filter(Boolean);
    const quoteCurrentPaths = Object.values(folderMap).map((item) => item.quotePath).filter(Boolean);

    const folder = await windowInstance.api.randomFolderNotUsed(currentPaths);
    const quoteFolder = await windowInstance.api.randomQuoteFolderNotUsed(quoteCurrentPaths);

    if (!folder.path && !quoteFolder.path) {
      toast.error("Không tìm thấy folder hợp lệ (workingDir / quoteWorkingDir)");
      return;
    }

    setFolderMap((prev) => ({
      ...prev,
      [androidIndex]: {
        name: folder.name || "",
        path: folder.path || "",
        quoteName: quoteFolder.name || "",
        quotePath: quoteFolder.path || "",
      },
    }));
  };

  const handleBulkRandomFolder = async () => {
    if (selectedIndexes.length === 0) {
      toast.error("Chọn ít nhất 1 Android");
      return;
    }

    setActionIndex("random-folder");
    try {
      let nextMap = { ...folderMap };
      for (const index of selectedIndexes) {
        const currentPaths = Object.values(nextMap).map((item) => item.path).filter(Boolean);
        const quoteCurrentPaths = Object.values(nextMap).map((item) => item.quotePath).filter(Boolean);

        const folder = await windowInstance.api.randomFolderNotUsed(currentPaths);
        const quoteFolder = await windowInstance.api.randomQuoteFolderNotUsed(quoteCurrentPaths);

        nextMap = {
          ...nextMap,
          [index]: {
            name: folder.name || "",
            path: folder.path || "",
            quoteName: quoteFolder.name || "",
            quotePath: quoteFolder.path || "",
          },
        };
      }
      setFolderMap(nextMap);
      toast.success(`Đã random folder cho ${selectedIndexes.length} Android`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Random folder thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleOpenFolder = async (path: string) => {
    if (!path) {
      toast.error("Chưa có folder");
      return;
    }
    await windowInstance.api.openFolder(path);
  };

  const openEditNote = (android: Android) => {
    setEditingNoteIndexes([android.index]);
    setEditingNoteValue(noteMap[android.index] || "");
  };

  const openBulkEditNote = () => {
    if (selectedIndexes.length === 0) {
      toast.error("Chưa chọn Android nào");
      return;
    }
    const indexes = [...selectedIndexes];
    const firstNote = noteMap[indexes[0]] || "";
    const sameNote = indexes.every((index) => (noteMap[index] || "") === firstNote);
    setEditingNoteIndexes(indexes);
    setEditingNoteValue(sameNote ? firstNote : "");
  };

  const closeEditNote = () => {
    setEditingNoteIndexes(null);
    setEditingNoteValue("");
  };

  const applyEditNote = () => {
    if (!editingNoteIndexes?.length) return;
    setNoteMap((prev) => {
      const next = { ...prev };
      for (const index of editingNoteIndexes) {
        next[index] = editingNoteValue;
      }
      return next;
    });
    toast.success(
      editingNoteIndexes.length > 1
        ? `Đã cập nhật note cho ${editingNoteIndexes.length} Android`
        : "Đã cập nhật note"
    );
    closeEditNote();
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const result = await windowInstance.api.saveAndroidNotes(noteMap);
      toast.success(`Đã lưu ${result.count} note → android-notes.txt`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Lưu note thất bại");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCreatePost = async (android: Android) => {
    const folder = folderMap[android.index]?.path;

    if (!folder) {
      toast.error("Chưa random folder");
      return;
    }
    if (!android.is_android_started) {
      toast.error("Android chưa chạy");
      return;
    }

    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.createPostOnAndroids([
        { android, folder },
      ]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Post thất bại");
      } else {
        toast.success(`Post: ${android.name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Post thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleBulkCreatePost = async () => {
    const ordered = selectedIndexes
      .map((index) => androidList.find((item) => item.index === index))
      .filter(Boolean) as Android[];

    const items = ordered
      .map((android) => ({
        android,
        folder: folderMap[android.index]?.path || "",
      }))
      .filter((item) => item.android.is_android_started && item.folder);

    if (items.length === 0) {
      toast.error("Không có máy đang chạy + đã random folder");
      return;
    }

    setActionIndex("create-post");
    try {
      const result = await windowInstance.api.createPostOnAndroids(items);
      if (result.failed > 0) {
        toast.error(`Post: ${result.success} ok, ${result.failed} lỗi`);
      } else {
        toast.success(`Đã post cho ${result.success} Android`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Post thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleQuoteLatestPost = async (android: Android) => {
    const folder = folderMap[android.index]?.quotePath;

    if (!folder) {
      toast.error("Chưa random quote folder");
      return;
    }
    if (!android.is_android_started) {
      toast.error("Android chưa chạy");
      return;
    }

    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.quoteLatestPostOnAndroids([
        { android, folder },
      ]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Quote/repost thất bại");
      } else {
        toast.success(`Quote/repost: ${android.name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Quote/repost thất bại"
      );
    } finally {
      setActionIndex(null);
    }
  };

  const handleBulkQuoteLatestPost = async () => {
    const ordered = selectedIndexes
      .map((index) => androidList.find((item) => item.index === index))
      .filter(Boolean) as Android[];

    const items = ordered
      .map((android) => ({
        android,
        folder: folderMap[android.index]?.quotePath || "",
      }))
      .filter((item) => item.android.is_android_started && item.folder);

    if (items.length === 0) {
      toast.error("Không có máy đang chạy + đã random quote folder");
      return;
    }

    setActionIndex("quote-repost");
    try {
      const result = await windowInstance.api.quoteLatestPostOnAndroids(items);
      if (result.failed > 0) {
        toast.error(`Quote: ${result.success} ok, ${result.failed} lỗi`);
      } else {
        toast.success(`Đã quote/repost cho ${result.success} Android`);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Quote/repost thất bại"
      );
    } finally {
      setActionIndex(null);
    }
  };

  const handleEditLatestPost = async (
    android: Android,
    type: "post" | "quote" = "post"
  ) => {
    const folder =
      type === "quote"
        ? folderMap[android.index]?.quotePath
        : folderMap[android.index]?.path;

    if (!folder) {
      toast.error(
        type === "quote" ? "Chưa random quote folder" : "Chưa random folder"
      );
      return;
    }
    if (!android.is_android_started) {
      toast.error("Android chưa chạy");
      return;
    }

    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.editLatestPostOnAndroids([
        { android, folder },
      ]);
      const label = type === "quote" ? "Edit quote" : "Edit post";
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || `${label} thất bại`);
      } else {
        toast.success(`${label}: ${android.name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : type === "quote"
            ? "Edit quote thất bại"
            : "Edit post thất bại"
      );
    } finally {
      setActionIndex(null);
    }
  };

  const handleBulkEditLatestPost = async (type: "post" | "quote" = "post") => {
    const ordered = selectedIndexes
      .map((index) => androidList.find((item) => item.index === index))
      .filter(Boolean) as Android[];

    const items = ordered
      .map((android) => ({
        android,
        folder:
          type === "quote"
            ? folderMap[android.index]?.quotePath || ""
            : folderMap[android.index]?.path || "",
      }))
      .filter((item) => item.android.is_android_started && item.folder);

    const label = type === "quote" ? "Edit quote" : "Edit post";

    if (items.length === 0) {
      toast.error(
        type === "quote"
          ? "Không có máy đang chạy + đã random quote folder"
          : "Không có máy đang chạy + đã random folder"
      );
      return;
    }

    setActionIndex(`edit-${type}`);
    try {
      const result = await windowInstance.api.editLatestPostOnAndroids(items);
      if (result.failed > 0) {
        toast.error(`${label}: ${result.success} ok, ${result.failed} lỗi`);
      } else {
        toast.success(`Đã ${label.toLowerCase()} cho ${result.success} Android`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : `${label} thất bại`);
    } finally {
      setActionIndex(null);
    }
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

  const handleRandomDeviceIdentity = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.randomDeviceIdentity(android);
      toast.success(
        `Device: ${result.brand} · ${result.model} · IMEI ${result.imei}`
      );
      await fetchAndroidList();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Random device thất bại"
      );
    } finally {
      setActionIndex(null);
    }
  };

  const handleBulkRandomDeviceIdentity = async () => {
    if (selectedIndexes.length === 0) {
      toast.error("Chưa chọn Android nào");
      return;
    }
    const ordered = selectedIndexes
      .map((index) => androidList.find((item) => item.index === index))
      .filter(Boolean) as Android[];

    setActionIndex("random-device");
    try {
      const result = await windowInstance.api.randomDeviceIdentityOnAndroids(
        ordered
      );
      if (result.failed > 0) {
        toast.error(
          `Random device: ${result.success} ok, ${result.failed} lỗi`
        );
      } else {
        toast.success(`Đã random brand/model/IMEI cho ${result.success} Android`);
      }
      await fetchAndroidList();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Random device thất bại"
      );
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

  const handleLoginInstagram = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.loginInstagramOnAndroids([android]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Login Instagram thất bại");
      } else {
        toast.success(`Đã login Instagram: ${android.name}`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Login Instagram thất bại");
    } finally {
      setActionIndex(null);
    }
  };

  const handleFullSetup = async (android: Android) => {
    setActionIndex(android.index);
    try {
      const result = await windowInstance.api.fullSetupOnAndroids([android]);
      if (result.failed > 0) {
        toast.error(result.results[0]?.error || "Full setup thất bại");
      } else {
        toast.success(`Full setup xong: ${android.name}`);
      }
      await fetchAndroidList();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Full setup thất bại");
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
      <div className="p-6 max-w-full min-w-0 overflow-x-hidden text-gray-900 dark:text-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Android Manage</h2>
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>}
            <Button
              disabled={savingNotes || !!actionIndex}
              tooltip="Save notes → android-notes.txt"
              onClick={handleSaveNotes}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <i className="fa-solid fa-floppy-disk mr-1"></i>
              Save notes
            </Button>
            <Button
              disabled={selectedIndexes.length === 0 || !!actionIndex}
              tooltip="Edit note for selected Androids"
              onClick={openBulkEditNote}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
            >
              <i className="fa-solid fa-pen mr-1"></i>
              Edit notes
            </Button>
            <Button
              onClick={() => setShowMoreActions(true)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              tooltip="Settings"
            >
              <i className="fa-solid fa-gear mr-1"></i>
            </Button>
            <Button
              disabled={!!actionIndex}
              tooltip="Connect ADB"
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
            </Button>
            <Button
              onClick={fetchAndroidList}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              tooltip="Refresh"
            >
              <i className="fa-solid fa-rotate-right mr-1"></i>
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Selected: <b className="text-gray-900 dark:text-white">{selectedIndexes.length}</b>
            {noteFilter.trim() ? (
              <span className="ml-2 text-gray-500">
                · Showing {filteredAndroidList.length}/{androidList.length}
              </span>
            ) : null}
          </span>
          <div className="flex items-center gap-2 min-w-[200px] max-w-xs flex-1 sm:flex-none">
            <Input
              placeholder="Filter by note..."
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value)}
              className="flex-1 !py-1.5 text-sm"
            />
            {noteFilter ? (
              <Button
                tooltip="Clear note filter"
                onClick={() => setNoteFilter("")}
                className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                <i className="fa-solid fa-xmark"></i>
              </Button>
            ) : null}
          </div>
          <div className="flex-1"></div>
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
            <i className="fa-solid fa-shuffle"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Random brand / model / IMEI (selected)"
            onClick={handleBulkRandomDeviceIdentity}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
          >
            <i className="fa-brands fa-android"></i>
          </Button>
          <Button
            disabled={selectedIndexes.length === 0 || !!actionIndex}
            tooltip="Random folder + quote folder"
            onClick={handleBulkRandomFolder}
            className="px-3 py-1.5 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-folder-tree"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) => !item.is_android_started || !folderMap[item.index]?.path
              )
            }
            tooltip="Create post (selected)"
            onClick={() => handleBulkCreatePost()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) =>
                  !item.is_android_started || !folderMap[item.index]?.quotePath
              )
            }
            tooltip="Quote/repost latest post (selected)"
            onClick={() => handleBulkQuoteLatestPost()}
            className="px-3 py-1.5 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-quote-right"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) => !item.is_android_started || !folderMap[item.index]?.path
              )
            }
            tooltip="Edit latest post + append link (selected)"
            onClick={() => handleBulkEditLatestPost("post")}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-pen-to-square"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) =>
                  !item.is_android_started || !folderMap[item.index]?.quotePath
              )
            }
            tooltip="Edit latest quote + append link (selected)"
            onClick={() => handleBulkEditLatestPost("quote")}
            className="px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            <i className="fa-solid fa-pen-fancy"></i>
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
            <i className="fa-solid fa-file-import"></i>
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
            <i className="fa-solid fa-network-wired"></i>
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
            <i className="fa-regular fa-folder-open"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) =>
                  !item.is_android_started ||
                  !item.account?.username ||
                  !item.account?.password
              )
            }
            tooltip="Login Instagram selected"
            onClick={async () => {
              try {
                setActionIndex('login-instagram');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.loginInstagramOnAndroids(ordered);
                if (result.failed > 0) {
                  toast.error(`Login Instagram: ${result.success} ok, ${result.failed} lỗi`);
                } else {
                  toast.success(`Đã login Instagram ${result.success} android`);
                }
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Login Instagram thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
          >
            <i className="fa-brands fa-instagram"></i>
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
            <i className="fa-solid fa-user-plus"></i>
          </Button>
          <Button
            disabled={
              selectedIndexes.length === 0 ||
              !!actionIndex ||
              selectedAndroids.some(
                (item) =>
                  !item.is_android_started ||
                  !item.account?.proxy ||
                  !item.account?.username ||
                  !item.account?.password
              )
            }
            tooltip="Full setup selected (proxy → Threads → register)"
            onClick={async () => {
              try {
                setActionIndex('full-setup');
                const ordered = selectedIndexes
                  .map((index) => androidList.find((item) => item.index === index))
                  .filter(Boolean) as Android[];
                const result = await windowInstance.api.fullSetupOnAndroids(ordered);
                if (result.failed > 0) {
                  toast.error(`Full setup: ${result.success} ok, ${result.failed} lỗi`);
                } else {
                  toast.success(`Full setup xong ${result.success} android`);
                }
                await fetchAndroidList();
              } catch (error) {
                console.error(error);
                toast.error(error instanceof Error ? error.message : 'Full setup thất bại');
              } finally {
                setActionIndex(null);
              }
            }}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            <i className="fa-solid fa-rocket mr-1"></i>
          </Button>
        </div>

        <Dialog open={showMoreActions} onClose={() => setShowMoreActions(false)} className="!max-w-xl">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">More actions</h3>
              <Button
                onClick={() => setShowMoreActions(false)}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <i className="fa-solid fa-xmark"></i>
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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

        <Dialog
          open={editingNoteIndexes != null}
          onClose={closeEditNote}
          className="sm:max-w-lg"
        >
          <div className="p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {editingNoteIndexes && editingNoteIndexes.length > 1
                ? `Edit note · ${editingNoteIndexes.length} Androids`
                : `Edit note · index ${editingNoteIndexes?.[0] ?? ""}`}
            </h3>
            {editingNoteIndexes && editingNoteIndexes.length > 1 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Note sẽ được áp dụng cho tất cả máy đang chọn.
              </p>
            ) : null}
            <TextArea
              label="Note"
              rows={4}
              value={editingNoteValue}
              onChange={(e) => setEditingNoteValue(e.target.value)}
              placeholder="Nhập note..."
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={closeEditNote}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={applyEditNote}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600"
              >
                Apply
                {editingNoteIndexes && editingNoteIndexes.length > 1
                  ? ` (${editingNoteIndexes.length})`
                  : ""}
              </Button>
            </div>
          </div>
        </Dialog>

        <div className="max-w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Index</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Message</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Account</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Note</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Folder</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Proxy</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">ADB</th>
                <th className="px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredAndroidList.map((item) => {
                const busy = actionIndex === item.index;
                const checked = selectedIndexes.includes(item.index);
                const adb =
                  item.adb_host_ip && item.adb_port
                    ? `${item.adb_host_ip}:${item.adb_port}`
                    : "-";
                const meta = [
                  `Ver ${item.android_version}`,
                  item.pid ? `PID ${item.pid}` : null,
                  formatBytes(item.disk_size_bytes),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr
                    key={item.index}
                    className={`text-xs hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${checked ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}
                  >
                    <td className="px-2 py-3 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item.index)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-2 py-3 truncate overflow-hidden text-gray-900 dark:text-gray-100">{item.index}</td>
                    <td
                      className="px-2 py-3 font-medium overflow-hidden text-gray-900 dark:text-white"
                      title={`${item.name}\n${meta}\n${[item.brand, item.model].filter(Boolean).join(' · ') || ''}${item.imei ? `\nIMEI ${item.imei}` : ''}`}
                    >
                      <div className="flex items-start gap-1.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{item.name}</div>
                          <div className="truncate text-xs font-normal text-gray-400 dark:text-gray-500">
                            {meta}
                          </div>
                          {(item.brand || item.model) && (
                            <div
                              className="truncate text-xs font-normal text-indigo-500 dark:text-indigo-400"
                              title={[item.brand, item.model].filter(Boolean).join(' · ')}
                            >
                              {[item.brand, item.model].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {item.imei && (
                            <div
                              className="truncate text-xs font-normal text-teal-600 dark:text-teal-400"
                              title={`IMEI ${item.imei}`}
                            >
                              IMEI {item.imei}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={busy}
                            title="Random name"
                            onClick={() => handleRandomName(item)}
                            className="text-indigo-500 hover:text-indigo-600 disabled:opacity-40 p-0.5"
                          >
                            <i className="fa-solid fa-shuffle text-sm"></i>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            title="Random brand / model / IMEI"
                            onClick={() => handleRandomDeviceIdentity(item)}
                            className="text-teal-600 hover:text-teal-700 disabled:opacity-40 p-0.5"
                          >
                            <i className="fa-brands fa-android text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-gray-600 dark:text-gray-300 overflow-hidden">
                      <div id={`message-${item.name}`} className="truncate min-h-[20px]"></div>
                    </td>
                    <td className="px-2 py-3 text-gray-600 dark:text-gray-300 overflow-hidden truncate" title={item.account?.username || undefined}>
                      {item.account?.username || "-"}
                    </td>
                    <td className="px-2 py-3 overflow-hidden text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="truncate flex-1 min-w-0"
                          title={noteMap[item.index] || undefined}
                        >
                          {noteMap[item.index]?.trim() || (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-amber-500 hover:text-amber-600 dark:text-amber-400"
                          title="Edit note"
                          onClick={() => openEditNote(item)}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3 overflow-hidden text-gray-600 dark:text-gray-300">
                      {(() => {
                        const folder = folderMap[item.index];
                        if (!folder?.path && !folder?.quotePath) {
                          return <span className="text-gray-400">-</span>;
                        }
                        return (
                          <div className="space-y-0.5 min-w-0">
                            <button
                              type="button"
                              className="block w-full truncate text-left text-emerald-600 hover:underline dark:text-emerald-400"
                              title={folder.path || undefined}
                              onClick={() => handleOpenFolder(folder.path)}
                              disabled={!folder.path}
                            >
                              {shortName(folder.name)}
                            </button>
                            <button
                              type="button"
                              className="block w-full truncate text-left text-pink-600 hover:underline dark:text-pink-400"
                              title={folder.quotePath || undefined}
                              onClick={() => handleOpenFolder(folder.quotePath)}
                              disabled={!folder.quotePath}
                            >
                              {shortName(folder.quoteName)}
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-3 overflow-hidden">
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
                    <td className="px-2 py-3 overflow-hidden">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.is_android_started
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.is_android_started ? "On" : "Off"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-600 dark:text-gray-300 overflow-hidden truncate" title={adb}>
                      {adb}
                    </td>
                    <td className="px-2 py-3 text-right overflow-hidden">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          disabled={busy || item.is_android_started}
                          onClick={() => handleOpen(item)}
                          className="!px-1.5 !py-1 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-play"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started}
                          onClick={() => handleClose(item)}
                          className="!px-1.5 !py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-stop"></i>
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => handleRandomFolder(item.index)}
                          tooltip="Random folder + quote folder"
                          className="!px-1.5 !py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-folder-tree"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !folderMap[item.index]?.path
                          }
                          onClick={() => handleCreatePost(item)}
                          tooltip="Create post → caption → media → Post"
                          className="!px-1.5 !py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-paper-plane"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !folderMap[item.index]?.quotePath
                          }
                          onClick={() => handleQuoteLatestPost(item)}
                          tooltip="Quote/repost latest post → caption → media → Post"
                          className="!px-1.5 !py-1 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-quote-right"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !folderMap[item.index]?.path
                          }
                          onClick={() => handleEditLatestPost(item, "post")}
                          tooltip="Edit latest post → append link → Post"
                          className="!px-1.5 !py-1 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !folderMap[item.index]?.quotePath
                          }
                          onClick={() => handleEditLatestPost(item, "quote")}
                          tooltip="Edit latest quote → append link → Post"
                          className="!px-1.5 !py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-pen-fancy"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started || !item.account?.proxy}
                          onClick={() => handleSetupProxy(item)}
                          tooltip="Setup proxy"
                          className="!px-1.5 !py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-bolt"></i>
                        </Button>
                        <Button
                          disabled={busy || !item.is_android_started}
                          onClick={() => handleOpenThreads(item)}
                          tooltip="Open Threads"
                          className="!px-1.5 !py-1 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
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
                          onClick={() => handleLoginInstagram(item)}
                          tooltip="Login Instagram"
                          className="!px-1.5 !py-1 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 disabled:opacity-50"
                        >
                          <i className="fa-brands fa-instagram"></i>
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
                          className="!px-1.5 !py-1 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-user-plus"></i>
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            !item.is_android_started ||
                            !item.account?.proxy ||
                            !item.account?.username ||
                            !item.account?.password
                          }
                          onClick={() => handleFullSetup(item)}
                          tooltip="Full setup (proxy → Threads → register)"
                          className="!px-1.5 !py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-rocket"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && androidList.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No Android devices found
                  </td>
                </tr>
              )}
              {!loading && androidList.length > 0 && filteredAndroidList.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No rows match note filter “{noteFilter.trim()}”
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

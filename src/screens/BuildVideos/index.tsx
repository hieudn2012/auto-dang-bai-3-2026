import Button from "@/components/Button";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import type { BuildVideoFolder, OverlayCorner } from "electron/features/build-videos";
import { useEffect, useMemo, useState } from "react";

type FolderStatus = "idle" | "running" | "done" | "skipped" | "error";

type FolderRow = BuildVideoFolder & {
  status: FolderStatus;
  resultError?: string;
};

const BuildVideos = () => {
  const [parentFolder, setParentFolder] = useState("");
  const [rows, setRows] = useState<FolderRow[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [corner, setCorner] = useState<OverlayCorner>("bottom-left");
  const [scanning, setScanning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const readyCount = useMemo(() => rows.filter((row) => row.ready).length, [rows]);
  const doneCount = useMemo(
    () => rows.filter((row) => row.status === "done" || row.hasOutput).length,
    [rows],
  );

  const scanFolder = async (folderPath: string) => {
    if (!folderPath) return;
    setScanning(true);
    try {
      const result = await windowInstance.api.scanBuildVideos(folderPath);
      setRows(
        (result.folders || []).map((folder) => ({
          ...folder,
          status: folder.hasOutput ? "skipped" : "idle",
        })),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      setRows([]);
    } finally {
      setScanning(false);
    }
  };

  const handlePickFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (!folderPath) return;
    setParentFolder(folderPath);
    await windowInstance.api.saveMainConfig({ buildVideosDir: folderPath });
    await scanFolder(folderPath);
  };

  const handleBuild = async () => {
    if (!parentFolder) {
      toast.error("Chọn thư mục cha trước");
      return;
    }
    setBuilding(true);
    setLogs([]);
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        status: row.ready && (overwrite || !row.hasOutput) ? "running" : row.status,
        resultError: undefined,
      })),
    );
    try {
      const result = await windowInstance.api.buildVideos({
        parentFolder,
        overwrite,
        corner,
      });
      const byFolder = new Map(result.results.map((item) => [item.folder, item]));
      setRows((prev) =>
        prev.map((row) => {
          const item = byFolder.get(row.folder);
          if (!item) return row;
          if (item.skipped) return { ...row, status: "skipped", hasOutput: true };
          if (item.ok) return { ...row, status: "done", hasOutput: true };
          return { ...row, status: "error", resultError: item.error };
        }),
      );
      toast.success(`Xong: ${result.success} tạo mới, ${result.skipped} bỏ qua, ${result.failed} lỗi`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setBuilding(false);
      await scanFolder(parentFolder);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!windowInstance.api?.loadMainConfig) return;
      const config = await windowInstance.api.loadMainConfig();
      if (config?.buildVideosDir) {
        setParentFolder(config.buildVideosDir);
        await scanFolder(config.buildVideosDir);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!windowInstance.api?.onLog) return;
    const handleLog = (log: { username?: string; message?: string }) => {
      if (!log?.message) return;
      const line = log.username ? `[${log.username}] ${log.message}` : log.message;
      setLogs((prev) => [...prev.slice(-200), line]);
    };
    windowInstance.api.onLog(handleLog);
    return () => {
      windowInstance.api.removeLogListener?.(handleLog);
    };
  }, []);

  const statusLabel = (row: FolderRow) => {
    if (row.status === "running") return "Đang ghép";
    if (row.status === "done") return "Đã tạo C";
    if (row.status === "skipped") return "Đã có C";
    if (row.status === "error") return "Lỗi";
    if (!row.ready) return "Thiếu video";
    return "Sẵn sàng";
  };

  return (
    <Layout>
      <div className="p-6 text-sm text-gray-900 dark:text-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center">
            <i className="fas fa-film text-blue-500 mr-3"></i>
            Build videos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Chọn folder cha. Mỗi folder con có 2 video: A là video gốc, B là nhân vật reaction
            ghép góc trái. Kết quả là <span className="font-mono">C.mp4</span> trong folder đó.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              <i className="fas fa-folder text-blue-400 mr-1"></i>
              Thư mục cha
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Đường dẫn folder chứa các folder con"
                value={parentFolder}
                onChange={(event) => setParentFolder(event.target.value)}
              />
              <Button onClick={handlePickFolder} className="px-4 py-2 bg-blue-500 hover:bg-blue-600">
                <i className="fas fa-folder-open"></i>
              </Button>
              <Button
                loading={scanning}
                onClick={() => scanFolder(parentFolder)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700"
              >
                Quét
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              <span>Vị trí video B</span>
              <select
                value={corner}
                onChange={(event) => setCorner(event.target.value as OverlayCorner)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="bottom-left">Góc trái dưới</option>
                <option value="top-left">Góc trái trên</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(event) => setOverwrite(event.target.checked)}
              />
              Ghi đè C.mp4 nếu đã có
            </label>
            <div className="text-gray-500">
              {rows.length} folder · {readyCount} đủ 2 video · {doneCount} đã có C
            </div>
          </div>

          <Button
            loading={building}
            disabled={!parentFolder || building || scanning}
            onClick={handleBuild}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <i className="fas fa-play mr-2"></i>
            Build videos
          </Button>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3">Folder</th>
                <th className="px-4 py-3">Video A</th>
                <th className="px-4 py-3">Video B (reaction)</th>
                <th className="px-4 py-3">C.mp4</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chưa có folder con. Chọn thư mục cha rồi quét.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.folder} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.videoAName || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.videoBName || "-"}</td>
                    <td className="px-4 py-3">{row.hasOutput ? "Có" : "Chưa"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.status === "done"
                            ? "text-green-600"
                            : row.status === "error"
                              ? "text-red-600"
                              : row.status === "running"
                                ? "text-blue-600"
                                : "text-gray-500"
                        }
                      >
                        {statusLabel(row)}
                      </span>
                      {row.resultError || row.error ? (
                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={row.resultError || row.error}>
                          {row.resultError || row.error}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => windowInstance.api.openFolder(row.folder)}
                        className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600"
                      >
                        Mở
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {logs.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 p-4 font-mono text-xs max-h-64 overflow-auto">
            {logs.map((line, index) => (
              <div key={`${index}-${line}`}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BuildVideos;

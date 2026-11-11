import Button from "@/components/Button";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import type { BuildVideoFolder, OverlayCorner } from "electron/features/build-videos";
import { useEffect, useMemo, useState } from "react";

type FolderStatus = "idle" | "running" | "done" | "error";

type FolderRow = BuildVideoFolder & {
  status: FolderStatus;
  resultError?: string;
};

const BuildVideos = () => {
  const [parentFolder, setParentFolder] = useState("");
  const [reactionFolder, setReactionFolder] = useState("");
  const [rows, setRows] = useState<FolderRow[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const [reactionError, setReactionError] = useState("");
  const [corner, setCorner] = useState<OverlayCorner>("bottom-left");
  const [scanning, setScanning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const readyCount = useMemo(() => rows.filter((row) => row.ready).length, [rows]);
  const doneCount = useMemo(() => rows.filter((row) => row.hasOutput).length, [rows]);

  const persistFolders = async (product: string, reaction: string) => {
    await windowInstance.api.saveMainConfig({
      buildVideosDir: product,
      reactionVideosDir: reaction,
    });
  };

  const scanFolder = async (folderPath: string, characterPath = reactionFolder) => {
    if (!folderPath) return;
    setScanning(true);
    try {
      const result = await windowInstance.api.scanBuildVideos(folderPath, characterPath || undefined);
      setReactionCount(result.reactionCount || 0);
      setReactionError(result.reactionError || "");
      setRows(
        (result.folders || []).map((folder) => ({
          ...folder,
          status: "idle",
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

  const handlePickProductFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (!folderPath) return;
    setParentFolder(folderPath);
    await persistFolders(folderPath, reactionFolder);
    await scanFolder(folderPath, reactionFolder);
  };

  const handlePickReactionFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (!folderPath) return;
    setReactionFolder(folderPath);
    await persistFolders(parentFolder, folderPath);
    if (parentFolder) await scanFolder(parentFolder, folderPath);
  };

  const handleScan = async () => {
    await persistFolders(parentFolder, reactionFolder);
    await scanFolder(parentFolder, reactionFolder);
  };

  const handleBuild = async () => {
    if (!parentFolder) {
      toast.error("Chọn thư mục product trước");
      return;
    }
    if (!reactionFolder) {
      toast.error("Chọn thư mục nhân vật reaction trước");
      return;
    }
    setBuilding(true);
    setLogs([]);
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        status: row.ready ? "running" : row.status,
        resultError: undefined,
      })),
    );
    try {
      const result = await windowInstance.api.buildVideos({
        parentFolder,
        reactionFolder,
        corner,
      });
      const byFolder = new Map(result.results.map((item) => [item.folder, item]));
      setRows((prev) =>
        prev.map((row) => {
          const item = byFolder.get(row.folder);
          if (!item) return row;
          if (item.ok) {
            return {
              ...row,
              status: "done",
              hasOutput: true,
              outputPath: item.outputPath,
              outputName: item.outputName,
              createdAt: item.createdAt,
              error: undefined,
              resultError: undefined,
            };
          }
          return { ...row, status: "error", resultError: item.error };
        }),
      );
      toast.success(`Xong: ${result.success} video reaction, ${result.failed} lỗi`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setBuilding(false);
      await scanFolder(parentFolder, reactionFolder);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!windowInstance.api?.loadMainConfig) return;
      const config = await windowInstance.api.loadMainConfig();
      // const product = config?.buildVideosDir || "";
      // const reaction = config?.reactionVideosDir || "";
      // if (product) setParentFolder(product);
      // if (reaction) setReactionFolder(reaction);
      // if (product) await scanFolder(product, reaction);
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
    if (row.status === "done") return "Đã tạo";
    if (row.status === "error") return "Lỗi";
    if (!row.ready) return "Thiếu video";
    if (row.hasOutput) return "Đã có";
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
            Thư mục product chứa từng folder sản phẩm, mỗi folder một video. Thư mục nhân vật chỉ chứa
            video reaction. Mỗi lần build chọn ngẫu nhiên một nhân vật, ghép vào video product và ghi đè
            reaction cũ. File mới có dạng <span className="font-mono">reaction_dd_mm_yyyy_hh_mm.mp4</span>.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              <i className="fas fa-folder text-blue-400 mr-1"></i>
              Thư mục product
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Đường dẫn folder chứa các product"
                value={parentFolder}
                onChange={(event) => setParentFolder(event.target.value)}
              />
              <Button onClick={handlePickProductFolder} className="px-4 py-2 bg-blue-500 hover:bg-blue-600">
                <i className="fas fa-folder-open"></i>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <i className="fas fa-user text-purple-400 mr-1"></i>
              Thư mục nhân vật reaction
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Đường dẫn folder chỉ chứa video nhân vật"
                value={reactionFolder}
                onChange={(event) => setReactionFolder(event.target.value)}
              />
              <Button onClick={handlePickReactionFolder} className="px-4 py-2 bg-purple-500 hover:bg-purple-600">
                <i className="fas fa-folder-open"></i>
              </Button>
              <Button
                loading={scanning}
                onClick={handleScan}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700"
              >
                Quét
              </Button>
            </div>
            {reactionError ? (
              <p className="mt-2 text-xs text-red-500">{reactionError}</p>
            ) : reactionFolder ? (
              <p className="mt-2 text-xs text-gray-500">{reactionCount} video nhân vật</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              <span>Vị trí nhân vật</span>
              <select
                value={corner}
                onChange={(event) => setCorner(event.target.value as OverlayCorner)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="bottom-left">Góc trái dưới</option>
                <option value="top-left">Góc trái trên</option>
              </select>
            </label>
            <div className="text-gray-500">
              {rows.length} product · {readyCount} có video · {doneCount} đã có reaction
            </div>
          </div>

          <Button
            loading={building}
            disabled={!parentFolder || !reactionFolder || building || scanning}
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
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Video product</th>
                <th className="px-4 py-3">Ngày tạo reaction</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Chưa có product. Chọn thư mục product rồi quét.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.folder} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.videoAName || "-"}</td>
                    <td className="px-4 py-3">
                      {row.createdAt ? (
                        <div>
                          <div>{row.createdAt}</div>
                          <div className="font-mono text-xs text-gray-500">{row.outputName}</div>
                        </div>
                      ) : row.outputName ? (
                        <div>
                          <div className="text-gray-500">Định dạng cũ</div>
                          <div className="font-mono text-xs text-gray-500">{row.outputName}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Chưa có</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.status === "done"
                            ? "text-green-600"
                            : row.status === "error"
                              ? "text-red-600"
                              : row.status === "running"
                                ? "text-blue-600"
                                : row.hasOutput
                                  ? "text-green-600"
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

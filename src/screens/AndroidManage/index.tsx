import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { windowInstance } from "@/services/window";
import { Android } from "electron/features/android";
import { useCallback, useEffect, useState } from "react";

const formatBytes = (bytes: number) => {
  if (!bytes) return "-";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
};

const AndroidManage = () => {
  const [androidList, setAndroidList] = useState<Android[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionIndex, setActionIndex] = useState<string | null>(null);

  const fetchAndroidList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await windowInstance.api.getAndroidList();
      setAndroidList(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndroidList();
  }, [fetchAndroidList]);

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

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Android Manage</h2>
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm text-gray-500">Loading...</span>}
            <Button
              onClick={fetchAndroidList}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <i className="fa-solid fa-rotate-right mr-1"></i>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Index</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
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
                return (
                  <tr key={item.index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{item.index}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{item.name}</td>
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
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && androidList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
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

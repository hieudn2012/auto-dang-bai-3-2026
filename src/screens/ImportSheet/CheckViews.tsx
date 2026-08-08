import Button from "@/components/Button";
import Input from "@/components/Input";
import { toast } from "@/components/ToastContainer";
import { useMainConfig } from "@/hooks/useMainConfig";
import { getProfiles, useGetGroupList } from "@/services/profiles";
import { windowInstance } from "@/services/window";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type GroupItem = {
  id: number;
  title: string;
};

const GroupRow = ({
  group,
  ws,
  reportName,
  checking,
  onCheckingChange,
}: {
  group: GroupItem;
  ws: string;
  reportName: string;
  checking: boolean;
  onCheckingChange: (groupId: number | null) => void;
}) => {
  const { data, isFetching, isFetched, refetch } = useQuery({
    queryKey: ["profiles", group.id],
    queryFn: () => getProfiles(group.id),
    enabled: false,
  });
  const profiles = data?.data?.data?.data || [];
  const profileNames = profiles
    .map((profile: any) => profile.name)
    .filter(Boolean) as string[];
  const total = profileNames.length;
  const loaded = isFetched;

  const handleCheck = async () => {
    if (!ws.trim()) {
      toast.error("Vui lòng nhập WebSocket URL");
      return;
    }
    if (profileNames.length === 0) {
      toast.error(`Group "${group.title}" không có profile`);
      return;
    }

    const messageEl = document.getElementById(`message-${group.id}`);
    if (messageEl) messageEl.textContent = "";

    onCheckingChange(group.id);
    try {
      // if reportName is not empty, create name with [group_name]_[dd_mm_yyyy_hh_mm]
      const name = `${group.title}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '_')}_${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '_')}`;
      const result = await windowInstance.api.checkAccountViews({
        ws: ws.trim(),
        groupId: group.id,
        profiles: profileNames,
        reportName: reportName || name,
      });
      toast.success(`Đã lưu report: ${result.reportFileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check views thất bại");
    } finally {
      onCheckingChange(null);
    }
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
        {group.title}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        {!loaded ? (
          <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
            {total}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        <div id={`message-${group.id}`} className="truncate min-h-[20px] text-xs" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            loading={isFetching}
            tooltip="Load profiles"
            className="!px-3 !py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-xs"
          >
            <i className="fas fa-download mr-1"></i>
            Load profiles
          </Button>
          <Button
            onClick={handleCheck}
            loading={checking}
            disabled={
              !ws.trim() ||
              !loaded ||
              total === 0 ||
              checking ||
              isFetching
            }
            tooltip="Check views"
            className="!px-3 !py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
          >
            <i className="fas fa-eye mr-1"></i>
            Check
          </Button>
        </div>
      </td>
    </tr>
  );
};

const CheckViews = () => {
  const [ws, setWs] = useState("");
  const [reportName, setReportName] = useState("");
  const [checkingGroupId, setCheckingGroupId] = useState<number | null>(null);
  const [{ data: groupListData, isPending: groupsLoading }] = useGetGroupList();
  const { mainConfig } = useMainConfig();
  const groups: GroupItem[] = groupListData?.data?.data?.data || [];

  useEffect(() => {
    if (mainConfig?.wsUrl) {
      setWs(mainConfig.wsUrl);
    }
  }, [mainConfig]);

  useEffect(() => {
    const handleToast = (_event: unknown, arg: { username?: string; message?: string }) => {
      const { username, message } = arg || {};
      if (!username || message == null) return;
      const el = document.getElementById(`message-${username}`);
      if (el) el.textContent = message;
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.ipcRenderer.on("show-toast", handleToast);

    return () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      window.ipcRenderer.off("show-toast", handleToast);
    };
  }, []);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <i className="fas fa-eye text-indigo-500 mr-2"></i>
          Check Views
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Kiểm tra views theo từng profile group
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-link text-gray-400 mr-1"></i>
            WebSocket URL
          </label>
          <Input
            placeholder="Nhập WebSocket URL..."
            value={ws}
            onChange={(e) => setWs(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i className="fas fa-file-alt text-gray-400 mr-1"></i>
            Report name
          </label>
          <Input
            placeholder="vd: views-group-a"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
            <i className="fas fa-layer-group text-gray-400 mr-2"></i>
            Profile Groups
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {groups.length} groups
          </span>
        </div>

        {groupsLoading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-spinner animate-spin mr-2"></i>
            Loading groups...
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Không có group nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Group name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Total profiles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Message
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {groups.map((group) => (
                  <GroupRow
                    key={group.id}
                    group={group}
                    ws={ws}
                    reportName={reportName}
                    checking={checkingGroupId === group.id}
                    onCheckingChange={setCheckingGroupId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckViews;

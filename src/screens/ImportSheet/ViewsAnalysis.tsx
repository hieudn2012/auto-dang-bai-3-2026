import Button from "@/components/Button";
import Select from "@/components/Select";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  profile: string;
  postUrl: string;
  views: number;
};

type ReportData = {
  fileName: string;
  items: ReportItem[];
  totalRows: number;
  totalProfiles: number;
  totalViews: number;
  avgViews: number;
};

const formatNumber = (n: number) => n.toLocaleString("en-US");

const ViewsAnalysis = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const list = await windowInstance.api.listCheckViewsReports();
      setFiles(list);
      if (list.length > 0) {
        setSelectedFile((prev) => (prev && list.includes(prev) ? prev : list[0]));
      } else {
        setSelectedFile("");
        setReport(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load report files thất bại");
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadReport = async (fileName: string) => {
    if (!fileName) {
      setReport(null);
      return;
    }
    setLoadingReport(true);
    try {
      const data = await windowInstance.api.getCheckViewsReport(fileName);
      setReport(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Load report thất bại");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadReport(selectedFile);
    }
  }, [selectedFile]);

  const profileStats = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, { profile: string; posts: number; totalViews: number }>();
    for (const item of report.items) {
      const current = map.get(item.profile) || { profile: item.profile, posts: 0, totalViews: 0 };
      current.posts += 1;
      current.totalViews += item.views;
      map.set(item.profile, current);
    }
    return Array.from(map.values()).sort((a, b) => b.totalViews - a.totalViews);
  }, [report]);

  const selectOptions = [
    { value: "", label: files.length ? "Chọn file..." : "Chưa có file report" },
    ...files.map((file) => ({ value: file, label: file })),
  ];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <i className="fas fa-chart-bar text-emerald-500 mr-2"></i>
          Views Analysis
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Phân tích dữ liệu từ folder check-views
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <Select
              label="Report file"
              icon="fas fa-file-alt"
              options={selectOptions}
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              disabled={loadingFiles || files.length === 0}
            />
          </div>
          <Button
            onClick={loadFiles}
            loading={loadingFiles}
            className="!px-4 !py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh
          </Button>
        </div>
      </div>

      {loadingReport ? (
        <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          <i className="fa-solid fa-spinner animate-spin mr-2"></i>
          Loading report...
        </div>
      ) : !report || !selectedFile ? (
        <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Chọn một file report để xem phân tích
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rows</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalRows)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profiles</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalProfiles)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total views</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalViews)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg views/post</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.avgViews)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                By profile
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Profile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Posts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Total views
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {profileStats.map((item) => (
                    <tr key={item.profile}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {item.profile}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {item.posts}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.totalViews)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Raw rows
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {report.fileName}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 w-12">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Profile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Post URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Views
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {report.items.map((item, index) => (
                    <tr key={`${item.profile}-${item.postUrl}-${index}`}>
                      <td className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {item.profile}
                      </td>
                      <td className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 max-w-[420px] truncate">
                        <a href={item.postUrl} target="_blank" rel="noreferrer" title={item.postUrl}>
                          {item.postUrl}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.views)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewsAnalysis;

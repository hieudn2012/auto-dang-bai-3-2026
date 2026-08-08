import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useMemo, useState } from "react";

type ReportItem = {
  profile: string;
  postUrl: string;
  views: number;
  like: number;
  comment: number;
  share: number;
  send: number;
};

type ReportData = {
  fileName: string;
  items: ReportItem[];
  totalRows: number;
  totalProfiles: number;
  totalViews: number;
  avgViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSends: number;
};

type BarRow = {
  id: string;
  label: string;
  value: number;
  color: string;
  subLabel?: string;
};

const formatNumber = (n: number) => n.toLocaleString("en-US");

const shortenMiddle = (value: string, head = 10, tail = 8) => {
  if (!value) return "";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
};

const copyText = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Đã copy");
  } catch {
    toast.error("Copy thất bại");
  }
};

const compactNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return formatNumber(n);
};

const BAR_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const HorizontalBarChart = ({
  title,
  rows,
  emptyText = "Không có dữ liệu",
}: {
  title: string;
  rows: BarRow[];
  emptyText?: string;
}) => {
  const max = Math.max(...rows.map((r) => r.value), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">{emptyText}</div>
        ) : (
          rows.map((row) => {
            const width = max > 0 ? Math.max((row.value / max) * 100, 2) : 0;
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-800 dark:text-gray-100" title={row.label}>
                      {row.label}
                    </div>
                    {row.subLabel ? (
                      <div className="truncate text-gray-400 dark:text-gray-500" title={row.subLabel}>
                        {row.subLabel}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 font-semibold text-gray-700 dark:text-gray-200">
                    {compactNumber(row.value)}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const ENGAGEMENT_METRICS = [
  {
    id: "views",
    label: "Views",
    icon: "fas fa-eye",
    color: "#059669",
    soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    bar: "from-emerald-400 to-emerald-600",
  },
  {
    id: "likes",
    label: "Likes",
    icon: "fas fa-heart",
    color: "#dc2626",
    soft: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    bar: "from-rose-400 to-rose-600",
  },
  {
    id: "comments",
    label: "Comments",
    icon: "fas fa-comment",
    color: "#2563eb",
    soft: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    bar: "from-sky-400 to-sky-600",
  },
  {
    id: "shares",
    label: "Shares",
    icon: "fas fa-retweet",
    color: "#d97706",
    soft: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    bar: "from-amber-400 to-amber-600",
  },
  {
    id: "sends",
    label: "Sends",
    icon: "fas fa-paper-plane",
    color: "#0d9488",
    soft: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
    bar: "from-teal-400 to-teal-600",
  },
] as const;

const EngagementBars = ({ report }: { report: ReportData }) => {
  const values: Record<(typeof ENGAGEMENT_METRICS)[number]["id"], number> = {
    views: report.totalViews,
    likes: report.totalLikes,
    comments: report.totalComments,
    shares: report.totalShares,
    sends: report.totalSends,
  };

  const max = Math.max(...Object.values(values), 0);
  const engagementActions =
    report.totalLikes + report.totalComments + report.totalShares + report.totalSends;
  const engagementRate =
    report.totalViews > 0 ? ((engagementActions / report.totalViews) * 100).toFixed(2) : "0.00";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Engagement totals</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            So sánh theo tổng metrics của report
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Eng. rate
          </div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {engagementRate}%
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {ENGAGEMENT_METRICS.map((metric) => {
          const value = values[metric.id];
          const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
          const share = max > 0 ? Math.round((value / max) * 100) : 0;

          return (
            <div
              key={metric.id}
              className="group rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/40 dark:to-gray-800/40 px-3 py-2.5 transition-colors hover:border-gray-200 dark:hover:border-gray-600"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${metric.soft}`}
                >
                  <i className={`${metric.icon} text-sm`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {metric.label}
                    </span>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                        {compactNumber(value)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {share}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200/80 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${metric.bar} transition-all duration-700 ease-out`}
                      style={{ width: `${width}%` }}
                      title={`${metric.label}: ${formatNumber(value)}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ViewsAnalysis = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [minViewsInput, setMinViewsInput] = useState("0");
  const [exporting, setExporting] = useState(false);

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
    const map = new Map<
      string,
      {
        profile: string;
        posts: number;
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
        totalSends: number;
      }
    >();
    for (const item of report.items) {
      const current = map.get(item.profile) || {
        profile: item.profile,
        posts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSends: 0,
      };
      current.posts += 1;
      current.totalViews += item.views;
      current.totalLikes += item.like;
      current.totalComments += item.comment;
      current.totalShares += item.share;
      current.totalSends += item.send;
      map.set(item.profile, current);
    }
    return Array.from(map.values()).sort((a, b) => b.totalViews - a.totalViews);
  }, [report]);

  const topPostsChart = useMemo<BarRow[]>(() => {
    if (!report) return [];
    return report.items.slice(0, 15).map((item, index) => ({
      id: `${item.profile}-${item.postUrl}-${index}`,
      label: `@${item.profile}`,
      subLabel: item.postUrl,
      value: item.views,
      color: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [report]);

  const topProfilesChart = useMemo<BarRow[]>(() => {
    return profileStats.slice(0, 15).map((item, index) => ({
      id: item.profile,
      label: `@${item.profile}`,
      subLabel: `${item.posts} posts`,
      value: item.totalViews,
      color: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [profileStats]);

  const minViews = Math.max(0, Number(minViewsInput.replace(/[^\d]/g, "")) || 0);

  const exportLinks = useMemo(() => {
    if (!report) return [];
    return report.items
      .filter((item) => item.views >= minViews && item.postUrl.trim())
      .map((item) => item.postUrl.trim());
  }, [report, minViews]);

  const openExportDialog = () => {
    setMinViewsInput("0");
    setShowExportDialog(true);
  };

  const handleExport = () => {
    if (!selectedFile || !report) {
      toast.error("Chưa có report để export");
      return;
    }
    if (exportLinks.length === 0) {
      toast.error(`Không có post nào >= ${formatNumber(minViews)} views`);
      return;
    }

    setExporting(true);
    try {
      const content = exportLinks.join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile.endsWith(".txt") ? selectedFile : `${selectedFile}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Đã export ${exportLinks.length} links → ${selectedFile}`);
      setShowExportDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export thất bại");
    } finally {
      setExporting(false);
    }
  };

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
          <Button
            onClick={openExportDialog}
            disabled={!report || !selectedFile || loadingReport}
            className="!px-4 !py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <i className="fas fa-file-export mr-2"></i>
            Export
          </Button>
        </div>
      </div>

      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} className="!max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Export post links
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Xuất file <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFile}</span>
            {" "}— mỗi dòng 1 link post, lọc theo views tối thiểu.
          </p>

          <Input
            label="Min views"
            icon="fas fa-eye"
            type="number"
            min={0}
            value={minViewsInput}
            onChange={(e) => setMinViewsInput(e.target.value)}
            placeholder="e.g. 1000"
          />

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Sẽ export{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNumber(exportLinks.length)}
            </span>{" "}
            / {formatNumber(report?.totalRows || 0)} posts
            {minViews > 0 ? ` (views >= ${formatNumber(minViews)})` : ""}
          </div>

          <div className="flex gap-3 pt-5">
            <Button
              onClick={handleExport}
              loading={exporting}
              disabled={exportLinks.length === 0}
              className="flex-1 !px-4 !py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <i className="fas fa-download mr-2"></i>
              Export
            </Button>
            <Button
              onClick={() => setShowExportDialog(false)}
              disabled={exporting}
              className="flex-1 !px-4 !py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

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
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total likes</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalLikes)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total comments</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalComments)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total shares</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalShares)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total sends</div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(report.totalSends)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
            <EngagementBars report={report} />
            <HorizontalBarChart title="Top posts by views" rows={topPostsChart} />
            <HorizontalBarChart title="Top profiles by views" rows={topProfilesChart} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                By profile
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Profile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Posts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Views
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Likes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Comments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Sends
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
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.totalLikes)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.totalComments)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.totalShares)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.totalSends)}
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
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Like
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Comment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Share
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Send
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
                      <td className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="inline-flex items-center gap-2 max-w-[280px]">
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={item.postUrl}
                            className="truncate font-mono text-xs"
                          >
                            {shortenMiddle(item.postUrl)}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyText(item.postUrl)}
                            className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            title="Copy URL"
                          >
                            <i className="fas fa-copy text-xs"></i>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.views)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.like)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.comment)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.share)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {formatNumber(item.send)}
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

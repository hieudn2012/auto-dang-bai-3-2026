import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Input from "@/components/Input";
import Select from "@/components/Select";
import { toast } from "@/components/ToastContainer";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { windowInstance } from "@/services/window";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const ENGAGEMENT_COLORS: Record<string, string> = {
  Views: "#059669",
  Likes: "#dc2626",
  Comments: "#2563eb",
  Shares: "#d97706",
  Sends: "#0d9488",
};

const ChartCard = ({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
  >
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const ViewsAnalysis = () => {
  const { isDarkMode } = useDarkMode();
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [minViewsInput, setMinViewsInput] = useState("0");
  const [exporting, setExporting] = useState(false);

  const axisColor = isDarkMode ? "#9ca3af" : "#6b7280";
  const gridColor = isDarkMode ? "#374151" : "#e5e7eb";
  const tooltipStyle = {
    backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
    border: `1px solid ${isDarkMode ? "#374151" : "#e5e7eb"}`,
    borderRadius: 8,
    color: isDarkMode ? "#f3f4f6" : "#111827",
    fontSize: 12,
  };

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

  const engagementData = useMemo(() => {
    if (!report) return [];
    return [
      { name: "Views", value: report.totalViews },
      { name: "Likes", value: report.totalLikes },
      { name: "Comments", value: report.totalComments },
      { name: "Shares", value: report.totalShares },
      { name: "Sends", value: report.totalSends },
    ];
  }, [report]);

  const topPostsData = useMemo(() => {
    if (!report) return [];
    return report.items.slice(0, 12).map((item, index) => ({
      name: `@${item.profile}`,
      views: item.views,
      url: item.postUrl,
      fill: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [report]);

  const topProfilesData = useMemo(() => {
    return profileStats.slice(0, 12).map((item, index) => ({
      name: `@${item.profile}`,
      views: item.totalViews,
      posts: item.posts,
      fill: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [profileStats]);

  const profileStackedData = useMemo(() => {
    return profileStats.slice(0, 10).map((item) => ({
      name: `@${item.profile}`,
      likes: item.totalLikes,
      comments: item.totalComments,
      shares: item.totalShares,
      sends: item.totalSends,
    }));
  }, [profileStats]);

  const engagementRate = useMemo(() => {
    if (!report || report.totalViews <= 0) return "0.00";
    const actions =
      report.totalLikes + report.totalComments + report.totalShares + report.totalSends;
    return ((actions / report.totalViews) * 100).toFixed(2);
  }, [report]);

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
            <ChartCard
              title="Engagement totals"
              subtitle="Tỷ lệ metrics trong report"
              right={
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Eng. rate
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {engagementRate}%
                  </div>
                </div>
              }
            >
              <div className="h-[280px]">
                {engagementData.every((d) => d.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={engagementData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {engagementData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={ENGAGEMENT_COLORS[entry.name] || "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [formatNumber(Number(value ?? 0)), ""]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Top posts by views" subtitle="12 posts cao nhất">
              <div className="h-[280px]">
                {topPostsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topPostsData}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: axisColor, fontSize: 11 }}
                        tickFormatter={compactNumber}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        tick={{ fill: axisColor, fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [formatNumber(Number(value ?? 0)), "Views"]}
                        labelFormatter={(_, payload) => {
                          const url = payload?.[0]?.payload?.url;
                          return url ? shortenMiddle(String(url), 16, 12) : "";
                        }}
                      />
                      <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {topPostsData.map((entry) => (
                          <Cell key={`${entry.name}-${entry.url}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Top profiles by views" subtitle="12 profiles cao nhất">
              <div className="h-[280px]">
                {topProfilesData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProfilesData}
                      layout="vertical"
                      margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: axisColor, fontSize: 11 }}
                        tickFormatter={compactNumber}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={88}
                        tick={{ fill: axisColor, fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, _name, item) => [
                          formatNumber(Number(value ?? 0)),
                          `Views (${item?.payload?.posts ?? 0} posts)`,
                        ]}
                      />
                      <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {topProfilesData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title="Engagement by profile"
            subtitle="Top 10 profiles — likes / comments / shares / sends"
            className="mb-6"
          >
            <div className="h-[320px]">
              {profileStackedData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  Không có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profileStackedData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      tick={{ fill: axisColor, fontSize: 11 }}
                      tickFormatter={compactNumber}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => formatNumber(Number(value ?? 0))}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
                      )}
                    />
                    <Bar dataKey="likes" stackId="eng" fill="#dc2626" name="Likes" />
                    <Bar dataKey="comments" stackId="eng" fill="#2563eb" name="Comments" />
                    <Bar dataKey="shares" stackId="eng" fill="#d97706" name="Shares" />
                    <Bar
                      dataKey="sends"
                      stackId="eng"
                      fill="#0d9488"
                      name="Sends"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

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

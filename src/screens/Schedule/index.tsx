// Modal schedule.

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Mode from '@/components/Mode';
import { windowInstance } from '@/services/window';
import Layout from '@/components/Layout';
import { Group } from '../../components/Group';
import { toast } from '@/components/ToastContainer';
import { useGetGroupList } from '@/services/profiles';
import moment from 'moment';
import Switch from '@/components/Switch';

export type Lang = 'vi' | 'en';
export type ForMarket = 'shopee' | 'amz' | 'none';

type ScheduleTime = {
  id: string;
  time: string;
  enabled: boolean;
  groupId: number;
  mode: 'default' | 'affiliate';
  folder: string;
  quoteFolder: string;
  batchSize: number;
  reportName: string;
  captionLabel: string;
  forMarket: ForMarket;
  lang: Lang;
  isIncludeQuote: boolean;
};

const generateRandomId = () => {
  return Math.random().toString(36).substr(2, 9);
};

const ScheduleModal = () => {
  const [schedule, setSchedule] = useState<ScheduleTime>({
    id: generateRandomId(),
    time: moment().add(2, 'minutes').format('HH:mm'),
    enabled: true,
    groupId: -1,
    mode: 'affiliate',
    folder: '',
    quoteFolder: '',
    batchSize: 10,
    reportName: moment().add(2, 'minutes').format('DD_MM_HH_mm_A'),
    captionLabel: '',
    forMarket: 'amz',
    lang: 'en',
    isIncludeQuote: false,
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [{ data: groupListData }] = useGetGroupList();
  const groups = groupListData?.data?.data?.data || [];

  useEffect(() => {
    handleLoadJobs();
  }, []);

  const updateSchedule = (time: string) => {
    setSchedule(prev => ({ ...prev, time }));
  };

  const updateScheduleGroup = (groupId: number) => {
    setSchedule(prev => ({ ...prev, groupId }));
  };

  const updateScheduleMode = (mode: 'default' | 'affiliate') => {
    setSchedule(prev => ({ ...prev, mode }));
  };

  const updateScheduleFolder = (folder: string) => {
    setSchedule(prev => ({ ...prev, folder }));
  };

  const updateScheduleBatchSize = (batchSize: number) => {
    setSchedule(prev => ({ ...prev, batchSize }));
  };

  const updateScheduleReportName = (reportName: string) => {
    setSchedule(prev => ({ ...prev, reportName }));
  };

  const updateScheduleMarket = (forMarket: ForMarket) => {
    setSchedule(prev => ({ ...prev, forMarket }));
  };

  const updateScheduleQuoteFolder = (quoteFolder: string) => {
    setSchedule(prev => ({ ...prev, quoteFolder }));
  };

  const updateScheduleLang = (lang: Lang) => {
    setSchedule(prev => ({ ...prev, lang }));
  };

  const updateScheduleIsIncludeQuote = (isIncludeQuote: boolean) => {
    setSchedule(prev => ({ ...prev, isIncludeQuote }));
  };

  const handleSelectFolder = async (type: 'post' | 'quote') => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (type === 'post') {
      updateScheduleFolder(folderPath);
    } else {
      updateScheduleQuoteFolder(folderPath);
    }
  };

  const getTimeUntilSchedule = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const diff = scheduledTime.getTime() - now.getTime();
    const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hoursRemaining}h ${minutesRemaining}m`;
  };

  const startScheduling = () => {
    // Validate schedule has all required fields
    if (!schedule.time || schedule.groupId <= -1 || !schedule.folder || !schedule.reportName) {
      toast.error('Vui lòng điền đầy đủ thông tin: thời gian, nhóm, thư mục, tên báo cáo');
      return;
    }

    const [hours, minutes] = schedule.time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If scheduled time is in the past, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Convert directly from time to runAt timestamp
    const runAt = scheduledTime.getTime();

    const jobData = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      runAt,
      enabled: true,
      jobType: 'auto-post' as const,
      batchSize: schedule.batchSize,
      reportName: schedule.reportName,
      groupName: '',
      groupId: schedule.groupId,
      mode: schedule.mode,
      folder: schedule.folder,
      captionLabel: schedule.captionLabel,
      forMarket: schedule.forMarket as 'shopee' | 'amz' | 'none',
      quoteFolder: schedule.quoteFolder,
      lang: schedule.lang,
      isIncludeQuote: schedule.isIncludeQuote,
    };

    // Gửi job đến electron main process
    windowInstance.api.addJobs([jobData]);
    handleLoadJobs();
  };

  const handleLoadJobs = async () => {
    try {
      const queueJobs = await windowInstance.api.getQueue();
      setJobs(queueJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleClearJobs = async () => {
    try {
      await windowInstance.api.clearJobs();
      setJobs([]);
    } catch (error) {
      console.error('Error clearing jobs:', error);
    }
  };

  const formatJobTime = (runAt: number) => {
    const date = new Date(runAt);
    return date.toLocaleString('vi-VN');
  };

  const getGroupName = (groupId: number) => {
    const group = groups.find((g: any) => g.id === groupId);
    return group?.title || `Group ${groupId}`;
  };

  const getTimeUntilJob = (runAt: number) => {
    const now = Date.now();
    const diff = runAt - now;

    if (diff <= 0) return 'Đã chạy';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const isDisabled = !schedule.time || !schedule.folder || schedule.groupId === -1 || !schedule.reportName || !schedule.quoteFolder || !schedule.lang;

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-clock text-amber-600 dark:text-amber-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hẹn giờ đăng bài</h2>
          </div>
        </div>

        <div className="space-y-8">
          {/* Schedule Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 dark:bg-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                  <i className="fa-solid fa-clock text-white text-sm"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cài đặt lịch trình</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Thiết lập thời gian và thông tin đăng bài tự động</p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Folder Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-folder text-indigo-500"></i>
                    Thư mục nội dung
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Chọn thư mục chứa file nội dung..."
                      value={schedule.folder}
                      onChange={(e) => updateScheduleFolder(e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                    <Button
                      onClick={() => handleSelectFolder('post')}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                      tooltip="Chọn thư mục từ hệ thống"
                    >
                      <i className="fas fa-folder-open"></i>
                    </Button>
                  </div>
                </div>

                {/* Quote Folder Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-folder text-indigo-500"></i>
                    Thư mục quote
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Chọn thư mục chứa file quote..."
                      value={schedule.quoteFolder}
                      onChange={(e) => updateScheduleQuoteFolder(e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                    <Button
                      onClick={() => handleSelectFolder('quote')}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                      tooltip="Chọn thư mục từ hệ thống"
                    >
                      <i className="fas fa-folder-open"></i>
                    </Button>
                  </div>
                </div>

                {/* Group Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-users text-blue-500"></i>
                    Nhóm profiles
                  </label>
                  <Group
                    value={schedule.groupId}
                    onChange={(value) => updateScheduleGroup(value)}
                  />
                </div>

                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-cog text-purple-500"></i>
                    Chế độ
                  </label>
                  <Mode
                    value={schedule.mode}
                    onChange={(value) => updateScheduleMode(value)}
                  />
                </div>

                {/* Batch Size */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-green-500"></i>
                    Batch Size
                  </label>
                  <Select
                    value={schedule.batchSize}
                    onChange={(e) => updateScheduleBatchSize(Number(e.target.value))}
                    options={[
                      { value: 1, label: '1 profiles' },
                      { value: 2, label: '2 profiles' },
                      { value: 3, label: '3 profiles' },
                      { value: 5, label: '5 profiles' },
                      { value: 10, label: '10 profiles' },
                      { value: 20, label: '20 profiles' },
                      { value: 30, label: '30 profiles' },
                      { value: 50, label: '50 profiles' },
                      { value: 100, label: '100 profiles' },
                    ]}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Report Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-file-alt text-orange-500"></i>
                    Tên báo cáo
                  </label>
                  <Input
                    placeholder="Nhập tên báo cáo"
                    value={schedule.reportName}
                    onChange={(e) => updateScheduleReportName(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* For Market */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-globe text-yellow-500"></i>
                    Dành cho
                  </label>
                  <Select
                    value={schedule.forMarket}
                    onChange={(e) => updateScheduleMarket(e.target.value as 'shopee' | 'amz' | 'none')}
                    options={[
                      { value: 'shopee', label: 'Shopee' },
                      { value: 'amz', label: 'Amazon' },
                      { value: 'none', label: 'None' },
                    ]}
                  />
                </div>

                {/* Language */}
                <div>
                  <Select
                    value={schedule.lang}
                    onChange={(e) => updateScheduleLang(e.target.value as Lang)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    options={[
                      { label: 'English', value: 'en' },
                      { label: 'Vietnamese', value: 'vi' },
                    ]}
                    label="Language"
                    icon="fa-solid fa-language"
                  />
                </div>

                {/* Time Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-clock text-amber-500"></i>
                    Thời gian chạy
                  </label>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => updateSchedule(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                {/* Include Quote */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <i className="fa-solid fa-quote-left text-red-500"></i>
                    Bao gồm quote
                  </label>
                  <Switch
                    enabled={schedule.isIncludeQuote}
                    onChange={(value) => updateScheduleIsIncludeQuote(value)}
                  />
                </div>

              </div>

              {/* Status and Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {schedule.time && schedule.enabled && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <i className="fa-solid fa-hourglass-half text-blue-600 dark:text-blue-400"></i>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {getTimeUntilSchedule(schedule.time)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={startScheduling}
                    disabled={isDisabled}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-play mr-2"></i>
                    Bắt đầu hẹn giờ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Section */}
        <div className="border-t border-gray-100/50 pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-list text-blue-600 dark:text-blue-400 text-sm"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Jobs trong hàng đợi</h3>
              <span className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-600 dark:text-blue-400">
                {jobs.length} jobs
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleClearJobs}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm"
              >
                <i className="fa-solid fa-trash mr-1"></i>
                Xóa tất cả
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-center py-6 text-gray-600 dark:text-gray-400 rounded-lg">
                <i className="fa-solid fa-inbox text-3xl mb-2 opacity-50"></i>
                <p>Không có jobs nào trong hàng đợi</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {jobs.map((job, index) => (
                  <div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    {/* Job Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{index + 1}</span>
                          </div>
                          <div className="text-white">
                            <div className="font-bold text-xl">Job #{getGroupName(job.data?.groupId)}</div>
                          </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-[1px] rounded-full">
                          <span className="text-white text-sm font-medium">
                            {getTimeUntilJob(job.runAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-3">
                          {/* Time */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <i className="fas fa-clock text-blue-600 dark:text-blue-400"></i>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Thời gian</div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {formatJobTime(job.runAt)}
                              </div>
                            </div>
                          </div>

                          {/* Group */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                              <i className="fas fa-users text-purple-600 dark:text-purple-400"></i>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nhóm</div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {getGroupName(job.data?.groupId)}
                              </div>
                            </div>
                          </div>

                          {/* Mode */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                              <i className="fas fa-cog text-green-600 dark:text-green-400"></i>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Chế độ</div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {job.data?.mode}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-3">
                          {/* Caption */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                              <i className="fas fa-tag text-orange-600 dark:text-orange-400"></i>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Caption</div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium">
                                {job.data?.captionLabel || 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Folder */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <i className="fas fa-folder text-gray-600 dark:text-gray-400"></i>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Thư mục</div>
                              <div className="text-sm text-gray-900 dark:text-white font-medium break-all">
                                {job.data?.folder || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScheduleModal;

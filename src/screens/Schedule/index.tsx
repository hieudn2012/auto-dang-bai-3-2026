// Modal schedule.

import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Mode from '@/components/Mode';
import { windowInstance } from '@/services/window';
import Layout from '@/components/Layout';
import { Group } from '../Profiles/Group';
import { toast } from '@/components/ToastContainer';

type ScheduleTime = {
  id: string;
  time: string;
  enabled: boolean;
  groupId: number;
  mode: 'default' | 'affiliate';
  folder: string;
  batchSize: number;
};

const ScheduleModal = () => {
  const [schedule, setSchedule] = useState<ScheduleTime>({
    id: '1',
    time: '',
    enabled: true,
    groupId: -1,
    mode: 'default',
    folder: '',
    batchSize: 10
  });
  const [jobs, setJobs] = useState<any[]>([]);

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

  const handleSelectFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    updateScheduleFolder(folderPath);
  };

  const toggleSchedule = (enabled: boolean) => {
    setSchedule(prev => ({ ...prev, enabled }));
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
    if (!schedule.time || schedule.groupId <= -1 || !schedule.folder) {
      toast.error('Vui lòng điền đầy đủ thông tin: thời gian, nhóm, thư mục và chế độ');
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

    const job = {
      id: schedule.id,
      runAt: runAt,
      enabled: schedule.enabled,
      groupId: schedule.groupId,
      mode: schedule.mode,
      folder: schedule.folder,
      jobType: 'auto-post' as const,
      batchSize: schedule.batchSize
    };

    // Gửi job đến electron main process
    windowInstance.api.addJobs([job]);
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

                {/* Folder Selection */}
                <div className="space-y-2 md:col-span-2">
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
                      onClick={handleSelectFolder}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                      tooltip="Chọn thư mục từ hệ thống"
                    >
                      <i className="fas fa-folder-open"></i>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) => toggleSchedule(e.target.checked)}
                        className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Kích hoạt lịch trình</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bật/tắt tự động chạy</p>
                      </div>
                    </label>

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
                    disabled={!schedule.time || !schedule.folder || schedule.groupId <= -1}
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
              <div className="space-y-2">
                {jobs.map((job, index) => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-500/50">
                    <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">Job: {job.id}</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-600 dark:text-blue-400">
                          {job.data?.jobType || 'post'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-1">
                        <div>Chạy: {formatJobTime(job.runAt)}</div>
                        <div>Còn lại: {getTimeUntilJob(job.runAt)}</div>
                        <div>Group: {job.data?.groupId}</div>
                        <div>Mode: {job.data?.mode}</div>
                        <div className="col-span-2">Folder: {job.data?.folder || 'N/A'}</div>
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

// Modal schedule.

import { useState, useEffect } from 'react';
import Dialog from '@/components/Dialog';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Group } from './Group';
import Mode from '@/components/Mode';
import { windowInstance } from '@/services/window';

type ScheduleTime = {
  id: string;
  time: string;
  enabled: boolean;
  groupId: number;
  mode: 'default' | 'affiliate';
  folder: string;
};

const ScheduleModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleTime[]>([
    { id: '1', time: '', enabled: true, groupId: -1, mode: 'default', folder: '' }
  ]);
  const [activeSchedules, setActiveSchedules] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    // Cleanup all timeouts only when component unmounts
    return () => {
      Object.values(activeSchedules).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    if (showModal) {
      handleLoadJobs();
    }
  }, [showModal]);

  const addSchedule = () => {
    const newSchedule: ScheduleTime = {
      id: Date.now().toString(),
      time: '',
      enabled: true,
      groupId: -1,
      mode: 'default',
      folder: ''
    };
    setSchedules([...schedules, newSchedule]);
  };

  const removeSchedule = (id: string) => {
    // Clear timeout if exists
    if (activeSchedules[id]) {
      clearTimeout(activeSchedules[id]);
      const newActiveSchedules = { ...activeSchedules };
      delete newActiveSchedules[id];
      setActiveSchedules(newActiveSchedules);
    }

    setSchedules(schedules.filter(s => s.id !== id));
  };

  const updateSchedule = (id: string, time: string) => {
    setSchedules(schedules.map(s =>
      s.id === id ? { ...s, time } : s
    ));
  };

  const updateScheduleGroup = (id: string, groupId: number) => {
    setSchedules(schedules.map(s =>
      s.id === id ? { ...s, groupId } : s
    ));
  };

  const updateScheduleMode = (id: string, mode: 'default' | 'affiliate') => {
    setSchedules(schedules.map(s =>
      s.id === id ? { ...s, mode } : s
    ));
  };

  const updateScheduleFolder = (id: string, folder: string) => {
    setSchedules(schedules.map(s =>
      s.id === id ? { ...s, folder } : s
    ));
  };

  const handleSelectFolder = async (id: string) => {
    const folderPath = await windowInstance.api.openDialogFolder();
    updateScheduleFolder(id, folderPath);
  };

  const toggleSchedule = (id: string, enabled: boolean) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    // Clear existing timeout if disabling
    if (!enabled && activeSchedules[id]) {
      clearTimeout(activeSchedules[id]);
      const newActiveSchedules = { ...activeSchedules };
      delete newActiveSchedules[id];
      setActiveSchedules(newActiveSchedules);
    }

    setSchedules(schedules.map(s =>
      s.id === id ? { ...s, enabled } : s
    ));
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
    const enabledSchedules = schedules.filter(s => s.enabled);

    // Validate each enabled schedule has all required fields
    const invalidSchedules = enabledSchedules.filter(s => !s.time || s.groupId <= -1 || !s.folder);

    if (invalidSchedules.length > 0) {
      alert('Vui lòng điền đầy đủ thông tin cho từng lịch hẹn: thời gian, nhóm, thư mục và chế độ');
      return;
    }

    // Convert schedules to jobs with timestamps
    const jobs = enabledSchedules.map(schedule => {
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

      return {
        id: schedule.id,
        runAt: runAt, // Direct timestamp from time picker
        enabled: schedule.enabled,
        groupId: schedule.groupId,
        mode: schedule.mode,
        folder: schedule.folder,
        jobType: 'auto-post' as const,
        batchSize: 10
      };
    });

    // Gửi jobs đến electron main process
    windowInstance.api.addJobs(jobs);
    handleLoadJobs();
    setShowModal(false);
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
    <div>
      <div>
        <Button
          onClick={() => setShowModal(true)}
          tooltip="Hẹn giờ"
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <i className="fa-solid fa-clock mr-2"></i>
          Schedule
        </Button>
      </div>
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-clock text-amber-600 dark:text-amber-400"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hẹn giờ đăng bài</h2>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => updateSchedule(schedule.id, e.target.value)}
                    className="flex-shrink-0 w-[110px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                  />
                  <div className="flex-1 min-w-[200px]">
                    <Group
                      value={schedule.groupId}
                      onChange={(value) => updateScheduleGroup(schedule.id, value)}
                    />
                  </div>
                  <div className="w-[200px]">
                    <Mode
                      value={schedule.mode}
                      onChange={(value) => updateScheduleMode(schedule.id, value)}
                    />
                  </div>
                  <div className="flex-1 min-w-[350px]">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Chọn thư mục"
                        value={schedule.folder}
                        onChange={(e) => updateScheduleFolder(schedule.id, e.target.value)}
                        className="flex-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                      />
                      <Button
                        onClick={() => handleSelectFolder(schedule.id)}
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                        tooltip="Chọn thư mục từ hệ thống"
                      >
                        <i className="fas fa-folder-open"></i>
                      </Button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(e) => toggleSchedule(schedule.id, e.target.checked)}
                      className="rounded w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm whitespace-nowrap">Kích hoạt</span>
                  </label>
                  {schedule.time && schedule.enabled && (
                    <div className="px-3 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                        {getTimeUntilSchedule(schedule.time)}
                      </span>
                    </div>
                  )}
                  {schedules.length > 1 && (
                    <button
                      onClick={() => removeSchedule(schedule.id)}
                      className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 flex items-center justify-center"
                      title="Xóa"
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  )}
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <i className="fa-solid fa-clock text-4xl mb-3 opacity-50 text-gray-500 dark:text-gray-400"></i>
                  <p>Chưa có lịch hẹn nào</p>
                  <p className="text-sm mt-1">Nhấn "Thêm thời gian" để tạo lịch mới</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 py-4 border-t border-gray-700/50">
              <Button
                onClick={addSchedule}
                tooltip="Thêm thời gian"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Thêm thời gian
              </Button>
              <Button
                onClick={startScheduling}
                tooltip="Bắt đầu hẹn giờ"
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <i className="fa-solid fa-play mr-2"></i>
                Bắt đầu hẹn giờ
              </Button>
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
      </Dialog>
    </div>
  );
};

export default ScheduleModal;

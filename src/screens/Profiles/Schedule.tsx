// Modal schedule.

import { useState, useEffect } from 'react';
import Dialog from '@/components/Dialog';
import Button from '@/components/Button';
import Input from '@/components/Input';

type ScheduleTime = {
  id: string;
  time: string;
  enabled: boolean;
};

type Props = {
  onSchedule: (times: string[]) => void;
};

const ScheduleModal = ({ onSchedule }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleTime[]>([
    { id: '1', time: '', enabled: true }
  ]);
  const [activeSchedules, setActiveSchedules] = useState<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    // Cleanup all timeouts only when component unmounts
    return () => {
      Object.values(activeSchedules).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const addSchedule = () => {
    const newSchedule: ScheduleTime = {
      id: Date.now().toString(),
      time: '',
      enabled: true
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

  const startScheduling = () => {
    const enabledSchedules = schedules.filter(s => s.enabled && s.time);
    const timesToSchedule = enabledSchedules.map(s => s.time);

    if (timesToSchedule.length === 0) {
      alert('Vui lòng chọn ít nhất một thời gian hợp lệ');
      return;
    }

    // Set up timeouts for each schedule
    const newActiveSchedules: { [key: string]: NodeJS.Timeout } = {};

    enabledSchedules.forEach(schedule => {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If scheduled time is in the past, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const timeUntilSchedule = scheduledTime.getTime() - now.getTime();

      console.log(`Setting timeout for ${schedule.time} in ${timeUntilSchedule}ms (${Math.floor(timeUntilSchedule / 1000 / 60)} minutes)`);

      const timeout = setTimeout(() => {
        console.log(`Timeout fired for schedule ${schedule.id} at time ${schedule.time}`);

        // Call the callback function
        onSchedule([schedule.time]);

        // Remove from active schedules using functional update to avoid stale state
        setActiveSchedules(prev => {
          const updated = { ...prev };
          delete updated[schedule.id];
          return updated;
        });

        // Disable this schedule
        setSchedules(prev => prev.map(s =>
          s.id === schedule.id ? { ...s, enabled: false } : s
        ));
      }, timeUntilSchedule);

      newActiveSchedules[schedule.id] = timeout;
    });

    setActiveSchedules(newActiveSchedules);
    setShowModal(false);
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
                <div key={schedule.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">{index + 1}</span>
                  </div>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => updateSchedule(schedule.id, e.target.value)}
                    className="flex-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                  />
                  <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(e) => toggleSchedule(schedule.id, e.target.checked)}
                      className="rounded w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm">Kích hoạt</span>
                  </label>
                  {schedule.time && schedule.enabled && (
                    <div className="px-3 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
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

            <div className="flex gap-3 pt-4 border-t border-gray-700/50">
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

            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <i className="fa-solid fa-info-circle text-blue-500 dark:text-blue-400 mr-2"></i>
                Hướng dẫn sử dụng
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-green-500 dark:text-green-400 mt-0.5 text-xs"></i>
                  <p>Chọn thời gian để đăng bài tự động</p>
                </div>
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-green-500 dark:text-green-400 mt-0.5 text-xs"></i>
                  <p>Có thể thêm nhiều mốc thời gian</p>
                </div>
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-check text-green-500 dark:text-green-400 mt-0.5 text-xs"></i>
                  <p>Hệ thống sẽ gọi callback khi đến thời gian</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ScheduleModal;

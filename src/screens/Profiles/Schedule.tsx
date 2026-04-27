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
        <Button onClick={() => setShowModal(true)} tooltip="Hẹn giờ">
          <i className="fa-solid fa-clock"></i>
        </Button>
      </div>
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Hẹn giờ đăng bài</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              {schedules.map((schedule, index) => (
                <div key={schedule.id} className="flex items-center gap-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                  <span className="text-gray-300 w-8">{index + 1}.</span>
                  <Input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => updateSchedule(schedule.id, e.target.value)}
                    className="flex-1 bg-white"
                  />
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(e) => toggleSchedule(schedule.id, e.target.checked)}
                      className="rounded"
                    />
                    Kích hoạt
                  </label>
                  {schedule.time && schedule.enabled && (
                    <span className="text-xs text-blue-400">
                      {getTimeUntilSchedule(schedule.time)}
                    </span>
                  )}
                  {schedules.length > 1 && (
                    <button
                      onClick={() => removeSchedule(schedule.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={addSchedule} tooltip="Thêm thời gian">
                <i className="fa-solid fa-plus"></i>
                Thêm thời gian
              </Button>
              <Button onClick={startScheduling} tooltip="Bắt đầu hẹn giờ">
                <i className="fa-solid fa-play"></i>
                Bắt đầu hẹn giờ
              </Button>
            </div>

            <div className="text-sm text-gray-400">
              <p>• Chọn thời gian để đăng bài tự động</p>
              <p>• Có thể thêm nhiều mốc thời gian</p>
              <p>• Hệ thống sẽ gọi callback khi đến thời gian</p>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ScheduleModal;

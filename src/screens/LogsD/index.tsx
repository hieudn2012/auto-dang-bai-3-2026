import { useState, useEffect, useRef } from 'react';
import Button from '@/components/Button';
import Layout from '@/components/Layout';
import { LogItem } from '@/types/log';
import { windowInstance } from '@/services/window';

interface LogEntry extends LogItem {
  timestamp: string;
  id: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for log events from main process
    const handleLog = (log: LogItem) => {
      if (isPaused) return;
      
      const newLog: LogEntry = {
        ...log,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        id: `${Date.now()}-${Math.random()}`
      };
      
      setLogs(prev => {
        const updated = [...prev, newLog];
        // Keep only last 1000 logs to prevent memory issues
        return updated.slice(-1000);
      });
    };

    // Register event listener
    if (windowInstance.api?.onLog) {
      windowInstance.api.onLog(handleLog);
    }

    return () => {
      // Cleanup event listener
      if (windowInstance.api?.removeLogListener) {
        windowInstance.api.removeLogListener(handleLog);
      }
    };
  }, [isPaused]);

  useEffect(() => {
    // Auto scroll to bottom when new logs arrive
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.username ? `[${log.username}]` : ''} ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('lỗi') || lowerMessage.includes('error')) return 'text-red-600 dark:text-red-400';
    if (lowerMessage.includes('hoàn thành') || lowerMessage.includes('đã')) return 'text-green-600 dark:text-green-400';
    if (lowerMessage.includes('chờ') || lowerMessage.includes('bắt đầu')) return 'text-blue-600 dark:text-blue-400';
    if (lowerMessage.includes('bỏ qua') || lowerMessage.includes('không')) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-700 dark:text-gray-300';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                    <i className="fa-solid fa-terminal text-white text-xl"></i>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Logs Hệ Thống
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Xem logs real-time từ các processes tự động
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {logs.length} logs
                    </span>
                  </div>
                  <Button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-4 py-2 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 ${
                      isPaused 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/25'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25'
                    }`}
                    tooltip={isPaused ? "Tiếp tục nhận logs" : "Tạm dừng nhận logs"}
                  >
                    <i className={`fas ${isPaused ? 'fa-play' : 'fa-pause'} mr-2`}></i>
                    {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 animate-slide-up">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoScroll}
                      onChange={(e) => setIsAutoScroll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Auto scroll
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={clearLogs}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-105"
                    tooltip="Xóa tất cả logs"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Xóa
                  </Button>
                  <Button
                    onClick={exportLogs}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105"
                    tooltip="Xuất logs ra file"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Xuất
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Container */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <i className="fa-solid fa-stream"></i>
                Live Logs
              </h3>
            </div>
            <div 
              ref={logContainerRef}
              className="h-[600px] overflow-y-auto p-4 bg-gray-900 font-mono text-sm"
              style={{ scrollBehavior: isAutoScroll ? 'smooth' : 'auto' }}
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                    <i className="fa-solid fa-inbox text-2xl"></i>
                  </div>
                  <p className="text-center">
                    {isPaused ? 'Đã tạm dừng nhận logs' : 'Chưa có logs nào...'}
                  </p>
                  {!isPaused && (
                    <p className="text-sm mt-2 text-gray-600">
                      Logs sẽ xuất hiện khi có hoạt động từ hệ thống
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-3 py-1 px-2 rounded hover:bg-gray-800 transition-colors duration-200"
                    >
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {log.timestamp}
                      </span>
                      {log.username && (
                        <span className="text-purple-400 text-xs flex-shrink-0 min-w-[80px]">
                          [{log.username}]
                        </span>
                      )}
                      <span className={`flex-1 ${getLogTypeColor(log.message)}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-orange-500' : 'bg-green-500'} ${!isPaused && 'animate-pulse'}`}></div>
                  {isPaused ? 'Đã tạm dừng' : 'Đang nhận logs'}
                </span>
                <span>Auto scroll: {isAutoScroll ? 'Bật' : 'Tắt'}</span>
              </div>
              <span>
                Hiển thị {logs.length} logs gần nhất
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Logs;

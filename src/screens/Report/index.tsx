import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { toast } from '@/components/ToastContainer';
import { windowInstance } from '@/services/window';
import Layout from '@/components/Layout';

interface ReportItem {
  id: string;
  username: string;
  create_at: string;
  status: string;
  note: string;
  reportName: string;
}

interface ReportData {
  results: ReportItem[];
  totalFailed: number;
  totalCompleted: number;
  failedItems: ReportItem[];
}

const ReportModal = () => {
  const [reportNames, setReportNames] = useState<string[]>([]);
  const [selectedReportName, setSelectedReportName] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadReportNames();
  }, []);

  const loadReportNames = async () => {
    try {
      const names = await windowInstance.api.getReportNames();
      setReportNames(names.reverse());
    } catch (error) {
      console.error('Error loading report names:', error);
      toast.error('Không thể tải danh sách báo cáo');
    }
  };

  const loadReportData = async (reportName: string) => {
    if (!reportName) return;
    
    setLoading(true);
    try {
      const data = await windowInstance.api.getReportByReportName(reportName);
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleReportNameChange = (reportName: string) => {
    setSelectedReportName(reportName);
    if (reportName) {
      loadReportData(reportName);
    } else {
      setReportData(null);
    }
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
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <i className="fa-solid fa-file-alt text-white text-xl"></i>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      Báo cáo
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Xem và quản lý báo cáo tự động</p>
                  </div>
                </div>
                <Button
                  onClick={loadReportNames}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105"
                  tooltip="Tải lại danh sách báo cáo"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  Tải lại
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Report Selection */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-slide-up">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-list text-white text-sm"></i>
                </div>
                Chọn báo cáo
              </label>
              <Select
                value={selectedReportName}
                onChange={(e) => handleReportNameChange(e.target.value)}
                options={[
                  { value: '', label: '-- Chọn báo cáo --' },
                  ...reportNames.map((name) => ({ value: name, label: name }))
                ]}
                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Report Data */}
            {loading && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 animate-fade-in">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-orange-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <span className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Đang tải dữ liệu...</span>
                </div>
              </div>
            )}

            {reportData && !loading && (
              <div className="space-y-8 animate-fade-in">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 shadow-lg shadow-green-500/25 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-check-circle text-white"></i>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {reportData.totalCompleted}
                          </div>
                          <div className="text-green-100 text-sm">Hoàn thành</div>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-full px-2 py-1">
                        <span className="text-white text-xs font-semibold">+12%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-4 shadow-lg shadow-red-500/25 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-times-circle text-white"></i>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {reportData.totalFailed}
                          </div>
                          <div className="text-red-100 text-sm">Thất bại</div>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-full px-2 py-1">
                        <span className="text-white text-xs font-semibold">-5%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 shadow-lg shadow-blue-500/25 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <i className="fa-solid fa-chart-line text-white"></i>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {reportData.results.length}
                          </div>
                          <div className="text-blue-100 text-sm">Tổng cộng</div>
                        </div>
                      </div>
                      <div className="bg-white/20 rounded-full px-2 py-1">
                        <span className="text-white text-xs font-semibold">100%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Details Table */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <i className="fa-solid fa-table"></i>
                      Chi tiết báo cáo
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Thời gian
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {reportData.results.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                                #{item.id}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {item.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.username}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {item.create_at}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                                item.status === 'completed' 
                                  ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-green-500/25 shadow-md'
                                  : 'bg-gradient-to-r from-red-400 to-red-600 text-white shadow-red-500/25 shadow-md'
                              }`}>
                                {item.status === 'completed' ? (
                                  <><i className="fas fa-check mr-1"></i> Hoàn thành</>
                                ) : (
                                  <><i className="fas fa-times mr-1"></i> Thất bại</>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs">
                                {item.note || 'Không có ghi chú'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!loading && !reportData && selectedReportName && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-500/25">
                  <i className="fa-solid fa-inbox text-white text-3xl"></i>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">Không có dữ liệu báo cáo</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Báo cáo này hiện đang trống</p>
              </div>
            )}

            {!loading && !reportData && !selectedReportName && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                  <i className="fa-solid fa-file-alt text-white text-3xl"></i>
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">Vui lòng chọn báo cáo để xem chi tiết</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Chọn một báo cáo từ danh sách ở trên để bắt đầu</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportModal;

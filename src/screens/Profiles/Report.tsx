// report modal

import { useState } from 'react';
import { windowInstance } from '../../services/window';
import Button from '@/components/Button';
import Dialog from '@/components/Dialog';

type Props = {
  reportName: string;
};

const ReportModal = ({ reportName }: Props) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const result = await windowInstance.api.getReportByReportName(reportName);
      setReportData(result);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button 
        onClick={fetchReport} 
        tooltip="Get report"
        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
      >
        <i className="fa-solid fa-file mr-2"></i>
        Report
      </Button>
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-file text-emerald-400"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Báo cáo: {reportName}</h2>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-400"></i>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 rounded-xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-chart-simple text-blue-500 text-sm"></i>
                    </div>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">Tổng cộng</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{reportData.results.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 rounded-xl border border-green-200/50 dark:border-green-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-check text-green-500 text-sm"></i>
                    </div>
                    <h3 className="font-semibold text-green-700 dark:text-green-300">Hoàn thành</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{reportData.totalCompleted}</p>
                </div>
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-6 rounded-xl border border-red-200/50 dark:border-red-800/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-xmark text-red-500 text-sm"></i>
                    </div>
                    <h3 className="font-semibold text-red-700 dark:text-red-300">Thất bại</h3>
                  </div>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{reportData.totalFailed}</p>
                </div>
              </div>

              {reportData?.failedItems.length > 0 && (
                <div className="bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-xl border border-red-200/50 dark:border-red-800/50 backdrop-blur-sm">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <i className="fa-solid fa-exclamation-triangle text-red-500 text-sm"></i>
                      </div>
                      <h3 className="font-semibold text-red-700 dark:text-red-300">Các tài khoản thất bại</h3>
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                        {reportData.failedItems.length}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-red-200/50 dark:border-red-800/50">
                            <th className="text-left p-3 font-medium text-red-700 dark:text-red-300">ID</th>
                            <th className="text-left p-3 font-medium text-red-700 dark:text-red-300">Username</th>
                            <th className="text-left p-3 font-medium text-red-700 dark:text-red-300">Thời gian</th>
                            <th className="text-left p-3 font-medium text-red-700 dark:text-red-300">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData?.failedItems.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-red-100/50 dark:border-red-900/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors">
                              <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{item.id}</td>
                              <td className="p-3 text-gray-600 dark:text-gray-400">{item.username}</td>
                              <td className="p-3 text-gray-600 dark:text-gray-400">{item.create_at}</td>
                              <td className="p-3 text-gray-600 dark:text-gray-400">{item.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-gray-500/5 to-gray-600/5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gray-500/20 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-list text-gray-500 text-sm"></i>
                    </div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">Tất cả hoạt động</h3>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                      {reportData.results.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">ID</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Username</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Thời gian</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Trạng thái</th>
                          <th className="text-left p-3 font-medium text-gray-700 dark:text-gray-300">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.results.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{item.id}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{item.username}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{item.create_at}</td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-800/50'
                                : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50'
                              }`}>
                                {item.status === 'completed' ? '✓ Hoàn thành' : '✗ Thất bại'}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{item.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-file text-2xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Không có dữ liệu báo cáo</p>
            </div>
          )}
        </div>
      </Dialog>
    </div>

  );
};

export default ReportModal;

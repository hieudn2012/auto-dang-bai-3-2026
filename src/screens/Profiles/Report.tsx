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
      <Button onClick={fetchReport} tooltip="Get report">
        <i className="fa-solid fa-file"></i>
      </Button>
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Báo cáo: {reportName}</h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-white"></i>
              <p className="mt-2 text-gray-300">Đang tải dữ liệu...</p>
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-900/50 p-4 rounded border border-blue-700">
                  <h3 className="font-semibold text-blue-300">Tổng cộng</h3>
                  <p className="text-2xl font-bold text-blue-400">{reportData.results.length}</p>
                </div>
                <div className="bg-green-900/50 p-4 rounded border border-green-700">
                  <h3 className="font-semibold text-green-300">Hoàn thành</h3>
                  <p className="text-2xl font-bold text-green-400">{reportData.totalCompleted}</p>
                </div>
                <div className="bg-red-900/50 p-4 rounded border border-red-700">
                  <h3 className="font-semibold text-red-300">Thất bại</h3>
                  <p className="text-2xl font-bold text-red-400">{reportData.totalFailed}</p>
                </div>
              </div>

              {reportData?.failedItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-300 mb-2">Các tài khoản thất bại:</h3>
                  <div className="bg-red-900/30 rounded p-4 border border-red-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-red-800">
                          <th className="text-left p-2 text-red-300">ID</th>
                          <th className="text-left p-2 text-red-300">Username</th>
                          <th className="text-left p-2 text-red-300">Thời gian</th>
                          <th className="text-left p-2 text-red-300">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData?.failedItems.map((item: any, index: number) => (
                          <tr key={index} className="border-b border-red-800">
                            <td className="p-2 text-gray-300">{item.id}</td>
                            <td className="p-2 text-gray-300">{item.username}</td>
                            <td className="p-2 text-gray-300">{item.create_at}</td>
                            <td className="p-2 text-gray-300">{item.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Tất cả hoạt động:</h3>
                <div className="bg-gray-900/50 rounded p-4 border border-gray-700 max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-2 text-gray-300">ID</th>
                        <th className="text-left p-2 text-gray-300">Username</th>
                        <th className="text-left p-2 text-gray-300">Thời gian</th>
                        <th className="text-left p-2 text-gray-300">Trạng thái</th>
                        <th className="text-left p-2 text-gray-300">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.results.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-700">
                          <td className="p-2 text-gray-300">{item.id}</td>
                          <td className="p-2 text-gray-300">{item.username}</td>
                          <td className="p-2 text-gray-300">{item.create_at}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${item.status === 'completed'
                                ? 'bg-green-800 text-green-300'
                                : 'bg-red-800 text-red-300'
                              }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2 text-gray-300">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-300">Không có dữ liệu báo cáo</p>
            </div>
          )}
        </div>
      </Dialog>
    </div>

  );
};

export default ReportModal;

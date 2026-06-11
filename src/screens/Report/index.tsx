import { useState, useEffect } from 'react';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { toast } from '@/components/ToastContainer';
import { windowInstance } from '@/services/window';
import Layout from '@/components/Layout';
import { Group } from '@/components/Group';
import { useOpenProfile } from '@/services/profiles';
import { ReportResult } from 'electron/features/report';
import moment from 'moment';

const ReportModal = () => {
  const [reportNames, setReportNames] = useState<string[]>([]);
  const [selectedReportName, setSelectedReportName] = useState<string>('');
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<number>(-1);
  const [isMoving, setIsMoving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [mode, setMode] = useState<'completed' | 'failed' | 'default'>('completed');
  const { mutate: openProfile } = useOpenProfile();

  const listView = {
    'completed': reportData?.results.filter(item => item.status === 'completed') || [],
    'failed': reportData?.results.filter(item => item.status === 'failed') || [],
    'default': reportData?.results || [],
  }

  useEffect(() => {
    loadReportNames();
  }, []);

  const loadReportNames = async () => {
    try {
      const names = await windowInstance.api.getReportNamesV2();
      setReportNames(names);
    } catch (error) {
      console.error('Error loading report names:', error);
      toast.error('Không thể tải danh sách báo cáo');
    }
  };

  const loadReportData = async (reportName: string) => {
    if (!reportName) return;

    setLoading(true);
    try {
      const data = await windowInstance.api.getReportByName(reportName);
      console.log(data, 'data');

      setReportData(data);
      setSelectedUsers(new Set()); // Reset selection when loading new report
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Không thể tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    if (checked && reportData?.results) {
      const allUserIds = reportData.results.map((item) => item.userId);
      setSelectedUsers(new Set(allUserIds));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleMoveToGroup = async () => {
    if (selectedGroup === -1) {
      toast.error('Vui lòng chọn group đích');
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error('Vui lòng chọn ít nhất một user');
      return;
    }

    setIsMoving(true);
    try {
      const failedUsers: number[] = [];

      for (const userId of selectedUsers) {
        const user = reportData?.results?.find((item) => item.userId === userId);
        if (user && user.userId) {
          try {
            await windowInstance.api.updateProfileGroup(Number(user.userId), selectedGroup);
          } catch (error) {
            failedUsers.push(userId);
            console.error(`Failed to move user ${user.username}:`, error);
          }
        }
      }

      if (failedUsers.length === 0) {
        toast.success(`Đã chuyển ${selectedUsers.size} user sang group mới thành công`);
      } else {
        toast.warning(`Đã chuyển ${selectedUsers.size - failedUsers.length} user thành công, ${failedUsers.length} user thất bại`);
      }

      setSelectedUsers(new Set());
      setShowMoveModal(false);
      setSelectedGroup(-1);

      // Refresh report data
      await loadReportData(selectedReportName);
    } catch (error) {
      toast.error('Có lỗi xảy ra khi chuyển group');
      console.error('Error moving users:', error);
    } finally {
      setIsMoving(false);
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

  const handleDeleteOldestReportNames = async () => {
    try {
      await windowInstance.api.deleteOldestReportNames();
      toast.success('Đã xóa 10 report cũ nhất');
      loadReportNames();
    } catch (error) {
      console.log(error);
      
      toast.error('Có lỗi xảy ra khi xóa 10 report cũ nhất');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="p-6">
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
                <div className="flex gap-2">
                  <Button
                    onClick={handleDeleteOldestReportNames}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-105"
                    tooltip="Xóa 10 report cũ nhất"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Xóa 10 report cũ nhất
                  </Button>
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
          </div>

          <div className="space-y-8">
            {/* Report Selection */}
            <div className="flex gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-slide-up">
              <Select
                value={selectedReportName}
                onChange={(e) => handleReportNameChange(e.target.value)}
                options={[
                  { value: '', label: '-- Chọn báo cáo --' },
                  ...reportNames.map((name) => ({ value: name, label: name }))
                ]}
                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'completed' | 'failed' | 'default')}
                options={[
                  { value: 'default', label: 'Tất cả' },
                  { value: 'completed', label: 'Hoàn thành' },
                  { value: 'failed', label: 'Thất bại' }
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <i className="fa-solid fa-table"></i>
                        Chi tiết báo cáo
                      </h3>
                      <div className="flex items-center gap-3">
                        {selectedUsers.size > 0 && (
                          <Button
                            onClick={() => setShowMoveModal(true)}
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                            tooltip={`Chuyển ${selectedUsers.size} user đã chọn`}
                          >
                            <i className="fa-solid fa-arrow-right-arrow-left mr-2"></i>
                            Chuyển group ({selectedUsers.size})
                          </Button>
                        )}
                        <button
                          onClick={() => setShowMoveModal(false)}
                          className="text-white/80 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              onChange={toggleSelectAll}
                            />
                          </th>
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
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {listView[mode].map((item, index) => (
                          <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200 ${selectedUsers.has(item.userId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                checked={selectedUsers.has(item.userId)}
                                onChange={() => toggleUserSelection(item.userId)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-medium text-gray-900 dark:text-white px-2 py-1 rounded-lg">
                                #{item.userId}
                              </p>
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
                              {moment(item.create_at).format('HH:mm:ss DD/MM/YYYY')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${item.status === 'completed'
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
                              <p className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg text-xs max-w-[200px] break-words">
                                {item.description || 'Không có ghi chú'}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                              <p>
                                {item.type}
                              </p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Button
                                onClick={() => openProfile({ id: Number(item.userId), index: 0 })}
                                className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-1"
                                tooltip="Open Profile"
                              >
                                <i className="fas fa-external-link-alt"></i>
                              </Button>
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

      {/* Move to Group Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-arrow-right-arrow-left text-blue-400"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chuyển {selectedUsers.size} user sang group mới
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chọn group đích:
                  </label>
                  <Group
                    value={selectedGroup}
                    onChange={setSelectedGroup}
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <i className="fa-solid fa-info-circle text-blue-500"></i>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedUsers.size} user sẽ được chuyển sang group đã chọn. Hành động này không thể hoàn tác.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
                  disabled={isMoving}
                >
                  Hủy
                </button>
                <button
                  onClick={handleMoveToGroup}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                  disabled={isMoving || selectedGroup === -1}
                >
                  {isMoving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      Đang chuyển...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check mr-2"></i>
                      Xác nhận chuyển
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ReportModal;

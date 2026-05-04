import React, { useState } from 'react';
import Button from '@/components/Button';
import Dialog from '@/components/Dialog';
import TextArea from '@/components/TextArea';
import { toast } from '@/components/ToastContainer';
import { windowInstance } from '@/services/window';

interface ProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  selectedCount: number;
  onSuccess: () => void;
}

const ProxyModal: React.FC<ProxyModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedIds, 
  selectedCount,
  onSuccess
}) => {
  const [proxyData, setProxyData] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProxy = async () => {
    if (!proxyData.trim()) {
      toast.error('Vui lòng nhập dữ liệu proxy');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một profile');
      return;
    }

    setIsUpdating(true);
    try {
      await windowInstance.api.updateProfileProxy(selectedIds, proxyData);
      toast.success(`Đã cập nhật proxy cho ${selectedCount} profiles thành công`);
      onSuccess();
      onClose();
      setProxyData('');
    } catch (error) {
      console.error('Error updating proxy:', error);
      toast.error('Không thể cập nhật proxy');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onClose();
      setProxyData('');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="sm:max-w-2xl"
    >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center">
            <i className="fas fa-shield-alt mr-3"></i>
            Bulk Update Proxy
          </h2>
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Selected Profiles Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-600 mr-3"></i>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Đã chọn {selectedCount} profiles
              </p>
              <p className="text-xs text-blue-700">
                Proxy sẽ được phân phối tuần tự cho các profiles đã chọn
              </p>
            </div>
          </div>
        </div>

      {/* Proxy Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <i className="fas fa-list mr-2"></i>
            Danh sách Proxy
          </label>
          <TextArea
            value={proxyData}
            onChange={(e) => setProxyData(e.target.value)}
            placeholder="Nhập danh sách proxy, mỗi proxy trên một dòng&#10;Format: server:port:username:password&#10;Ví dụ: sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s"
            className="h-64 font-mono text-sm"
            disabled={isUpdating}
          />
          <div className="mt-2 text-xs text-gray-500">
            <i className="fas fa-lightbulb mr-1"></i>
            Mỗi proxy sẽ được phân phối cho nhiều profiles theo thứ tự
          </div>
        </div>

        {/* Format Guide */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            <i className="fas fa-question-circle mr-2"></i>
            Hướng dẫn định dạng:
          </h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p><code className="bg-gray-200 px-1 rounded">server:port:username:password</code></p>
            <p>Ví dụ: <code className="bg-gray-200 px-1 rounded">sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s</code></p>
            <p className="mt-2 text-orange-600">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              Nếu có nhiều profiles hơn proxies, proxy sẽ được lặp lại
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleClose}
            disabled={isUpdating}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium transition-colors disabled:opacity-50"
          >
            <i className="fas fa-times mr-2"></i>
            Hủy
          </Button>
          <Button
            onClick={handleUpdateProxy}
            disabled={isUpdating || !proxyData.trim() || selectedIds.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Đang cập nhật...
              </>
            ) : (
              <>
                <i className="fas fa-shield-alt mr-2"></i>
                Cập nhật Proxy
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ProxyModal;
import Button from "@/components/Button";
import { windowInstance } from "@/services/window";
import { useState } from "react";

const CheckValidFolder = () => {
  const [selectedFolder, setSelectedFolder] = useState('');
  const [results, setResults] = useState({
    captionResult: [],
    linkResult: [],
    captionErrorCount: 0,
    linkErrorCount: 0,
  });

  const handleFolderSelect = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    if (folderPath) {
      setSelectedFolder(folderPath);
    }
  };

  const handleClick = async () => {
    if (!selectedFolder) {
      alert('Vui lòng chọn thư mục trước khi kiểm tra!');
      return;
    }
    const results = await windowInstance.api.checkValidCaptionOrLink(selectedFolder);
    const { captionResult, linkResult, captionErrorCount, linkErrorCount } = results || {};
    setResults({
      captionResult,
      linkResult,
      captionErrorCount,
      linkErrorCount,
    });
  }

  const totalCaptionItems = results.captionResult.reduce((sum: number, item: any) => sum + (item.totalItems || 0), 0);
  const totalLinkItems = results.linkResult.reduce((sum: number, item: any) => sum + (item.totalItems || 0), 0);
  const totalCaptionFiles = results.captionResult.length;
  const totalLinkFiles = results.linkResult.length;
  
  // Tìm file caption có ít hơn 5 items
  const captionFilesWithFewItems = results.captionResult.filter((item: any) => 
    item.totalItems !== undefined && item.totalItems < 5
  );
  
  // Tìm file link có ít hơn 1 item (file rỗng)
  const linkFilesWithFewItems = results.linkResult.filter((item: any) => 
    item.totalItems !== undefined && item.totalItems < 1
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
            <i className="fas fa-folder-check text-blue-600 mr-3"></i>
            Kiểm tra Thư mục Hợp lệ
          </h1>
          <p className="text-gray-600">Chọn thư mục và kiểm tra tính hợp lệ của các file caption và link</p>
        </div>

        {/* Folder Selection Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <i className="fas fa-folder-open mr-3"></i>
              Chọn Thư mục Nguồn
            </h2>
          </div>
          
          <div className="p-6">
            {!selectedFolder ? (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-folder-plus text-3xl text-blue-600"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa chọn thư mục</h3>
                  <p className="text-gray-600 mb-6">Vui lòng chọn thư mục chứa các file caption.txt và link.txt cần kiểm tra</p>
                </div>
                
                <Button 
                  onClick={handleFolderSelect}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <i className="fas fa-folder-open mr-2"></i>
                  Chọn Thư mục
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check text-white"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-1">Thư mục đã chọn</h4>
                      <div className="bg-white rounded-md p-3 border border-green-300">
                        <div className="flex items-center text-sm">
                          <i className="fas fa-folder text-green-600 mr-2"></i>
                          <span className="text-green-800 font-mono break-all">{selectedFolder}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={handleFolderSelect}
                    className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <i className="fas fa-exchange-alt mr-2"></i>
                    Đổi Thư mục
                  </Button>
                  
                  <Button 
                    onClick={handleClick}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <i className="fas fa-play-circle mr-2"></i>
                    Bắt đầu Kiểm tra
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      {results.captionResult.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-file-alt text-blue-500 mr-2"></i>
            Kết quả Kiểm tra
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caption Results */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center">
                <i className="fas fa-closed-captioning text-blue-400 mr-2"></i>
                File Caption
              </h4>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tổng File:</span>
                    <span className="ml-2 font-semibold text-blue-700">{totalCaptionFiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tổng Item:</span>
                    <span className="ml-2 font-semibold text-blue-700">{totalCaptionItems}</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-4 border ${
                results.captionErrorCount > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Số Lỗi:</span>
                  <span className={`font-bold text-lg ${
                    results.captionErrorCount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {results.captionErrorCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Link Results */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center">
                <i className="fas fa-link text-green-400 mr-2"></i>
                File Link
              </h4>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tổng File:</span>
                    <span className="ml-2 font-semibold text-green-700">{totalLinkFiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tổng Item:</span>
                    <span className="ml-2 font-semibold text-green-700">{totalLinkItems}</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-4 border ${
                results.linkErrorCount > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Số Lỗi:</span>
                  <span className={`font-bold text-lg ${
                    results.linkErrorCount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {results.linkErrorCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for files with less than 5 items */}
          {captionFilesWithFewItems.length > 0 && (
            <div className="mt-6 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-yellow-700 mb-3 flex items-center">
                <i className="fas fa-exclamation-circle text-yellow-500 mr-2"></i>
                Cảnh báo Số lượng Ít
              </h4>
              <div className="text-sm text-yellow-800">
                <p className="mb-2">Các file caption sau có ít hơn 5 items:</p>
                <div className="space-y-1">
                  {captionFilesWithFewItems.map((item: any, index: number) => (
                    <div key={index} className="bg-yellow-100 rounded px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.path}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                            {item.totalItems} items
                          </span>
                          <button
                            onClick={() => windowInstance.api.openFolder(item.path)}
                            className="px-2 py-1 bg-yellow-300 hover:bg-yellow-400 text-yellow-800 rounded text-xs font-medium transition-colors duration-200 flex items-center"
                            title="Mở thư mục"
                          >
                            <i className="fas fa-folder-open mr-1"></i>
                            Mở
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Warning for empty link files */}
          {linkFilesWithFewItems.length > 0 && (
            <div className="mt-6 bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="font-medium text-orange-700 mb-3 flex items-center">
                <i className="fas fa-unlink text-orange-500 mr-2"></i>
                Cảnh báo File Link Rỗng
              </h4>
              <div className="text-sm text-orange-800">
                <p className="mb-2">Các file link sau đang rỗng (0 items):</p>
                <div className="space-y-1">
                  {linkFilesWithFewItems.map((item: any, index: number) => (
                    <div key={index} className="bg-orange-100 rounded px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.path}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                            {item.totalItems} items
                          </span>
                          <button
                            onClick={() => windowInstance.api.openFolder(item.path)}
                            className="px-2 py-1 bg-orange-300 hover:bg-orange-400 text-orange-800 rounded text-xs font-medium transition-colors duration-200 flex items-center"
                            title="Mở thư mục"
                          >
                            <i className="fas fa-folder-open mr-1"></i>
                            Mở
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Error List */}
          {(results.captionErrorCount > 0 || results.linkErrorCount > 0) && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-700 flex items-center">
                <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                Chi tiết Lỗi
              </h4>
              
              {results.captionResult.some((item: any) => !item.isValid) && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h5 className="font-medium text-red-700 mb-2">Lỗi Caption:</h5>
                  <div className="space-y-2 text-sm">
                    {results.captionResult.filter((item: any) => !item.isValid).map((item: any, index: number) => (
                      <div key={index} className="text-red-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.path}:</span>
                          <button
                            onClick={() => windowInstance.api.openFolder(item.path)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors duration-200 flex items-center"
                            title="Mở thư mục"
                          >
                            <i className="fas fa-folder-open mr-1"></i>
                            Mở
                          </button>
                        </div>
                        <ul className="ml-4 mt-1 list-disc">
                          {item.errors.map((error: string, errorIndex: number) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.linkResult.some((item: any) => !item.isValid) && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h5 className="font-medium text-red-700 mb-2">Lỗi Link:</h5>
                  <div className="space-y-2 text-sm">
                    {results.linkResult.filter((item: any) => !item.isValid).map((item: any, index: number) => (
                      <div key={index} className="text-red-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.path}:</span>
                          <button
                            onClick={() => windowInstance.api.openFolder(item.path)}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors duration-200 flex items-center"
                            title="Mở thư mục"
                          >
                            <i className="fas fa-folder-open mr-1"></i>
                            Mở
                          </button>
                        </div>
                        <ul className="ml-4 mt-1 list-disc">
                          {item.errors.map((error: string, errorIndex: number) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {results.captionErrorCount === 0 && results.linkErrorCount === 0 && (
            <div className="mt-6 bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center text-green-700">
                <i className="fas fa-check-circle text-green-500 mr-2"></i>
                <span className="font-medium">Tất cả file đều hợp lệ!</span>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default CheckValidFolder;

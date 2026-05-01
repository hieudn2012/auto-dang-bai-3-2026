import Button from "@/components/Button";
import { windowInstance } from "@/services/window";
import { useState } from "react";

const CheckValidFolder = () => {
  const [results, setResults] = useState({
    captionResult: [],
    linkResult: [],
    captionErrorCount: 0,
    linkErrorCount: 0,
  });
  const handleClick = async () => {
    const results = await windowInstance.api.checkValidCaptionOrLink();
    const { captionResult, linkResult, captionErrorCount, linkErrorCount } = results || {};
    console.log('Kiểm tra thư mục hợp lệ', results);
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
    <div className="space-y-6">
      <div className="text-center">
        <Button 
          onClick={handleClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <i className="fas fa-check-circle mr-2"></i>
          Kiểm tra Thư mục Hợp lệ
        </Button>
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
  );
};

export default CheckValidFolder;

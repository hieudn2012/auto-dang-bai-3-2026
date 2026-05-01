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
    console.log('Check Valid Folder', results);
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
  
  // Find caption files with less than 5 items
  const captionFilesWithFewItems = results.captionResult.filter((item: any) => 
    item.totalItems !== undefined && item.totalItems < 5
  );
  
  // Find link files with less than 1 item (empty files)
  const linkFilesWithFewItems = results.linkResult.filter((item: any) => 
    item.totalItems !== undefined && item.totalItems < 1
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button onClick={handleClick}>
          <i className="fas fa-check-circle mr-2"></i>
          Check Valid Folder
        </Button>
      </div>

      {results.captionResult.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-file-alt text-blue-500 mr-2"></i>
            Validation Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caption Results */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center">
                <i className="fas fa-closed-captioning text-blue-400 mr-2"></i>
                Caption Files
              </h4>
              
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Files:</span>
                    <span className="ml-2 font-semibold text-blue-700">{totalCaptionFiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Items:</span>
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
                  <span className="text-gray-700">Error Count:</span>
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
                Link Files
              </h4>
              
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Files:</span>
                    <span className="ml-2 font-semibold text-green-700">{totalLinkFiles}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Items:</span>
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
                  <span className="text-gray-700">Error Count:</span>
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
                Low Item Count Warning
              </h4>
              <div className="text-sm text-yellow-800">
                <p className="mb-2">The following caption files have less than 5 items:</p>
                <div className="space-y-1">
                  {captionFilesWithFewItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-yellow-100 rounded px-3 py-2">
                      <span className="font-medium">{item.path}</span>
                      <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                        {item.totalItems} items
                      </span>
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
                Empty Link Files Warning
              </h4>
              <div className="text-sm text-orange-800">
                <p className="mb-2">The following link files are empty (0 items):</p>
                <div className="space-y-1">
                  {linkFilesWithFewItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-orange-100 rounded px-3 py-2">
                      <span className="font-medium">{item.path}</span>
                      <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-semibold">
                        {item.totalItems} items
                      </span>
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
                Error Details
              </h4>
              
              {results.captionResult.some((item: any) => !item.isValid) && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h5 className="font-medium text-red-700 mb-2">Caption Errors:</h5>
                  <div className="space-y-2 text-sm">
                    {results.captionResult.filter((item: any) => !item.isValid).map((item: any, index: number) => (
                      <div key={index} className="text-red-600">
                        <span className="font-medium">{item.path}:</span>
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
                  <h5 className="font-medium text-red-700 mb-2">Link Errors:</h5>
                  <div className="space-y-2 text-sm">
                    {results.linkResult.filter((item: any) => !item.isValid).map((item: any, index: number) => (
                      <div key={index} className="text-red-600">
                        <span className="font-medium">{item.path}:</span>
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
                <span className="font-medium">All files passed validation!</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckValidFolder;

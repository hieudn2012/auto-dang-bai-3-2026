import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { useState } from "react";
import { parseCookiesFromRawLine } from "./ConvertCookie";
import { toast } from "@/components/ToastContainer";

// format UID|Pass|2FA|Cookie|Email|Phone
// return UIDs, Cookies
const extractUIDsAndCookies = (accString: string) => {
  const lines = accString.split('\n');
  const result = lines.map(line => {
    const [uid, _pass, _twoFa, cookie] = line.split('|');
    return { uid, cookie: JSON.stringify(parseCookiesFromRawLine(cookie)) };
  });
  return result;
};

const SetupAcc = () => {
  const [accString, setAccString] = useState('');

  const handleCopyNames = () => {
    const result = extractUIDsAndCookies(accString);
    const names = result.map(item => item.uid).join('\n');
    navigator.clipboard.writeText(names);
    toast.success('Copied names');
  };

  const handleCopyCookies = () => {
    const result = extractUIDsAndCookies(accString);
    const cookies = result.map(item => item.cookie).join('\n');
    navigator.clipboard.writeText(cookies);
    toast.success('Copied cookies');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <i className="fas fa-user-cog text-blue-500 mr-2"></i>
          Account Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Extract and copy UIDs and cookies from account data
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-file-alt text-gray-400 mr-1"></i>
              Account Data
            </label>
            <TextArea 
              placeholder="Nhập account data ở đây&#10;Format: UID|Pass|2FA|Cookie|Email|Phone&#10;Ví dụ: 123456789|password123|123456|cookie_data|email@example.com|0123456789"
              value={accString} 
              onChange={(e) => setAccString(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Format Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <i className="fas fa-info-circle text-blue-500 mr-2"></i>
              Format Information
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">UID|Pass|2FA|Cookie|Email|Phone</code></p>
              <p>Each line represents one account with pipe-separated values</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleCopyNames}
              className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium"
              disabled={!accString.trim()}
            >
              <i className="fas fa-copy mr-2"></i>
              Copy Names (UIDs)
            </Button>
            <Button 
              onClick={handleCopyCookies}
              className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium"
              disabled={!accString.trim()}
            >
              <i className="fas fa-cookie-bite mr-2"></i>
              Copy Cookies
            </Button>
          </div>

          {/* Statistics */}
          {accString.trim() && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {extractUIDsAndCookies(accString).length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Total Accounts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {extractUIDsAndCookies(accString).filter(item => item.uid && item.cookie).length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Valid Accounts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
          <i className="fas fa-book-open text-purple-500 mr-2"></i>
          How to Use
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800 dark:text-purple-200">
          <div className="space-y-2">
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Step 1:</h4>
            <p>Paste your account data in the text area above, one account per line</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Step 2:</h4>
            <p>Click "Copy Names" to extract all UIDs to clipboard</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Step 3:</h4>
            <p>Click "Copy Cookies" to extract all cookies to clipboard</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Result:</h4>
            <p>Use the copied data in your automation tools or scripts</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupAcc;

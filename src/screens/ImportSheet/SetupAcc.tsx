import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { useState } from "react";
import { parseCookiesFromRawLine } from "./ConvertCookie";
import { toast } from "@/components/ToastContainer";

// format UID|Pass|2FA|Cookie|Email|Phone
// return UIDs, Cookies

const extractUIDsAndCookies = (accString: string, template: string) => {
  const lines = accString.split('\n');
  const templateFields = template.split('|');
  const uidIndex = templateFields.indexOf('UID');
  const cookieIndex = templateFields.indexOf('Cookie');
  
  const result = lines.map(line => {
    const parts = line.split('|');
    const uid = parts[uidIndex] || '';
    const cookie = parts[cookieIndex] || '';
    return { uid, cookie: JSON.stringify(parseCookiesFromRawLine(cookie)) };
  });
  return result;
};

const SetupAcc = () => {
  const [accString, setAccString] = useState('');
  const [template, setTemplate] = useState('UID|Pass|2FA|Cookie|Email|Phone');

  const handleCopyNames = () => {
    const result = extractUIDsAndCookies(accString, template);
    const names = result.map(item => item.uid).join('\n');
    navigator.clipboard.writeText(names);
    toast.success('Copied names');
  };

  const handleCopyCookies = () => {
    const result = extractUIDsAndCookies(accString, template);
    const cookies = result.map(item => item.cookie).join('\n');
    navigator.clipboard.writeText(cookies);
    toast.success('Copied cookies');
  };

  return (
    <div className="w-full">
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
              <i className="fas fa-list text-gray-400 mr-1"></i>
              Template Format
            </label>
            <TextArea 
              placeholder="Nhập template format&#10;Ví dụ: UID|Pass|2FA|Cookie|Email|Phone&#10;Hoặc: UID|Pass|Cookie"
              value={template} 
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-[80px] font-mono text-sm"
            />
          </div>
          
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
                    {extractUIDsAndCookies(accString, template).length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Total Accounts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {extractUIDsAndCookies(accString, template).filter(item => item.uid && item.cookie).length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Valid Accounts</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupAcc;

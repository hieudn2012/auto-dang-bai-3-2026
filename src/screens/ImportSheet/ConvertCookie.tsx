import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { toast } from "@/components/ToastContainer";
import { useState } from "react";

type CookieItem = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export const parseCookiesFromRawLine = (
  cookieStr: string,
  domain = '.instagram.com'
): CookieItem[] => {
  return cookieStr
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [name, ...rest] = c.split('=');
      return {
        name: name.trim(),
        value: rest.join('=').trim(),
        domain,
        path: '/',
      };
    });
};

const ConvertCookie = () => {
  const [cookies, setCookies] = useState("");

  const handleConvert = async () => {
    // split by newline
    const lines = cookies.split('\n');
    // parse each line
    const parsed = lines.map((line) => parseCookiesFromRawLine(line));
    // convert each parsed cookie to json
    const json = parsed.map((cookie) => JSON.stringify(cookie));
    // join all json with newline
    const result = json.join('\n');
    // copy to clipboard
    navigator.clipboard.writeText(result);
    toast.success('Đã copy cookie');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <i className="fas fa-cookie-bite text-orange-500 mr-2"></i>
          Cookie Converter
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Convert raw cookie strings to JSON format for automation tools
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-file-import text-gray-400 mr-1"></i>
              Raw Cookie Data
            </label>
            <TextArea
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              placeholder="Nhập cookies ở đây&#10;Format: name1=value1; name2=value2; name3=value3&#10;Hoặc nhiều dòng, mỗi dòng là một cookie string"
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Format Info */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2 flex items-center">
              <i className="fas fa-info-circle text-orange-500 mr-2"></i>
              Format Information
            </h3>
            <div className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
              <div>
                <p className="font-medium">Input Format:</p>
                <code className="bg-orange-100 dark:bg-orange-800 px-2 py-1 rounded text-xs block mt-1">
                  name1=value1; name2=value2; name3=value3
                </code>
              </div>
              <div>
                <p className="font-medium">Output Format:</p>
                <code className="bg-orange-100 dark:bg-orange-800 px-2 py-1 rounded text-xs block mt-1">
                  {`{"name":"name1","value":"value1","domain":".instagram.com","path":"/"}`}
                </code>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {cookies.trim() && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cookies.split('\n').filter(line => line.trim()).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Lines</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {cookies.split('\n').filter(line => line.trim()).reduce((total, line) => {
                      const parsed = parseCookiesFromRawLine(line);
                      return total + parsed.length;
                    }, 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Cookies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {cookies.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Characters</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleConvert}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium"
              disabled={!cookies.trim()}
            >
              <i className="fas fa-exchange-alt mr-2"></i>
              Convert & Copy to Clipboard
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {cookies.trim() && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <i className="fas fa-eye text-gray-400 mr-2"></i>
            Preview
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300">
              {(() => {
                const lines = cookies.split('\n');
                const parsed = lines.map((line) => parseCookiesFromRawLine(line));
                const json = parsed.map((cookie) => JSON.stringify(cookie, null, 2));
                return json.slice(0, 5).join('\n\n') + (json.length > 5 ? '\n\n...' : '');
              })()}
            </pre>
          </div>
          {(() => {
            const lines = cookies.split('\n');
            const parsed = lines.map((line) => parseCookiesFromRawLine(line));
            const json = parsed.map((cookie) => JSON.stringify(cookie));
            return json.length > 5 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                Showing 5 of {json.length} converted cookies
              </p>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default ConvertCookie;

import Layout from "@/components/Layout";
import { useState } from "react";
import ConvertCookie from "./ConvertCookie";
import SetupAcc from "./SetupAcc";
import CheckLive from "./CheckLive";
import CheckValidFolder from "./CheckValidFolder";

const ImportSheet = () => {
  const [tab, setTab] = useState<'cookie' | 'setup' | 'check-live' | 'check-valid-folder'>('setup');
  const tabs = [
    { id: 'setup', label: 'Setup', icon: 'fas fa-cog' },
    { id: 'cookie', label: 'Cookie', icon: 'fas fa-cookie' },
    { id: 'check-live', label: 'Check Live', icon: 'fas fa-signal' },
    { id: 'check-valid-folder', label: 'Check Valid Folder', icon: 'fas fa-check-circle' },
  ] as const;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <i className="fas fa-tools text-blue-500 mr-3"></i>
            Import & Management Tools
          </h1>
          <p className="text-gray-600">
            Quản lý tài khoản, cookie và kiểm tra tính hợp lệ của dữ liệu
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex items-center px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                  tab === tabItem.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className={`${tabItem.icon} mr-2`}></i>
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div className="min-h-[400px]">
              {tab === 'cookie' && <ConvertCookie />}
              {tab === 'setup' && <SetupAcc />}
              {tab === 'check-live' && <CheckLive />}
              {tab === 'check-valid-folder' && <CheckValidFolder />}
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <i className="fas fa-info-circle text-blue-500 mr-2"></i>
            Quick Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Bắt đầu:</h4>
              <ul className="space-y-1 ml-4">
                <li className="flex items-center">
                  <i className="fas fa-check text-blue-500 mr-2 text-xs"></i>
                  <span>Setup - Cấu hình tài khoản</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-blue-500 mr-2 text-xs"></i>
                  <span>Cookie - Quản lý cookie</span>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Kiểm tra:</h4>
              <ul className="space-y-1 ml-4">
                <li className="flex items-center">
                  <i className="fas fa-check text-blue-500 mr-2 text-xs"></i>
                  <span>Check Live - Kiểm tra tài khoản</span>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-check text-blue-500 mr-2 text-xs"></i>
                  <span>Check Valid Folder - Kiểm tra dữ liệu</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportSheet;

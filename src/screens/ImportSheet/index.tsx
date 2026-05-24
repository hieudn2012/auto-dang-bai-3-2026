import Layout from "@/components/Layout";
import { useState } from "react";
import ConvertCookie from "./ConvertCookie";
import SetupAcc from "./SetupAcc";
import CheckLive from "./CheckLive";
import CheckValidFolder from "./CheckValidFolder";
import Product from "./Product";
import AmzLink from "./AmzLink";
import GeminiAI from "./GeminiAI";

const ImportSheet = () => {
  const [tab, setTab] = useState<'cookie' | 'setup' | 'check-live' | 'check-valid-folder' | 'product' | 'amz-link' | 'gemini-ai'>('setup');
  const tabs = [
    { id: 'setup', label: 'Setup', icon: 'fas fa-cog' },
    { id: 'cookie', label: 'Cookie', icon: 'fas fa-cookie' },
    { id: 'check-live', label: 'Check Live', icon: 'fas fa-signal' },
    { id: 'check-valid-folder', label: 'Check Valid Folder', icon: 'fas fa-check-circle' },
    { id: 'product', label: 'Product', icon: 'fas fa-box' },
    { id: 'amz-link', label: 'Amazon Link', icon: 'fas fa-link' },
    { id: 'gemini-ai', label: 'Gemini AI', icon: 'fas fa-robot' },
  ] as const;

  return (
    <Layout>
      <div className="p-6">
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
              {tab === 'product' && <Product />}
              {tab === 'amz-link' && <AmzLink />}
              {tab === 'gemini-ai' && <GeminiAI />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportSheet;

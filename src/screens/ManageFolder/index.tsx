import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";
import GlobalConfig from "./GlobalConfig";
import CaptionConfig from "./CaptionConfig";
import MultipleCaption from "./MultipleCaption";
import ProxyConfig from "./ProxyConfig";
import GeminiAI from "./GeminiAI";
import SexyContent from "./SexyContent";

interface Caption {
  label: string;
  value: string;
}

const ManageFolder = () => {
  const [workingFolder, setWorkingFolder] = useState('');
  const [profileFolder, setProfileFolder] = useState('');
  const [linkPost, setLinkPost] = useState('');
  const [caption, setCaption] = useState('');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [proxy, setProxy] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [lang, setLang] = useState('en');
  const [model, setModel] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [propmts, setPrompts] = useState<{ label: string, value: string }[]>([]);

  const handleOpenWorkingFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setWorkingFolder(folderPath);
  }

  const handleOpenProfileFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setProfileFolder(folderPath);
  }

  const handleSaveMainConfig = async () => {
    await windowInstance.api.saveMainConfig({
      workingDir: workingFolder,
      profileDir: profileFolder,
      linkPost,
      caption,
      captions,
      proxy,
      gemini: {
        apiKey: geminiApiKey,
        lang,
        model,
        propmts
      }
    });
    toast.success('Lưu cấu hình thành công');
  }

  const handleLoadMainConfig = async () => {
    const config = await windowInstance.api.loadMainConfig();
    setWorkingFolder(config?.workingDir || '');
    setProfileFolder(config?.profileDir || '');
    setLinkPost(config?.linkPost || '');
    setCaption(config?.caption || '');
    setCaptions(config?.captions || []);
    setProxy(config?.proxy || '');
    setGeminiApiKey(config?.gemini?.apiKey || '');
    setLang(config?.gemini?.lang || '');
    setModel(config?.gemini?.model || '');
    setPrompts(config?.gemini?.propmts || []);
  }

  useEffect(() => {
    handleLoadMainConfig();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <i className="fas fa-cog text-blue-500 mr-2"></i>
              Cấu Hình
            </h2>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('global')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'global'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-globe mr-2"></i>
                Global config
              </button>
              <button
                onClick={() => setActiveTab('caption')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'caption'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-closed-captioning mr-2"></i>
                Caption config
              </button>
              <button
                onClick={() => setActiveTab('sexy-content')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'sexy-content'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-heart mr-2"></i>
                Sexy Content
              </button>
              <button
                onClick={() => setActiveTab('multiple')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'multiple'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-list mr-2"></i>
                MultipleCaption
              </button>
              <button
                onClick={() => setActiveTab('proxy')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'proxy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-network-wired mr-2"></i>
                Proxy config
              </button>
              <button
                onClick={() => setActiveTab('gemini')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === 'gemini'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <i className="fas fa-robot mr-2"></i>
                Gemini AI
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'global' && (
              <GlobalConfig
                workingFolder={workingFolder}
                setWorkingFolder={setWorkingFolder}
                profileFolder={profileFolder}
                setProfileFolder={setProfileFolder}
                linkPost={linkPost}
                setLinkPost={setLinkPost}
                onChangeWorkingFolder={handleOpenWorkingFolder}
                onChangeProfileFolder={handleOpenProfileFolder}
              />
            )}

            {activeTab === 'caption' && (
              <CaptionConfig
                caption={caption}
                setCaption={setCaption}
              />
            )}

            {activeTab === 'sexy-content' && (
              <SexyContent />
            )}

            {activeTab === 'multiple' && (
              <MultipleCaption
                captions={captions}
                setCaptions={setCaptions}
              />
            )}

            {activeTab === 'proxy' && (
              <ProxyConfig
                proxy={proxy}
                setProxy={setProxy}
              />
            )}

            {activeTab === 'gemini' && (
              <GeminiAI
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                lang={lang}
                setLang={setLang}
                model={model}
                setModel={setModel}
                propmts={propmts}
                setPrompts={setPrompts}
              />
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
              <Button
                onClick={() => {
                  handleLoadMainConfig();
                  toast.info('Đã tải cấu hình');
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
              >
                <i className="fas fa-download mr-2"></i>
                Load Config
              </Button>
              <Button
                onClick={handleSaveMainConfig}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <i className="fas fa-save mr-2"></i>
                Lưu Config
              </Button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
            <div className="text-sm text-blue-800">
              <h3 className="font-medium mb-1">Thông tin cấu hình</h3>
              <p className="text-blue-700">
                Cấu hình này sẽ được sử dụng làm mặc định cho các chức năng khác trong ứng dụng.
                Thư mục làm việc là nơi chứa các folder sản phẩm của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ManageFolder;

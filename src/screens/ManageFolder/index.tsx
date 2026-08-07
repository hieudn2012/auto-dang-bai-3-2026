import Button from "@/components/Button";
import Layout from "@/components/Layout";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";
import GlobalConfig from "./GlobalConfig";
import ProxyConfig from "./ProxyConfig";
import GeminiAI from "./GeminiAI";

const ManageFolder = () => {
  const [workingFolder, setWorkingFolder] = useState('');
  const [profileFolder, setProfileFolder] = useState('');
  const [proxy, setProxy] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [lang, setLang] = useState('en');
  const [model, setModel] = useState('');
  const [activeTab, setActiveTab] = useState('global');
  const [propmts, setPrompts] = useState<{ label: string, value: string }[]>([]);
  const [quoteWorkingDir, setQuoteWorkingDir] = useState('');

  const handleOpenWorkingFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setWorkingFolder(folderPath);
  }

  const handleOpenQuoteWorkingDir = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setQuoteWorkingDir(folderPath);
  }

  const handleOpenProfileFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setProfileFolder(folderPath);
  }

  const handleSaveMainConfig = async () => {
    await windowInstance.api.saveMainConfig({
      workingDir: workingFolder,
      profileDir: profileFolder,
      quoteWorkingDir,
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
    setQuoteWorkingDir(config?.quoteWorkingDir || '');
    setProxy(config?.proxy || '');
    setGeminiApiKey(config?.gemini?.apiKey || '');
    setLang(config?.gemini?.lang || '');
    setModel(config?.gemini?.model || '');
    setPrompts(config?.gemini?.propmts || []);
  }

  useEffect(() => {
    handleLoadMainConfig();
  }, []);

  const tabClass = (tab: string) =>
    `py-3 px-6 border-b-2 font-medium text-sm ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
    }`;

  return (
    <Layout>
      <div className="p-6 text-gray-900 dark:text-gray-100">
        <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <i className="fas fa-cog text-blue-500 dark:text-blue-400 mr-2"></i>
              Cấu Hình
            </h2>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button onClick={() => setActiveTab('global')} className={tabClass('global')}>
                <i className="fas fa-globe mr-2"></i>
                Global config
              </button>
              <button onClick={() => setActiveTab('proxy')} className={tabClass('proxy')}>
                <i className="fas fa-network-wired mr-2"></i>
                Proxy config
              </button>
              <button onClick={() => setActiveTab('gemini')} className={tabClass('gemini')}>
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
                onChangeWorkingFolder={handleOpenWorkingFolder}
                onChangeProfileFolder={handleOpenProfileFolder}
                quoteWorkingDir={quoteWorkingDir}
                setQuoteWorkingDir={setQuoteWorkingDir}
                onChangeQuoteWorkingDir={handleOpenQuoteWorkingDir}
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
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {
                  handleLoadMainConfig();
                  toast.info('Đã tải cấu hình');
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white dark:bg-gray-600 dark:hover:bg-gray-500"
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
      </div>
    </Layout>
  )
}

export default ManageFolder;

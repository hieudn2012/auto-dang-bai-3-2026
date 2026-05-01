import Button from "@/components/Button";
import Input from "@/components/Input";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";

const ManageFolder = () => {
  const [workingFolder, setWorkingFolder] = useState('');
  const [linkPost, setLinkPost] = useState('');
  const [caption, setCaption] = useState('');

  const handleOpenDialogFolder = async () => {
    const folderPath = await windowInstance.api.openDialogFolder();
    setWorkingFolder(folderPath);
  }
  const handleSaveMainConfig = async () => {
    await windowInstance.api.saveMainConfig({ workingDir: workingFolder, linkPost, caption });
  }

  const handleLoadMainConfig = async () => {
    const config = await windowInstance.api.loadMainConfig();
    setWorkingFolder(config?.workingDir || '');
    setLinkPost(config?.linkPost || '');
    setCaption(config?.caption || '');
  }

  useEffect(() => {
    handleLoadMainConfig();
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <i className="fas fa-cog text-blue-500 mr-2"></i>
            Cấu Hình Thư Mục Làm Việc
          </h2>
          
          <div className="space-y-6">
            {/* Working Folder Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <i className="fas fa-folder text-blue-400 mr-1"></i>
                Thư Mục Làm Việc
              </label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Nhập tên thư mục làm việc" 
                  value={workingFolder} 
                  onChange={(e) => setWorkingFolder(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleOpenDialogFolder}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <i className="fas fa-folder-open mr-2"></i>
                  Chọn Folder
                </Button>
              </div>
            </div>

            {/* Link Post Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <i className="fas fa-link text-green-400 mr-1"></i>
                Link Post Mặc Định
              </label>
              <TextArea 
                placeholder="Nhập link post" 
                value={linkPost} 
                onChange={(e) => setLinkPost(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Caption Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <i className="fas fa-closed-captioning text-purple-400 mr-1"></i>
                Caption Mặc Định
              </label>
              <TextArea 
                placeholder="Nhập caption" 
                value={caption} 
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={handleLoadMainConfig}
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

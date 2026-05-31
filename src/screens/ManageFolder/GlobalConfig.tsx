import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";

interface GlobalConfigProps {
  workingFolder: string;
  setWorkingFolder: (value: string) => void;
  linkPost: string;
  setLinkPost: (value: string) => void;
  onChangeWorkingFolder: () => Promise<void>;
  onChangeProfileFolder: () => Promise<void>;
  profileFolder: string;
  setProfileFolder: (value: string) => void;
  quoteWorkingDir: string;
  setQuoteWorkingDir: (value: string) => void;
  onChangeQuoteWorkingDir: () => Promise<void>;
}

const GlobalConfig = ({
  workingFolder,
  setWorkingFolder,
  linkPost,
  setLinkPost,
  onChangeWorkingFolder,
  profileFolder,
  onChangeProfileFolder,
  setProfileFolder,
  quoteWorkingDir,
  setQuoteWorkingDir,
  onChangeQuoteWorkingDir
}: GlobalConfigProps) => {
  return (
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
            onClick={onChangeWorkingFolder}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <i className="fas fa-folder-open"></i>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <i className="fas fa-folder text-blue-400 mr-1"></i>
          Thư Mục Quote phục vụ cho Shopee giải trí
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên thư mục quote phục vụ cho Shopee giải trí"
            value={quoteWorkingDir}
            onChange={(e) => setQuoteWorkingDir(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={onChangeQuoteWorkingDir}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <i className="fas fa-folder-open"></i>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <i className="fas fa-folder text-blue-400 mr-1"></i>
          Thư Mục Profile
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên thư mục profile"
            value={profileFolder}
            onChange={(e) => setProfileFolder(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={onChangeProfileFolder}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <i className="fas fa-folder-open"></i>
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
    </div>
  );
};

export default GlobalConfig;
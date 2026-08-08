import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import Input from "@/components/Input";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";

type ProfileSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ProfileSettings = ({ isOpen, onClose }: ProfileSettingsProps) => {
  const [quoteLinkFile, setQuoteLinkFile] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const config = await windowInstance.api.loadMainConfig();
      setQuoteLinkFile(config?.quoteLinkFile || "");
    };
    load();
  }, [isOpen]);

  const handlePickFile = async () => {
    const filePath = await windowInstance.api.openDialogFolder();
    if (filePath) {
      setQuoteLinkFile(filePath);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await windowInstance.api.saveMainConfig({ quoteLinkFile });
      toast.success("Đã lưu settings");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu settings thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="sm:max-w-xl">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center">
            <i className="fas fa-cog mr-3"></i>
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <i className="fas fa-file-alt text-blue-400 mr-1"></i>
            Quote link file
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Chọn path quote link file..."
              value={quoteLinkFile}
              onChange={(e) => setQuoteLinkFile(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handlePickFile}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
              tooltip="Chọn file/folder"
            >
              <i className="fas fa-folder-open"></i>
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ProfileSettings;

import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";

const SexyContent = () => {
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');

  const handleLoadSexyContent = async () => {
    const content = await windowInstance.api.loadSexyContent();
    setCaption(content.caption);
    setLink(content.link);
  }

  const handleSaveSexyContent = async () => {
    await windowInstance.api.saveSexyCaption(caption);
    await windowInstance.api.saveSexyLink(link);
    toast.success('Lưu sexy content thành công');
  }

  useEffect(() => {
    handleLoadSexyContent();
  }, []);

  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Sexy Content</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Caption</label>
        <TextArea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={6}
          placeholder="Nhập caption..."
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link</label>
        <TextArea
          value={link}
          onChange={e => setLink(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={6}
          placeholder="Nhập link..."
        />
      </div>
      <div className="flex space-x-4 justify-end">
        < Button
          onClick={handleSaveSexyContent}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          <i className="fas fa-save mr-2"></i>
          Save Sexy Content
        </Button>
      </div>
    </div>
  )
}

export default SexyContent
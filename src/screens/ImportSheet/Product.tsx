import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useState } from "react";

const Product = () => {
  const [path, setPath] = useState('');
  const [cap, setCap] = useState('');
  const [link, setLink] = useState('');

  const handleCreateEmptyProduct = async () => {
    const data = await windowInstance.api.createEmptyProduct();
    loadData(data.folderPath);
    toast.success('Create success');
  }

  const handleLoadProductFolder = async () => {
    const folder = await windowInstance.api.openDialogFolder();
    if (folder) {
      loadData(folder);
    }
  }

  const handleSave = async () => {
    await windowInstance.api.saveProduct({ folderPath: path, link, cap });
    toast.success('Save success');
  }

  const handleOpenProductFolder = async () => {
    await windowInstance.api.openFolder(path);
  }

  const loadData = async (folder: string) => {
    const data = await windowInstance.api.getProductFolder(folder);
    setPath(folder);
    setCap(data.cap);
    setLink(data.link);
    console.log(data);
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <Button onClick={handleCreateEmptyProduct} className="bg-blue-500 text-white" tooltip="Create empty product">
          <i className="fa-solid fa-plus"></i>
        </Button>
        <Button onClick={handleLoadProductFolder} className="bg-blue-500 text-white" tooltip="Load product folder">
          <i className="fa-solid fa-folder-open"></i>
        </Button>
      </div>
      <div className="flex flex-col gap-5">
        <p>Path: {path}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-gray-500">
              <i className="fa-solid fa-box"></i>
              Cap
            </p>
            <TextArea value={cap} onChange={(e) => setCap(e.target.value)} className="min-h-[200px]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-gray-500">
              <i className="fa-solid fa-link"></i>
              Link
            </p>
            <TextArea value={link} onChange={(e) => setLink(e.target.value)} className="min-h-[200px]" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button onClick={handleOpenProductFolder} className="bg-blue-500 text-white" tooltip="Open">
          <i className="fa-solid fa-folder-open"></i>
        </Button>
        <Button onClick={handleSave} className="bg-blue-500 text-white" tooltip="Save">
          <i className="fa-solid fa-save"></i>
        </Button>
      </div>
    </div>
  )
}

export default Product;

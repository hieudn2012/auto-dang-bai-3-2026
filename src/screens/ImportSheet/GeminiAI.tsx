import Button from "@/components/Button";
import Input from "@/components/Input";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { MoveData } from "electron/features/foder";
import { useState } from "react";

interface Item {
  path: string;
  link: string;
}

const shortName = (name: string) => {
  // get 10 characters start and 10 characters end
  return name.slice(0, 10) + '...' + name.slice(-10);
}

const GeminiAI = () => {
  const [rootFolder, setRootFolder] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [ws, setWs] = useState('');

  const handleChangeFolder = async () => {
    const root = await windowInstance.api.openDialogFolder();
    setRootFolder(root);
    const folders = await windowInstance.api.getAllFolder(root);
    const results = folders.map((folder: string) => ({
      path: folder,
      link: '',
    }));
    setItems(results);
  };

  return (
    <div className="w-full p-6 pb-10">
      <div className="mb-2">
        <div className="flex items-end gap-2">
          <Input
            label="Root Folder"
            value={rootFolder}
            onChange={(e) => setRootFolder(e.target.value)}
            placeholder="Select root folder"
          />
          <Button onClick={handleChangeFolder}>
            <i className="fas fa-folder-open"></i>
          </Button>
        </div>
      </div>
      <div className="mb-4">
        <Input
          label="WebSocket URL"
          value={ws}
          onChange={(e) => setWs(e.target.value)}
          placeholder="WebSocket URL"
        />
      </div>
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left">Path</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Link</th>
            <th className="border border-gray-200 px-4 py-2 text-left">C</th>
            <th className="border border-gray-200 px-4 py-2 text-left">L</th>
            <th className="border border-gray-200 px-4 py-2 text-left">CM</th>
            <th className="border border-gray-200 px-4 py-2 text-left">LM</th>
            <th className="border border-gray-200 px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <Row key={index} path={item.path} ws={ws} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Row = ({ path, ws }: { path: string, ws: string }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGettingLinks, setIsGettingLinks] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [links, setLinks] = useState('');
  const [isCapMoved, setIsCapMoved] = useState(false);
  const [isLinksMoved, setIsLinksMoved] = useState(false);
  const handleGenerate = async (folder: string) => {
    try {
      setIsGenerating(true);
      toast.info('Quá trình có thể mất vài giây, vui lòng chờ...');
      const text = await windowInstance.api.generateAmazonCaptions(folder);
      setText(text);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) {
      toast.error('No text to copy');
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(text);
  };

  const handleGetLinks = async () => {
    try {
      setIsGettingLinks(true);
      const links = await windowInstance.api.getAffAmzLink({ links: [link], ws, numberToGet: 10 });
      setLinks(links);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsGettingLinks(false);
    }
  }

  const handleMove = async ({ data, folder, fileName }: MoveData) => {
    if (!data) {
      toast.error('No data to move');
      return;
    }

    try {
      await windowInstance.api.moveDataToFolder({
        data,
        folder,
        fileName
      });
      if (fileName === 'cap.txt') {
        setIsCapMoved(true);
      }
      if (fileName === 'links.txt') {
        setIsLinksMoved(true);
      }
      toast.success('Moved to folder');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-200 px-4 py-2">{shortName(path)}</td>
      <td className="border border-gray-200 px-4 py-2">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Amz link"
        />
      </td>
      <td className="border border-gray-200 px-4 py-2">
        {text ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-times text-red-500"></i>}
      </td>
      <td className="border border-gray-200 px-4 py-2">
        {links ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-times text-red-500"></i>}
      </td>
      <td className="border border-gray-200 px-4 py-2">
        {isCapMoved ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-times text-red-500"></i>}
      </td>
      <td className="border border-gray-200 px-4 py-2">
        {isLinksMoved ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-times text-red-500"></i>}
      </td>

      <td className="border border-gray-200 px-4 py-2 text-center">
        <div className="flex gap-2 flex-wrap">
          <Button
            className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700"
            loading={isGenerating}
            onClick={() => handleGenerate(path)}
            tooltip="Generate caption"
          >
            <i className="fas fa-robot"></i>
          </Button>
          <Button
            className="px-3 py-1 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200"
            onClick={handleGetLinks}
            tooltip="Generate links"
            disabled={!link || isGettingLinks}
            loading={isGettingLinks}
          >
            <i className="fas fa-wand-magic-sparkles"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200"
            onClick={() => handleCopy(text)}
            tooltip="Copy caption"
            disabled={!text}
          >
            <i className="fas fa-copy"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200"
            onClick={() => handleCopy(links)}
            tooltip="Copy links"
            disabled={!links}
          >
            <i className="fas fa-link"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-sky-100 hover:bg-sky-200 text-sky-700 border border-sky-200"
            onClick={() => handleMove({ data: text, folder: path, fileName: 'cap.txt' })}
            tooltip="Move caption to folder"
            disabled={!text}
          >
            <i className="fas fa-file-arrow-down"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border border-fuchsia-200"
            onClick={() => handleMove({ data: links, folder: path, fileName: 'link.txt' })}
            tooltip="Move link to folder"
            disabled={!links}
          >
            <i className="fas fa-folder-plus"></i>
          </Button>
        </div>
      </td>
    </tr>
  )
}

export default GeminiAI;

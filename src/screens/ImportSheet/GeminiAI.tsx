import Button from "@/components/Button";
import Input from "@/components/Input";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { MoveData } from "electron/features/foder";
import React, { useState, useImperativeHandle, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

interface Item {
  path: string;
  defaultLink: string;
  totalLink: number;
  totalCap: number;
}

const shortName = (name: string) => {
  // get 10 characters start and 10 characters end
  return name.slice(0, 10) + '...' + name.slice(-10);
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const GeminiAI = () => {
  const [rootFolder, setRootFolder] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [ws, setWs] = useState('');
  const [indexSelected, setIndexSelected] = useState<number[]>([]);
  const rowRefs = items.reduce((acc, _, index) => {
    acc[index] = React.createRef();
    return acc;
  }, {} as { [key: number]: React.RefObject<{ handleGenerate: (folder: string) => Promise<void>, handleGetLinks: () => Promise<void> }> });

  const handleSelect = (index: number) => {
    if (indexSelected.includes(index)) {
      setIndexSelected(indexSelected.filter(i => i !== index));
    } else {
      setIndexSelected([...indexSelected, index]);
    }
  }

  const handleSelectAll = () => {
    if (indexSelected.length === items.length) {
      setIndexSelected([]);
    } else {
      setIndexSelected(items.map((_, index) => index));
    }
  }

  const handleChangeFolder = async () => {
    const root = await windowInstance.api.openDialogFolder();
    setRootFolder(root);
    const folders = await windowInstance.api.getAllFolder(root);
    const results = folders.map(({ folder, defaultLink, totalLink, totalCap }) => ({
      path: folder,
      defaultLink: defaultLink,
      totalLink: totalLink,
      totalCap: totalCap
    }));
    setItems(results);
  };

  const handleBulkGenerate = async () => {
    for (const index of indexSelected) {
      const ref = rowRefs[index];
      if (ref && ref.current) {
        await ref.current.handleGenerate(items[index].path);
        await wait(2000);
        const buttonMoveCaption = document.getElementById(`move-caption-btn-${index}`);
        if (buttonMoveCaption) {
          buttonMoveCaption.click();
        }
      }
    }
  }

  const handleBulkGetLinks = async () => {
    for (const index of indexSelected) {
      const ref = rowRefs[index];
      if (ref && ref.current) {
        await ref.current.handleGetLinks();
        await wait(2000);
        const buttonMoveLinks = document.getElementById(`move-links-btn-${index}`);
        if (buttonMoveLinks) {
          buttonMoveLinks.click();
        }
      }
    }
  }

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
      <div className="flex justify-end gap-4">
        <Button
          className="px-4 py-2 mb-4 bg-blue-500 hover:bg-blue-600 text-white rounded"
          onClick={handleBulkGenerate}
          disabled={indexSelected.length === 0}
          tooltip="Generate Captions for selected folders"
        >
          <i className="fas fa-robot"></i>
        </Button>
        <Button
          className="px-4 py-2 mb-4 bg-green-500 hover:bg-green-600 text-white rounded"
          onClick={handleBulkGetLinks}
          disabled={indexSelected.length === 0 || !ws}
          tooltip="Get Links for selected folders"
        >
          <i className="fas fa-link"></i>
        </Button>
      </div>
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left">
              <input
                type="checkbox"
                checked={indexSelected.length === items.length && items.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th className="border border-gray-200 px-4 py-2 text-left">Path</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Link</th>
            <th className="border border-gray-200 px-4 py-2 text-left">TL</th>
            <th className="border border-gray-200 px-4 py-2 text-left">TC</th>
            <th className="border border-gray-200 px-4 py-2 text-left">C</th>
            <th className="border border-gray-200 px-4 py-2 text-left">L</th>
            <th className="border border-gray-200 px-4 py-2 text-left">CM</th>
            <th className="border border-gray-200 px-4 py-2 text-left">LM</th>
            <th className="border border-gray-200 px-4 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <Row key={index} path={item.path} defaultLink={item.defaultLink} totalLink={item.totalLink} totalCap={item.totalCap} ws={ws} numberIndex={index} indexSelected={indexSelected} onSelect={handleSelect} ref={rowRefs[index]} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Row = forwardRef(({ path, defaultLink, totalLink, totalCap, ws, numberIndex, indexSelected, onSelect }: { path: string, defaultLink: string, totalLink: number, totalCap: number, ws: string, numberIndex: number, indexSelected: number[], onSelect: (index: number) => void }, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGettingLinks, setIsGettingLinks] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState(defaultLink);
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
      const links = await windowInstance.api.getAffAmzLink({ links: [link], ws, numberToGet: 20 });
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
      const result = data.replace(/####/g, '\n\n');
      await windowInstance.api.moveDataToFolder({
        data: result,
        folder,
        fileName
      });
      if (fileName === 'cap.txt') {
        setIsCapMoved(true);
      }
      if (fileName === 'link.txt') {
        setIsLinksMoved(true);
      }
      toast.success('Moved to folder');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  // use useImperativeHandle to expose handleGenerate and handleGetLinks to parent component
  useImperativeHandle(ref, () => ({
    handleGenerate,
    handleGetLinks,
  }));

  const capColor = totalCap < 5 || totalCap !== totalLink ? 'text-red-500' : 'text-green-500';
  const linkColor = totalLink < 5 || totalLink !== totalCap ? 'text-red-500' : 'text-green-500';

  return (
    <tr className="hover:bg-gray-50">
      <td className="border border-gray-200 px-4 py-2 cursor-pointer" onClick={() => onSelect(numberIndex)}>
        <div className="flex items-center select-none">
          <input
            type="checkbox"
            className="mr-2"
            checked={indexSelected.includes(numberIndex)}
            onChange={() => onSelect(numberIndex)}
          />
          {numberIndex + 1}
        </div>
      </td>
      <td className="border border-gray-200 px-4 py-2">
        <div className="flex gap-2">
          <span>
            {shortName(path)}
          </span>
          <Button onClick={() => windowInstance.api.openFolder(path)} className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200">
            <i className="fas fa-folder-open"></i>
          </Button>
        </div>
      </td>
      <td className="border border-gray-200 px-4 py-2">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Amz link"
        />
      </td>
      <td className={twMerge("border border-gray-200 px-4 py-2 font-bold", linkColor)}>
        {totalLink}
      </td>
      <td className={twMerge("border border-gray-200 px-4 py-2 font-bold", capColor)}>
        {totalCap}
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
            id={`generate-btn-${numberIndex}`}
          >
            <i className="fas fa-robot"></i>
          </Button>
          <Button
            className="px-3 py-1 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200"
            onClick={handleGetLinks}
            tooltip="Generate links"
            disabled={!link || isGettingLinks}
            loading={isGettingLinks}
            id={`get-links-btn-${numberIndex}`}
          >
            <i className="fas fa-wand-magic-sparkles"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-200"
            onClick={() => handleCopy(text)}
            tooltip="Copy caption"
            disabled={!text}
            id={`copy-caption-btn-${numberIndex}`}
          >
            <i className="fas fa-copy"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200"
            onClick={() => handleCopy(links)}
            tooltip="Copy links"
            disabled={!links}
            id={`copy-links-btn-${numberIndex}`}
          >
            <i className="fas fa-link"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-sky-100 hover:bg-sky-200 text-sky-700 border border-sky-200"
            onClick={() => handleMove({ data: text, folder: path, fileName: 'cap.txt' })}
            tooltip="Move caption to folder"
            disabled={!text}
            id={`move-caption-btn-${numberIndex}`}
          >
            <i className="fas fa-file-arrow-down"></i>
          </Button>

          <Button
            className="px-3 py-1 text-sm bg-fuchsia-100 hover:bg-fuchsia-200 text-fuchsia-700 border border-fuchsia-200"
            onClick={() => handleMove({ data: links, folder: path, fileName: 'link.txt' })}
            tooltip="Move link to folder"
            disabled={!links}
            id={`move-links-btn-${numberIndex}`}
          >
            <i className="fas fa-folder-plus"></i>
          </Button>
        </div>
      </td>
    </tr>
  )
});

export default GeminiAI;

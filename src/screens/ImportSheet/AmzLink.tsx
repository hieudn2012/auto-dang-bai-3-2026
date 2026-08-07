import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import { windowInstance } from "@/services/window";
import { useState } from "react";

const AmzLink = () => {
  const [links, setLinks] = useState('');
  const [ws, setWs] = useState('');
  const [result, setResult] = useState('');

  const handleGetLinks = async () => {
    const res = await windowInstance.api.getAffAmzLink({
      ws,
      links: links.trim().split('\n'),
      numberToGet: 20,
      linkMode: 'amz',
      isGlobal: false
    });
    setResult(res);
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="dark:text-gray-300 mb-2">WS</label>
        <Input value={ws} onChange={(e) => setWs(e.target.value)} className="mt-2" />
      </div>
      <div>
        <label className="dark:text-gray-300 mb-2">Links</label>
        <TextArea value={links} onChange={(e) => setLinks(e.target.value)} className="min-h-[200px] mt-2" />
      </div>
      <Button onClick={handleGetLinks}>Get Links</Button>
      <div>
        <label className="dark:text-gray-300 mb-2">Result Links</label>
        <TextArea value={result} onChange={(e) => setResult(e.target.value)} className="min-h-[200px] mt-2" />
      </div>
    </div>
  )
}

export default AmzLink;

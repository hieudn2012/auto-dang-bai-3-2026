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
    const res = await windowInstance.api.getAffAmzLink({ ws, links: links.trim().split('\n'), numberToGet: 20, linkMode: 'amz' });
    setResult(res);
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label>WS</label>
        <Input value={ws} onChange={(e) => setWs(e.target.value)} />
      </div>
      <div>
        <label>Links</label>
        <TextArea value={links} onChange={(e) => setLinks(e.target.value)} className="min-h-[200px]" />
      </div>
      <Button onClick={handleGetLinks}>Get Links</Button>
      <div>
        <label>Result Links</label>
        <TextArea value={result} onChange={(e) => setResult(e.target.value)} className="min-h-[200px]" />
      </div>
    </div>
  )
}

export default AmzLink;

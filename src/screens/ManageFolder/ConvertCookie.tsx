import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { useState } from "react";

type CookieItem = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

const parseCookiesFromRawLine = (
  line: string,
  domain = '.instagram.com'
): CookieItem[] => {
  const parts = line.split('|');

  // lấy phần cookie (index 3)
  const cookieStr = parts[3] || '';

  return cookieStr
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [name, ...rest] = c.split('=');

      return {
        name: name.trim(),
        value: rest.join('=').trim(),
        domain,
        path: '/',
      };
    });
};


const ConvertCookie = () => {
  const [cookieStr, setCookieStr] = useState('');
  const [result, setResult] = useState('');

  const handleConvertCookie = () => {
    const cookies = parseCookiesFromRawLine(cookieStr);
    setResult(JSON.stringify(cookies, null, 2));
  }

  return (
    <div className="flex flex-col gap-2 items-start py-2">
      <TextArea placeholder="Nhập cookie" value={cookieStr} onChange={(e) => setCookieStr(e.target.value)} />
      <Button onClick={handleConvertCookie}>Convert cookie</Button>
      <TextArea placeholder="Kết quả" value={result} readOnly />
    </div>
  )
}

export default ConvertCookie;
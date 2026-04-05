import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { toast } from "react-toastify";
import { useState } from "react";

type CookieItem = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export const parseCookiesFromRawLine = (
  cookieStr: string,
  domain = '.instagram.com'
): CookieItem[] => {
  return cookieStr
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const [name, ...rest] = c.split('=');
      const now = Math.floor(Date.now() / 1000);

      return {
        name: name.trim(),
        value: rest.join('=').trim(),
        domain,
        path: '/',

        // IXBrowser required
        expirationDate: now + 3600 * 24 * 30, // 30 ngày
        hostOnly: false,
        httpOnly: true,
        secure: true,
        sameSite: 'no_restriction', // quan trọng
        storeId: '0',
      };
    });
};

const ConvertCookie = () => {
  const [cookies, setCookies] = useState("");

  const handleConvert = async () => {
    // split by newline
    const lines = cookies.split('\n');
    // parse each line
    const parsed = lines.map((line) => parseCookiesFromRawLine(line));
    // convert each parsed cookie to json
    const json = parsed.map((cookie) => JSON.stringify(cookie));
    // join all json with newline
    const result = json.join('\n');
    // copy to clipboard
    navigator.clipboard.writeText(result);
    toast.success('Đã copy cookie');
  };

  return (
    <div className="flex flex-col gap-4 items-start">
      <TextArea
        value={cookies}
        onChange={(e) => setCookies(e.target.value)}
        placeholder="Nhập cookies"
      />
      <Button onClick={handleConvert}>Convert cookie</Button>
    </div>
  );
};

export default ConvertCookie;

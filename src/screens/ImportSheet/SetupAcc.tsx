import Button from "@/components/Button";
import TextArea from "@/components/TextArea";
import { useState } from "react";
import { parseCookiesFromRawLine } from "./ConvertCookie";
import { toast } from "react-toastify";

// format UID|Pass|2FA|Cookie|Email|Phone
// return UIDs, Cookies
const extractUIDsAndCookies = (accString: string) => {
	const lines = accString.split('\n');
	const result = lines.map(line => {
		const [uid, _pass, _twoFa, cookie] = line.split('|');
		return { uid, cookie: JSON.stringify(parseCookiesFromRawLine(cookie)) };
	});
	return result;
};

const SetupAcc = () => {
	const [accString, setAccString] = useState('');

	const handleCopyNames = () => {
		const result = extractUIDsAndCookies(accString);
		const names = result.map(item => item.uid).join('\n');
		navigator.clipboard.writeText(names);
		toast.success('Copied names');
	};

	const handleCopyCookies = () => {
		const result = extractUIDsAndCookies(accString);
		const cookies = result.map(item => item.cookie).join('\n');
		navigator.clipboard.writeText(cookies);
		toast.success('Copied cookies');
	};

	return (
		<div>
			<TextArea placeholder="Nhập account data ở đây" value={accString} onChange={(e) => setAccString(e.target.value)} />
			<div className="flex gap-2 mt-2">
				<Button onClick={handleCopyNames}>Copy names</Button>
				<Button onClick={handleCopyCookies}>Copy cookies</Button>
			</div>
		</div>
	);
};

export default SetupAcc;

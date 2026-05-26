import Button from '@/components/Button';
import Input from '@/components/Input';
import TextArea from '@/components/TextArea';
import { windowInstance } from '@/services/window';
import { useState } from 'react';

const Fanpage = () => {
  const [ws, setWs] = useState('');
  const [pages, setPages] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    const links = await windowInstance.api.getFanpageLinks({
      ws,
      pages
    });
    setResult(links);
  };

  const handleCut10Items = () => {
    if (!result) return;
    const items = result.split('\n').slice(0, 10).join('\n');
    navigator.clipboard.writeText(items);
    // set new result after cut
    setResult(result.split('\n').slice(10).join('\n'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-xl">
        <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Lấy Link Bài Viết Fanpage</h2>
        <p className="text-gray-500 text-center mb-6">
          Nhập WebSocket và danh sách link fanpage để lấy link bài viết mới nhất.
        </p>
        <div className="space-y-5">
          <div>
            <Input
              type="text"
              value={ws}
              onChange={e => setWs(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Nhập ws..."
              required
              label="WebSocket"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh sách Fanpage
            </label>
            <TextArea
              value={pages}
              onChange={e => setPages(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={6}
              placeholder="Nhập mỗi dòng một link fanpage..."
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            onClick={handleSubmit}
          >
            Lấy Link
          </Button>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kết quả
            </label>
            <TextArea
              value={result || ''}
              rows={6}
              placeholder="Kết quả sẽ hiển thị ở đây..."
              onChange={(e) => setResult(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
            onClick={handleCut10Items}
            disabled={!result}
          >
            Cắt 10 Link Đầu Tiên và Copy
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Fanpage;
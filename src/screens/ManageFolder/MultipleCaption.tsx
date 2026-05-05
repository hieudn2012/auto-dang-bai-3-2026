import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import { useState } from "react";

interface Caption {
  label: string;
  value: string;
}

interface MultipleCaptionProps {
  captions: Caption[];
  setCaptions: (captions: Caption[]) => void;
}

const MultipleCaption = ({
  captions,
  setCaptions
}: MultipleCaptionProps) => {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddCaption = () => {
    if (newLabel.trim() && newValue.trim()) {
      if (editingIndex !== null) {
        // Update existing caption
        const updatedCaptions = [...captions];
        updatedCaptions[editingIndex] = { label: newLabel, value: newValue };
        setCaptions(updatedCaptions);
        setEditingIndex(null);
      } else {
        // Add new caption
        setCaptions([...captions, { label: newLabel, value: newValue }]);
      }
      setNewLabel('');
      setNewValue('');
    }
  };

  const handleEditCaption = (index: number) => {
    setNewLabel(captions[index].label);
    setNewValue(captions[index].value);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setNewLabel('');
    setNewValue('');
    setEditingIndex(null);
  };

  const handleDeleteCaption = (index: number) => {
    setCaptions(captions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Add/Edit Caption Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                <i className="fas fa-tag text-blue-400 mr-2"></i>
                Label
              </label>
              <Input
                placeholder="Nhập label cho caption"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                <i className="fas fa-align-left text-green-400 mr-2"></i>
                Caption
              </label>
              <TextArea
                placeholder="Nhập nội dung caption"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="min-h-[120px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAddCaption}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-md transition-all duration-200"
            >
              <i className={`fas ${editingIndex !== null ? 'fa-save' : 'fa-plus'} mr-2`}></i>
              {editingIndex !== null ? 'Cập Nhật Caption' : 'Thêm Caption'}
            </Button>
            {editingIndex !== null && (
              <Button
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium shadow-md transition-all duration-200"
              >
                <i className="fas fa-times mr-2"></i>
                Hủy
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Caption List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fas fa-table text-purple-500 mr-2"></i>
            Danh Sách Captions
          </h3>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {captions.length} captions
          </div>
        </div>
        {captions.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <i className="fas fa-inbox text-gray-400 text-5xl mb-4"></i>
            <h4 className="text-lg font-medium text-gray-600 mb-2">Chưa có caption nào</h4>
            <p className="text-gray-500">Thêm caption đầu tiên để bắt đầu quản lý</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <i className="fas fa-hashtag mr-1"></i>
                    STT
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <i className="fas fa-tag mr-1"></i>
                    Label
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <i className="fas fa-align-left mr-1"></i>
                    Caption
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <i className="fas fa-cogs mr-1"></i>
                    Hành Động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {captions.map((caption, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {caption.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-gray-900 text-sm line-clamp-2" title={caption.value}>
                          {caption.value}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEditCaption(index)}
                          className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm"
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteCaption(index)}
                          className="inline-flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors duration-200 shadow-sm"
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultipleCaption;
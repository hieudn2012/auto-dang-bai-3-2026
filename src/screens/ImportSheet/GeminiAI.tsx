import Button from "@/components/Button";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import { toast } from "@/components/ToastContainer";
import { windowInstance } from "@/services/window";
import { useState } from "react";

const GeminiAI = () => {
  const [folder, setFolder] = useState('');
  const [captions, setCaptions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChangeFolder = () => {
    windowInstance.api.openDialogFolder().then((res) => {
      setFolder(res);
    });
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      toast.info('Quá trình có thể mất vài giây, vui lòng chờ...');
      const text = await windowInstance.api.generateAmazonCaptions(folder);
      toast.success('Captions generated successfully');
      setCaptions(text);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(captions);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 pb-10">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <i className="fas fa-robot"></i>
            Gemini AI Caption Generator
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            Generate Amazon product captions using AI
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Folder Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <i className="fas fa-folder mr-2 text-gray-400"></i>
              Product Images Folder
            </label>
            <div className="flex gap-3">
              <Input
                value={folder}
                onChange={() => { }}
                placeholder="Select folder containing product images..."
                className="flex-1"
              />
              <Button
                onClick={handleChangeFolder}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <i className="fas fa-folder-open"></i>
              </Button>
            </div>
            {folder && (
              <p className="text-xs text-gray-500">
                <i className="fas fa-check-circle text-green-500 mr-1"></i>
                {folder}
              </p>
            )}
          </div>

          {/* Generate Button */}
          <Button
            loading={isGenerating}
            onClick={handleGenerate}
            disabled={!folder || isGenerating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-magic mr-2"></i>
            {isGenerating ? 'Generating...' : 'Generate Captions'}
          </Button>

          {/* Results Section */}
          {captions && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  <i className="fas fa-file-alt mr-2 text-gray-400"></i>
                  Generated Captions
                </label>
                <Button
                  onClick={handleCopy}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200"
                >
                  <i className="fas fa-copy mr-1"></i>
                  Copy
                </Button>
              </div>
              <div className="relative">
                <TextArea
                  value={captions}
                  className="min-h-[200px] border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg"
                />

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GeminiAI;

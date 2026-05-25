import Input from '@/components/Input';
import TextArea from '@/components/TextArea';
import React from 'react';

interface GeminiAIProps {
  geminiApiKey: string;
  setGeminiApiKey: (geminiApiKey: string) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  model: string;
  setModel: (model: string) => void;
}

const GeminiAI: React.FC<GeminiAIProps> = ({ geminiApiKey, setGeminiApiKey, prompt, setPrompt, model, setModel }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
        <TextArea
          value={geminiApiKey}
          onChange={(e) => setGeminiApiKey(e.target.value)}
          className="w-full min-h-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your Gemini API key"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your prompt"
          rows={4}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
        <Input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your model"
        />
      </div>
    </div>
  );
};

export default GeminiAI;

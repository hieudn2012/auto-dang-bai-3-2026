import Button from '@/components/Button';
import Dialog from '@/components/Dialog';
import Input from '@/components/Input';
import Select from '@/components/Select';
import TextArea from '@/components/TextArea';
import { toast } from '@/components/ToastContainer';
import { shortenString } from '@/utils/string';
import React from 'react';

interface GeminiAIProps {
  geminiApiKey: string;
  setGeminiApiKey: (geminiApiKey: string) => void;
  lang: string;
  setLang: (lang: string) => void;
  model: string;
  setModel: (model: string) => void;
  propmts: { label: string, value: string }[];
  setPrompts: React.Dispatch<React.SetStateAction<{
    label: string;
    value: string;
  }[]>>;
}

const GeminiAI: React.FC<GeminiAIProps> = ({ geminiApiKey, setGeminiApiKey, lang, setLang, model, setModel, propmts, setPrompts }) => {
  const [isPromptModalOpen, setIsPromptModalOpen] = React.useState(false);
  const [selectedPrompt, setSelectedPrompt] = React.useState<{ label: string, value: string } | null>(null);
  const [mode, setMode] = React.useState<'add' | 'edit'>('add');

  const handleAddPrompt = () => {
    setIsPromptModalOpen(true);
    setSelectedPrompt(null);
    setMode('add');
  }

  const handleEditPrompt = (prompt: { label: string, value: string }) => {
    setIsPromptModalOpen(true);
    setMode('edit');
    setSelectedPrompt(prompt);
  }

  const handleDeletePrompt = (label: string) => {
    setPrompts(prev => prev.filter(item => item.label !== label));
  }

  const handleSubmitPrompt = (label: string, prompt: string) => {
    if (mode === 'add') {
      if (propmts.some(item => item.label === label)) {
        toast.error('Label đã tồn tại, vui lòng chọn label khác');
        return;
      }
      setPrompts(prev => [...prev, { label, value: prompt }]);
    }
    if (mode === 'edit') {
      setPrompts(prev => prev.map(item => item.label === label ? { label, value: prompt } : item));
    }
  }

  return (
    <div className="text-gray-900">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Input
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full"
            placeholder="Enter your Gemini API key"
            label="Gemini API Key"
            icon="fa-solid fa-robot"
          />
        </div>
        <div>
          <Select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full"
            options={[
              { label: 'English', value: 'en' },
              { label: 'Vietnamese', value: 'vi' },
            ]}
            label="Language"
            icon="fa-solid fa-language"
          />
        </div>
        <div>
          <Input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full"
            placeholder="Enter your model"
            label="Model"
            icon="fa-solid fa-microchip"
          />
        </div>
      </div>
      <div>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Label</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Prompt</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {propmts.map((prompt, index) => (
                <tr key={index} className="transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{prompt.label}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{shortenString(prompt.value, 40)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleEditPrompt(prompt)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 mr-2"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </Button>
                      <Button
                        onClick={() => handleDeletePrompt(prompt.label)}
                        className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <Button
          onClick={handleAddPrompt}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <i className="fa-solid fa-plus"></i>
        </Button>
      </div>
      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handleSubmitPrompt}
        selectedPrompt={selectedPrompt}
        mode={mode}
      />
    </div >
  );
};

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string, prompt: string) => void;
  selectedPrompt?: { label: string, value: string } | null;
  mode: 'add' | 'edit';
}

const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedPrompt,
  mode,
}) => {

  const [prompt, setPrompt] = React.useState('');
  const [label, setLabel] = React.useState('');

  React.useEffect(() => {
    if (selectedPrompt) {
      setLabel(selectedPrompt.label);
      setPrompt(selectedPrompt.value);
    } else {
      setLabel('');
      setPrompt('');
    }
  }, [selectedPrompt]);

  const handleSubmit = () => {
    onSubmit(label, prompt);
    setPrompt('');
    setLabel('');
    onClose();
  }


  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className='!max-w-2xl'
    >
      <div className='p-6'>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{mode === 'add' ? 'Add New Prompt' : 'Edit Prompt'}</h2>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full mb-4"
          placeholder="Enter prompt label"
          label="Prompt Label"
          icon='fa-solid fa-tag'
          readOnly={mode === 'edit'}
        />
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full mb-4"
          placeholder="Enter your prompt here"
          label="Prompt"
          rows={10}
          icon='fa-solid fa-pen-to-square'
        />
        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Prompt
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default GeminiAI;

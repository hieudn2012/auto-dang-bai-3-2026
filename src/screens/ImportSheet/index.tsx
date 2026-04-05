import Layout from "@/components/Layout";
import { useState } from "react";
import ConvertCookie from "./ConvertCookie";
import SetupAcc from "./SetupAcc";

const ImportSheet = () => {
  const [tab, setTab] = useState<'cookie' | 'setup'>('cookie');
  return (
    <Layout>
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('setup')}
          className={`px-4 py-2 font-medium transition-colors ${tab === 'setup'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Setup
        </button>
        <button
          onClick={() => setTab('cookie')}
          className={`px-4 py-2 font-medium transition-colors ${tab === 'cookie'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Cookie
        </button>
      </div>
      {tab === 'cookie' && <ConvertCookie />}
      {tab === 'setup' && <SetupAcc />}
    </Layout>
  );
};

export default ImportSheet;

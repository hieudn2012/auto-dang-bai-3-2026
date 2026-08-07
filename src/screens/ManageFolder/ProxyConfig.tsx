import React from 'react';
import TextArea from '@/components/TextArea';

interface ProxyConfigProps {
  proxy: string;
  setProxy: (proxy: string) => void;
}

// sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s
const ProxyConfig: React.FC<ProxyConfigProps> = ({ proxy, setProxy }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <i className="fas fa-network-wired mr-2"></i>
          Proxy Configuration
        </label>
        <TextArea
          value={proxy}
          onChange={(e) => setProxy(e.target.value)}
          placeholder="Enter proxy configuration (e.g., sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s)"
          rows={4}
        />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter proxy server configuration. Format: sv28.proxyzen.io.vn:31156:BOrCsD:pkqui15s
        </p>
      </div>
    </div>
  );
};

export default ProxyConfig;

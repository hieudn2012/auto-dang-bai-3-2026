import Button from "@/components/Button";
import { windowInstance } from "@/services/window";
import { useEffect, useState } from "react";
import { Group } from "../../components/Group";
import { useDeleteProfile, useGetProfiles } from "@/services/profiles";
import Input from "@/components/Input";
import { toast } from "@/components/ToastContainer";
import { useMainConfig } from "@/hooks/useMainConfig";

const CheckLive = () => {
  const [checkLiveLoading, setCheckLiveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const [dieAccounts, setDieAccounts] = useState<string[]>([]);
  const [{ data }] = useGetProfiles(groupId);
  const { mutateAsync: deleteProfile } = useDeleteProfile();
  const accounts = data?.data?.data?.data;
  const { mainConfig } = useMainConfig();

  const [ws, setWs] = useState('');

  const handleCheckLive = async () => {
    setCheckLiveLoading(true);
    const accountsStr = accounts?.map((account: any) => account.name);
    const result = await windowInstance.api.checkLiveAccounts({ ws, accounts: accountsStr, batchSize });
    setDieAccounts(result.deadAccounts);
    setCheckLiveLoading(false);
    toast.success(`Hoàn thành kiểm tra! Tìm thấy ${result.liveAccounts.length} live accounts và ${result.deadAccounts.length} die accounts.`);
  }

  const handleDeleteDieAccounts = async () => {
    setLoading(true);
    const dieAccs = accounts?.filter((acc: any) => dieAccounts.includes(acc.name)) || [];
    const profileIdsToDelete = dieAccs.map((acc: any) => acc.profile_id);

    for (const profileId of profileIdsToDelete) {
      await deleteProfile({ profile_id: profileId });
    }
    setDieAccounts([]);
    toast.success(`Đã xóa ${profileIdsToDelete.length} profile bị die`);
    setLoading(false);
  }

  useEffect(() => {
    if (mainConfig?.wsUrl) {
      setWs(mainConfig.wsUrl);
    }
  }, [mainConfig]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
          <i className="fas fa-signal text-green-500 mr-2"></i>
          Check Live Accounts
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Test account connectivity and remove inactive profiles
        </p>
      </div>

      {/* Configuration Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <i className="fas fa-cog text-gray-400 mr-2"></i>
          Configuration
        </h3>
        
        <div className="space-y-4">
          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-users text-gray-400 mr-1"></i>
              Select Group
            </label>
            <Group onChange={setGroupId} value={groupId} />
          </div>

          {/* WebSocket and Batch Size */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-link text-gray-400 mr-1"></i>
                WebSocket URL
              </label>
              <Input 
                placeholder="Nhập WebSocket URL..." 
                value={ws}
                onChange={(e) => setWs(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <i className="fas fa-layer-group text-gray-400 mr-1"></i>
                Batch Size
              </label>
              <Input 
                placeholder="Batch size..." 
                value={batchSize} 
                onChange={(e) => setBatchSize(Number(e.target.value))} 
              />
            </div>
          </div>

          {/* Check Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleCheckLive} 
              loading={checkLiveLoading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium"
              disabled={!ws.trim() || !accounts?.length}
            >
              <i className="fas fa-play mr-2"></i>
              Check Live Accounts
            </Button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {dieAccounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 flex items-center">
              <i className="fas fa-skull-crossbones mr-2"></i>
              Die Accounts ({dieAccounts.length})
            </h3>
            <Button 
              onClick={handleDeleteDieAccounts} 
              loading={loading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete All
            </Button>
          </div>

          {/* Account List */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800 max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {dieAccounts.map((acc, index) => (
                <li key={acc} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-700">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">
                      <i className="fas fa-times-circle"></i>
                    </span>
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{acc}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {accounts?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Accounts</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(accounts?.length || 0) - dieAccounts.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Live Accounts</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {dieAccounts.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Die Accounts</div>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {dieAccounts.length === 0 && accounts?.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800 text-center">
          <i className="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-2">
            All Accounts Are Live!
          </h3>
          <p className="text-green-700 dark:text-green-300 text-sm">
            All {accounts.length} accounts in this group are active and functioning properly.
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckLive;

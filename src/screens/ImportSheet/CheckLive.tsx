import Button from "@/components/Button";
import { windowInstance } from "@/services/window";
import { useState } from "react";
import { Group } from "../Profiles/Group";
import { useDeleteProfile, useGetProfiles } from "@/services/profiles";
import Input from "@/components/Input";
import { toast } from "react-toastify";

const CheckLive = () => {
  const [checkLiveLoading, setCheckLiveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const [dieAccounts, setDieAccounts] = useState<string[]>([]);
  const [{ data }] = useGetProfiles(groupId);
  const { mutateAsync: deleteProfile } = useDeleteProfile();
  const accounts = data?.data?.data?.data;

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

  return (
    <div className="flex flex-col gap-2 items-start py-2">
      <Group onChange={setGroupId} value={groupId} />
      <div className="flex gap-2 w-full">
        <div className="flex-1">
          <Input placeholder="Nhập WebSocket URL..." value={ws} onChange={(e) => setWs(e.target.value)} />
        </div>
        <div className="w-40">
          <Input placeholder="Batch size..." value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} />
        </div>
      </div>
      <Button onClick={handleCheckLive} loading={checkLiveLoading}>
        Check Live
      </Button>
      <div>
        <h3 className="font-medium">Die accounts:</h3>
        <ul className="list-disc list-inside">
          {dieAccounts.map((acc) => (
            <li key={acc}>{acc}</li>
          ))}
        </ul>
        <Button onClick={handleDeleteDieAccounts} loading={loading}>
          Xóa accounts bị die
        </Button>
      </div>
    </div>
  );
};

export default CheckLive;

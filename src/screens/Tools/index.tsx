import { useState } from "react";
import Button from "@/components/Button";
import Layout from "@/components/Layout";
import TextArea from "@/components/TextArea";
import { map } from "lodash";

const Tools = () => {
  const [accounts, setAccounts] = useState('');

  const handleCheckLive = () => {
    const list = accounts.trim().split('\n');
    const trimList = map(list, (item) => item.trim());
    window.api.checkLive({ accounts: trimList});
  }

  return (
    <Layout>
      <div>
        <div className="max-w-[400px]">
          <TextArea value={accounts} onChange={({ target: { value } }) => setAccounts(value)} />
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={handleCheckLive}>Check live</Button>
          <Button>Check search top</Button>
        </div>
      </div>
    </Layout>
  );
};

export default Tools;

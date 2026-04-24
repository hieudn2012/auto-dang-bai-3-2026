import { useGetGroupList } from "@/services/profiles"
import { get, map } from "lodash";
import { useEffect } from "react";

export const Group = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => {
  const [{ data: groupList }] = useGetGroupList();

  useEffect(() => {
    if (value === -1 && groupList?.data?.data?.data?.length > 0) {
      onChange(get(groupList, 'data.data.data[0].id', -1) as number);
    }
  }, [groupList]);

  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="text-white px-2 rounded-md font-medium">
      {map(groupList?.data?.data?.data, (group) => (
        <option key={group.id} value={group.id}>{group.title}</option>
      ))}
    </select>
  )
}

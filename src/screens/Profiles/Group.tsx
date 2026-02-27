import { useGetGroupList } from "@/services/profiles"
import { map } from "lodash";

export const Group = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => {
  const [{ data: groupList }] = useGetGroupList();

  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="text-white px-2 rounded-md font-medium">
      {map(groupList?.data?.data.data, (group) => (
        <option key={group.id} value={group.id}>{group.title}</option>
      ))}
    </select>
  )
}

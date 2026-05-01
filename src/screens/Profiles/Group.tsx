import { useGetGroupList } from "@/services/profiles"
import { get, map } from "lodash"
import { useEffect } from "react"
import Select from "@/components/Select"

export const Group = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => {
  const [{ data: groupList }] = useGetGroupList();

  useEffect(() => {
    if (value === -1 && groupList?.data?.data?.data?.length > 0) {
      onChange(get(groupList, 'data.data.data[0].id', -1) as number);
    }
  }, [groupList]);

  const options = map(groupList?.data?.data?.data, (group) => ({
    value: group.id,
    label: group.title
  }));

  return (
    <Select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      options={options}
      className="min-w-[200px]"
    />
  )
}

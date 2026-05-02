import { useGetGroupList } from "@/services/profiles"
import { map } from "lodash"
import Select from "@/components/Select"

export const Group = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => {
  const [{ data: groupList }] = useGetGroupList();

  const options = [
    { value: -1, label: 'Chọn nhóm...' },
    ...map(groupList?.data?.data?.data, (group) => ({
      value: group.id,
      label: group.title
    }))
  ];

  return (
    <Select
      value={value}
      onChange={(e) => {
        onChange(Number(e.target.value));
      }}
      options={options}
      className="min-w-[200px]"
    />
  )
}

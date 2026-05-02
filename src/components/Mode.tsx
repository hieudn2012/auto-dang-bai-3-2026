import Select from "@/components/Select";

type Mode = 'default' | 'affiliate';

type Props = {
  value: Mode;
  onChange: (value: Mode) => void;
  className?: string;
};

const Mode = ({ value, onChange, className = "w-full" }: Props) => {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as unknown as Mode)}
      options={[
        { value: 'default', label: 'Mặc định' },
        { value: 'affiliate', label: 'Affiliate' },
      ]}
      className={className}
    />
  );
};

export default Mode;

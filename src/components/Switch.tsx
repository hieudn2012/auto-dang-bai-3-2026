import { Switch as SwitchUI } from '@headlessui/react'

interface SwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function Switch({ enabled, onChange }: SwitchProps) {
  return (
    <SwitchUI
      checked={enabled}
      onChange={onChange}
      className={`group relative flex h-7 w-14 cursor-pointer rounded-full p-1 ease-in-out transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-500'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
          enabled ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </SwitchUI>
  )
}
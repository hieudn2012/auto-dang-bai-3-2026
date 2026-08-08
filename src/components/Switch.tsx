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
      className={`group relative flex h-5 w-9 cursor-pointer rounded-full p-0.5 ease-in-out transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-500'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </SwitchUI>
  )
}
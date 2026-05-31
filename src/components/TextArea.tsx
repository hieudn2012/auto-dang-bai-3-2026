import { twMerge } from "tailwind-merge";

interface TextAreaProps extends React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> {
  label?: string;
  icon?: string;
}

const TextArea = (props: TextAreaProps) => {
  const { label, icon, ...textareaProps } = props;
  return (

    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {icon && <i className={`mr-2 ${icon}`}></i>}
          {label}
        </label>
      )}
      <textarea
        {...textareaProps}
        className={twMerge(
          "w-full h-full p-3 rounded-xl border bg-white/80 dark:bg-dark-bgSecondary/80 backdrop-blur-sm border-gray-300/50 dark:border-dark-border/50 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-textTertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-dark-accent/50 focus:border-transparent shadow-sm dark:shadow-lg",
          textareaProps.className
        )}
      />
    </div>
  )
}

export default TextArea;

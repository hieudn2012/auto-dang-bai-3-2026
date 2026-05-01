import { twMerge } from "tailwind-merge";

const Input = (props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  return (
    <input 
      type="text" 
      {...props} 
      className={twMerge(
        "w-full p-3 rounded-xl border bg-white/80 dark:bg-dark-bgSecondary/80 backdrop-blur-sm border-gray-300/50 dark:border-dark-border/50 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-textTertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-dark-accent/50 focus:border-transparent transition-all duration-300 shadow-sm dark:shadow-lg", 
        props.className
      )} 
    />
  )
}

export default Input;

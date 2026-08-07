import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
}

const Select = ({ 
  options, 
  label, 
  error, 
  helperText, 
  className,
  icon,
  ...props 
}: SelectProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-2">
          {icon && <i className={`mr-2 ${icon}`}></i>}
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          {...props}
          className={twMerge(
            `w-full px-4 py-2 pr-10 rounded-xl border bg-white/80 dark:bg-dark-bgSecondary/80 backdrop-blur-sm text-gray-900 dark:text-dark-text border-gray-300/50 dark:border-dark-border/50 
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-dark-accent/50 focus:border-transparent 
            transition-all duration-300 appearance-none cursor-pointer shadow-sm dark:shadow-lg
            ${isFocused ? 'ring-2 ring-blue-500/50 dark:ring-dark-accent/50 border-transparent scale-[1.02]' : ''}
            ${error ? 'border-red-500/50 dark:border-red-400/50 focus:ring-red-500/50' : ''}`,
            className
          )}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white dark:bg-dark-bgSecondary text-gray-900 dark:text-dark-text">
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <i className="fas fa-chevron-down text-gray-400 dark:text-dark-textTertiary text-sm transition-transform duration-300 group-hover:scale-110"></i>
        </div>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
          <i className="fas fa-exclamation-circle mr-1"></i>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-textTertiary flex items-center">
          <i className="fas fa-info-circle mr-1"></i>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Select;

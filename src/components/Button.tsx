import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';

type Props = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  loading?: boolean;
  tooltip?: string;
}

const Button = ({ loading, tooltip, ...props }: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        {...props}
        className={twMerge("px-4 py-2 rounded-lg bg-primary text-white text-md font-semibold hover:bg-primary/80 dark:bg-gradient-to-r dark:from-dark-accent dark:to-dark-accentHover dark:hover:from-dark-accentHover dark:hover:to-dark-accent hover:scale-95 active:scale-90 shadow-lg dark:shadow-xl border border-primary/20 dark:border-dark-accent/30 transition-all duration-150", props.className)}
        disabled={loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : props.children}
      </button>
      {tooltip && (
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50 transition-all duration-200 ease-in-out ${showTooltip ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1 pointer-events-none'}`}>
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  )
}

export default Button;

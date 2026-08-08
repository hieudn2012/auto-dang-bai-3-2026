import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

type Props = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  loading?: boolean;
  tooltip?: string;
}

const Button = ({ loading, tooltip, ...props }: Props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const isDisabled = loading || props.disabled;

  useEffect(() => {
    if (!showTooltip || !btnRef.current) return;
    const update = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [showTooltip]);

  return (
    <div className="relative inline-flex">
      <button
        {...props}
        ref={btnRef}
        className={twMerge("px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/80 dark:bg-gradient-to-r dark:from-dark-accent dark:to-dark-accentHover dark:hover:from-dark-accentHover dark:hover:to-dark-accent hover:scale-95 active:scale-90 shadow-lg dark:shadow-xl border border-primary/20 dark:border-dark-accent/30 transition-all duration-150", isDisabled ? 'opacity-50 cursor-not-allowed' : '', props.className)}
        disabled={isDisabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {loading ? <i className="fa-solid fa-spinner animate-spin inline-block"></i> : props.children}
      </button>
      {tooltip && showTooltip && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ top: pos.top, left: pos.left }}
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Button;

import { useDarkMode } from '@/contexts/DarkModeContext';

const DarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="group relative p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-bgTertiary dark:to-dark-bg border border-gray-300 dark:border-dark-border hover:scale-110 hover:shadow-lg transition-all duration-300 transform"
      aria-label="Toggle dark mode"
    >
      <div className="relative">
        {isDarkMode ? (
          <i className="fas fa-sun text-yellow-500 text-lg group-hover:text-yellow-400 group-hover:rotate-180 transition-all duration-500 drop-shadow-lg"></i>
        ) : (
          <i className="fas fa-moon text-indigo-600 text-lg group-hover:text-indigo-500 group-hover:rotate-12 transition-all duration-500 drop-shadow-lg"></i>
        )}
      </div>
      
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-yellow-400/20 dark:bg-yellow-400/10' : 'bg-indigo-400/20 dark:bg-indigo-400/10'} group-hover:opacity-100 opacity-0 blur-md`}></div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-dark-bgTertiary text-white dark:text-dark-text text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-lg">
        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-dark-bgTertiary rotate-45"></div>
      </div>
    </button>
  );
};

export default DarkModeToggle;

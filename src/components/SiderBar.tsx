import { map } from "lodash";
import { routerPath } from "@/configs/router";
import { Link } from "react-router-dom";
import DarkModeToggle from "./DarkModeToggle";

const routers = [
  { 
    path: routerPath.manage_folder, 
    name: 'Thư mục', 
    icon: <i className="fa-solid fa-folder"></i>,
    description: 'Quản lý thư mục'
  },
  { 
    path: routerPath.profiles, 
    name: 'Hồ sơ', 
    icon: <i className="fa-solid fa-user"></i>,
    description: 'Quản lý profiles'
  },
  { 
    path: routerPath.import_sheet, 
    name: 'Tools', 
    icon: <i className="fa-solid fa-toolbox"></i>,
    description: 'Công cụ'
  },
];

const SiderBar = () => {
  const currentPath = window.location.pathname;
  
  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand Section */}
      <div className="p-4 border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 dark:shadow-purple-400/25 animate-pulse">
            <i className="fas fa-rocket text-white text-sm"></i>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 px-3 space-y-2">
        {map(routers, (router) => {
          const isActive = currentPath === router.path;
          
          return (
            <Link 
              to={router.path} 
              className={`group relative flex items-center justify-center p-3 rounded-xl transition-all duration-300 transform ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 text-white shadow-xl shadow-blue-500/30 dark:shadow-blue-400/30 scale-105' 
                  : 'text-gray-600 dark:text-dark-textSecondary hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 dark:hover:from-dark-bgTertiary dark:hover:to-dark-bgSecondary hover:scale-110 hover:shadow-lg'
              }`} 
              key={router.name}
              title={router.name}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-white to-blue-200 dark:from-white dark:to-blue-300 rounded-r-full shadow-lg"></div>
              )}
              
              {/* Icon */}
              <div className={`text-lg transition-all duration-300 ${isActive ? 'text-white drop-shadow-lg' : 'group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:drop-shadow-md'}`}>
                {router.icon}
              </div>
              
              {/* Tooltip */}
              <div className={`absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-dark-bgTertiary text-white dark:text-dark-text rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl transform scale-95 group-hover:scale-100 ${
                isActive ? 'hidden' : ''
              }`}>
                {router.name}
                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-2 h-2 bg-gray-900 dark:bg-dark-bgTertiary rotate-45"></div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-200/50 dark:border-dark-border/50">
        <DarkModeToggle />
      </div>
    </div>
  );
};

export default SiderBar;

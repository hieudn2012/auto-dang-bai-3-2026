import { map } from "lodash";
import { routerPath } from "@/configs/router";
import { Link } from "react-router-dom";

const routers = [
  { path: routerPath.manage_folder, name: 'Thư mục', icon: <i className="fa-solid fa-folder"></i> },
  { path: routerPath.profiles, name: 'Hồ sơ', icon: <i className="fa-solid fa-user"></i> },
  { path: routerPath.import_sheet, name: 'Tools', icon: <i className="fa-solid fa-toolbox"></i> },
];

const SiderBar = () => {
  const currentPath = window.location.pathname;
  return (
    <div className="flex flex-col py-5 pl-4">
      {map(routers, (router) => {
        return (
          <Link to={router.path} className={`rounded-lg p-2 font-bold text-xl flex items-center gap-2 ${currentPath === router.path ? 'bg-blue-500 text-white' : ''}`} key={router.name}>
            {router.icon}
          </Link>
        )
      })}
    </div>
  );
};

export default SiderBar;

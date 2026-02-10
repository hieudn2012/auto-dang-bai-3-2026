import { map } from "lodash";
import { routerPath } from "@/configs/router";
import { Link } from "react-router-dom";

const routers = [
  { path: routerPath.manage_folder, name: 'Thư mục' },
  { path: routerPath.profiles, name: 'Hồ sơ' },
];

const SiderBar = () => {
  return (
    <div className="flex flex-col py-5">
      {map(routers, (router) => {
        return (
          <Link to={router.path} className="p-2 font-bold" key={router.name}>{router.name}</Link>
        )
      })}
    </div>
  );
};

export default SiderBar;

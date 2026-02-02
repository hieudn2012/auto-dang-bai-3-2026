import { map } from "lodash";
import { routerPath } from "@/configs/router";
import { Link } from "react-router-dom";

const routers = [
  { path: routerPath.home, name: 'Home' },
  { path: routerPath.profiles, name: 'Profiles' },
  { path: routerPath.tools, name: 'Tools' }
];

const SiderBar = () => {
  return (
    <div className="flex flex-col">
      {map(routers, (router) => {
        return (
          <Link to={router.path} className="p-2 font-bold">{router.name}</Link>
        )
      })}
    </div>
  );
};

export default SiderBar;

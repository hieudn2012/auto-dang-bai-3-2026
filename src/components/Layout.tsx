import SiderBar from "./SiderBar";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <div className="flex">
      <div className="w-[200px]">
        <SiderBar />
      </div>
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
}

export default Layout;

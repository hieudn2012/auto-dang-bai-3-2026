import SiderBar from "./SiderBar";
import PageTransition from "./PageTransition";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-bgSecondary transition-colors duration-300">
      <div className="fixed left-0 top-0 h-full w-[60px] bg-white/80 dark:bg-dark-bgSecondary/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-dark-border/50 flex flex-col shadow-xl z-50">
        <SiderBar />
      </div>
      <div className="ml-[60px] w-[calc(100%-60px)] min-w-0 overflow-x-hidden p-8 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-dark-bg/50 dark:to-dark-bgSecondary/50 transition-colors duration-300">
        <PageTransition className="max-w-full min-w-0">
          {children}
        </PageTransition>
      </div>
    </div>
  )
}

export default Layout;

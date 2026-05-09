import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from './components/ToastContainer'
import 'react-toastify/dist/ReactToastify.css'

import { routerPath } from './configs/router'
import Splash from './screens/Splash'
import ManageFolder from './screens/ManageFolder'
import Profiles from './screens/Profiles'
import ImportSheet from './screens/ImportSheet'
import Schedule from './screens/Schedule'
import Report from './screens/Report'
import Logs from './screens/LogsD'
import Login from './screens/Login'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { LDProvider } from './configs/LDProvider'
// import LDFlagsViewer from './components/LDFlagsViewer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60
    }
  }
})

function App() {
  return (
    <LDProvider>
      <DarkModeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastContainer />
          <Router>
            {/* <LDFlagsViewer /> */}
            <Routes>
              <Route path={routerPath.splash} element={<Splash />} />
              <Route path={routerPath.home} element={<Splash />} />
              <Route path={routerPath.manage_folder} element={<ManageFolder />} />
              <Route path={routerPath.profiles} element={<Profiles />} />
              <Route path={routerPath.import_sheet} element={<ImportSheet />} />
              <Route path={routerPath.schedule} element={<Schedule />} />
              <Route path={routerPath.report} element={<Report />} />
              <Route path={routerPath.logs} element={<Logs />} />
              <Route path={routerPath.login} element={<Login />} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </DarkModeProvider>
    </LDProvider>
  )
}

export default App

import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { routerPath } from './configs/router'
import ManageFolder from './screens/ManageFolder'
import Profiles from './screens/Profiles'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60
    }
  }
})

function App() {
  useEffect(() => {
    const handleToast = (_event: any, arg: any) => {
      const { type, message } = arg as { type: 'success' | 'error' | 'info', message: string };
      if (type === 'success') {
        toast.success(message)
      } else if (type === 'error') {
        toast.error(message)
      } else {
        toast.info(message)
      }
    }

    window.ipcRenderer.on('show-toast', handleToast)

    return () => {
      window.ipcRenderer.off('show-toast', handleToast)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path={routerPath.home} element={<ManageFolder />} />
          <Route path={routerPath.manage_folder} element={<ManageFolder />} />
          <Route path={routerPath.profiles} element={<Profiles />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App

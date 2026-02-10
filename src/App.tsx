import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
  return (
    <QueryClientProvider client={queryClient}>
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

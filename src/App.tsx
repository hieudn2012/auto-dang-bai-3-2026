import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Home from './screens/Home'
import Profiles from './screens/Profiles'
import { routerPath } from './configs/router'
import Tools from './screens/Tools'

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
          <Route path={routerPath.home} element={<Home />} />
          <Route path={routerPath.profiles} element={<Profiles />} />
          <Route path={routerPath.tools} element={<Tools />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App

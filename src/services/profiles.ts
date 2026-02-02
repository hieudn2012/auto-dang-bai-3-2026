import { useQueries } from "@tanstack/react-query"
import axios from "axios"

const getProfiles = () => {
  return axios.post(`/api/v2/profile-list`)
}

export const useGetProfiles = () => {
  return useQueries({
    queries: [
      { queryKey: ['profiles'], queryFn: getProfiles }
    ]
  })
} 

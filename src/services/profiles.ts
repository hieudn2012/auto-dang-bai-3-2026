import { useMutation, useQueries } from "@tanstack/react-query"
import axios from "axios"
import { windowInstance } from "./window"

const getProfiles = (group_id: number) => {
  return axios.post(`/api/v2/profile-list`, { group_id, limit: 100 })
}

const getGroupList = () => {
  return axios.post(`/api/v2/group-list`)
}

const getNativeClientProfileOpenedList = async () => {
  const res = await axios.post(`/api/v2/native-client-profile-opened-list`, { group_id: 257818 })
  const data = res?.data?.data || [];

  // convert to map
  const openedMap = data.reduce((acc: any, item: any) => {
    acc[item.profile_id] = item;
    return acc;
  }, {} as Record<number, (typeof data)[0]>);

  return openedMap;
}

export const useGetProfiles = (group_id: number) => {
  return useQueries({
    queries: [
      { queryKey: ['profiles', group_id], queryFn: () => getProfiles(group_id) }
    ]
  })
}

export const useGetNativeClientProfileOpenedList = () => {
  return useQueries({
    queries: [
      { queryKey: ['native-client-profile-opened-list'], queryFn: getNativeClientProfileOpenedList }
    ]
  })
}

export const useOpenProfile = () => {
  return useMutation({
    mutationFn: ({ id, index }: { id: number, index: number }) => {
      return windowInstance.api.threadsProfileOpen(id, index);
    }
  })
}

export const useGetGroupList = () => {
  return useQueries({
    queries: [
      { queryKey: ['group-list'], queryFn: getGroupList }
    ]
  })
}

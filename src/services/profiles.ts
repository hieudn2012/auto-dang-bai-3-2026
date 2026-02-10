import { useQueries } from "@tanstack/react-query"
import axios from "axios"

const getProfiles = () => {
  return axios.post(`/api/v2/profile-list`, { group_id: 257818 })
}

const getNativeClientProfileOpenedList = async () => {
  const res = await axios.post(`/api/v2/native-client-profile-opened-list`, { group_id: 257818 })
  const data = res?.data?.data || [];

  // convert to map
  const openedMap = data.reduce((acc: any, item: any) => {
    acc[item.profile_id] = item;
    return acc;
  }, {} as Record<number, (typeof data)[0]>);

  console.log(openedMap, 'openedMap');


  return openedMap;
}

export const useGetProfiles = () => {
  return useQueries({
    queries: [
      { queryKey: ['profiles'], queryFn: getProfiles }
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

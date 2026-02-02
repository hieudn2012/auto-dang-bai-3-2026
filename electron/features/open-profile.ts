import axios from "axios"

export const openProfile = async (id: number) => {
  axios.post('http://127.0.0.1:53200/api/v2/profile-open', { profile_id: id })
}
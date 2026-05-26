import axios from "axios"

const request = axios.create({
  baseURL: 'http://localhost:3001/api',
})

request.interceptors.request.use((config) => {
  config.headers['Content-Type'] = 'application/json'
  return config
})

request.interceptors.response.use((response) => {
  return response.data
})

export default request

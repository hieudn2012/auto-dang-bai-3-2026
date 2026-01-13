import axios from "axios"

const request = axios.create({
  baseURL: 'https://api.gologin.com',
})

request.interceptors.request.use((config) => {
  const settings = JSON.parse(localStorage.getItem('settings') || '{}')
  config.headers['Content-Type'] = 'application/json'
  config.headers['Authorization'] = `Bearer ${settings.token}`
  return config
})

request.interceptors.response.use((response) => {
  return response.data
})

export default request

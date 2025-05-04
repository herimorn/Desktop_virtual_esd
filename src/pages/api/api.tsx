import axios from "axios";


const API_BASE_URL = 'http://192.168.100.34:5000/api/serial';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

import axios from "axios";


const API_BASE_URL = 'http://192.168.100.152:5000/api/auth/';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

import axios from "axios";


const API_BASE_URL = 'http://192.168.100.34:5000/api/product';

const productApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});


productApi.interceptors.request.use(
  async (config) => {

    return config;
  },
  (error) => Promise.reject(error)
);

export default productApi;

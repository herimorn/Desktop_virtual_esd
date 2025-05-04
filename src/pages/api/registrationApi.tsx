import axios from "axios";


const API_BASE_URL = 'http://192.168.100.34:5000/api';

const registrationApi = axios.create({
  baseURL: API_BASE_URL,
  time:10000,
});


registrationApi.interceptors.request.use(
  async (config) => {

    return config;
  },
  (error) => Promise.reject(error)
);

export default registrationApi;

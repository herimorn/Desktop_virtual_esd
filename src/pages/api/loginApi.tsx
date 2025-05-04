import axios from "axios";
const API_BASE_URL = 'http://192.168.100.34:5000/api/companies';

const loginApi = axios.create({
  baseURL: API_BASE_URL,
});

// Add serial number verification endpoint
export const verifySerialNumber = (serialNumber: string) => {
  return loginApi.post('/verify-serial', { serialNumber });
};

// Add registration with serial number
export const registerUser = (userData: {
  fullName: string;
  password: string;
  serialNumber: string;
}) => {
  return loginApi.post('/register', userData);
};

// Add login endpoint
export const loginUser = (credentials: {
  fullName: string;
  password: string;
}) => {
  return loginApi.post('/login', credentials);
};

loginApi.interceptors.request.use(
  async (config) => {

    return config;
  },
  (error) => Promise.reject(error)
);

export default loginApi;

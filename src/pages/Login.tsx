/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import loginApi from './api/loginApi';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const[role, setRole]= useState('');
  const [serial, setSerial] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo,setUserInfo]=useState('');

  // Fetch serial from remote database via Electron API
  useEffect(() => {
    const fetchSerial = async () => {
      try {
        const result = await window.electron.CheckSerial();
        console.log('Remote serial result:', result);
        if (result && result[0]?.serial) {
          setSerial(result[0].serial);
        } else {
          toast.error('No serial found in remote. Please register.');
          // Optionally redirect to registration if no serial exists
          navigate('/registration');
        }
      } catch (error: any) {
        console.error('Error fetching remote serial:', error.message);
        toast.error('Failed to fetch serial from remote.');
      }
    };
    fetchSerial();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !password || !serial) {
      toast.error('All fields are required and serial must be available.');
      return;
    }

    setIsLoading(true);

    try {
      // Send login details (including the serial fetched from remote) to your server
      const response = await loginApi.post('/login', {
        fullName,
        password,
        serial,
      });
      console.log('Response data:', response.data);

      if (response.data.message === 'Login successful.') {
        console.log('this one is triggered');
        // Optionally store auth token if provided
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }
        // Dispatch user data to Redux for persistence
        dispatch(setUser({
          token: response.data.token,
          fullName,
          serial,
          password,
          role:response.data.user.role.name,
          userInfo:response.data.user,
        }));
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Login error:', error.message);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light fontCss">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label text-secondary">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="form-control"
              disabled={isLoading}
              placeholder="Enter your full name"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="form-label text-secondary">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-control"
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>
          <div className="d-grid">
            <button type="submit" className="btn btn-danger" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Link to="/forgot-password" className={`text-danger ${isLoading ? 'disabled' : ''}`}>
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

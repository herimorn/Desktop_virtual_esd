import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import api from './api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const serial = location.state?.serial;
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  // Check for serial number and redirect if missing
  if (!serial) {
    toast.error('Serial number is missing. Please verify again.', {
      toastId: 'serial-missing' // Prevent duplicate toasts
    });
    navigate('/verify-serial');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);



    try {
      let storedSerial = await window.electron.GetSerial(); // Fetch stored serial from SQLite
      console.log('the stored serial is',storedSerial);

      // If serial is not stored, use the input serial
      if (!storedSerial) {
        if (!serial.trim()) {
          toast.error('Serial number is required');
          setIsLoading(false);
          return;
        }
        storedSerial = serial;
      }

      if (!fullName.trim() || !password.trim()) {
        toast.error('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      const response = await api.post('/company-login', {
        serial: storedSerial, // Use stored serial if available
        fullName,
        password,
      });

      console.log('Response data:', response.data);

      if (response.data.message === 'Login successful') {
        // Store the serial in SQLite if it's a new registration
        if (!await window.electron.GetSerial()) {
          await window.electron.RegisterSerial({ fullName, serial: storedSerial });
          toast.success('Serial number saved successfully!');
        }

        // Store auth token
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }

        navigate('/dashboard', { state: { fullName } });
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
              onChange={(e) => setFullName(e.target.value.trim())}
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
            <button
              type="submit"
              className="btn btn-danger"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Link
              to="/forgot-password"
              className={`text-danger ${isLoading ? 'disabled' : ''}`}
            >
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

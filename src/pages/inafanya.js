/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import api from './api/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const serial = location.state?.serial;
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  if (!serial) {
    toast.error('Serial number is missing. Please verify again.');
    navigate('/verify-serial');
    return null;
  }

   const handleLogin =  async() =>{

    try {
      const response = await api.post('/company-login', { serial, fullName, password });
      console.log('mzigo unaotumwa ni huu hapa:', response.data); // Log the entire response

      if (response.data.success) {
        toast.success('Serial Number Verified');
        // setRedirectToLogin(true);
        // navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Error fetching bank data:', error.message);
      toast.error('Failed to verify serial number');
    }
   }
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light fontCss">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label text-secondary">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="form-control"
            />
          </div>
          <div className="mb-4">
            <label className="form-label text-secondary">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="d-grid">
            <button type="submit" className="btn btn-danger" >Login</button>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Link to="/forgot-password" className="text-danger">Forgot Password?</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

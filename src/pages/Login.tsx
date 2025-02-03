/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [serial, setSerial] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Check if a session exists in localStorage when the app starts or reloads
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
      // If session exists, redirect to the dashboard
      navigate('/dashboard');
    }

    // Handle login response from Electron
    const handleLoginResponse = (response: any) => {
      if (response.success) {
        console.log(response);
        // Store session data in localStorage (e.g., user ID, token, etc.)
        localStorage.setItem('userSession', JSON.stringify(response.user));
        toast.success(response.message);
        // Redirect to the dashboard
        navigate('/dashboard');
      } else {
        console.log(response);
        toast.error(response.message);
      }
    };

    // Listen to login responses
    window.electron.onLoginResponse(handleLoginResponse);

    return () => {
      // Clean up the event listener
      window.electron.removeRedirectToLoginListener(handleLoginResponse);
    };
  }, [navigate]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Trigger the login process in Electron
    window.electron.login({ serial, password });
  };


  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light fontCss">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label text-secondary">Serial Number</label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
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

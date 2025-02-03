/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
const CreatePassword: React.FC = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    window.electron.onSetPasswordResponse((response) => {
      if (response.success) {
        toast.success(response.message);
        navigate('/login');
      } else {
        toast.error(response.message);
      }
    });

    return () => {
      // window.electron.removeListener('set-password-response');
    };
  }, [navigate]);

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    window.electron.setPassword({newPassword });
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light font">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Create Password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-3">
            <label className="form-label text-secondary">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="form-control"
            />
          </div>
          <div className="mb-3">
            <label className="form-label text-secondary">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-control"
            />
          </div>
          <div className="d-grid">
            <button type="submit" className="btn btn-danger">Set Password</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePassword;

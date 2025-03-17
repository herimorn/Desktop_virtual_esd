/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import api from './api';

const VerifySerial: React.FC = () => {
  const navigate = useNavigate();
  const [serial, setSerial] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement> | undefined) => {
    if (event) event.preventDefault();

    if (!serial) {
      toast.error('Serial number is required'); // Show error if serial is empty
      return;
    }

    try {
      const response = await api.post('/serial-numbers/check', { serial }); // Send serial in the request
      console.log('serial number:', response.data);

      if (response.data.exists) { // Assuming the response has a success property
        toast.success('Serial Number Verified');
        navigate('/login', { state: { serial } }); // Pass serial as state
      } else {
        navigate('/registration');
      }
    } catch (error: any) {
      console.error('Error fetching bank data:', error.message);
      toast.error('Failed to verify serial number'); // Show error toast
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light fontCss">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Verify Serial</h2>
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
          <div className="d-grid">
            <button type="submit" className="btn btn-danger" >Verify</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifySerial;

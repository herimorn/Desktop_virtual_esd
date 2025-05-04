/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import api from './api/api';

const VerifySerial: React.FC = () => {
  const navigate = useNavigate();
  const [serial, setSerial] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!serial) {
      toast.error('Serial number is required');
      return;
    }

    try {
      // Step 1: Check serial with the server
      const response = await api.post('/check', { serial });
      console.log('Server response:', response.data);

      if (response.data.status) {
        toast.success('Serial Number Verified by server');

        // Step 2: Check remote (local database via Electron) for existing serial
        const remoteResult = await window.electron.CheckSerial();
        console.log('Remote check result:', remoteResult);

        // If the serial already exists remotely, proceed to login
        if (remoteResult && remoteResult[0]?.serial) {
          toast.success('Serial already registered remotely');
          navigate('/login', { state: { serial } });
        } else {
          // If not found, insert the serial remotely
          const insertResult = await window.electron.RegisterSerial({
            formData: {
              serial,
              // If needed, you can add additional fields (e.g. fullName, password) here.
            }
          });
          console.log('Remote insert result:', insertResult);

          if (insertResult && insertResult.id) {
            toast.success('Serial inserted remotely');
            navigate('/login', { state: { serial } });
          } else {
            toast.error('Failed to insert serial remotely');
          }
        }
      } else {
        toast.info('Serial not found, please register');
        navigate('/registration');
      }
    } catch (error: any) {
      console.error('Error verifying serial number:', error.message);
      const errorMessage = error.response?.data?.message || 'Failed to verify serial number';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light fontCss">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Verify Serial</h2>
        <form onSubmit={handleSubmit}>
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
            <button type="submit" className="btn btn-danger">
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifySerial;
 
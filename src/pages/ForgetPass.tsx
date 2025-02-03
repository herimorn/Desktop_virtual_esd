/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/function-component-definition */
/* eslint-disable prettier/prettier */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const Forget: React.FC = () => {
  const navigate = useNavigate();
  const [serial, setSerial] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const handleSerialVerify = (response: any) => {
      if (response.success) {
        console.log("the response is " ,response);
        toast.success(response.message);
        navigate('/create-password');
      } else {
        console.log(response);
        toast.error(response.message);
      }
    };

    window.electron.onSerialVerify(handleSerialVerify);

    return () => {
      // window.electron.removeLoginResponseListener(handleEmailVerify);
    };
  }, [navigate]);

  const handleSerial= (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.electron.serialVerify({ serial });
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <ToastContainer />
      <div className="p-4 rounded shadow-sm bg-white" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4 text-dark">Request Password</h2>
        <form onSubmit={handleSerial}>
          <div className="mb-3">
            <label className="form-label text-secondary">Put your Serial Number</label>
            <input
              type="text"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="d-grid">
            <button type="submit" className="btn btn-primary">Request</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Forget;

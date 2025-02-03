import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import '../renderer/registration.css';
import { Container, Row, Col, Button, Form, Table, Modal, Pagination } from 'react-bootstrap';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
 import './register.css'
const Registration: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    country: '',
    currency: '',
    bankName: '',
    chartOfAccounts: '',
    fiscalYearStart: '',
    fiscalYearEnd: '',
    serialNumber: '',
    password: '',
    address: ''  // New address field
  });

  const [errors, setErrors] = useState({
    companyName: '',
    fullName: '',
    email: '',
    country: '',
    currency: '',
    bankName: '',
    chartOfAccounts: '',
    fiscalYearStart: '',
    fiscalYearEnd: '',
    serialNumber: '',
    password: '',
    phone: '',
    address: ''
     // New address field error
  });

  const countryToCurrencyMap: { [key: string]: string } = {
    Tanzania: 'TZS',
    Kenya: 'KES',
    Uganda: 'UGX',
    Rwanda: 'RWF',
    Burundi: 'BIF',
    SouthSudan: 'SSP'
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string; // Base64 string
        setFormData({
          ...formData,
          profilePicture: base64String
        });
        setSelectedFile(base64String); // Update selectedFile after reading the file
      };

      reader.readAsDataURL(file); // Convert file to Base64 string
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setFormData({ ...formData, [id]: value });
    setErrors({ ...errors, [id]: '' }); // Clear error when input is modified
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.companyName) newErrors.companyName = 'Company Name is required.';
    if (!formData.fullName) newErrors.fullName = 'Full Name is required.';
    if (!formData.email || !validateEmail(formData.email)) newErrors.email = 'Valid Email is required.';
    if (!phone || !isValidPhoneNumber(phone)) newErrors.phone = 'Valid Phone number is required.';
    if (!formData.country) newErrors.country = 'Country is required.';
    if (!formData.currency) newErrors.currency = 'Currency is required.';
    if (!formData.bankName) newErrors.bankName = 'Bank Name is required.';
    if (!formData.chartOfAccounts) newErrors.chartOfAccounts = 'Chart of Accounts is required.';
    if (!formData.password) newErrors.password = 'Password is required.';
    if (!formData.address) newErrors.address = 'Address is required.'; // Address validation

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (formData.country) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        currency: countryToCurrencyMap[formData.country] || ''
      }));
    }
  }, [formData.country]);

  const handleCountryChange = (selectedOption: any) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      country: selectedOption.value,
      currency: countryToCurrencyMap[selectedOption.value] || ''
    }));
    setErrors({ ...errors, country: '', currency: '' }); // Clear errors when country is selected
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    // window.electron.register({
    //         formData: {
    //           ...formData,
    //           phone,
    //           profilePicture: formData.profilePicture   // Send the file object to the backend
    //         }
    //       });

    try {
      const response = await window.electron.sendRegistrationData({
        ...formData,
        phone,
      });

      if (response.message === 'Registration successful') {
        console.log('the response from the backend:', response);
        window.electron.register({
          formData: {
            ...formData,
            phone,
            profilePicture: formData.profilePicture    // Send the file object to the backend
          }
        });
        toast.success('Registration successful!');
        navigate('/login');
      } else {
        toast.error(Error sending data: ${response.message});
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(Error sending data: ${errorMessage});
    }
  };

  const countryOptions = Object.keys(countryToCurrencyMap).map((country) => ({
    value: country,
    label: country
  }));

  return (
    <div className="form-registration-container font">
      <ToastContainer />
      <h2 className='text-center'>Set up your organization</h2>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <center>
              <label className='txt'>Company Name</label>
            </center>
            <input type="text" placeholder="Company Name" id='companyName' onChange={handleChange}
            isInvalid={!!errors.companyName} required />
            {errors.companyName && <div className="invalid-feedback">{errors.companyName}</div>}
          </div>
          <div className="form-group">
  <label className="me-3">Phone</label>  {/* me-3 adds some margin to the right */}
  <PhoneInput style={{display:'flex',height:'2.8rem'}}
    className={form-control ${errors.phone ? 'is-invalid' : ''}} // Added 'form-control' to align with Bootstrap form styling
    defaultCountry="TZ"
    value={phone}
    onChange={(value) => {
      setPhone(value);
      setErrors({ ...errors, phone: '' });
    }}
    name="phone"
    required
  />
  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
</div>

          <div className="form-group">
            <label htmlFor="profilePicture">Company Profile Picture</label>
            <div className="file-input">
              <input type="file" id="profilePicture" onChange={handleFileChange} />
              <label htmlFor="profilePicture" className="file-label">
                <i className="fas fa-camera" /> Upload Picture
              </label>
            </div>
            {selectedFile && (
              <div className="image-preview">
                <img src={selectedFile} alt="Profile Preview" />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Full Name" id='fullName' onChange={handleChange} required />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="john@doe.com" id='email' onChange={handleChange} required
               isInvalid={!!errors.email}/>
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Address</label> {/* New address field */}
            <input type="text" placeholder="123 Main St" id='address' onChange={handleChange} required />
            {errors.address && <div className="invalid-feedback">{errors.address}</div>}
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label>Country</label>
            <Select
              id='country'
              options={countryOptions}
              onChange={handleCountryChange}
              value={countryOptions.find(option => option.value === formData.country)}
            />
            {errors.country && <div className="invalid-feedback">{errors.country}</div>}
          </div>
          <div className="form-group">
            <label>Currency</label>
            <input type="text" placeholder="TZS" id='currency' value={formData.currency} readOnly />
            {errors.currency && <div className="invalid-feedback">{errors.currency}</div>}
          </div>
          <div className="form-group">
            <label>Bank Name</label>
            <input type="text" placeholder="Bank Name" id='bankName' onChange={handleChange} required />
            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
          </div>
          <div className="form-group">
            <label>Chart of Accounts</label>
            <input type="text" placeholder="Chart of Accounts" id='chartOfAccounts' onChange={handleChange} required />
            {errors.chartOfAccounts && <div className="invalid-feedback">{errors.chartOfAccounts}</div>}
          </div>
          <div className="form-group">
            <label>Fiscal Year Start</label>
            <input type="date" id='fiscalYearStart' onChange={handleChange} required />
            {errors.fiscalYearStart && <div className="invalid-feedback">{errors.fiscalYearStart}</div>}
          </div>
          <div className="form-group">
            <label>Fiscal Year End</label>
            <input type="date" id='fiscalYearEnd' onChange={handleChange} required />
            {errors.fiscalYearEnd && <div className="invalid-feedback">{errors.fiscalYearEnd}</div>}
          </div>
          <div className="form-group">
            <label>Serial Number</label>
            <input type="text" placeholder="Serial Number" id='serialNumber' onChange={handleChange} required />
            {errors.serialNumber && <div className="invalid-feedback">{errors.serialNumber}</div>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Password" id='password' onChange={handleChange} required />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
        </div>

        <div className="text-center">
          <button type="submit" className="btn btn-secondary">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default Registration;

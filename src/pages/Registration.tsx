import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import '../renderer/registration.css';
import { Container, Row, Col, Button, Form, Table, Modal, Pagination } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap';
import PhoneInput, { isValidPhoneNumber, E164Number } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './register.css';
import { display } from 'html2canvas/dist/types/css/property-descriptors/display';
import api from './api/api';
const Registration: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [accountNumbers, setAccountNumbers] = useState<{ [key: string]: string }>({}); // State to hold account numbers for each selected bank

  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    country: '',
    currency: '',
    bankName: [],
    chartOfAccounts: '',
    fiscalYearStart: '',
    fiscalYearEnd: '',
    serialNumber: '',
    password: '',
    address: '',  // New address field
    street: '',   // New street field
    region: '',   // New region field
    district: '', // New district field
    pobox: '' ,
     personal_username:'',
    personal_email:'',
    // New P.O. BOX field
    iform: '', // New iform field
    traTin: '', // New TRA TIN field
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
    address: '',
    street: '',   // New street field error
    region: '',   // New region field error
    district: '', // New district field error
    pobox: '',
    personal_username: '', // New P.O. BOX field error
    tra_error: '', // New TRA TIN field error
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
          // profilePicture is not in formData type, so we don't set it
        });
        setSelectedFile(file); // Update selectedFile with the File object
      };

      reader.readAsDataURL(file); // Convert file to Base64 string
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = event.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: '' })); // Clear error when input changes
  };

  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
    if (!formData.bankName.length) newErrors.bankName = 'Bank Name is required.';
    if (!formData.chartOfAccounts) newErrors.chartOfAccounts = 'Chart of Accounts is required.';
    if (!formData.password) newErrors.password = 'Password is required.';
    if (!formData.address) newErrors.address = 'Address is required.';
    if (!formData.personal_username) newErrors.personal_username = 'Username is required.';// Address validation
    if (!formData.personal_email)
    if (!formData.traTin) newErrors.tra_error = 'TRA TIN is required.'; // TRA TIN validation
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

    if (validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      const response = await window.electron.sendRegistrationData({
        ...formData,
        phone,
        accountNumbers
      });

      console.log('mzigo unaotumwa ni', response)
      if ((response as any).message === 'success') {
        //console.log('the response from the backend:', response);
        window.electron.RegisterSerial({
          formData: {
            ...formData,
            phone
          }
        });
        toast.success('Registration successful!');
        navigate('/login');
      } else {
        toast.error(`Error sending data: ${(response as any).message}`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Error sending data: ${errorMessage}`);
    }
  };

  const countryOptions = Object.keys(countryToCurrencyMap).map((country) => ({
    value: country,
    label: country
  }));


  const chartOfAccountsOptions = () => [
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Assets', label: 'Assets' },
    { value: 'Expense', label: 'Expense' },
    { value: 'Liability', label: 'Liability' },
  ];


// Add the predefined banks object
const Bbanks: { [key: string]: string } = {
  Tanzania: 'CRDB',
  Kenya: 'NMB',
  Uganda: 'NBC',
  ABSA: 'ABSA',
  AZANIA: 'AZANIA'
};

// Remove fetchBank function and replace with bankOptions
const bankOptions = Object.entries(Bbanks).map(([key, value]) => ({
  value: value,
  label: value
}));

// Update the handleBankChange function
const handleBankChange = (selectedOptions: any) => {
  if (!selectedOptions) {
    setFormData(prev => ({ ...prev, bankName: [] }));
    setAccountNumbers({});
    return;
  }

  const selectedBanks = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
  const selectedBankNames = selectedBanks.map(option => option.value);
  setFormData(prev => ({ ...prev, bankName: selectedBankNames }));

  // Initialize account numbers for newly selected banks
  const newAccountNumbers = { ...accountNumbers };
  selectedBankNames.forEach(bank => {
    if (!newAccountNumbers[bank]) {
      newAccountNumbers[bank] = '';
    }
  });
  setAccountNumbers(newAccountNumbers);
};

// Remove the useEffect for fetchBank since we're using static data now

  return (
    <div className="form-registration-container" style={{ fontFamily: 'CustomFont' }}>
      <ToastContainer />
      <h2 className='text-center'>Set up your organization</h2>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <center>
              <label className='txt'>Company Name</label>
            </center>
            <Form.Control
              type="text"
              placeholder="Company Name"
              id='companyName'
              onChange={handleChange}
              isInvalid={!!errors.companyName}
              required
            />
            {errors.companyName && <div className="invalid-feedback">{errors.companyName}</div>}
          </div>
          <div className="form-group">
      <label className="txt">Phone</label>
      <PhoneInput style={{height:'4',display:'flex'}}
        name="tel"
        id="tel"
        className={`form-control ${errors.phone ? 'is-invalid' : ''} custom-phone-input`}
        defaultCountry="TZ"
        value={phone}
        onChange={(value?: E164Number | undefined) => {
          setPhone(value || null);
          setErrors({ ...errors, phone: '' });
        }}
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
                <img src={URL.createObjectURL(selectedFile)} alt="Profile Preview" />
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
            <input
              type="email"
              placeholder="john@doe.com"
              id='email'
              onChange={handleChange}
              required
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Region</label> {/* New address field */}
            <input type="text" placeholder="eg Dar es salaam" id='region' onChange={handleChange} required />
            {errors.region && <div className="invalid-feedback">{errors.region}</div>}
          </div>
          <div className="form-group">
            <label>District</label> {/* New address field */}
            <input type="text" placeholder="District" id='district' onChange={handleChange} required />
            {errors.district && <div className="invalid-feedback">{errors.district}</div>}
          </div>
          <div className="form-group">
            <label>Street</label> {/* New address field */}
            <input type="text" placeholder="123 Main St" id='street' onChange={handleChange} required />
            {errors.street && <div className="invalid-feedback">{errors.street}</div>}
          </div>
          <div className="form-group">
            <label>P.O. BOX</label> {/* New address field */}
            <input type="text" placeholder="P.O. BOX" id='pobox' onChange={handleChange} required />
            {errors.pobox && <div className="invalid-feedback">{errors.pobox}</div>}
          </div>
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
        </div>

        <div className="form-section">

          <div className="form-group">
            <label>Currency</label>
            <input type="text" placeholder="TZS" id='currency' value={formData.currency} readOnly />
            {errors.currency && <div className="invalid-feedback">{errors.currency}</div>}
          </div>
          <div className="form-group">
            <label>Bank Name</label>
            <Select
              isMulti
              options={bankOptions}
              onChange={handleBankChange}
              className={`basic-multi-select ${errors.bankName ? 'is-invalid' : ''}`}
              placeholder="Select banks..."
            />
            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
          </div>

          {formData.bankName.map((bank) => (
            <div className="form-group" key={bank}>
              <label>Account Number for {bank}</label>
              <input
                type="text"
                placeholder={`Account Number for ${bank}`}
                value={accountNumbers[bank] || ''} // Ensure the input value is linked to the correct bank
                onChange={(e) => setAccountNumbers({ ...accountNumbers, [bank]: e.target.value })} // Update account number for the specific bank
                required
              />
            </div>
          ))}

          <div className="form-section">
  <div className="form-group">
    <label htmlFor="accountType">Charts Account</label>
    <select id="accountType" onChange={handleChange}>
      {chartOfAccountsOptions().map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
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
            <label>TRA TIN</label>
            <input type="text" placeholder="TRA TIN" id='traTin' onChange={handleChange} required />
            {errors.tra_error && <div className="invalid-feedback">{errors.tra_error}</div>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Password" id='password' onChange={handleChange} required />
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>
          <div className="form-group">
            <label>Personal Username</label>
            <input type="text" placeholder="Personal Username" id='personal_username' onChange={handleChange} required />
            {errors.personal_username && <div className="invalid-feedback">{errors.personal_username}</div>}
          </div>
          <div className="form-group">
            <label>Personal Email</label>
            <input type="email" placeholder="john@doe.com" id='personal_email' onChange={handleChange} required
            />
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

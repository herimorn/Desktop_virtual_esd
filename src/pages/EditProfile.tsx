import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import { Container, Button, Form, Row, Col, Card } from 'react-bootstrap';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { ArrowLeft } from 'react-bootstrap-icons';
import './EditProfile.css'; // Custom CSS styles

const EditProfile: React.FC = () => {
   const { id } = useParams<{ id: string }>();

  // console.log('id is ',id)
  // const id=1;

  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    address: '',
    phone:'' // New address field

  });

  const [errors, setErrors] = useState<Record<string, string>>({
    companyName: '',
    fullName: '',
    email: '',
    address: '',
    phone: '',
  });

  const countryToCurrencyMap: { [key: string]: string } = {
    Tanzania: 'TZS',
    Kenya: 'KES',
    Uganda: 'UGX',
    Rwanda: 'RWF',
    Burundi: 'BIF',
    SouthSudan: 'SSP',
  };

  // Handle file change for profile picture
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData((prev) => ({ ...prev, profilePicture: base64String }));
        setSelectedFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form field changes
  const handleChange = (e: { target: { id: any; value: any } }) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  // Validate email format
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Validate form before submitting
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = [
      'companyName',
      'fullName',
      'email',
      'phone',
      'address',
    ];

    requiredFields.forEach((field) => {
      if (!formData[field as keyof typeof formData])
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1')} is required.`;
    });

    if (formData.email && !validateEmail(formData.email))
      newErrors.email = 'Valid Email is required.';

    if (phone && !isValidPhoneNumber(phone))
      newErrors.phone = 'Valid Phone number is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle country selection
  const handleCountryChange = (selectedOption: { value: string }) => {
    setFormData((prev) => ({
      ...prev,
      country: selectedOption.value,
      currency: countryToCurrencyMap[selectedOption.value] || '',
    }));
    setErrors((prev) => ({ ...prev, country: '', currency: '' }));
  };
  useEffect(() => {
    fetchData();
  }, []);
  // Fetch data from the backend
  const fetchData = async () => {
    try {
      const response = await window.electron.fetchUserData(id);
      console.log('response is', response);
      if (response) {
        setFormData(response);
        setPhone(response.phone);
      } else {
        toast.error(response.error || 'Company data not found.');
      }
    } catch (error) {
      toast.error('Failed to load company data.');
    }
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      // First API call: UpdateData
      const response = await window.electron.UpdateData({
        ...formData,
        phone, // Include phone number in the payload
      });

      if (response.message === 'success') {
        // Second API call: Update with profile picture (if needed)
        await window.electron.update({
          formData: {
            ...formData,
            phone,
          },
        });

        toast.success('Profile updated and installed successfully!');
        navigate('/dashboard'); // Redirect to dashboard on success
      } else {
        // Handle backend errors
        toast.error(`Error updating profile: ${response.message}`);
      }
    } catch (error: any) {
      // Handle any unexpected errors from either API call
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Error updating profile: ${errorMessage}`);
    }
  };



  // Define country options
  const countryOptions = Object.keys(countryToCurrencyMap).map((country) => ({
    value: country,
    label: country,
  }));

  // Handle navigation back
  const handleBack = () => navigate('/dashboard');

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Card className="p-4 shadow-lg" style={{ width: '50%' }}>
        <Button
          onClick={handleBack}
          variant="outline-secondary"
          className="mb-3"
          style={{ width: 'fit-content' }}
        >
          <ArrowLeft /> Back
        </Button>

        <ToastContainer />

        <h2 className="text-center mb-4">Edit Profile</h2>

        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Company Name</Form.Label>
                {/* Bind state to companyName */}
                <Form.Control
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  isInvalid={!!errors.companyName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.companyName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Full Name</Form.Label>
                {/* Bind state to fullName */}
                <Form.Control
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  isInvalid={!!errors.fullName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.fullName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Email</Form.Label>
                {/* Bind state to email */}
                <Form.Control
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Address</Form.Label>
                {/* Bind state to email */}
                <Form.Control
                  type="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  isInvalid={!!errors.address}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Phone</Form.Label>
                {/* Bind state to phone */}
                <PhoneInput
                  defaultCountry="TZ"
                  value={formData.phone}
                  onChange={(value) =>
                    setFormData({ ...formData, phone: value })
                  }
                  className={errors.phone ? 'is-invalid' : ''}
                />
                {errors.phone && (
                  <div className="invalid-feedback">{errors.phone}</div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* <Col className="form-group">
            <label htmlFor="profilePicture">Company Profile Picture</label>
            <div className="file-input">
              <input
                type="file"
                id="profilePicture"
                onChange={handleFileChange}

              />
              <label htmlFor="profilePicture" className="file-label">
                {formData.profilePicture}
                <i className="fas fa-camera" /> Upload Picture
              </label>
            </div>
            {selectedFile && (
              <div className="image-preview">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Profile Preview"
                />
              </div>
            )}
          </Col> */}

          <Button type="submit" variant="secondary" className="w-100 mt-3">
            Update Profile
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default EditProfile;

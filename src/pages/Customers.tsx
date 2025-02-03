import React, { useState } from 'react';
import { Form, Button, Col, Row, Card, Container, Stack } from 'react-bootstrap';
import { Sidebar } from './Layouts/sidebar';
import { Header } from './Layouts/nav';
import { BsSave, BsX } from 'react-icons/bs';

const CustomerForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Customer',
    email: '',
    phone: '',
    address: '',
    defaultAccount: '',
    currency: 'TZ',
    taxId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    country: '',
    state: '',
    postalCode: ''
  });

  const [showAddressForm, setShowAddressForm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleAddressSave = () => {
    setFormData(prevData => ({
      ...prevData,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2,
      city: formData.city,
      country: formData.country,
      state: formData.state,
      postalCode: formData.postalCode
    }));
    setShowAddressForm(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(formData); // This should include both the main form and address details
  };

  const handleAddressFormToggle = () => {
    setShowAddressForm(!showAddressForm);
  };

  return (
    <Container fluid className="p-0">
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={showAddressForm ? 5 : 8} className="p-4">
          <Card className="shadow-sm border-0">
            <Card.Header className="d-flex justify-content-between align-items-center border-bottom-0">
              <h5 className="mb-0">New Entry</h5>
              <span className="badge bg-secondary">Draft</span>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Stack gap={3}>
                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="formName">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Full Name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          isInvalid={!formData.name}
                        />
                        <Form.Control.Feedback type="invalid">Name is required</Form.Control.Feedback>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group controlId="formRole">
                        <Form.Label>Role</Form.Label>
                        <Form.Select name="role" value={formData.role} onChange={handleChange}>
                          <option>Customer</option>
                          <option>Vendor</option>
                          <option>Partner</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="formEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="Email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group controlId="formPhone">
                        <Form.Label>Phone</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="formAddress">
                        <Form.Label>Address</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group controlId="formDefaultAccount">
                        <Form.Label>Default Account</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Default Account"
                          name="defaultAccount"
                          value={formData.defaultAccount}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group controlId="formCurrency">
                        <Form.Label>Currency</Form.Label>
                        <Form.Select name="currency" value={formData.currency} onChange={handleChange}>
                          <option>INR</option>
                          <option>USD</option>
                          <option>EUR</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group controlId="formTaxId">
                        <Form.Label>Tax ID</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Tax ID"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end">
                    <Button variant="primary" type="submit">
                      <BsSave className="me-2" /> Save
                    </Button>
                  </div>
                </Stack>
              </Form>
            </Card.Body>
          </Card>
        </Col>


      </Row>
    </Container>
  );
};

export default CustomerForm;

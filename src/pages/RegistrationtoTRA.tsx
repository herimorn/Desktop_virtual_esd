// TraRegistration.tsx
import React, { useState } from 'react';
import { Container, Row, Col, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { toast } from 'react-toastify';

const TraRegistration: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [traTin, setTraTin] = useState('');
  const [certKey, setCertKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Form submitted');
    if (traTin && certKey) {
      console.log('Setting isLoading to true');
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const response = await window.electron.registerTra(traTin, certKey);
        console.log('Registration response:', response);
        toast.success('Registration successful');
        setShowModal(false);
      } catch (error) {
        console.error('Error during registration:', error);
        toast.error('Registration failed');
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    } else {
      alert('Please fill out all fields.');
    }
  };

  return (
    <Container fluid className="p-0 font">
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-4 content">
          <div className="d-flex justify-content-center">
            <Button onClick={() => { console.log('Opening modal'); setShowModal(true); }}>
              Click here to Register
            </Button>
          </div>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => { console.log('Closing modal'); setShowModal(false); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Register to TRA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="traTin">
              <Form.Label>Tin</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Tin"
                value={traTin}
                onChange={(e) => setTraTin(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="certKey">
              <Form.Label>Certkey</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Certkey"
                value={certKey}
                onChange={(e) => setCertKey(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              style={{ marginTop: 20 }}
              variant="primary"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />{' '}
                  Loading...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default TraRegistration;

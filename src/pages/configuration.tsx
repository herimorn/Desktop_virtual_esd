import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Modal, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';

interface EmailConfig {
  email: string;
  password: string;
}

const Configuration: React.FC = () => {
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({ email: '', password: '' });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const user = await window.electron.fetchUserData();
      if (user && !emailConfig.email) {
        setEmailConfig({ email: user.email || '', password: '' });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Error fetching user data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await window.electron.addOrUpdateEmailConfiguration(emailConfig.email, emailConfig.password);
      Swal.fire('Success', 'Email configuration saved successfully', 'success');
      setShowModal(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
      Swal.fire('Error', 'Failed to save configuration', 'error');
    }
  };

  const handleEdit = () => {
    setShowModal(true);
  };

  return (
    <Container fluid className="p-0 font" style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content">
          <h3 style={{ marginTop: 20 }} className="mb-3">Email Configurations</h3>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleEdit}
            className="btn-sm rounded-pill text-white p-1"
            style={{ position: 'relative', left: '80%', width: 150, margin: 10 }}
          >
            <i className="bi bi-plus-circle"> {'   '}Add Configuration</i>
          </Button>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Email</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{loading ? 'Loading...' : emailConfig.email}</td>
                <td>{loading ? 'Loading...' : emailConfig.password}</td>
              </tr>
            </tbody>
          </Table>

          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Edit Configuration</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="formEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="text"
                    value={emailConfig.email}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, email: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group controlId="formPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="text"
                    value={emailConfig.password}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, password: e.target.value })
                    }
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Close
                </Button>
                <Button variant="danger" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </Modal.Footer>
          </Modal>

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default Configuration;

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { useNavigate } from 'react-router-dom';

const Pfx: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Attach event listeners for PFX upload events
    window.electron.onPfxUploadProgress(() => {});
    window.electron.onPfxUploadSuccess(() => {
      setShowModal(false);
      navigate('/register'); // Redirect to login page on success
    });
    window.electron.onPfxUploadError((errorMessage: string) => toast.error(`Error: ${errorMessage}`));

    return () => {
      // Clean up event listeners when component unmounts
      window.electron.removePfxUploadListeners();
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (file && password) {
      try {
        const formData = { fileData: await file.arrayBuffer(), password };
        await window.electron.uploadPfx(formData); // Trigger PFX upload process
      } catch (error: any) {
        toast.error(`Error: ${error.message}`); // Display error toast on failure
      }
    } else {
      toast.warn('Please fill out all fields.'); // Warn if file or password is missing
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]); // Set selected file for upload
    }
  };

  return (
    <Container fluid className="p-0">
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-4 content">
          <div className="d-flex justify-content-center">
            <Button onClick={() => setShowModal(true)}>Click here</Button>
          </div>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload PFX</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="file">
              <Form.Label>Choose File</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
                required
              />
            </Form.Group>
            <Button style={{ marginTop: 20 }} variant="primary" type="submit">
              Upload
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ToastContainer /> {/* ToastContainer component for displaying notifications */}
    </Container>
  );
};

export default Pfx;

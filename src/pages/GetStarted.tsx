import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Button,
  Container,
  Row,
  Col,
  Card,
  Navbar,
  Nav,
  Modal,
  Form,
} from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import { Sidebar } from './Layouts/sidebar';
import { useNavigate,Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import '../renderer/getStarted.css';
import { Header } from './Layouts/nav';
import { ProgressBar, Spinner, Modal, Button } from 'react-bootstrap';

const GetStarted = () => {
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTinModal, setShowTinModal] = useState(false);
  const [traTin, setTraTin] = useState('');
  const [certKey, setCertKey] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPfxConfigured, setIsPfxConfigured] = useState(false);
  const [isTraConfigured, setIsTraConfigured] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
console.log("isPfxConfigured:", isPfxConfigured);
console.log("isTraConfigured:", isTraConfigured);


  useEffect(() => {
    const handleUploadProgress = (progress: number) => {
      setUploadProgress(progress);
      if (progress === 100) {
        toast.info('Upload completed');
      }
    };

    const handleUploadSuccess = () => {
      setShowModal(false);
      setIsPfxConfigured(true);
      toast.success('Success: Data uploaded successfully');
    };

    const handleUploadError = (errorMessage: string) => {
      toast.error(`Error: ${errorMessage}`);
    };

    window.electron.onPfxUploadProgress(handleUploadProgress);
    window.electron.onPfxUploadSuccess(handleUploadSuccess);
    window.electron.onPfxUploadError(handleUploadError);

    const checkPfxExists = async () => {
      const exists = await window.electron.checkPfxExists();
      setIsPfxConfigured(exists);
    };

    const checkRegisterTra = async () => {
      const exists = await window.electron.checkRegisterTra();
      setIsTraConfigured(exists);
    };

    checkPfxExists();
    checkRegisterTra();

    return () => {
      window.electron.removePfxUploadListeners();
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (file && password) {
      try {
        const formData = { fileData: await file.arrayBuffer(), password };
        await window.electron.uploadPfx(formData);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      }
    } else {
      toast.warn('Please fill out all fields.');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmitTra = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tinRegex = /^[0-9]{9}$/;
    if (!tinRegex.test(traTin)) {
      toast.error('TRA TIN must be exactly 9 digits.');
      return;
    }
    if (traTin && certKey) {
      setIsRegistering(true);
      try {
        await window.electron.registerTra(traTin, certKey);
        setIsTraConfigured(true); // Update state to reflect successful registration
        setShowTinModal(false);
        toast.success('TRA Registration successful!');
      } catch (error) {
        toast.error('Registration failed');
      } finally {
        setIsRegistering(false); // Hide loader after completion
      }
    } else {
      toast.warn('Please fill out all fields.');
    }
  };

  useEffect(() => {
    if (isRegistering) {
      console.log('Registration is in progress...');
    }
  }, [isRegistering]);

  return (
    <Container fluid className="p-0 font"style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="pt-5 content" style={{marginTop:20}}>
          <h3 className="mb-4">Set Up Your Workspace</h3>
          <Row>
            <Col md={4}>
              <Card className="mb-4 shadow-sm card-hover">
                <Card.Body>
                  <Card.Title>Configuration</Card.Title>
                  <Card.Text>Configure TRA Pfx and Signature.</Card.Text>
                  {isPfxConfigured ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '50px',
                      }}
                    >
                      <FaCheckCircle size={30} color="green" />
                    </div>
                  ) : (
                    <Button
                      className="btn btn-danger"
                      onClick={() => setShowModal(true)}
                    >
                      Click here to Configure
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
            <Card className="mb-4 shadow-sm card-hover">
    <Card.Body>
      <Card.Title>Register To TRA</Card.Title>
      <Card.Text>Register to TRA now.</Card.Text>
      {isTraConfigured ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '50px',
          }}
        >
          <FaCheckCircle size={30} color="green" />
        </div>
      ) : (
        <Button
          className="btn btn-danger"
          onClick={() => setShowTinModal(true)}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Loading...
            </>
          ) : (
            'Register now'
          )}
        </Button>
      )}
    </Card.Body>
  </Card>
            </Col>
            <Col md={4}>
              <Card className="mb-4 shadow-sm card-hover">
                <Card.Body>
                  <Card.Title>Receipt</Card.Title>
                  <Card.Text>View your Receipt here.</Card.Text>
                  <Link to="/all-receipt" className="btn btn-danger">
                    View Now
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row>

            <Col md={4}>
              <Card className="mb-4 shadow-sm card-hover">
                <Card.Body>
                  <Card.Title>Settings</Card.Title>
                  <Card.Text>custumize the starting invoice number.</Card.Text>
                  <Link to="/setting" className="btn btn-danger">
                    Open
                  </Link>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="mb-4 shadow-sm card-hover">
                <Card.Body>
                  <Card.Title>Email Configuration</Card.Title>
                  <Card.Text>Make email configuration Password .</Card.Text>
                  <Link to="/configuration" className="btn btn-danger">
                    Click here
                  </Link>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="mb-4 shadow-sm card-hover">
                <Card.Body>
                  <Card.Title>Financial Statement</Card.Title>
                  <Card.Text>Profit  and Loss.</Card.Text>
                  <Link to="/account" className="btn btn-danger">
                    Click here
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
      <ToastContainer />
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
              <Form.Control type="file" onChange={handleFileChange} required />
            </Form.Group>
            {uploadProgress > 0 && (
              <div>Upload Progress: {uploadProgress}%</div>
            )}
            <Button variant="danger" type="submit">
              Upload
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showTinModal} onHide={() => setShowTinModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Register TRA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitTra}>
            <Form.Group controlId="traTin">
              <Form.Label>TRA TIN</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter TRA TIN"
                value={traTin}
                onChange={(e) => {
                  const { value } = e.target;
                  if (/^\d{0,10}$/.test(value)) {
                    setTraTin(value);
                  }
                }}
                required
              />
            </Form.Group>
            <Form.Group controlId="certKey">
              <Form.Label>Certificate Key</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Certificate Key"
                value={certKey}
                onChange={(e) => setCertKey(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="danger" type="submit">
              Register
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default GetStarted;

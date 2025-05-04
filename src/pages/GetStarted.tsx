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
import { RootState } from 'redux/store';
import { ProgressBar, Spinner, Modal, Button } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import "./getStarted.css";
import loginApi from './api/loginApi';

const GetStarted = () => {
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTinModal, setShowTinModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPfxConfigured, setIsPfxConfigured] = useState(false);
  const [isTraConfigured, setIsTraConfigured] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { fullName, serial,role,company} = useSelector((state: RootState) => state.user);
  const {userInfo} = useSelector((state: RootState) => state.user);
  console.log('user ya id',userInfo?.company.id);


const   checkPfxStatus = async () => {
  console.log('company ya id',company);
  const rensponse =await loginApi.get(`/${userInfo?.company.id}/tra/exists`);
  console.log('renponse ya tra',rensponse);
  if(rensponse.status === 200){
    setIsTraConfigured(true);
  }
}

const checkTraStatus = async () => {
  const rensponse = await loginApi.get(`/${userInfo?.company.id}/pfx/exists`);
  console.log('renponse ya pxf',rensponse);
  if(rensponse.status === 200){
    setIsPfxConfigured(true);
  }
}

useEffect(()=>{
  checkPfxStatus();
  checkTraStatus();
},[company]);
  return (
    <Container fluid className="p-0 font"style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="pt-5 content" style={{marginTop:20}}>
         <div>
         <h3 className="mb-4">Set Up Your Workspace</h3>
         <div className="welcome-header d-flex justify-content-end align-items-center mb-4">
  <h3>
    Welcome, <span className="username">{fullName}</span>{' '}
  
    <span className="user-role">({role})</span>
  </h3>
</div>

         </div>
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

                    >
                      Not Configure yet
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


    </Container>
  );
};

export default GetStarted;

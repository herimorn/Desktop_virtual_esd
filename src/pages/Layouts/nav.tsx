/* eslint-disable prettier/prettier */
/* eslint-disable import/prefer-default-export */
/* eslint-disable react/function-component-definition */
import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Modal, Button, Image, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './header.css'; // Import custom CSS file
import { useNavigate, useLocation } from 'react-router-dom';
export const Header: React.FC = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Convert BLOB to Base64
  const convertBlobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = await window.electron.fetchUserData();
        // Convert BLOB data to Base64 if needed
        if (user.profile && user.profile instanceof Blob) {
          user.profile = await convertBlobToBase64(user.profile);
        }
        setUserData(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []); // Empty dependency array means this runs once on mount

  const handleCloseProfile = () => setShowProfile(false);

  const handleShowProfile = async (e) => {
    e.preventDefault();  // Prevent the default behavior of the event
    setLoading(true);

    try {
      const user = await window.electron.fetchUserData();

      // Convert BLOB data to Base64 if needed
      if (user.profile && user.profile instanceof Blob) {
        user.profile = await convertBlobToBase64(user.profile);
      }

      setUserData(user);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setShowProfile(true);
    }
  };
  const handleEdit = (id: string) => {
    navigate(`/edit_profile/${id}`);
  };

  const handleToggleMore = () => setShowMore(!showMore);

  return (
    <>
      <Navbar  variant="dark" expand="lg" className="shadow-sm navbar_fixed" style={{backgroundColor:'#57585a'}}
      >
        <Navbar.Brand className='demo-nav ' href="#" onClick={handleShowProfile}>{userData?.companyName} </Navbar.Brand>
        <Navbar.Toggle  aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">

        </Navbar.Collapse>
      </Navbar>

      <Modal
        show={showProfile}
        onHide={handleCloseProfile}
        centered
        size="md"
        dialogClassName="transparent-modal"
        backdropClassName="transparent-backdrop"
      >
        <Modal.Header closeButton className="profile-modal-header">
          <Modal.Title>User Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body className="profile-modal-body">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100px' }}>
              <Spinner animation="border" />
            </div>
          ) : userData ? (
            <Container>
              <Row className="align-items-center mb-3">
                <Col xs={3}>
                {userData.profile ? (
        <Image
          src={userData.profile} // Display Base64 image
          roundedCircle
          className="profile-picture"
          alt="Profile"
        />
      ) : (
        <div className="profile-picture-placeholder">No Image</div>
      )}
                </Col>
                <Col xs={9}>
                  <h4 className="mb-2">{userData.fullName}</h4>
                  <p className="text-muted mb-1"><strong>Company Name:</strong> {userData.companyName}</p>
                  <p className="text-muted mb-1"><strong>Email:</strong> {userData.email}</p>
                  <p className="text-muted mb-1"><strong>Serial Number:</strong> {userData.serialNumber}</p>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Button variant="secondary" className="w-100" onClick={handleToggleMore}>
                    {showMore ? 'View Less' : 'View More'}
                  </Button>
                </Col>

                <Col>
             <Button variant='danger' className='w-100'  onClick={handleEdit}>Edit Profile</Button>

                </Col>
              </Row>
              {showMore && (
                <Row className="mt-3">
                  <Col>
                    <p className="text-muted mb-1"><strong>Country:</strong> {userData.country}</p>
                    <p className="text-muted mb-1"><strong>Currency:</strong> {userData.currency}</p>
                    <p className="text-muted mb-1"><strong>Bank Name:</strong> {userData.bankName}</p>
                    <p className="text-muted mb-1"><strong>Chart of Accounts:</strong> {userData.chartOfAccounts}</p>
                    <p className="text-muted mb-1"><strong>Fiscal Year Start:</strong> {userData.fiscalYearStart}</p>
                    <p className="text-muted mb-1"><strong>Fiscal Year End:</strong> {userData.fiscalYearEnd}</p>
                  </Col>
                </Row>
              )}
            </Container>
          ) : (
            <p>No user data available.</p>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

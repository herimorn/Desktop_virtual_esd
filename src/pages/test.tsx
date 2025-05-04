/* eslint-disable prettier/prettier */
/* eslint-disable react/function-component-definition */
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Table,
  Modal,
  Pagination,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
} from 'libphonenumber-js';
import Swal from 'sweetalert2';
import './all_customer.css';
import Papa from 'papaparse';
import { Download } from 'react-bootstrap-icons';
import { FaDownload } from 'react-icons/fa'; // FontAwesome Icon
import { useSelector } from 'react-redux';
import customerApi from '../api/customerApi';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  tin: string;
  outstanding: number;
  VRN: string;
}

const AllCustomer: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { fullName, serial,role,company} = useSelector((state: RootState) => state.user);
  const {userInfo} = useSelector((state: RootState) => state.user);
  console.log('user ya id',userInfo?.id);
  const itemsPerPage = 4;
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerApi.get('/');
      setCustomers(response.data);
      setFilteredCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await customerApi.post('/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Customers imported successfully!');
      fetchCustomers(); // Refresh the customer list
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error('Error importing customers. Please check your file format.');
    }
  };

  const handleAdd = () => {
    setModalType('Add');
    setCurrentCustomer({
      id: 0,
      name: '',
      email: '',
      phone: '',
      address: '',
      tin: '',
      outstanding: 0,
      VRN: '',
    });
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setModalType('Edit');
    setCurrentCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await customerApi.delete(`/${id}`);
        toast.success('Customer deleted successfully!');
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Error deleting customer.');
      }
    }
  };

  const handleSave = async () => {
    try {
      if (currentCustomer) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        const phoneNumber = parsePhoneNumberFromString(currentCustomer.phone);

        if (!currentCustomer.name.trim()) {
          toast.error('Name is required.');
          return;
        }

        if (
          !currentCustomer.email.trim() ||
          !emailRegex.test(currentCustomer.email)
        ) {
          toast.error('A valid Gmail address is required.');
          return;
        }

        if (
          !currentCustomer.phone.trim() ||
          !phoneNumber ||
          !isValidPhoneNumber(phoneNumber.number)
        ) {
          toast.error('A valid international phone number is required.');
          return;
        }

        if (!currentCustomer.address.trim()) {
          toast.error('Address is required.');
          return;
        }

        const tinRegex = /^[0-9]{9}$/;
        if (!tinRegex.test(currentCustomer.tin)) {
          toast.error('TRA TIN must be exactly 9 digits.');
          return;
        }

        if (modalType === 'Add') {
          await customerApi.post('/', currentCustomer);
          toast.success('Customer added successfully!');
        } else if (modalType === 'Edit') {
          await customerApi.put(`/${currentCustomer.id}`, currentCustomer);
          toast.success('Customer updated successfully!');
        }

        setShowModal(false);
        fetchCustomers();
      }
    } catch (error) {
      console.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} customer:`, error);
      toast.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} customer.`);
    }
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredCustomers(
      customers.filter(
        (customer: Customer) =>
          customer.name.toLowerCase().includes(term) ||
          customer.email.toLowerCase().includes(term) ||
          (parsePhoneNumberFromString(customer.phone)?.number || '')
            .toLowerCase()
            .includes(term) ||
          customer.address.toLowerCase().includes(term) ||
          customer.tin.toLowerCase().includes(term) ||
          customer.outstanding.toString().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPaginatedCustomers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCustomers.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Define the sample CSV data
  const downloadCSVTemplate = () => {
    const sampleCSVData = [
      ['No', 'TIN', 'VRN', 'Name', 'Address', 'Email', 'Phone'], // Headers
      [
        '1',
        '123456789',
        '987654321',
        'Sample User',
        '123 Main St',
        'adva@gmail.com',
        '123-456-7890',
      ], // Example row
    ];
    const csvContent = sampleCSVData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'CustomerTemplate.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // React Component with Download Button

  return (
    <Container fluid className="p-0 " style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 4 }} className="mb-3">
            All Customers
          </h3>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </Col>
            <div
              className="text-end mb-0"
              style={{
                display: 'flex',

                gap: '20px',
                alignItems: 'center',
                marginLeft: '38%',
              }}
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAdd}
                className="btn-sm rounded-pill  text-white p-1"
                style={{ width: 150, margin: 10 }}
              >
                <i className="bi bi-plus-circle"> {'   '}Add customer</i>
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="btn-sm rounded-pill d-flex align-items-center"
                onClick={handleImport}
                style={{ width: 150, margin: 10 }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Import
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="btn-sm rounded-pill d-flex align-items-center"
                onClick={downloadCSVTemplate}
                style={{ width: 150, margin: 10 }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Download
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
          </Row>
          <Table
            striped
            bordered
            hover
            style={{ fontFamily: 'CustomFont', marginTop: -2 }}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>TIN</th>
                <th>VRN</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                {/* <th>Outstanding Amount</th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedCustomers().length > 0 ? (
                getPaginatedCustomers().map(
                  (customer: Customer, index: number) => (
                    <tr key={customer.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{customer.tin}</td>
                      <td>{customer.VRN}</td>
                      <td>{customer.name}</td>
                      <td>{customer.email}</td>
                      <td>
                        {parsePhoneNumberFromString(customer.phone)?.number ||
                          customer.phone}
                      </td>
                      <td>{customer.address}</td>
                      {/* <td>{format_number(customer.outstanding)}</td> */}
                      <td style={{ display: 'flex', gap: 10 }}>
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => handleEdit(customer)}
                        className='viewButton'
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                         className='deleteButton'
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={7} className="text-center">
                    <i className="bi bi-file-earmark-excel"></i> No entries
                    found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Pagination Controls */}
          <Pagination className="justify-content-center">
            <Pagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </Pagination>

          {/* Modal for Add/Edit Customer */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalType} Customer</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="formCustomerName" className="mb-3">
                      <Form.Label>Customer Name</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        value={currentCustomer?.name || ''}
                        onChange={(e) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            name: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="formCustomerEmail" className="mb-5">
                      <Form.Label>Customer Email</Form.Label>
                      <Form.Control
                        type="email"
                        required
                        value={currentCustomer?.email || ''}
                        onChange={(e) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            email: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="formCustomerPhone" className="mb-5">
                      <Form.Label>Customer Phone</Form.Label>
                      <PhoneInput
                        className="form-control"
                        defaultCountry="TZ"
                        value={currentCustomer?.phone || ''}
                        onChange={(value) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            phone: value,
                          })
                        }
                      />
                      <Form.Control.Feedback type="invalid">
                        A valid international phone number is required.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group
                      controlId="formCustomerAddress"
                      className="mb-5"
                    >
                      <Form.Label>Customer Address</Form.Label>
                      <Form.Control
                        type="text"
                        required
                        value={currentCustomer?.address || ''}
                        onChange={(e) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            address: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="formCustomerTin" className="mb-5">
                      <Form.Label>Customer TIN</Form.Label>
                      <Form.Control
                        type="number"
                        required
                        value={currentCustomer?.tin || ''}
                        onChange={(e) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            tin: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="formCustomerVrn" className="mb-5">
                      <Form.Label>Customer VRN</Form.Label>
                      <Form.Control
                        type="text"
                        value={currentCustomer?.VRN || ''}
                        onChange={(e) =>
                          setCurrentCustomer({
                            ...currentCustomer,
                            VRN: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                style={{ width: 100 }}
              >
                Close
              </Button>
              <Button
                variant="danger"
                onClick={handleSave}
                style={{ width: 100 }}
              >
                Save
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
      <ToastContainer />
    </Container>
  );
};

export default AllCustomer;

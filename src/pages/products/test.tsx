import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Container, Row, Col, Button, Form, Table, Modal, Pagination as BootstrapPagination
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../../pages/Layouts/nav';
import { Sidebar } from '../../pages/Layouts/sidebar';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';
import Swal from 'sweetalert2';
import supplierApi from '../../api/supplierApi'; // Import the supplier API

// Supplier Interface
interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  tin: string;
}

const Supplier: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchAllSuppliers();
  }, []);

  // Fetch all suppliers from the backend
  const fetchAllSuppliers = async () => {
    try {
      const response = await supplierApi.get('/');
      console.log('Suppliers fetched:', response.data); // Debugging line
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error fetching suppliers.');
    }
  };

  // Add Supplier Modal
  const handleAdd = () => {
    setModalType('Add');
    setCurrentSupplier({ id: 0, name: '', email: '', phone: '', address: '', tin: '' });
    setShowModal(true);
  };

  // Edit Supplier Modal
  const handleEdit = (supplier: Supplier) => {
    setModalType('Edit');
    setCurrentSupplier(supplier);
    setShowModal(true);
  };

  // Delete Supplier
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
        await supplierApi.delete(`/${id}`);
        toast.success('Supplier deleted successfully!');
        fetchAllSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Error deleting supplier.');
      }
    }
  };

  // Save or Update Supplier
  const handleSave = async () => {
    try {
      if (currentSupplier) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneNumber = parsePhoneNumberFromString(currentSupplier.phone);

        if (!currentSupplier.name.trim()) {
          toast.error('Name is required.');
          return;
        }

        if (!currentSupplier.email.trim() || !emailRegex.test(currentSupplier.email)) {
          toast.error('A valid Gmail address is required.');
          return;
        }

        if (!currentSupplier.phone.trim() || !phoneNumber || !isValidPhoneNumber(phoneNumber.number)) {
          toast.error('A valid international phone number is required.');
          return;
        }

        if (!currentSupplier.address.trim()) {
          toast.error('Address is required.');
          return;
        }

        const tinRegex = /^[0-9]{9}$/;
        if (!tinRegex.test(currentSupplier.tin)) {
          toast.error('TRA TIN must be exactly 9 digits.');
          return;
        }

        if (modalType === 'Add') {
          await supplierApi.post('/', currentSupplier);
          toast.success('Supplier added successfully!');
        } else {
          await supplierApi.put(`/${currentSupplier.id}`, currentSupplier);
          toast.success('Supplier updated successfully!');
        }

        // Re-fetch all suppliers after the save operation
        fetchAllSuppliers();

        setShowModal(false);
        setCurrentSupplier(null);
      }
    } catch (error) {
      console.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} supplier:`, error);
      toast.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} supplier.`);
    }
  };

  // Search Suppliers
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredSuppliers(
      suppliers.filter((supplier) =>
        supplier.name.toLowerCase().includes(term) ||
        supplier.email.toLowerCase().includes(term) ||
        (parsePhoneNumberFromString(supplier.phone)?.number || '').toLowerCase().includes(term) ||
        supplier.address.toLowerCase().includes(term) ||
        supplier.tin.includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  // Pagination Logic
  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const getPaginatedSuppliers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  return (
    <Container fluid className="p-0 " style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 20 }}>
          <h3 className="mb-3 " style={{ position: 'relative', top: 2 }}>All Suppliers</h3>
          <Row className="mb-3">
            <Col md={3} style={{ position: 'relative', top: 2 }}>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </Col>
            <Col
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '20px',
                alignItems: 'center',
                marginLeft: '75%'
              }}
              md={3}
              className="text-right"
            >
              <Button size="sm" variant="secondary" onClick={handleAdd}
                className='btn-sm rounded-pill' style={{ width: 150 }}
              >
                <i className="bi bi-plus-circle"> Add Supplier </i>
              </Button>
            </Col>
          </Row>
          <Table striped bordered hover responsive className="Supplier" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>TIN</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedSuppliers().map((supplier, index) => (
                <tr key={supplier.id}>
                  <td>{index + 1}</td>
                  <td>{supplier.name}</td>
                  <td>{supplier.tin}</td>
                  <td>{supplier.email}</td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.address}</td>
                  <td style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '4px 8px',
                    justifyContent: 'flex-start',
                    alignItems: 'center'
                  }}>
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => handleEdit(supplier)}
                      className='editButton'
                    >
                      <i className="bi bi-pencil-square"></i>
                    </Button>{' '}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(supplier.id)}
                      className='deleteButton'
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <BootstrapPagination style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <BootstrapPagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {Array.from({ length: totalPages }, (_, i) => (
              <BootstrapPagination.Item
                key={i + 1}
                active={i + 1 === currentPage}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </BootstrapPagination.Item>
            ))}
            <BootstrapPagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </BootstrapPagination>
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalType === 'Add' ? 'Add Supplier' : 'Edit Supplier'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group controlId="formName" className="mb-3">
                      <Form.Label style={{ fontWeight: 'bold', color: '#333' }}>Supplier Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={currentSupplier?.name || ''}
                        onChange={(e) =>
                          setCurrentSupplier((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="formEmail" className="mb-3">
                      <Form.Label style={{ fontWeight: 'bold', color: '#333' }}>Supplier Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={currentSupplier?.email || ''}
                        onChange={(e) =>
                          setCurrentSupplier((prev) => ({ ...prev, email: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group controlId="formPhone" className="mb-3">
                      <Form.Label style={{ fontWeight: 'bold', color: '#333' }}>Supplier Phone</Form.Label>
                      <PhoneInput
                        international
                        defaultCountry="TZ"
                        className='form-control'
                        value={currentSupplier?.phone || ''}
                        onChange={(value) =>
                          setCurrentSupplier((prev) => ({ ...prev, phone: value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="formAddress" className="mb-3">
                      <Form.Label style={{ fontWeight: 'bold', color: '#333' }}>Supplier Address</Form.Label>
                      <Form.Control
                        type="text"
                        value={currentSupplier?.address || ''}
                        onChange={(e) =>
                          setCurrentSupplier((prev) => ({ ...prev, address: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group controlId="formTin" className="mb-3">
                      <Form.Label style={{ fontWeight: 'bold', color: '#333' }}>Supplier TIN</Form.Label>
                      <Form.Control
                        type="number"
                        value={currentSupplier?.tin || ''}
                        onChange={(e) =>
                          setCurrentSupplier((prev) => ({ ...prev, tin: e.target.value }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{ width: 80 }}>
                Close
              </Button>
              <Button variant="danger" onClick={handleSave} style={{ width: 80 }}>
                Save
              </Button>
            </Modal.Footer>
          </Modal>
          <ToastContainer />
        </Col>
      </Row>
    </Container>
  );
};

export default Supplier;

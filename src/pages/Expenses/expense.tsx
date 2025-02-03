// Example layout adapted from your provided code structure

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Container, Row, Col, Button, Form, Table, Modal, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';


interface Expense {
  id: number;
  category: string;
  date: string;
}

const Expense: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response: Expense[] = await window.electron.fetchExpenses();
      setExpenses(response);
      setFilteredExpenses(response);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleAdd = () => {
    setModalType('Add');
    setCurrentExpense({ id: 0, category: '', date: '' });
    setShowModal(true);
  };

  const handleEdit = (expense: Expense) => {
    setModalType('Edit');
    setCurrentExpense(expense);
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
        await window.electron.deleteExpense(id);
        toast.success('Expense deleted successfully!');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Error deleting expense.');
      }
    }
  };

  const handleSave = async () => {
    try {
      if (currentExpense) {
        if (modalType === 'Add') {
          await window.electron.addExpense(currentExpense);
          toast.success('Expense added successfully!');
        } else if (modalType === 'Edit') {
          await window.electron.updateExpense(currentExpense);
          toast.success('Expense updated successfully!');
        }
        setShowModal(false);
        fetchExpenses();
      }
    } catch (error) {
      console.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} expense:`, error);
      toast.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} expense.`);
    }
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredExpenses(
      expenses.filter((expense: Expense) =>
        expense.category.toLowerCase().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPaginatedExpenses = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredExpenses.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  return (
    <Container fluid className="p-0 " style={{fontFamily:'CustomFont'}}>
      <Header/>
    <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{marginTop:18}}>
          <h3 style={{marginTop:4}} className="mb-3" >All  expenses</h3>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </Col>
            <div className="text-end mb-0">
              <Button size="sm" variant="secondary" onClick={handleAdd}
                className="btn-sm rounded-pill text-white p-1"
                style={{ width: 150, margin: 10 }}
              >
                <i className="bi bi-plus-circle"> {'   '}Add Expense</i>
              </Button>
            </div>
          </Row>
          <Table striped bordered hover className='fontCss'>
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>

                <th style={{width:'10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedExpenses().length > 0 ? (
                getPaginatedExpenses().map((expense: Expense, index: number) => (
                  <tr key={expense.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{expense.category}</td>

                    <td style={{
                        display: 'flex',
                        gap: '4px',  // Reduced gap
                        padding: '4px 8px',  // Reduced padding
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                      }}>
                      <Button className='viewButton' size="sm" variant='warning' onClick={() => handleEdit(expense)} >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button className='deleteButton' size="sm" variant="danger" onClick={() => handleDelete(expense.id)} >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, index) => (
                <Pagination.Item
                  key={index + 1}
                  active={index + 1 === currentPage}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </Pagination.Item>
              ))}
            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
          </Pagination>

          {/* Expense Modal for Add/Edit */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalType === 'Add' ? 'Add Expense' : 'Edit Expense'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>

                <Form.Group controlId="formCategory">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter expense category"
                    value={currentExpense?.category || ''}
                    onChange={(e) =>
                      setCurrentExpense((prev) => (prev ? { ...prev, category: e.target.value } : null))
                    }
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{width:80}}>
                Close
              </Button>
              <Button variant="danger" onClick={handleSave} style={{width:80}}>
                Save
              </Button>
            </Modal.Footer>
          </Modal>

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default Expense;


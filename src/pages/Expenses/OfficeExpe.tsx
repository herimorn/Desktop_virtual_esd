import React, { useState, useEffect, ChangeEvent } from 'react';
import { Container, Row, Col, Button, Form, Table, Modal, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import expens from '../../pages/api/expenseApi';
import * as XLSX from 'xlsx';

interface Expense {
  id: number;
  category: string;
  description: string;
  date: string;
  amount: number;
  added_by: string; // Added amount field
}

const OfficeExp: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { userInfo } = useSelector((state: RootState) => state.user);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Fetch all expenses
  const fetchExpenses = async () => {
    try {
      const response = await expens.get(`/office-expenses/${userInfo.company.id}`);
      console.log('API Response:', response.data);

      // Extract the data array from the response
      const data = Array.isArray(response.data.data) ? response.data.data : []; // Ensure data is an array
      setFilteredExpenses(data);
      setExpenses(data); // Also set the main expenses array
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Error fetching expenses.');
    }
  };

  // Add Expense Modal
  const handleAdd = () => {
    setModalType('Add');
    setCurrentExpense({ id: 0, category: '', description: '', date: '', amount: 0 });
    setShowModal(true);
  };

  // Edit Expense Modal
  const handleEdit = (expense: Expense) => {
    setModalType('Edit');
    setCurrentExpense(expense);
    setShowModal(true);
  };

  // Delete Expense
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await expens.delete(`/office-expenses/${id}`);
        toast.success('Expense deleted successfully!');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Error deleting expense.');
      }
    }
  };

  // Save or Update Expense
  const handleSave = async () => {
    try {
      if (currentExpense) {
        const payload = {
          ...currentExpense,
          userId: userInfo.id, // Add user ID
          companyId: userInfo.company.id, // Add company ID
        };

        if (modalType === 'Add') {
          await expens.post('/office-expenses', payload);
          toast.success('Expense added successfully!');
        } else if (modalType === 'Edit') {
          await expens.put(`/office-expenses/${currentExpense.id}`, payload);
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

  // Search Expenses
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredExpenses(
      expenses.filter((expense: Expense) =>
        expense.category.toLowerCase().includes(term) ||
        expense.description.toLowerCase().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  // Pagination Logic
  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const getPaginatedExpenses = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredExpenses.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const downloadExcelTemplate = () => {
    const sampleData = [
      ['Category', 'Description', 'Date', 'Amount'], // Headers
      ['Transport', 'Transport for all', '2025-04-28', '10000'], // Example row
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample');

    XLSX.writeFile(workbook, 'ExpenseTemplate.xlsx');
  };


  const handleDownload = () => {
    const sampleData = [
      ['Category', 'Description', 'Date', 'Amount'], // Headers
      ['Transport', 'Transport for all', '2025-04-28', '10000'], // Example row
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    XLSX.writeFile(workbook, 'ExpenseTemplate.xlsx');
    toast.success('Template downloaded successfully!');
  };
  const handleAddImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result;
      if (data) {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const importedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Process the imported data
        const parsedExpenses = importedData.slice(1).map((row: any) => ({
          category: row[0] || '',
          description: row[1] || '',
          date: row[2] || '',
          amount: parseFloat(row[3]) || 0,
        }));

        try {
          // Send the parsed data to the server with companyId and userId at the top level
          const payload = {
            companyId: userInfo.company.id, // Add company ID
            userId: userInfo.id, // Add user ID
            expenses: parsedExpenses, // Add parsed expenses
          };

          await expens.post('/office-expenses/import', payload);
          toast.success('File imported successfully!');
          fetchExpenses(); // Refresh the expenses list
        } catch (error) {
          console.error('Error importing file:', error);
          toast.error('Error importing file.');
        }
      }
    };
    reader.readAsBinaryString(file);
  };


  return (
    <Container fluid className="p-0 " style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 4 }} className="mb-3">


            All Office Expenses
          </h3>
          <Row className="mb-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>

          </Row>
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
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAdd}
                className="btn-sm rounded-pill text-white"
                style={{
                  width: 150,
                  margin: 10,
                  backgroundColor: '#6c757d', // Gray background
                  border: 'none',
                }}
              >
                <i className="bi bi-plus-circle"></i> Add Expense
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDownload}
                className="btn-sm rounded-pill text-white"
                style={{
                  width: 150,
                  margin: 10,
                  backgroundColor: '#dc3545', // Red background
                  border: 'none',
                }}
              >
                <i className="bi bi-plus-circle"></i> Download
              </Button>
               <label
                htmlFor="import-file"
                className="btn btn-danger btn-sm rounded-pill text-white"
                style={{ width: 150, margin: 10 }}
              >
                <i className="bi bi-upload"></i> Import
              </label>
              <input
                type="file"
                id="import-file"
                accept=".xlsx, .xls"
                onChange={handleAddImport}
                style={{ display: 'none' }}
              />

              {/* <Button
                size="sm"
                variant="danger"
                onClick={handleAddImport}
                className="btn-sm rounded-pill text-white"
                style={{
                  width: 150,
                  margin: 10,
                  backgroundColor: '#dc3545', // Red background
                  border: 'none',
                }}
              >
                <i className="bi bi-plus-circle"></i> Import
              </Button> */}
            </div>
          </Row>
          <Table striped bordered hover className="fontCss">
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Ammount</th>
                <th>Description</th>
                <th>Added By</th>
                <th>Date</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedExpenses().length > 0 ? (
                getPaginatedExpenses().map((expense: Expense, index: number) => (
                  <tr key={expense.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{expense.category}</td>
                    <td>{expense.amount}</td>
                    <td>{expense.description}</td>
                    <td>{expense.added_by}</td>
                    <td>{expense.date}</td>

                    <td
                      style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '4px 8px',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                      }}
                    >
                      <Button
                        className="viewButton"
                        size="sm"
                        variant="warning"
                        onClick={() => handleEdit(expense)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        className="deleteButton"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(expense.id)}
                      >
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

          {/* Expense Modal for Add/Edit */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalType === 'Add' ? 'Add Expense' : 'Edit Expense'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="formCategory" className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter expense category"
                    value={currentExpense?.category || ''}
                    onChange={(e) =>
                      setCurrentExpense((prev) =>
                        prev ? { ...prev, category: e.target.value } : null
                      )
                    }
                  />
                </Form.Group>
                <Form.Group controlId="formDescription" className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter expense description"
                    value={currentExpense?.description || ''}
                    onChange={(e) =>
                      setCurrentExpense((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                    }
                  />
                </Form.Group>
                <Form.Group controlId="formAmount" className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter expense amount"
                    value={currentExpense?.amount || ''}
                    onChange={(e) =>
                      setCurrentExpense((prev) =>
                        prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null
                      )
                    }
                  />
                </Form.Group>
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

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default OfficeExp;


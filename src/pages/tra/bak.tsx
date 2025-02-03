import React, { useState, useEffect, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Form, Table, Button, Pagination } from 'react-bootstrap';

import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        const data = await fetchReceipts();
        setReceipts(data);
        setFilteredReceipts(data);
      } catch (error) {
        console.error('Error fetching receipts:', error);
      }
    };
    loadReceipts();
  }, []);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredReceipts(
      receipts.filter((receipt: Receipt) =>
        receipt.category.toLowerCase().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPaginatedReceipts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReceipts.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  return (
    <Container fluid className="p-0">
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content">
          <Header />
          <h3 style={{ marginTop: 20 }} className="mb-3">Receipt Management</h3>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </Col>
            <Col className="text-end">
              <Link to="/add-receipt">
                <Button size="sm" variant="secondary" className="btn-sm rounded-pill text-white p-1" style={{ width: 150, margin: 10 }}>
                  <i className="bi bi-plus-circle"> {'   '}Add Receipt</i>
                </Button>
              </Link>
            </Col>
          </Row>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>No</th>
                <th>Category</th>
                <th>Date</th>
                <th style={{ width: '28%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedReceipts().length > 0 ? (
                getPaginatedReceipts().map((receipt: Receipt, index: number) => (
                  <tr key={receipt.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{receipt.category}</td>
                    <td>{receipt.date}</td>
                    <td>
                      <Link to={`/receipt/${receipt.id}`}>
                        <Button size="sm" variant="warning" style={{ width: 80 }}>
                          <i className="bi bi-eye"></i> View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center">
                    No receipts found
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
        </Col>
      </Row>
    </Container>
  );
};

export default ReceiptsPage;

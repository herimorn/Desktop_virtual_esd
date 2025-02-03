import React, { useState, ChangeEvent, useEffect, ReactNode } from 'react';
import { Container, Row, Col, Table, Badge, InputGroup, FormControl, Pagination, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { useLocation, useNavigate } from 'react-router-dom';

interface PurchaseItem {
  product_name: ReactNode;
  id?: number;
  purchase_id?: number;
  product_id: number;
  quantity: number;
  price: number;
}

interface Purchase {
  id?: number;
  supplier_id: number;
  supplier_name?: string;
  date: string;
  total_amount: number;
  items: PurchaseItem[];
}

const PurchaseDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation<{ filteredPurchases: Purchase[] }>();
  const { filteredPurchases } = location.state || { filteredPurchases: [] };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(5);
  const [displayedPurchases, setDisplayedPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    const filtered = filteredPurchases.filter((purchase: Purchase) =>
      purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.date.includes(searchQuery)
    );
    setDisplayedPurchases(filtered);
    setCurrentPage(1);
  }, [searchQuery, filteredPurchases]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const totalPages = Math.ceil(displayedPurchases.length / itemsPerPage);

  const paginatedPurchases = displayedPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPurchaseItems = filteredPurchases.reduce((sum: number, purchase: Purchase) => sum + purchase.items.length, 0);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
    }).format(num);
  };

  return (
    <Container fluid style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-4 content font">
          <Button
            variant="secondary"
            className="mb-3"
            onClick={() => navigate(-1)}
            style={{ float: 'right' }}
          >
            <i className="bi bi-arrow-return-left"></i> Back
          </Button>
          <h2 className="mb-4">Purchase Details</h2>
          <Row className="my-3">
            <Col>
              <Badge pill variant="dark" className="p-2">
                Total Purchases: {filteredPurchases.length}
              </Badge>
            </Col>
            <Col>
              <Badge pill variant="dark" className="p-2">
                Total Purchase Items: {totalPurchaseItems}
              </Badge>
            </Col>
          </Row>
          <InputGroup className="mb-4" style={{ maxWidth: '400px' }}>
            <FormControl
              placeholder="Search by supplier name or date"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </InputGroup>
          {paginatedPurchases.map((purchase) => (
            <div key={purchase.id} className="mb-5 p-3 border rounded bg-light">
              <h5 className="mb-3">Supplier: {purchase.supplier_name}</h5>
              <p>Date: {purchase.date}</p>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatNumber(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <h6 className="mt-3">Total Amount: {formatNumber(purchase.total_amount)}</h6>
              <div className="d-flex justify-content-between mt-3">
                <Badge pill variant="info">Purchase ID: {purchase.id}</Badge>
                <Badge pill variant="info">Total Items: {purchase.items.length}</Badge>
              </div>
            </div>
          ))}
          <Pagination className="justify-content-center mt-4">
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
          </Pagination>
        </Col>
      </Row>
    </Container>
  );
};

export default PurchaseDetails;

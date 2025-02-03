import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Table, Pagination, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { useNavigate } from 'react-router-dom';

interface Stock {
  id: number;
  product_id: number;
  product_name: string;
  stock: number;
  sold_item: number;
  stock_amount: number;
  buying_price: number;
  sold_amount: number;
}

const Stock: React.FC = () => {
  const [stockData, setStockData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;
  const navigate = useNavigate();

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      const data: Stock[] = await window.electron.fetchAllStock();
      setStockData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPaginatedStock = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return stockData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(stockData.length / itemsPerPage);

  return (
    <Container fluid className="p-0 customFont"style={{fontFamily:'CustomFont'}} >
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content">
          <h3 style={{marginTop:20}} className="mb-3">Stock Management</h3>
          <Row className="mb-3">
            <Col md={3} style={{marginLeft:'auto',position:'relative',top:55}}>
              <Button variant='danger' onClick={() => navigate('/all-stock')}
                className="btn-sm rounded-pill  text-white p-1 bi bi-eye"
                style={{width: 150, margin: 10 }}  >{'       '}
                  View Summary</Button>
            </Col>
          </Row>
          {loading ? (
            <Spinner animation="border" />
          ) : (
            <Table striped bordered hover style={{marginTop:70}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Stock</th>
                  <th>Sold Items</th>
                  {/* <th>Stock Amount</th> */}
                  <th>Buying Price</th>
                  {/* <th>Sold Amount</th> */}
                </tr>
              </thead>
              <tbody>
                {getPaginatedStock().length > 0 ? (
                  getPaginatedStock().map((stock: Stock, index: number) => (
                    <tr key={stock.id}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{stock.product_name}</td>
                      <td>{stock.stock}</td>
                      <td>{stock.sold_item}</td>
                    
                      <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' }).format(stock.buying_price)}</td>


                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">
                      No entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
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

export default Stock;

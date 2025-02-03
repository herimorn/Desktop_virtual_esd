import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Spinner, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { useParams,useNavigate } from 'react-router-dom';
import { bold } from 'chalk';
import { ArrowLeft, Download } from 'react-bootstrap-icons';

interface StockSummary {
  product_id: number;
  product_name: string;
  total_stock: number;
}

const Allstock: React.FC = () => {
  const navigate = useNavigate();
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStockSummary();
  }, []);

  const fetchStockSummary = async () => {
    try {
      const data: StockSummary[] = await window.electron.fetchSumStockGroupedByProduct();
      setStockSummary(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock summary:', error);
    }
  };
  const handleBack = (e:any) => {
    e.preventDefault();
    navigate('/stock');
  };
  return (
    <Container fluid className="p-0 font"style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{marginTop:20}}>

        <Button
        onClick={handleBack}
        className="mb-3"
        style={{ width: '5%', marginLeft: '95%', backgroundColor: '#6c757d' }}
        className="font  no-print"
      >
        <ArrowLeft /> {/* Added the back icon here */}
      </Button>
          <h3 className="mb-3">Stock Summary</h3>
          {loading ? (
            <Spinner animation="border" />
          ) : (
            <Table striped bordered hover className='fontCss'  style={{marginTop:112}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Name</th>
                  <th>Total Stock</th>
                </tr>
              </thead>
              <tbody>
                {stockSummary.length > 0 ? (
                  stockSummary.map((summary: StockSummary, index: number) => (
                    <tr key={summary.product_id}>
                      <td>{index + 1}</td>
                      <td>{summary.product_name}</td>
                      <td>{summary.total_stock}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center">
                      No entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Allstock;

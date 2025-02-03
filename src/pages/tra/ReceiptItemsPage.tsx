import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Table, Button, Row, Col } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import { Header } from '../Layouts/nav'; // Import your Header component
import { Sidebar } from '../Layouts/sidebar'; // Import your Sidebar component

const ReceiptItemPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      const result = await window.electron.fetchReceiptItems(Number(receiptId));
      setItems(result);
    };

    fetchItems();
  }, [receiptId]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Container fluid className="font" style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5">
        <Button onClick={handleBack} className="mb-3" style={{width:'5%',marginLeft:'95%', marginTop:50, position:'relative',backgroundColor:'#6c757d'}}>
            <ArrowLeft />
          </Button>
          <h2>Items for Receipt</h2>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  );
};

export default ReceiptItemPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Table, Button, Form, Row, Col } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons'; // Import the back icon
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { Eye } from 'react-bootstrap-icons';

interface Receipt {
  id: number;
  sale_id: number;
  gc: string;
  dc: string;
  totalTax: number;
  totalTaxExcl: number;
  totalTaxIncl: number;
  importance: string;
}

const ReceiptPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [importanceFilter, setImportanceFilter] = useState<string>('All');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReceipts = async () => {
      const result: Receipt[] = await window.electron.fetchReceiptsByReport(Number(reportId));
      setReceipts(result);
      setFilteredReceipts(result);
    };

    fetchReceipts();
  }, [reportId]);

  useEffect(() => {
    if (importanceFilter === 'All') {
      setFilteredReceipts(receipts);
    } else {
      setFilteredReceipts(receipts.filter(receipt => receipt.importance === importanceFilter));
    }
  }, [importanceFilter, receipts]);

  const handleViewReceiptItems = (receiptId: number) => {
    navigate(`/receipt-items/${receiptId}`);
  };

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <Container fluid className="p-0 font" style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5">
          <Button onClick={handleBack} className="mb-3" style={{width:'5%',marginLeft:'95%',position:'relative', marginTop:50,backgroundColor:'#6c757d'}}>
            <ArrowLeft />  {/* Added the back icon here */}
          </Button>
          <h2>Receipts for Report </h2>
          <Form.Control
            as="select"
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value)}
            className="mb-3"
          >
            <option value="All">All Importance Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </Form.Control>
          {filteredReceipts.length > 0 ? (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Receipt ID</th>
                  <th>Sale ID</th>
                  <th>GC</th>
                  <th>DC</th>
                  <th>Total Tax</th>
                  <th>Total Tax Excl</th>
                  <th>Total Tax Incl</th>
                  <th style={{width:'10%'}}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontWeight: 300 }}>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} style={{ fontStyle: 'normal' }}>
                    <td>{receipt.id}</td>
                    <td>{receipt.sale_id}</td>
                    <td>{receipt.gc}</td>
                    <td>{receipt.dc}</td>
                    <td>{receipt.totalTax}</td>
                    <td>{receipt.totalTaxExcl}</td>
                    <td>{receipt.totalTaxIncl}</td>
                    <td>
                      <Button className='viewButton' onClick={() => handleViewReceiptItems(receipt.id)} variant='secondary'>
                      <Eye />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>No receipts found for this report.</p>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default ReceiptPage;

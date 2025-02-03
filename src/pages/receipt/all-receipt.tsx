import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Table, Button, Form, Row, Col } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons'; // Import the back icon
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { Eye } from 'react-bootstrap-icons';
import { ToastContainer, toast } from 'react-toastify';
import Queue from '../../../.erb/dll/vendors-node_modules_canvg_lib_index_es_js.dev.dll';

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
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchDate, setSearchDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [countPending, setCountPending] = useState<number>(0);
  const [countSuccess, setCountSuccess] = useState<number>(0);
  const [countProcess, setCountProcess] = useState<number>(0);
  const itemsPerPage = 4;
  // const [receiptId,setReceiptId] = useState<number>(0);
  // console.log("the receipt id id",receiptId);
  const navigate = useNavigate();
  useEffect(() => {
    const fetchReceipts = async () => {
      const result: Receipt[] = await window.electron.fetchAllReceptQue();
      setReceipts(result);
      // setReceiptId(result.receipt_id);
      setFilteredReceipts(result);
    };
    fetchCountPending();
    fetchCountSuccess();
    fetchCountProcess();
    fetchReceipts();
  }, [reportId]);

  useEffect(() => {
    if (importanceFilter === 'All') {
      setFilteredReceipts(receipts);
    } else {
      setFilteredReceipts(receipts.filter(receipt => receipt.importance === importanceFilter));
    }
  }, [importanceFilter, receipts]);

  const handleViewReceiptItems = (receiptId: number,e:any) => {
    e.preventDefault();
    // console.log("the receipt is is",receiptId)
    navigate(`/Allreceipt/${receiptId}`);
  };
    // Fetch count of pending receipts
    const fetchCountPending = async () => {
      try {
        const result = await window.electron.fetchCountPending();
        console.log('count my code',result);
        setCountPending(result?.pending_count || 0); // Adjust according to the actual structure of the result
      } catch (error) {
        console.error('Error fetching pending count:', error);
        toast.error('Error fetching pending count.');
      }
    };

    // Fetch count of successful receipts
    const fetchCountSuccess = async () => {
      try {
        const result = await window.electron.fetchCountSuccess();
        console.log("the success receipt is ",result)
        setCountSuccess(result|| 0); // Adjust according to the actual structure of the result
      } catch (error) {
        console.error('Error fetching success count:', error);
        toast.error('Error fetching success count.');
      }
    };

    // Fetch count of process receipts
    const fetchCountProcess = async () => {
      try {
        const result = await window.electron.fetchCountProcess();
        console.log("the process recipt is",result)
        setCountProcess(result|| 0); // Adjust according to the actual structure of the result
      } catch (error) {
        console.error('Error fetching process count:', error);
        toast.error('Error fetching process count.');
      }
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
          <Button onClick={handleBack} className="mb-3" style={{width:'5%',marginLeft:'95%', position:'relative', top:50, backgroundColor:'#6c757d'}}>
            <ArrowLeft />  {/* Added the back icon here */}
          </Button>
          <h2 className="my-3">Receipt</h2>

<div style={{display:'flex', gap:20, marginBottom:20}}>
  <button className='btn btn-secondary'>Pending Receipts ({countPending})</button>
  <button className='btn btn-secondary'>Receipts in Queue ({countProcess})</button>
  <button className='btn btn-secondary'>Verified Receipts ({countSuccess})</button>
</div>
{/* <Form.Control
  as="select"
  value={importanceFilter}
  onChange={(e) => setImportanceFilter(e.target.value)}
  className="mb-3"
  style={{ display: 'none' }} // Add this line to hide the element
>
  <option value="All">All Importance Levels</option>
  <option value="High">High</option>
  <option value="Medium">Medium</option>
  <option value="Low">Low</option>
</Form.Control> */}

          {filteredReceipts.length > 0 ? (
            <Table striped bordered hover style={{marginTop:10}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sale ID</th>
                  <th>GC</th>
                  <th>DC</th>
                  <th>Status</th>
                  <th style={{width:'10%'}}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontWeight: 300 }}>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} style={{ fontStyle: 'normal' }}>
                    <td>{receipt.receipt_id}</td>
                    <td>{receipt.sale_id}</td>
                    <td>{receipt.gc}</td>
                    <td>{receipt.dc}</td>
                    <td>{receipt.status}</td>
                    <td style={{
                        display: 'flex',
                        gap: '4px',  // Reduced gap
                        padding: '4px 8px',  // Reduced padding
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                      }}>
                    <Button className='btn btn-secondary viewButton' onClick={(e) => handleViewReceiptItems(receipt.receipt_id, e)}>
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

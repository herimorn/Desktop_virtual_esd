import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Form,
  Pagination,
  InputGroup,
  FormControl,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
// import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import '../../pages/purchase/purchese.css';
import { saveAs } from 'file-saver';
import { ArrowLeft } from 'react-bootstrap-icons';
import { useParams, useNavigate } from 'react-router-dom';


export interface ReceiptItems {
  sale_id: number;
  quantity: number;
  receipt_code: string;
  product_name: string;
  amount: number;
}

export interface Receipt {
  id: number;
  supplier_name: string;
  dc: number;
  date: string;
  items: ReceiptItems[];
  total_amount: number; // Added total_amount for displaying in table
}
const ReceiptItems: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const { receiptId } = useParams<{ reportId: string }>();
  console.log("the receipt id is",receiptId);
  console.log("the receipts is",receipts)

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllReceptQue();
    //fecthing the receipt_items please !!!
  }, []);

  useEffect(() => {
    filterReceipts();
  }, [searchQuery, dateFilter, monthFilter, yearFilter, receipts]);

  const fetchAllReceptQue = async () => {
    try {
      const receiptData = await window.electron.fetchReceiptItems(receiptId);
      setReceipts(receiptData);

      console.log('receipt data is',receiptData);
      setFilteredReceipts(receiptData);
    } catch (error) {
      toast.error('Failed to fetch receipts.');
    }
  };

  const filterReceipts = () => {
    let filtered = receipts;

    if (searchQuery) {
      filtered = filtered.filter((receipt) =>
        receipt.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter((receipt) => receipt.date === dateFilter);
    }

    if (monthFilter) {
      filtered = filtered.filter(
        (receipt) => new Date(receipt.date).getMonth() + 1 === Number(monthFilter)
      );
    }

    if (yearFilter) {
      filtered = filtered.filter(
        (receipt) => new Date(receipt.date).getFullYear() === Number(yearFilter)
      );
    }

    setFilteredReceipts(filtered);
  };


  const convertToCSV = (receipts: Receipt[]): string => {
    const header = 'Product Name, Amount, Quantity, Date, Payment Type\n';
    const rows = receipts
      .map((receipt) =>
        receipt.items
          .map(
            (item) =>
              `${item.product_name || ''},${item.amount},${item.quantity},${receipt.date},${receipt.paymentType || ''}`
          )
          .join('\n')
      )
      .join('\n');

    return `${header}${rows}`;
  };

  const exportToCSV = (receipts: Receipt[]) => {
    const csvContent = convertToCSV(receipts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'receipts.csv');
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDateFilterChange = (date: string) => {
    setDateFilter(date);
  };

  const handleMonthChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMonthFilter(event.target.value);
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    setYearFilter(event.target.value);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewDetails = () => {
    navigate('/details', { state: { filteredReceipts } });
  };

  const handleEditReceipt = (receipt: Receipt) => {
    setCurrentReceipt(receipt);
    setShowModal(true);
    setIsViewing(false);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setCurrentReceipt(receipt);
    setShowModal(true);
    setIsViewing(true);
  };

  const handleDeleteReceipt = (id: number) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        setReceipts((prevReceipts) =>
          prevReceipts.filter((receipt) => receipt.id !== id)
        );
        toast.success('Receipt deleted successfully!');
      }
    });
  };

  const renderTableRows = () => {
    // Calculate the starting number for the current page
    const startNumber = (currentPage - 1) * itemsPerPage + 1;

    return filteredReceipts
      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      .map((receipt, index) => (
        <tr key={receipt.id}> {/* Use a unique identifier for the key */}
          <td>{startNumber + index}</td> {/* Auto-incrementing number */}

          <td>{receipt.product_name}</td>
          <td>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'TZS',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(receipt.amount)}
          </td>

        </tr>
      ));
  };

  const renderPagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= Math.ceil(filteredReceipts.length / itemsPerPage); i++) {
      pageNumbers.push(i);
    }
    return (
      <Pagination style={{ marginLeft: '45%' }}>
        {pageNumbers.map((number) => (
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        ))}
      </Pagination>
    );
  };
  const handleBack = (e:any) => {
    e.preventDefault();
    navigate('/all-receipt');
  };
  return (
    <Container fluid className="font" style={{ fontFamily: 'CustomFont' }}>

      <Row>
        <Col xs={2} className="sidebar">
          <Sidebar />
        </Col>
        <Header title="Receipt Management" />
        <Col xs={10} className="content">
          <ToastContainer />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginTop: '10%' }}>
            {/* <Button
              className="btn btn-secondary btn-sm rounded-pill"
              onClick={() => exportToCSV(filteredReceipts)}
              style={{ width: 200 }}
            >
              <i className="bi bi-file-earmark-spreadsheet"></i> Export CSV
            </Button> */}
            <Button onClick={handleBack} className="mb-3" style={{width:'5%',marginLeft:'95%',backgroundColor:'#6c757d'}}>
            <ArrowLeft />  {/* Added the back icon here */}
          </Button>
          </div>
          <div style={{ marginTop: 20 }}>
            <InputGroup className="mb-3">
              <FormControl
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <FormControl
                type="date"
                onChange={(e) => handleDateFilterChange(e.target.value)}
              />
              <FormControl
                type="number"
                placeholder="Month"
                onChange={handleMonthChange}
              />
              <FormControl
                type="number"
                placeholder="Year"
                onChange={handleYearChange}
              />
            </InputGroup>
          </div>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Total Amount</th>



              </tr>
            </thead>
            <tbody>{renderTableRows()}</tbody>
          </Table>
          {renderPagination()}
          <Modal show={showModal} onHide={handleModalClose}>
            <Modal.Header closeButton>
              <Modal.Title>{isViewing ? 'View Receipt' : 'Edit Receipt'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {currentReceipt && (
                <Form>
                  <Form.Group controlId="formSupplierName">
                    <Form.Label>Supplier Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentReceipt.supplier_name}
                      readOnly={isViewing}
                    />
                  </Form.Group>
                  <Form.Group controlId="formTotalAmount">
                    <Form.Label>Total Amount</Form.Label>
                    <Form.Control
                      type="text"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'TZS',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(currentReceipt.total_amount)}
                      readOnly={isViewing}
                    />
                  </Form.Group>
                  <Form.Group controlId="formDate">
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentReceipt.date}
                      readOnly={isViewing}
                    />
                  </Form.Group>
                  {!isViewing && (
                    <Button variant="primary" type="submit">
                      Save Changes
                    </Button>
                  )}
                </Form>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleModalClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default ReceiptItems;

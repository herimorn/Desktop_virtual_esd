import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Table, Button, Form } from 'react-bootstrap';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { toast, ToastContainer } from 'react-toastify';
import Papa from 'papaparse';

interface Sale {
  status: string;
  invoice_number: string;
  sale_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
}

interface PaginationProps {
  salesPerPage: number;
  totalSales: number;
  paginate: (pageNumber: number) => void;
  currentPage: number;
}

const Services: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [salesPerPage] = useState<number>(10);
  const [modalShow, setModalShow] = useState(false)
  const navigate = useNavigate();
  const [invoiceStartNumber, setInvoiceStartNumber] = useState<number>(1001);
  const [invoiceString, setInvoiceString] = useState<string>('advac');

  const handleProvideServiceClick = () => {
    setModalShow(true);
  };


  const handleServiceSubmit = async (serviceData) => {
    try {
      await window.electron.ipcRenderer.invoke('insertService', serviceData);
      setModalShow(false);
    } catch (error) {
      console.error('Failed to save service data:', error);
    }
  };

  useEffect(() => {
    // Check if we get the TRA response from TRA
    const traResponse = sessionStorage.getItem('traResponse');
    if (traResponse) {
      const { success, data, message } = JSON.parse(traResponse);
      if (success) {
        if (data) {
          alert('Data sent successfully to TRA! Data received: ' + JSON.stringify(data));
        } else {
          alert('Data sent successfully to TRA, but no additional data was received.');
        }
      } else {
        alert('Failed to send data to TRA: ' + message);
      }
      sessionStorage.removeItem('traResponse'); // Clear the response data after use
    }

    fetchInvoiceDetails();
    fetchSalesDetails();
  }, []);

  const fetchInvoiceDetails = async () => {
    try {
      const response = await window.electron.fetchInvoice();
      if (response) {
        setInvoiceString(response.invoice_string || 'advac');
        const lastInvoiceNumber = parseInt(response.invoice_number.split('-')[1], 10);
        setInvoiceStartNumber(isNaN(lastInvoiceNumber) ? 1000 : lastInvoiceNumber + 1);
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  const fetchSalesDetails = async () => {
    try {
      const response = await window.electron.fetchServiceDetails();
      setSales(response);
    } catch (error) {
      console.error('Error fetching sales details:', error);
    }
  };

  const generateInvoiceNumber = (index: number) => {
    return `${invoiceString}-${invoiceStartNumber + index}`;
  };

  const handleViewDetails = (saleId: number) => {
    navigate(`/service-details/${saleId}`);
  };

  const handleEditSale = (saleId: number) => {
    navigate(`/edit-sale/${saleId}`);
  };

  const handleCreateInvoice = (saleId: number) => {
    const saleIndex = sales.findIndex(sale => sale.sale_id === saleId);
    const newInvoiceNumber = generateInvoiceNumber(saleIndex);
    navigate(`/Serviceinvoice/${saleId}?invoiceNumber=${newInvoiceNumber}`);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredSales = sales.filter((sale) =>
    sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const csvHeaders = ['Sale ID', 'Invoice Number', 'Date', 'Customer', 'Status', 'Total Amount'];

    const csvRows = [
      csvHeaders.join(','), // Add headers row
      ...sales.map((sale) => [
        sale.sale_id,
        sale.invoice_number,
        new Date(sale.date).toLocaleDateString(),
        sale.customer_name,
        sale.status,
        sale.total_amount
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sales_data.csv');
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link); // Clean up
  };


  return (
    <Container fluid className="p-0 font"style={{fontFamily:'CustomFont'}}>
      <ToastContainer />
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 20 }}>
          <h3 className="mb-3">All services</h3>
          <Form.Control
            style={{ width: '30%' }}
            type="text"
            placeholder="Search by customer name"
            value={searchTerm}
            onChange={handleSearch}
            className="mb-3"
          />
<div
  style={{
    display: 'flex',
    gap: '25px',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginRight: '5%',
    marginTop: '20px',
  }}
>
  {/* <Button
    size="sm"
    variant="danger"
    style={{ width: 150, padding: '8px 12px' }}
    onClick={() => navigate('/sales')}
    className="btn-sm rounded-pill"
  >
    <i className="bi bi-plus-circle" style={{ marginRight: '8px' }}></i>
    Sale (Product)
  </Button> */}

  <Button
    size="sm"
    variant="danger"
    style={{ width: 150, padding: '8px 12px' }}
    onClick={() => navigate('/sales')}
    className="btn-sm rounded-pill"
  >
    <i className="bi bi-plus-circle" style={{ marginRight: '8px' }}></i>
    Provide Service
  </Button>

  <Button
    size="sm"
    variant="secondary"
    style={{ width: 150, padding: '8px 12px' }}
    onClick={exportToCSV}
    className="btn-sm rounded-pill"
  >
    <i className="bi bi-download" style={{ marginRight: '8px' }}></i>
    Export CSV
  </Button>
</div>

          <Table striped bordered hover  style={{marginTop:15}}>
            <thead>
              <tr>
                <th>Sale  ID</th>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th style={{ width: '23%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSales.map((sale, index) => (
                <tr key={sale.sale_id}>
                  <td>{sale.sale_id}</td>
                  <td>{sale.invoice_number}</td>
                  <td>{new Date(sale.date).toLocaleDateString()}</td>
                  <td>{sale.customer_name}</td>
                  <td>{sale.status}</td>
                  <td>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(sale.total_amount)}
                  </td>
                  <td style={{ display: 'flex', gap: 10 }}>
                    <Button
                      className="bi bi-eye btn btn-secondary"
                      style={{ width: 80 }}
                      onClick={() => handleViewDetails(sale.sale_id)}
                    ></Button>
                    <Button
                      style={{ width: 80 }}
                      onClick={() => handleCreateInvoice(sale.sale_id)}
                      className="bi bi-printer btn btn-danger"
                    ></Button>
                    {/* <Button
                      style={{ width: 80 }}
                      onClick={() => handleEditSale(sale.sale_id)}
                      className="bi bi-pencil btn btn-warning"
                    ></Button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            salesPerPage={salesPerPage}
            totalSales={filteredSales.length}
            paginate={paginate}
            currentPage={currentPage}
          />
        </Col>
      </Row>
    </Container>
  );
};

const Pagination: React.FC<PaginationProps> = ({
  salesPerPage,
  totalSales,
  paginate,
  currentPage
}) => {
  const pageNumbers: number[] = [];

  for (let i = 1; i <= Math.ceil(totalSales / salesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className="pagination">
        {pageNumbers.map((number) => (
          <li
            key={number}
            className={`page-item ${number === currentPage ? 'active' : ''}`}
          >
            <a
              onClick={() => paginate(number)}
              href="#"
              className="page-link"
            >
              {number}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Services;

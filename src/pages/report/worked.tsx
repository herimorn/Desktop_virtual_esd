import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Table, Button, Form } from 'react-bootstrap';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { toast, ToastContainer } from 'react-toastify';
import * as XLSX from 'xlsx';

interface Sale {
  status: React.ReactNode;
  invoice_number: React.ReactNode;
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

const Report: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [salesPerPage] = useState<number>(10);
  const navigate = useNavigate();
  const [invoiceStartNumber, setInvoiceStartNumber] = useState<number>(1001);
  const [invoiceString, setInvoiceString] = useState<string>('advac');
  const [filterType, setFilterType] = useState<string>('all');
  const [year, setYear] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  useEffect(() => {
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
      const response = await window.electron.fetchSalesDetails();
      setSales(response);
    } catch (error) {
      console.error('Error fetching sales details:', error);
    }
  };

  const generateInvoiceNumber = (index: number) => {
    return `${invoiceString}-${invoiceStartNumber + index}`;
  };

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      const saleYear = saleDate.getFullYear().toString();

      if (filterType === 'year') {
        return saleYear === year;
      }

      if (filterType === 'date') {
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date();
        return saleDate >= start && saleDate <= end;
      }

      if (filterType === 'month') {
        if (!month || !year || isNaN(Number(year)) || Number(year) < 1900) {
          setError('Please select a valid month and year.');
          return false;
        }
        const saleMonth = (saleDate.getMonth() + 1).toString().padStart(2, '0');
        return saleMonth === month && saleYear === year;
      }

      // Default to no filter
      return true;
    })
    .filter((sale) =>
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredSales);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
    XLSX.writeFile(workbook, 'Report.csv');
  };

  return (
    <Container fluid className="p-0 customFont">
      <ToastContainer />
      <Header />
      <Row noGutters={true}>
        {/* Corrected the prop usage */}
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 20 }}>
          <h3 className="mb-3">Sales Report</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={exportToCSV}
            className="btn-sm rounded-pill"
            style={{ width: 150, marginLeft: '85%' }}
          >
            <i className="bi bi-upload"> Export to CSV </i>
          </Button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Form.Group controlId="filterType" className="mb-3" style={{ width: '30%' }}>
              <Form.Label>Filter By</Form.Label>
              <Form.Control
                style={{ padding: '5px' }}
                as="select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All</option>
                <option value="year">Year</option>
                <option value="date">Select Date Range</option>
                <option value="month">Month</option> {/* Added missing option for month */}
              </Form.Control>
            </Form.Group>

            {filterType === 'year' && (
              <Form.Control
                className="mb-3"
                style={{ width: '30%', height: '20%', marginTop: '3%' }}
                type="text"
                placeholder="Enter year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            )}

            {filterType === 'date' && (
              <>
                <Form.Control
                  type="date"
                  placeholder="Start date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mb-3"
                  style={{ width: '30%', height: '20%', marginTop: '3%' }}
                />
                <Form.Control
                  type="date"
                  placeholder="End date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mb-3"
                  style={{ width: '30%', height: '20%', marginTop: '3%' }}
                />
              </>
            )}

            {filterType === 'month' && (
              <>
                <Form.Control
                  className="mb-3"
                  style={{ width: '30%', height: '20%', marginTop: '3%' }}
                  type="text"
                  placeholder="Enter year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
                <Form.Control
                  className="mb-3"
                  style={{ width: '30%', height: '20%', marginTop: '3%' }}
                  as="select"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  <option value="">Select Month</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </Form.Control>
              </>
            )}
          </div>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {currentSales.map((sale, index) => (
                <tr key={sale.sale_id}>
                  <td>{sale.sale_id}</td>
                  <td>{generateInvoiceNumber(index)}</td>
                  <td>{new Date(sale.date).toLocaleDateString()}</td>
                  <td>{sale.customer_name}</td>
                  <td>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(sale.total_amount)}
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
  currentPage,
}) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalSales / salesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav style={{ marginTop: 10 }}>
      <ul className="pagination justify-content-center">
        {pageNumbers.map((number) => (
          <li
            key={number}
            className={`page-item ${currentPage === number ? 'active' : ''}`}
          >
            <button onClick={() => paginate(number)} className="page-link">
              {number}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Report;

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Table, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { toast,ToastContainer  } from 'react-toastify';

interface ProfomaItem {
  product_id: number;
  quantity: number;
  price: number;
  tax: number;
}

interface Profoma {
  profoma_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  items: ProfomaItem[];
  status: 'pending' | 'converted' | 'cancelled';
  converted_to_invoice?: string;
  conversion_date?: string;
}

interface PaginationProps {
  salesPerPage: number;
  totalSales: number;
  paginate: (pageNumber: number) => void;
  currentPage: number;
}

const AllProfoma: React.FC = () => {
  const [profomas, setProfomas] = useState<Profoma[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [salesPerPage] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfomaDetails();
  }, []);

  const fetchProfomaDetails = async () => {
    try {
      const response = await window.electron.fetchProfoma();
      const groupedProfomas = groupProfomaItems(response);
      console.log('grouped profomas:',groupedProfomas);
      setProfomas(groupedProfomas);
    } catch (error) {
      toast.error('Error fetching profoma details.');
      console.error('Error fetching profoma details:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupProfomaItems = (profomaData: any[]): Profoma[] => {
    const grouped: { [key: number]: Profoma } = {};

    profomaData.forEach((item) => {
      if (!grouped[item.profoma_id]) {
        grouped[item.profoma_id] = {
          profoma_id: item.profoma_id,
          profoma_number: item.profoma_number,
          date: item.date,
          total_amount: item.total_amount,
          customer_name: item.customer_name,
          items: [],
          status: item.status || 'pending',
          converted_to_invoice: item.converted_to_sale,
          conversion_date: item.conversion_date,
        };
      }
      grouped[item.profoma_id].items.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        tax: item.tax,
      });
    });

    return Object.values(grouped);
  };

  const handleViewDetails = (profoma_id: number) => {
    navigate(`/profoma-details/${profoma_id}`);

  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredProfomas = profomas.filter(
    (profoma) =>
      profoma.customer_name &&
      profoma.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredProfomas.slice(indexOfFirstSale, indexOfLastSale);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleConvertToInvoice = async (profomaId: number) => {
    try {
      await window.electron.convertProformaToInvoice(profomaId);
      toast.success('Proforma converted to invoice successfully!');
      fetchProfomaDetails(); // Refresh the list
    } catch (error) {
      toast.error(error.message); // Display the error message
      console.error('Error converting proforma:', error);
    }
  };

  return (
    <Container fluid className="p-0 customFont"style={{fontFamily:'CustomFont'}}>
      <ToastContainer />
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 3 }}>
          <h3 className="mb-3" style={{position:'relative',top:18}}>All Profomas</h3>

          <Form.Control
            style={{position:'relative',top:18, width: '30%' }}
            type="text"
            placeholder="Search by customer name"
            value={searchTerm}
            onChange={handleSearch}
            className="mb-3"
          />
                <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate('/profoma')}
            className="btn-sm rounded-pill"
            style={{ width: 150, marginLeft: '85%' }}
          >
            <i className="bi bi-plus-circle"> Create Profoma</i>
          </Button>
          {loading ? (
            <Spinner animation="border" variant="primary" />
          ) : (
            <>
              <Table striped bordered hover className='font'  style={{marginTop:'4%'}}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Profoma Number</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Total Amount</th>
                    <th style={{width:'5%'}}>Status</th>

                    <th style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSales.map((profoma, index) => (
                    <tr key={profoma.profoma_id}>
                      <td>{index + 1 + (currentPage - 1) * salesPerPage}</td>
                      <td>{profoma.profoma_number}</td>
                      <td>{new Date(profoma.date).toLocaleDateString()}</td>
                      <td>{profoma.customer_name}</td>
                      <td>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'TZS',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(profoma.total_amount)}
                      </td>
                      <td>
                        <Badge className='font' bg={
                          profoma.converted_to_sale || profoma.converted_to_invoice ? 'danger' : 'warning'
                        }>
                          {profoma.converted_to_sale || profoma.converted_to_invoice ? 'Approved' : 'Pending'}

                        </Badge>
                      </td>
                      <td style={{ display: 'flex', gap: 10 }}>
                      <Button
                            className="bi bi-eye viewButton"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleViewDetails(profoma.profoma_id)}
                            title="View Details"
                          />
                   <Button
                            className={`bi bi-arrow-right-circle deleteButton ${profoma.converted_to_sale || profoma.converted_to_invoice ? 'disabled' : ''}`}
                            variant={profoma.converted_to_sale || profoma.converted_to_invoice ? 'secondary' : 'success'}
                            size="sm"
                            onClick={() => {
                              if (!(profoma.converted_to_sale || profoma.converted_to_invoice)) {
                                handleConvertToInvoice(profoma.profoma_id);
                              }
                            }}
                            title={profoma.converted_to_sale || profoma.converted_to_invoice ? 'Already Converted' : 'Convert to Invoice'}
                            disabled={profoma.converted_to_sale || profoma.converted_to_invoice}
                          />
                  </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                salesPerPage={salesPerPage}
                totalSales={filteredProfomas.length}
                paginate={paginate}
                currentPage={currentPage}
              />
            </>
          )}
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

export default AllProfoma;

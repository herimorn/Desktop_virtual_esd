import React, { useEffect, useState } from 'react';
import { Button, Card, Container, Row, Col, Table } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sale = location.state?.sale;
  const [userData, setUserData] = useState<any>(null);
  const [previewCustomer, setPreviewCustomer] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  console.log('sales is:', sale);

  const convertBlobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = await window.electron.fetchUserData();
        // Convert BLOB data to Base64 if needed
        if (user.profile && user.profile instanceof Blob) {
          user.profile = await convertBlobToBase64(user.profile);
        }
        setUserData(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    // Check if sale.customer_id is valid before making the request
    if (sale.customer_id) {
      window.electron
        .getCustomerById(sale.customer_id)
        .then((customer: any) => {
          setPreviewCustomer(customer.rows.name);
        })
        .catch(() => {
          toast.error('Error fetching customer details.');
        });
    }
  }, [sale.customer_id]);

  const handleConfirmSale = () => {
    window.electron
      .addSale(sale)
      .then(() => {
        toast.success('Sale added successfully!');
        navigate('/sales'); // Redirect to sales list or another desired page
      })
      .catch(() => {
        toast.error('Error adding sale.');
      });
  };

  const handleCancel = () => {
    navigate('./invoice'); 
  };

  // Calculate the exclusive amount (total before tax)
  const exclusiveAmount = sale.products.reduce(
    (total: number, product: any) => total + product.quantity * product.price,
    0
  );

  // Assuming `sale.total_tax` is the total tax value for the sale
  const totalTax = sale.total_tax;

  // Grand total = exclusive amount + total tax
  const grandTotal = exclusiveAmount + totalTax;

  return (
    <Container fluid className="p-5 font" style={{ backgroundColor: '#f7f7f7' }}>
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-secondary text-white text-center">
              <h4>Review Sale now</h4>
            </Card.Header>
            <Card.Body className="p-4">
              {userData?.profile && (
                <img
                  src={userData?.profile}
                  alt="Company Logo"
                  style={{
                    height: 'auto',
                    width: 100,
                    marginLeft: '88%',
                    borderRadius: 100,
                  }}
                />
              )}
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Customer ID:</strong> {sale.customer_id}
                  </p>
                  <p className="mb-2">
                    <strong>Customer Name:</strong> {previewCustomer}
                  </p>
                  <p className="mb-2">
                    <strong>Transaction Status:</strong>{' '}
                    {sale.transaction_status}
                  </p>
                </Col>
                <Col md={6} className="text-md-right">
                  <p className="mb-2">
                    <strong>Transaction Type:</strong> {sale.transaction_type}
                  </p>
                  <p className="mb-2">
                    <strong>Total:</strong>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(sale.total)}
                  </p>
                  <p className="mb-2">
                    <strong>Total Tax:</strong>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(totalTax)}
                  </p>
                </Col>
              </Row>

              <h6 className="mt-4">Products</h6>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price (TZS)</th>
                    <th>Total (TZS)</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.products.map((product: any, index: number) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{product.product_name}</td>
                      <td>{product.quantity}</td>
                      <td>{product.price.toFixed(2)}</td>
                      <td>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'TZS',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(product.quantity * product.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Row className="mt-4">
                <Col md={6}>
                  <h5>Invoice Note</h5>
                  <div dangerouslySetInnerHTML={{__html:sale.invoice_note}} />
                 <p></p>
                </Col>
                <Col md={6} className="text-md-right">
                  <h5>
                    Exclusive Amount:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(exclusiveAmount)}
                  </h5>
                  <h5>
                    Total Tax:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(totalTax)}
                  </h5>
                  <h5>
                    Grand Total:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'TZS',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(grandTotal)}
                  </h5>
                </Col>
              </Row>
              <div className="mt-4 d-flex justify-content-center">
                <Button
                  variant="danger"
                  onClick={handleConfirmSale}
                  style={{ minWidth: '150px', margin: 10 }}
                >
                  Confirm Sale
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  style={{ minWidth: '150px' }}
                >
                  Cancel
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Preview;

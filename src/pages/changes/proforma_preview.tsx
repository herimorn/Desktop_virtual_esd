import React, { useEffect, useState } from 'react';
import { Button, Card, Container, Row, Col, Table, Badge } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

interface ProformaStatus {
  id: number;
  status: 'pending' | 'converted' | 'cancelled';
  converted_to_invoice?: string;
  conversion_date?: string;
}

const ProformaPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const proforma = location.state?.proforma;
  const [userData, setUserData] = useState<any>(null);
  const [previewCustomer, setPreviewCustomer] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [proformaStatus, setProformaStatus] = useState<ProformaStatus | null>(null);

  const convertBlobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = await window.electron.fetchUserData();
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
    if (proforma.customer_id) {
      window.electron
        .getCustomerById(proforma.customer_id)
        .then((customer: any) => {
          setPreviewCustomer(customer.rows.name);
        })
        .catch(() => {
          toast.error('Error fetching customer details.');
        });
    }
  }, [proforma.customer_id]);

  useEffect(() => {
    if (proforma.id) {
      window.electron
        .getProformaStatus(proforma.id)
        .then((status: ProformaStatus) => {
          setProformaStatus(status);
        })
        .catch(() => {
          toast.error('Error fetching proforma status.');
        });
    }
  }, [proforma.id]);

  const handleConfirmProforma = () => {
    window.electron.addProfoma({
        ...proforma,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .then(() => {
        toast.success('Proforma created successfully!');
        navigate('/profoma');
      })
      .catch(() => {
        toast.error('Error creating proforma.');
      });
  };

  const handleConvertToInvoice = () => {
    // First update proforma status
    window.electron
      .updateProformaStatus(proforma.id, {
        status: 'converted',
        converted_to_invoice: `INV-${Date.now()}`,
        conversion_date: new Date().toISOString()
      })
      .then(() => {
        // Then create invoice from proforma
        return window.electron.createInvoiceFromProforma({
          ...proforma,
          proforma_id: proforma.id,
          invoice_date: new Date().toISOString()
        });
      })
      .then(() => {
        toast.success('Proforma converted to invoice successfully!');
        navigate('/sales');
      })
      .catch(() => {
        toast.error('Error converting proforma to invoice.');
      });
  };

  // Calculate the exclusive amount (total before tax)
  const exclusiveAmount = proforma.products.reduce(
    (total: number, product: any) => total + product.quantity * product.price,
    0
  );

  const totalTax = proforma.total_tax;
  const grandTotal = exclusiveAmount + totalTax;

  return (
    <Container fluid className="p-5 font" style={{ backgroundColor: '#f7f7f7' }}>
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-secondary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Proforma Preview</h4>
                {proformaStatus && (
                  <Badge bg={
                    proformaStatus.status === 'converted' ? 'success' :
                    proformaStatus.status === 'pending' ? 'warning' : 'danger'
                  }>
                    {proformaStatus.status.toUpperCase()}
                  </Badge>
                )}
              </div>
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
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="text-muted">BILL TO</h6>
                  <p className="mb-1">Customer Name:<strong> {previewCustomer}</strong></p>

                  <p className="mb-1">Transaction Type: {proforma.transaction_type}</p>
                </Col>
                <Col md={6} className="text-md-right">
                  <h6 className="text-muted">PROFORMA DETAILS</h6>
                  <p className="mb-1">Date: {new Date().toLocaleDateString()}</p>
                  <p className="mb-1">Status: {proforma.transaction_status}</p>
                  {proformaStatus?.converted_to_invoice && (
                    <p className="mb-1">Invoice: {proformaStatus.converted_to_invoice}</p>
                  )}
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
                  {proforma.products.map((product: any, index: number) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{product.product_name}</td>
                      <td>{product.quantity}</td>
                      <td>
                        {new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(product.price || 0)}
                      </td>
                      <td>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'TZS',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format((product.quantity || 0) * (product.price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Row className="mt-4">
                <Col md={6}>
                  <Card className="bg-light">
                    <Card.Body>
                      <h6 className="text-muted">PROFORMA NOTE</h6>
                      <div dangerouslySetInnerHTML={{__html: proforma.invoice_note}} />
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="bg-light">
                    <Card.Body>
                      <Row className="mb-2">
                        <Col>Exclusive Amount:</Col>
                        <Col className="text-right">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'TZS',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(exclusiveAmount)}
                        </Col>
                      </Row>
                      <Row className="mb-2">
                        <Col>Total Tax:</Col>
                        <Col className="text-right">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'TZS',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(totalTax)}
                        </Col>
                      </Row>
                      <hr />
                      <Row>
                        <Col><strong>Grand Total:</strong></Col>
                        <Col className="text-right">
                          <strong>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'TZS',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(grandTotal)}
                          </strong>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <div className="mt-4 d-flex justify-content-center gap-3">
                {!proformaStatus?.status && (
                  <Button
                    variant="secondary"
                    onClick={handleConfirmProforma}
                    className="px-4"
                  >
                    Confirm Proforma
                  </Button>
                )}

                {proformaStatus?.status === 'pending' && (
                  <Button
                    variant="success"
                    onClick={handleConvertToInvoice}
                    className="px-4"
                  >
                    Convert to Invoice
                  </Button>
                )}

                <Button
                  variant="danger"
                  onClick={() => navigate('/profoma')}
                  className="px-4"
                >
                  Back
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProformaPreview;

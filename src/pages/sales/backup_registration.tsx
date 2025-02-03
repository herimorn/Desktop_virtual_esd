import React from "react";
import { Button, Card, Container, Row, Col, Image } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
// import logo from "../assets/logo.png"; // Assuming your logo is stored here

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sale = location.state?.sale;

  const handleConfirmSale = () => {
    window.electron.addSale(sale)
      .then(() => {
        toast.success("Sale added successfully!");
        navigate("/sales"); // Redirect to sales list or another desired page
      })
      .catch(() => {
        toast.error("Error adding sale.");
      });
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <Container fluid className="p-5" style={{ backgroundColor: "#f7f7f7" }}>
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg border-0">
            <Card.Header className="bg-primary text-white text-center">
              {/* <Image src={logo} fluid className="mb-3" style={{ maxHeight: "50px" }} /> */}
              <h4>Review Sale</h4>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={6}>
                  <p className="mb-2"><strong>Customer:</strong> {sale.customer_id}</p>
                  <p className="mb-2"><strong>Transaction Status:</strong> {sale.transaction_status}</p>
                </Col>
                <Col md={6} className="text-md-right">
                  <p className="mb-2"><strong>Transaction Type:</strong> {sale.transaction_type}</p>
                  <p className="mb-2"><strong>Total:</strong> TZS {sale.total.toFixed(2)}</p>
                  <p className="mb-2"><strong>Total Tax:</strong> TZS {sale.total_tax.toFixed(2)}</p>
                </Col>
              </Row>

              <h6 className="mt-4">Products</h6>
              <ul className="list-unstyled">
                {sale.products.map((product: any, index: number) => (
                  <li key={index} className="mb-2">
                    <strong>{product.quantity} x</strong> {product.product_id} <span className="text-muted">@ TZS {product.price}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 d-flex justify-content-center">
                <Button variant="success" onClick={handleConfirmSale} className="mr-3" style={{ minWidth: "150px" }}>Confirm Sale</Button>
                <Button variant="outline-secondary" onClick={handleCancel} style={{ minWidth: "150px" }}>Cancel</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Preview;

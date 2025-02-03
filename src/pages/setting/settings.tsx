import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Modal, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';

interface Invoice {
  invoice_number: string;
  invoice_string: string;
}

const Setting: React.FC = () => {
  const [invoice, setInvoice] = useState<Invoice>({ invoice_number: '', invoice_string: '' });
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await window.electron.fetchInvoice();
      if (response) {
        setInvoice({
          invoice_number: response.invoice_number,
          invoice_string: response.invoice_string,
        });
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Error fetching invoice.');
    }
  };

  const handleSave = async () => {
    try {
      await window.electron.addOrUpdateInvoice(invoice);
      Swal.fire('Success', 'Invoice saved successfully', 'success');
      setShowModal(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      Swal.fire('Error', 'Failed to save invoice', 'error');
    }
  };

  const handleEdit = () => {
    setShowModal(true);
  };

  return (
    <Container fluid className="p-0  font"style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content">

          <h3 style={{ marginTop: 20 }} className="mb-3">Invoice Settings</h3>

        {/* <Button variant="secondary" size="sm" onClick={handleEdit} className="mb-3" style={{width:80}}>
            Add setting
          </Button> */}
          <Button size="sm" variant="secondary" onClick={handleEdit}
                className="btn-sm rounded-pill text-white p-1"
                style={{position:'relative',left:'80%',width: 150, margin: 10 }}
              >
                <i className="bi bi-plus-circle"> {'   '}Add setting</i>
              </Button>

          {/* Display Current Invoice Details */}
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Invoice String</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.invoice_string}</td>
              </tr>
            </tbody>
          </Table>


          {/* Invoice Modal for Edit */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Edit Invoice</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="formInvoiceNumber">
                  <Form.Label>Invoice Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={invoice.invoice_number}
                    onChange={(e) =>
                      setInvoice({ ...invoice, invoice_number: e.target.value })
                    }
                  />
                </Form.Group>
                <Form.Group controlId="formInvoiceString">
                  <Form.Label>Invoice String</Form.Label>
                  <Form.Control
                    type="text"
                    value={invoice.invoice_string}
                    onChange={(e) =>
                      setInvoice({ ...invoice, invoice_string: e.target.value })
                    }
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <div style={{display:'flex', gap:10}}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </Button>
              <Button variant="danger" onClick={handleSave}>
                Add
              </Button>
              </div>

            </Modal.Footer>
          </Modal>

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default Setting;

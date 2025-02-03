import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const SaveStylePopup = ({ show, onHide, onSaveForThisInvoice, onSaveForAllInvoices}) => (
    <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
            <Modal.Title>Save Customization</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <p>Do you want to save these customizations for this invoice only, or apply them to all invoices?</p>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onSaveForThisInvoice}>
                Save for This Invoice Only
            </Button>
            <Button variant="primary" onClick={onSaveForAllInvoices}>
                Apply to All Invoices
            </Button>
        </Modal.Footer>
    </Modal>
);

export default SaveStylePopup;

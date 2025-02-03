import React from 'react';
import { Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Receipt } from '../types';

interface ReceiptListProps {
  receipts: Receipt[];
}

const ReceiptList: React.FC<ReceiptListProps> = ({ receipts }) => {
  const navigate = useNavigate();

  return (
    <Table striped bordered hover style={{fontFamily:'CustomFont'}}>
      <thead>
        <tr>
          <th>Receipt Number</th>
          <th>Customer Name</th>
          <th>Total Amount</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {receipts.map((receipt) => (
          <tr key={receipt.id}>
            <td>{receipt.rctnum}</td>
            <td>{receipt.customer_name}</td>
            <td>{receipt.totalTaxIncl}</td>
            <td>{receipt.created_at}</td>
            <td>
              <Button
                variant="primary"
                onClick={() => navigate(`/receipt-items/${receipt.id}`)}
              >
                View Items
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ReceiptList;

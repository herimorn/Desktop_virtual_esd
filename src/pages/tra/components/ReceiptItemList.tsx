import React from 'react';
import { Table } from 'react-bootstrap';
import { ReceiptItem } from '../types';

interface ReceiptItemListProps {
  items: ReceiptItem[];
}

const ReceiptItemList: React.FC<ReceiptItemListProps> = ({ items }) => {
  return (
    <Table striped bordered hover style={{fontFamily:'CustomFont'}}>
      <thead>
        <tr>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Amount</th>
          <th>Tax Code</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{item.product_name}</td>
            <td>{item.quantity}</td>
            <td>{item.amount}</td>
            <td>{item.tax_code}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ReceiptItemList;

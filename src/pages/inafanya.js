import React, { useState, useEffect, ChangeEvent,Component } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Form,
  Pagination,
  InputGroup,
  FormControl,

} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Swal from 'sweetalert2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../pages/purchase/purchese.css';
import { saveAs } from 'file-saver';
import { DateRangePickerComponent } from '@syncfusion/ej2-react-calendars';

export interface Purchase {
  total_tax: number;
  id?: number;
  supplier_id: number;
  date: string;
  payment_type: string;
  items: PurchaseItem[];
  expenses: Expense[];
  total_amount: number;
  supplier_name?: string;
}

export interface PurchaseItem {
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
  tax_rate?:number;
}

export interface Expense {
  id: number;
  category?: string;
  amount: number;
}

export interface Product {
  id: number;
  name: string;
  tax_rate: number;
}

export interface Supplier {
  id: number;
  name: string;
}
const Account: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);


  //  start= new Date("10/7/2020");
  // end= new Date("11/15/2020")
 //console.log('this is purchase payload', purchases)
  const [newItem, setNewItem] = useState<PurchaseItem>({
    product_id: 0,
    quantity: 0,
    price: 0,
  });
  const [newExpense, setNewExpense] = useState<Expense>({
    id: 0,
    amount: 0,
  });
  console.log("new expense is ",newExpense)
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const navigate = useNavigate();
  const paymentTypes = ['CASH', 'CHEQUE', 'CREDIT CARD','E-MONEY'];
  console.log("currentPurchase is",currentPurchase?.items)
  console.log("expenses is",expenses)




  return (
    <Container fluid className="font"style={{fontFamily:'CustomFont'}}>
      <Row>
        <Col xs={2} className="sidebar">
          <Sidebar />
        </Col>
        <Header title="Purchase Management" />


        <Col xs={10} className="p-5 content">




          <ToastContainer />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginTop: '15%' }}>


</div>
<h3 style={{position:'relative',top:-110}} >Profit and Loss</h3>
<div style={{display:'flex',justifyContent:'space-between',position:'relative',top:-40}} className='font'>

              <InputGroup className="mb-3" style={{width:370}}>
                <FormControl
                  placeholder="Search"
                  aria-label="Search"
                  value={searchQuery}
                  // onChange={}
                />
              </InputGroup>

              <InputGroup className="mb-3" style={{display:'flex',justifyContent:'flex-end',width:600,gap:10}}>
              <FormControl
                type="date"
                aria-label="Date Filter"
                aria-describedby="basic-addon2"
                value={dateFilter}
                // onChange={handleDateFilterChange}
              />
              <FormControl
                type="number"
                placeholder="Month"
                aria-label="Month Filter"
                aria-describedby="basic-addon2"
                value={monthFilter}
                // onChange={handleMonthChange}
              />
              <FormControl
                type="number"
                placeholder="Year"
                aria-label="Year Filter"
                aria-describedby="basic-addon2"
                value={yearFilter}
                // onChange={handleYearChange}
              />
            </InputGroup>
            </div>
          <Row>

          </Row>

          <Table striped bordered hover className='fontCss' style={{marginTop:-61}}>
            <thead>
              <tr>
                <th>#</th>
                <th>Purchase</th>
                <th>Sell</th>
                <th>Expense</th>

                <th style={{width:'10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>{renderTableRows()}</tbody>
          </Table>
          {renderPagination()}
          <Modal show={showModal} onHide={handleModalClose}>
  <Modal.Header closeButton>
    <Modal.Title>
      {isViewing ? 'View Purchase' : currentPurchase?.id ? 'Edit Purchase' : 'Add Purchase'}
    </Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {currentPurchase && (
      <Form>
        <Form.Group controlId="supplier">
          <Form.Label>Supplier</Form.Label>
          <Form.Control
            as="select"
            value={currentPurchase.supplier_id}
            onChange={(e) => setCurrentPurchase({ ...currentPurchase, supplier_id: parseInt(e.target.value) })}
            disabled={isViewing}
          >
            <option value={0}>Select Supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
        <Form.Group controlId="date">
          <Form.Label>Date</Form.Label>
          <Form.Control
            type="date"
            value={currentPurchase.date}
            onChange={(e) => setCurrentPurchase({ ...currentPurchase, date: e.target.value })}
            disabled={isViewing}
          />
        </Form.Group>
        <Form.Group controlId="payment_type">
          <Form.Label>Payment Type</Form.Label>
          <Form.Control
            as="select"
            value={currentPurchase.payment_type}
            onChange={(e) => setCurrentPurchase({ ...currentPurchase, payment_type: e.target.value })}
            disabled={isViewing}
          >
            <option value="">Select Payment Type</option>
            {paymentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
        <Form.Group controlId="items">
          <Form.Label>Items</Form.Label>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                {isViewing ? <th>Tax</th> : null}
                {!isViewing &&<th style={{width:'10%',height:5}}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentPurchase.items.map((item, index) => (
                <tr key={index}>
                  <td>{products.find((product) => product.id === item.product_id)?.name}</td>
                  <td>{item.quantity}</td>
                  <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(item.price)}</td>
                  {isViewing ? <td>{item.tax_rate}</td> : null}
                  {!isViewing && (
                    <td>
                      <Button
                        className="btn btn-danger bi bi-trash"
                        onClick={() => {
                          const updatedItems = currentPurchase.items.filter((_, i) => i !== index);
                          setCurrentPurchase({ ...currentPurchase, items: updatedItems });
                          updateTotalTax({ ...currentPurchase, items: updatedItems });
                        }}
                      ></Button>
                    </td>
                  )}
                </tr>
              ))}
              {!isViewing && (
                <tr>
                  <td>
                    <Form.Control
                      as="select"
                      value={newItem.product_id}
                      onChange={(e) => setNewItem({ ...newItem, product_id: parseInt(e.target.value) })}
                    >
                      <option value={0}>Select Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </Form.Control>
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                    />
                  </td>
                  <td>
                    <Button className="btn btn-secondary bi bi-plus" onClick={handleAddItem}></Button>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Form.Group>
        <Form.Group controlId="expenses">
          <Form.Label>Expenses</Form.Label>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                {!isViewing && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentPurchase?.expenses?.map((expense, index) => (
                <tr key={index}>
                  <td>{expenses.find((exp) => exp.id === expense.id)?.category}</td>
                  <td>{expense.amount.toLocaleString()}</td>
                  {!isViewing && (
                    <td>
                      <Button
                        className="btn btn-danger bi bi-trash"
                        onClick={() => {
                          if (currentPurchase) {
                            const updatedExpenses = currentPurchase.expenses.filter((_, i) => i !== index);
                            setCurrentPurchase({ ...currentPurchase, expenses: updatedExpenses });
                          }
                        }}
                      ></Button>
                    </td>
                  )}
                </tr>
              ))}
              {!isViewing && (
                <tr>
                  <td>
                    <Form.Control
                      as="select"
                      value={newExpense.id}
                      onChange={(e) => setNewExpense({ ...newExpense, id: parseInt(e.target.value) })}
                    >
                      <option value={0}>Select Category</option>
                      {expenses.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.category}
                        </option>
                      ))}
                    </Form.Control>
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                      placeholder="Optional"
                    />
                  </td>
                  <td>
                    <Button
                      className="btn btn-secondary bi bi-plus"
                      onClick={handleAddExpense}
                      disabled={newExpense.id === 0} // Disable button if no category selected
                    ></Button>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Form.Group>
      </Form>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button style={{ width: 200 }} variant="secondary" onClick={handleModalClose}>
      Close
    </Button>
    {!isViewing && (
      <Button style={{ width: 200 }} variant="danger" onClick={handleSavePurchase}>
        Save Purchase
      </Button>
    )}
  </Modal.Footer>
</Modal>


        </Col>
      </Row>
    </Container>
  );
};

export default Account;

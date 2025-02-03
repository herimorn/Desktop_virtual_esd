import React, { useState, useEffect, ChangeEvent } from 'react';
import { Container, Row, Col, Button, Table, Modal, Form, Pagination, InputGroup, FormControl } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import './purchese.css'; // Adjust your CSS file to match the styles in the template

export interface Purchase {
  total_tax: any;
  id?: number;
  supplier_id: number;
  date: string;
  payment_type: string;
  items: PurchaseItem[];
  total_amount: number;
  supplier_name?: string;
}

export interface PurchaseItem {
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
  tax_rate?: string;
}

export interface Expense {
  expense_id: number;
  amount: number;
}

export interface Product {
  id: number;
  name: string;
  tax_rate: string;
}

export interface Supplier {
  id: number;
  name: string;
}

const Purchase: React.FC = () => {
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
  const [newItem, setNewItem] = useState<PurchaseItem>({ product_id: 0, quantity: 0, price: 0 });
  const [newExpense, setNewExpense] = useState<Expense>({ expense_id: 0, amount: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const navigate = useNavigate();
  console.log(expenses)
  const paymentTypes = ['Cash', 'Credit Card', 'Bank Transfer'];

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
    fetchExpenses();
  }, []);

  useEffect(() => {
    setFilteredPurchases(filterPurchases());
  }, [purchases, searchQuery, dateFilter, monthFilter, yearFilter]);

  const fetchPurchases = async () => {
    const purchases = await window.electron.fetchPurchases();
    setPurchases(purchases);
  };

  const fetchProducts = async () => {
    const products = await window.electron.fetchProducts();
    setProducts(products);
  };

  const fetchSuppliers = async () => {
    const suppliers = await window.electron.fetchSuppliers();
    setSuppliers(suppliers);
  };

  const fetchExpenses = async () => {
    const expenses = await window.electron.fetchExpenses();
    setExpenses(expenses);
  };

  const handleAddPurchase = () => {
    setCurrentPurchase({
      id: undefined,
      supplier_id: 0,
      date: '',
      payment_type: '',
      items: [],
      total_amount: 0,
    });
    setIsViewing(false);
    setShowModal(true);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setCurrentPurchase(purchase);
    setIsViewing(false);
    setShowModal(true);
  };

  const handleViewPurchase = (purchase: Purchase) => {
    setCurrentPurchase(purchase);
    setIsViewing(true);
    setShowModal(true);
  };

  const handleDeletePurchase = async (purchaseId: number) => {
    try {
      await window.electron.deletePurchase(purchaseId);
      toast.success('Purchase deleted successfully');
      fetchPurchases();
    } catch (error) {
      toast.error('Error deleting purchase');
    }
  };

  const handleSavePurchase = async () => {
    if (currentPurchase) {
      try {
        if (currentPurchase.id) {
          await window.electron.updatePurchase(currentPurchase);
          toast.success('Purchase updated successfully');
        } else {
          await window.electron.addPurchase(currentPurchase);
          toast.success('Purchase added successfully');
        }
        fetchPurchases();
        setShowModal(false);
      } catch (error) {
        toast.error('Error saving purchase');
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDateFilter(event.target.value);
  };

  const handleMonthChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMonthFilter(event.target.value);
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    setYearFilter(event.target.value);
  };

  const handlePaymentTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPaymentType(event.target.value);
  };

  const filterPurchases = () => {
    return purchases.filter(purchase => {
      const dateMatches = dateFilter ? purchase.date === dateFilter : true;
      const monthMatches = monthFilter ? new Date(purchase.date).getMonth() + 1 === parseInt(monthFilter) : true;
      const yearMatches = yearFilter ? new Date(purchase.date).getFullYear() === parseInt(yearFilter) : true;
      const searchMatches = purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return dateMatches && monthMatches && yearMatches && searchMatches;
    });
  };

  const handleAddItem = () => {
    if (currentPurchase) {
      const updatedItems = [...currentPurchase.items, newItem];
      setCurrentPurchase({ ...currentPurchase, items: updatedItems });
      setNewItem({ product_id: 0, quantity: 0, price: 0 });
    }
  };
  const handleViewDetails = () => {
    navigate('/details', { state: { filteredPurchases } });
  };

  const handleAddExpense = () => {
    if (currentPurchase) {
      const updatedExpenses = [...(currentPurchase.expenses || []), newExpense];
      setCurrentPurchase({ ...currentPurchase, expenses: updatedExpenses });
      setNewExpense({ expense_id: 0, amount: 0 });
    }
  };

  const currentPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <Header />
      <Sidebar />
      <Container className="mt-4">
        <Row>
          <Col md={12}>
            <Button variant="primary" onClick={handleAddPurchase}>Add Purchase</Button>
            <InputGroup className="mb-3 mt-3">
              <FormControl placeholder="Search by supplier name" value={searchQuery} onChange={handleSearchChange} />
              <FormControl placeholder="Date (YYYY-MM-DD)" value={dateFilter} onChange={handleDateChange} />
              <FormControl placeholder="Month (1-12)" value={monthFilter} onChange={handleMonthChange} />
              <FormControl placeholder="Year (YYYY)" value={yearFilter} onChange={handleYearChange} />
              <Form.Control as="select" value={paymentType} onChange={handlePaymentTypeChange}>
                <option value="">Select Payment Type</option>
                {paymentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Control>
            </InputGroup>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPurchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>{purchase.date}</td>
                    <td>{purchase.supplier_name}</td>
                    <td>{purchase.total_amount}</td>
                    <td>
                      <Button variant="info" onClick={() => handleViewPurchase(purchase)}>View</Button>
                      <Button variant="warning" onClick={() => handleEditPurchase(purchase)}>Edit</Button>
                      <Button variant="danger" onClick={() => handleDeletePurchase(purchase.id!)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination>
              {Array.from({ length: Math.ceil(filteredPurchases.length / itemsPerPage) }, (_, index) => (
                <Pagination.Item key={index} active={index + 1 === currentPage} onClick={() => setCurrentPage(index + 1)}>
                  {index + 1}
                </Pagination.Item>
              ))}
            </Pagination>
          </Col>
        </Row>
      </Container>
      <Modal show={showModal} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isViewing ? 'View Purchase' : currentPurchase?.id ? 'Edit Purchase' : 'Add Purchase'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentPurchase && (
            <Form>
              <Form.Group controlId="supplier">
                <Form.Label>Supplier</Form.Label>
                <Form.Control as="select" value={currentPurchase.supplier_id} onChange={(e) => setCurrentPurchase({ ...currentPurchase, supplier_id: parseInt(e.target.value) })}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="date">
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={currentPurchase.date} onChange={(e) => setCurrentPurchase({ ...currentPurchase, date: e.target.value })} />
              </Form.Group>
              <Form.Group controlId="payment_type">
                <Form.Label>Payment Type</Form.Label>
                <Form.Control as="select" value={currentPurchase.payment_type} onChange={(e) => setCurrentPurchase({ ...currentPurchase, payment_type: e.target.value })}>
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="items">
                <Form.Label>Items</Form.Label>
                {currentPurchase.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <span>{item.product_name}</span> -
                    <span>Quantity: {item.quantity}</span> -
                    <span>Price: {item.price}</span>
                  </div>
                ))}
                <Form.Control as="select" value={newItem.product_id} onChange={(e) => setNewItem({ ...newItem, product_id: parseInt(e.target.value) })}>
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </Form.Control>
                <Form.Control type="number" placeholder="Quantity" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })} />
                <Form.Control type="number" placeholder="Price" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                <Button onClick={handleAddItem}>Add Item</Button>
              </Form.Group>
              <Form.Group controlId="expenses">
                <Form.Label>Expenses</Form.Label>
                {currentPurchase.expenses?.map((expense, index) => (
                  <div key={index} className="expense-row">
                    <span>Expense ID: {expense.id}</span> -
                    <span>Amount: {expense.amount}</span>
                  </div>
                ))}
                <Form.Control as="select" value={newExpense.id} onChange={(e) => setNewExpense({ ...newExpense, expense_id: parseInt(e.target.value) })}>
                  <option value="">Select Expense</option>
                  {expenses.map(expense => (
                    <option key={expense.id} value={expense.id}>{expense.category}</option>
                  ))}
                </Form.Control>
                <Form.Control type="number" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} />
                <Button onClick={handleAddExpense}>Add Expense</Button>
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Close
          </Button>
          {!isViewing && (
            <Button variant="primary" onClick={handleSavePurchase}>
              Save Changes
            </Button>
          )}
        </Modal.Footer>
      </Modal>
      <ToastContainer />
    </>
  );
};

export default Purchase;

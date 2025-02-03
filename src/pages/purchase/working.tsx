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
  supplier_name?: string; // assuming you might need this for display purposes
}

export interface PurchaseItem {
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string; // assuming you might need this for display purposes
  tax_rate?: string; // optional if not all items have a tax rate
}

export interface Expense {
  expense_id: number;
  amount: number;
}

export interface Product {
  id: number;
  name: string;
  tax_rate: string; // assuming tax_rate is a string
}

export interface Supplier {
  id: number;
  name: string;
}


const Purchase: React.FC = () => {
  // Your existing state and useEffect hooks...
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
const [newItem, setNewItem] = useState<PurchaseItem>({ product_id: 0, quantity: 0, price: 0, product_name: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState<Expense>({ expense_id: 0, amount: 0 });
  console.log(currentPurchase)
  const navigate = useNavigate();
  const paymentTypes = ['Cash', 'Credit Card', 'Bank Transfer'];

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    setFilteredPurchases(filterPurchases());
  }, [purchases, searchQuery, dateFilter, monthFilter, yearFilter]);

  const fetchPurchases = async () => {
    // Fetch purchases from your Electron backend
    const purchases = await window.electron.fetchPurchases();
    setPurchases(purchases);
  };

  const fetchProducts = async () => {
    // Fetch products from your Electron backend
    const products = await window.electron.fetchProducts();
    setProducts(products);
  };

  const fetchSuppliers = async () => {
    // Fetch suppliers from your Electron backend
    const suppliers = await window.electron.fetchSuppliers();
    setSuppliers(suppliers);
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
        setShowModal(false);
        fetchPurchases();
      } catch (error) {
        toast.error('Error saving purchase');
      }
    }
  };

  const handleAddItem = () => {
    if (currentPurchase && newItem.product_id && newItem.quantity > 0 && newItem.price > 0) {
      const product = products.find(p => p.id === newItem.product_id);
      const taxRate = product?.tax_rate || '0';
      const newItemWithTax = { ...newItem, product_name: product?.name, tax_rate: taxRate };
      setCurrentPurchase({
        ...currentPurchase,
        items: [...currentPurchase.items, newItemWithTax]
      });
      setNewItem({ product_id: 0, quantity: 0, price: 0 });
    }
  };

  const handleRemoveItem = (index: number) => {
    if (currentPurchase) {
      const updatedItems = [...currentPurchase.items];
      updatedItems.splice(index, 1);
      setCurrentPurchase({ ...currentPurchase, items: updatedItems });
    }
  };

  const handleAddExpense = () => {
    if (newExpense.expense_id && newExpense.amount > 0) {
      setExpenses([...expenses, newExpense]);
      setNewExpense({ expense_id: 0, amount: 0 });
    }
  };

  const handleRemoveExpense = (index: number) => {
    const updatedExpenses = [...expenses];
    updatedExpenses.splice(index, 1);
    setExpenses(updatedExpenses);
  };

  const filterPurchases = () => {
    let filtered = purchases;

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(purchase =>
        purchase.supplier_name?.toLowerCase().includes(lowercasedQuery) ||
        purchase.date.toLowerCase().includes(lowercasedQuery)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(purchase => purchase.date === dateFilter);
    }

    if (monthFilter) {
      filtered = filtered.filter(purchase => new Date(purchase.date).getMonth() + 1 === parseInt(monthFilter));
    }

    if (yearFilter) {
      filtered = filtered.filter(purchase => new Date(purchase.date).getFullYear() === parseInt(yearFilter));
    }

    return filtered;
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDateFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
  };

  const handleMonthFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMonthFilter(e.target.value);
  };

  const handleYearFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setYearFilter(e.target.value);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewDetails = () => {
    navigate('/details', { state: { filteredPurchases } });
  };



  const renderTableRows = () => {
    return filteredPurchases
      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      .map(purchase => (
        <tr key={purchase.id}>
          <td>{purchase.id}</td>
          <td>{purchase.supplier_name}</td>
          <td>{purchase.total_amount}</td>
          <td>{purchase.total_tax?.toFixed(2)}</td>
          <td>{purchase.date}</td>
          <td>
            <Button className='btn btn-warning bi bi-pencil-square' onClick={() => handleEditPurchase(purchase)}
              style={{width:80}}> </Button>
            <Button style={{width:80,marginLeft:5}}className='btn btn-danger bi bi-trash' onClick={() => handleDeletePurchase(purchase.id!)}></Button>
            <Button  style={{width:80,marginLeft:5}}className='btn btn-secondary bi bi-eye' onClick={() => { setCurrentPurchase(purchase); setIsViewing(true); setShowModal(true); }}>View</Button>
          </td>
        </tr>
      ));
  };

  const renderPaginationItems = () => {
    const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
    let items = [];

    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
          {number}
        </Pagination.Item>
      );
    }

    return items;
  };
  //handling payment type
  const handlePaymentTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPaymentType(event.target.value);
    if (currentPurchase) {
      setCurrentPurchase({ ...currentPurchase, payment_type: event.target.value });
    }
  };


  return (
    <>

      <Container fluid className="p-0">
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
            <Col className='mt-5'>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>All Purchases</h2>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:5}}>

                  <Button className='btn btn-secondary  btn-sm rounded-pill' onClick={handleAddPurchase} style={{width:200}}>
                  <i className="bi bi-plus-circle"></i>{'   '}
                    Add Purchase</Button>
                  <Button className='btn btn-danger btn-sm rounded-pill' style={{width:200}} onClick={handleViewDetails}>
                  <i className="bi bi-eye"></i>{'   '}
                    View</Button>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
              <InputGroup className="mb-3" style={{width:370}}>
                <FormControl
                  placeholder="Search"
                  aria-label="Search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </InputGroup>

              <InputGroup className="mb-3" style={{display:'flex',justifyContent:'flex-end',width:600,gap:10}}>
              <FormControl
                type="date"
                aria-label="Date Filter"
                aria-describedby="basic-addon2"
                value={dateFilter}
                onChange={handleDateFilterChange}
              />
              <FormControl
                type="number"
                placeholder="Month"
                aria-label="Month Filter"
                aria-describedby="basic-addon2"
                value={monthFilter}
                onChange={handleMonthFilterChange}
              />
              <FormControl
                type="number"
                placeholder="Year"
                aria-label="Year Filter"
                aria-describedby="basic-addon2"
                value={yearFilter}
                onChange={handleYearFilterChange}
              />
            </InputGroup>
            </div>

              <Table striped bordered hover className='purcharse'>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Total Amount</th>
                    <th>Total Tax</th>
                    <th>Date</th>
                    <th style={{width:'28%'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows()}
                </tbody>
              </Table>
              <Pagination className="justify-content-center">
                {renderPaginationItems()}
              </Pagination>
            </Col>
          </Row>
        </Container>


        <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>{isViewing ? 'View Purchase' : currentPurchase?.id ? 'Edit Purchase' : 'Add Purchase'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {currentPurchase && (
                <Form>
                  <Form.Group controlId="supplier">
                    <Form.Label>Supplier</Form.Label>
                    <Form.Control
                      as="select"
                      value={currentPurchase.supplier_id}
                      onChange={(e) =>
                        setCurrentPurchase({ ...currentPurchase, supplier_id: parseInt(e.target.value) })
                      }
                      disabled={isViewing}
                    >
                      <option value={0}>Select a supplier</option>
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
                  <Form.Group controlId="paymentType">
                    <Form.Label>Payment Type</Form.Label>
                    <Form.Control
                      as="select"
                      value={paymentType}
                      onChange={handlePaymentTypeChange}
                      disabled={isViewing}
                    >
                      <option value="">Select a payment type</option>
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
                          <th>#</th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Tax Rate</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPurchase.items.map((item, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{item.price}</td>
                            <td>{item.tax_rate}</td>
                            <td>
                              {!isViewing && (
                                <Button variant="danger" onClick={() => handleRemoveItem(index)}>
                                  Remove
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {!isViewing && (
                      <InputGroup className="mb-3">
                        <Form.Control
                          as="select"
                          value={newItem.product_id}
                          onChange={(e) => setNewItem({ ...newItem, product_id: parseInt(e.target.value) })}
                        >
                          <option value={0}>Select a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </Form.Control>
                        <FormControl
                          type="number"
                          placeholder="Quantity"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                        />
                        <FormControl
                          type="number"
                          placeholder="Price"
                          value={newItem.price}
                          onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                        />
                        <InputGroup>
                          <Button variant="primary" onClick={handleAddItem}>
                            Add Item
                          </Button>
                        </InputGroup>
                      </InputGroup>
                    )}
                  </Form.Group>
                  <Form.Group controlId="expenses">
                    <Form.Label>Expenses</Form.Label>
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Expense ID</th>
                          <th>Amount</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((expense, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{expense.expense_id}</td>
                            <td>{expense.amount}</td>
                            <td>
                              {!isViewing && (
                                <Button variant="danger" onClick={() => handleRemoveExpense(index)}>
                                  Remove
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {!isViewing && (
                      <InputGroup className="mb-3">
                        <FormControl
                          type="number"
                          placeholder="Expense ID"
                          value={newExpense.expense_id}
                          onChange={(e) => setNewExpense({ ...newExpense, expense_id: parseInt(e.target.value) })}
                        />
                        <FormControl
                          type="number"
                          placeholder="Amount"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                        />
                        <InputGroup>
                          <Button variant="primary" onClick={handleAddExpense}>
                            Add Expense
                          </Button>
                        </InputGroup>
                      </InputGroup>
                    )}
                  </Form.Group>
                </Form>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
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

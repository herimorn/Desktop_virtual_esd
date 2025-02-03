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
    const products = await window.electron.fetchProductsService();
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
      id: 0,
      supplier_id: 0,
      date: '',
      payment_type: '',
      items: [],
      expenses: [],
      total_amount: 0,
      total_tax: 0,
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
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await window.electron.deletePurchase(purchaseId);
        toast.success('Purchase deleted successfully!');
        fetchPurchases();
      } catch (error) {
        console.error('Error deleting purchase', error);
        toast.error('Error deleting purchase.');
      }
    }
  };


  // csv file
// Convert your purchases to CSV format
const convertToCSV = (purchases: Purchase[]): string => {
  const header = 'Supplier Name,Total Amount,Date,Payment Type,Item Name,Item Quantity,Item Price,Item Tax Rate,Expense Category,Expense Amount\n';
  const rows = purchases.map(purchase => {
    const items = purchase.items.map(item =>
      `${purchase.supplier_name},${purchase.total_amount},${purchase.date},${purchase.payment_type},${item.product_name},${item.quantity},${item.price},${item.tax_rate},,`
    ).join('\n');

    const expenses = purchase.expenses.map(expense =>
      `,,,,,,,,${expense.category},${expense.amount}`
    ).join('\n');

    return `${items}\n${expenses}`;
  }).join('\n');

  return `${header}${rows}`;
};

// Function to trigger CSV download
const exportToCSV = (purchases: Purchase[]) => {
  const csvContent = convertToCSV(purchases);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'purchases.csv');
};

  const handleSavePurchase = async () => {
  if (currentPurchase) {
    // Add validation logic
    if (
      !currentPurchase.supplier_id ||
      !currentPurchase.date ||
      !currentPurchase.payment_type ||
      currentPurchase.items.length === 0 ||
      currentPurchase.items.some(item => item.product_id === 0 || item.quantity === 0) ||
      currentPurchase.expenses.length === 0 ||
      currentPurchase.expenses.some(expense => expense.id === 0) // Only check for id === 0, not amount
    ) {
      toast.error('Please fill in all required fields and ensure no item or expense is empty.');
      return;
    }

    try {
      // Update total tax before saving
      updateTotalTax(currentPurchase);

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

  const handleDateFilterChange = (date: Date | null) => {
    setDateFilter(date);
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
      const dateMatches = dateFilter
        ? new Date(purchase.date).toLocaleDateString('en-GB') === dateFilter.toLocaleDateString('en-GB')
        : true;
      const monthMatches = monthFilter ? new Date(purchase.date).getMonth() + 1 === parseInt(monthFilter) : true;
      const yearMatches = yearFilter ? new Date(purchase.date).getFullYear() === parseInt(yearFilter) : true;
      const searchMatches = purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return dateMatches && monthMatches && yearMatches && searchMatches;
    });
  };

const updateTotalTax = (purchase: Purchase) => {
  const totalTax = purchase.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    const taxRate = product ? product.tax_rate : 0;
    return sum + (item.price * item.quantity * taxRate) / 100;
  }, 0);
  purchase.total_tax = totalTax; // Update the total_tax of the purchase
};
// console.log(updateTotalTax(currentPurchase))






  const handleAddExpense = () => {
    if (newExpense.id !== 0 && currentPurchase) {  // Only check if category is selected
      const updatedExpenses = [...(currentPurchase.expenses || []), newExpense];
      setCurrentPurchase({ ...currentPurchase, expenses: updatedExpenses });
      setNewExpense({ id: 0, amount: 0 });  // Reset fields after adding
    } else {
      toast.error('Please select a category.');
    }
  };


  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewDetails = () => {
    navigate('/details', { state: { filteredPurchases } });
  };

const renderTableRows = () => {
  let number = (currentPage - 1) * itemsPerPage;
  return filteredPurchases
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map(purchase => (
      <tr key={purchase.id}>
        <td>{++number}</td>
        <td>{purchase.supplier_name}</td>
        <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',    minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(purchase.total_amount)}</td>
        <td>{purchase.date}</td>
        <td
        style={{
          display: 'flex',
          gap: '4px',  // Reduced gap
          padding: '4px 8px',  // Reduced padding
          justifyContent: 'flex-start',
          alignItems: 'center'
        }}>
          <Button
            className="btn btn-warning bi bi-pencil-square editButton"
            onClick={() => handleEditPurchase(purchase)}

          ></Button>
          <Button

            className="btn btn-danger bi bi-trash deleteButton"
            onClick={() => handleDeletePurchase(purchase.id!)}
          ></Button>
          <Button

            className="btn btn-secondary bi bi-eye viewButton"
            onClick={() => handleViewPurchase(purchase)}
          ></Button>
        </td>
      </tr>
    ));
};

  const renderPagination = () => {
    const pageNumbers = [];
    for (let i = 1; i <= Math.ceil(filteredPurchases.length / itemsPerPage); i++) {
      pageNumbers.push(i);
    }
    return (
      <Pagination style={{marginLeft:'45%'}} >
        {pageNumbers.map(number => (
          <Pagination.Item  key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
            {number}
          </Pagination.Item>
        ))}
      </Pagination>
    );
  };
  const handleAddItem = () => {
    if (!currentPurchase) {
      toast.error('No current purchase selected.');
      return;
    }

    const product = products.find((p) => p.id === newItem.product_id);
    if (product) {
      const newItemWithTax = {
        ...newItem,
        tax_rate: product.tax_rate, // Set the tax rate of the new item
      };

      const updatedItems = [...currentPurchase.items, newItemWithTax];
      const updatedPurchase = { ...currentPurchase, items: updatedItems };

      updateTotalTax(updatedPurchase);
      setCurrentPurchase(updatedPurchase);
      setNewItem({ product_id: 0, quantity: 0, price: 0, tax_rate: 0 }); // Reset the newItem state
    } else {
      toast.error('Please select a product.');
    }
  };


  return (
    <Container fluid className="font"style={{fontFamily:'CustomFont'}}>
      <Row>
        <Col xs={2} className="sidebar">
          <Sidebar />
        </Col>
        <Header title="Purchase Management" />


        <Col xs={10} className="p-5 content">




          <ToastContainer />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginTop: '10%' }}>
 
  <Button
    className="btn btn-secondary btn-sm rounded-pill"
    style={{ width: 200 }}
    onClick={() => exportToCSV(filteredPurchases)}
  >
    <i className="bi bi-file-earmark-spreadsheet"></i>{'   '}
 
  </Button>
</div>
<h3 style={{position:'relative',top:-110}} >Profit and Loss</h3>
<div style={{display:'flex',justifyContent:'space-between',position:'relative',top:-40}} className='font'>

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
                onChange={handleMonthChange}
              />
              <FormControl
                type="number"
                placeholder="Year"
                aria-label="Year Filter"
                aria-describedby="basic-addon2"
                value={yearFilter}
                onChange={handleYearChange}
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

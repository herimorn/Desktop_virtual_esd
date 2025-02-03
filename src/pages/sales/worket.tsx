import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  InputGroup,
  FormControl,
  Card,
  Pagination,
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SalesForm.css';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  itemCode: string;
  buying_price: number;
  selling_price?: number;
  stock: number;
  tax_codeValue: string;
  quantity?: number;
}

interface Sale {
  customer_id: string;
  transaction_status: string;
  transaction_type: string;
  products: {
    product_id: string;
    quantity: number;
    price: number;
    buying_price: number;
    tax: string;
  }[];
  total: number;
  total_tax: number;
}

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<string>('');
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>(''); // New state for search term
  const itemsPerPage = 10;

  useEffect(() => {
    window.electron.fetchSales().then(setSales);
    window.electron.fetchCustomers().then(setCustomers);
    window.electron.fetchProductsSales().then(setProducts);

    const stockUpdateListener = () => {
      window.electron.fetchProductsSales().then(setProducts);
    };
    window.electron.onStockUpdated(stockUpdateListener);

    return () => {
      // window.electron.removeStockUpdatedListener(stockUpdateListener);
    };
  }, []);

  useEffect(() => {
    updateTotal();
  }, [selectedProducts]);

  const handleAddProduct = (product: Product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      return;
    }
    if (product.stock > 0) {
      const productWithQuantity = {
        ...product,
        quantity: 1,
        selling_price: product.selling_price || 0,
      };
      setSelectedProducts((prevSelectedProducts) => [
        ...prevSelectedProducts,
        productWithQuantity,
      ]);
    } else {
      toast.error('Stock is not available for this product.');
    }
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.map((product) => {
        if (product.id === productId) {
          if (quantity && parseInt(quantity) > product.stock) {
            toast.error(`Quantity exceeds available stock for ${product.name}`);
            return { ...product, quantity: product.stock };
          } else {
            return { ...product, quantity: parseInt(quantity, 10) || 0 };
          }
        }
        return product;
      }),
    );
  };

  const handleSellingPriceChange = (
    productId: string,
    sellingPrice: string,
  ) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.map((product) => {
        if (product.id === productId) {
          return { ...product, selling_price: parseFloat(sellingPrice) || 0 };
        }
        return product;
      }),
    );
  };

  const updateTotal = () => {
    const newTotal = selectedProducts.reduce(
      (acc, product) =>
        acc +
        (product.selling_price! > 0
          ? product.selling_price!
          : product.buying_price) *
          product.quantity!,
      0,
    );

    const newTotalTax = selectedProducts.reduce(
      (acc, product) =>
        acc +
        (product.selling_price! > 0
          ? product.selling_price!
          : product.buying_price) *
          product.quantity! *
          (parseFloat(product.tax_codeValue) / 100),
      0,
    );

    setTotal(newTotal);
    setTotalTax(newTotalTax);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSell = (event: FormEvent) => {
    event.preventDefault();

    if (!customer) {
      toast.error('Please select a customer.');
      return;
    }

    if (!transactionStatus) {
      toast.error('Please select a transaction status.');
      return;
    }

    if (!transactionType) {
      toast.error('Please select a transaction type.');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    const newSale: Sale = {
      customer_id: customer,
      transaction_status: transactionStatus,
      transaction_type: transactionType,
      products: selectedProducts.map((product) => ({
        product_id: product.id,
        quantity: product.quantity!,
        price:
          product.selling_price! > 0
            ? product.selling_price!
            : product.buying_price,
        buying_price: product.buying_price,
        tax: product.tax_codeValue,
      })),
      total,
      total_tax: totalTax,
    };

    window.electron
      .addSale(newSale)
      .then((newSale: Sale) => {
        setSales([...sales, newSale]);
        setSelectedProducts([]);
        setTotal(0);
        setTotalTax(0);
        toast.success('Sale added successfully!');
      })
      .catch(() => {
        toast.error('Error adding sale.');
      });
  };

  const paginatedProducts = products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || // Filter by name
        product.itemCode.toLowerCase().includes(searchTerm.toLowerCase()), // Or by item code
    )
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(products.length / itemsPerPage);

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.filter((product) => product.id !== productId),
    );
  };

  return (
    <Container fluid className="p-0">
      <ToastContainer />
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 20 }}>
          <Row>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Create Sales</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSell}>
                    <Form.Group controlId="formCustomer">
                      <Form.Label>Customer</Form.Label>
                      <InputGroup>
                        <FormControl
                          as="select"
                          value={customer}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setCustomer(e.target.value)
                          }
                        >
                          <option value="">Select Customer</option>
                          {customers.map((cust) => (
                            <option key={cust.id} value={cust.id}>
                              {cust.name}
                            </option>
                          ))}
                        </FormControl>
                      </InputGroup>
                    </Form.Group>
                    <Form.Group controlId="formTransactionStatus">
                      <Form.Label>Transaction Status</Form.Label>
                      <FormControl
                        as="select"
                        value={transactionStatus}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setTransactionStatus(e.target.value)
                        }
                      >
                        <option value="">Choose Transaction Status</option>
                        <option value="Wait to approve">Wait to approve</option>
                        <option value="Approved">Approved</option>
                        <option value="Cancel Report">Cancel Report</option>
                        <option value="Canceled">Canceled</option>
                        <option value="Refund">Refund</option>
                        <option value="Transferred">Transferred</option>
                      </FormControl>
                    </Form.Group>
                    <Form.Group controlId="formTransactionType">
                      <Form.Label>Transaction Type</Form.Label>
                      <FormControl
                        as="select"
                        value={transactionType}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setTransactionType(e.target.value)
                        }
                      >
                        <option value="">Choose Transaction Type</option>
                        <option value="Copy">Copy</option>
                        <option value="Normal">Normal</option>
                        <option value="Proforma">Proforma</option>
                        <option value="Training">Training</option>
                        <option value="Testing">Testing</option>
                      </FormControl>
                    </Form.Group>
                    <Form.Group controlId="formProducts">
                      <Form.Label>Products</Form.Label>
                      <Table bordered striped hover>
                        <thead>
                          <tr>
                            <th> Name</th>
                            <th>Quantity</th>
                            <th>Selling Price</th>{' '}
                            {/* Restored Selling Price */}
                            <th>Buying Price</th> {/* Restored Selling Price */}
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProducts.map((product) => (
                            <tr key={product.id}>
                              <td>{product.name}</td>
                              <td>
                                <FormControl
                                  type="number"
                                  value={product.quantity}
                                  onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    handleQuantityChange(
                                      product.id,
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <FormControl
                                  type="number"
                                  value={
                                    product.selling_price ||
                                    product.buying_price
                                  }
                                  onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    handleSellingPriceChange(
                                      product.id,
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td>{product.buying_price}</td>
                              <td>
                                <Button
                                  variant="danger"
                                  className="bi bi-trash-fill"
                                  onClick={() =>
                                    handleRemoveProduct(product.id)
                                  }
                                ></Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Form.Group>
                    <Row>
                      <Col md={6}>
                        <Button type="submit" className="btn-secondary">
                          Sell
                        </Button>
                      </Col>
                      <Col md={6}>
                        <h5>Total: {total.toFixed(2)}</h5>
                        <h5>Total Tax: {totalTax.toFixed(2)}</h5>
                      </Col>
                    </Row>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Available Products</h5>
                  <Form>
                    <InputGroup>
                      <FormControl
                        type="text"
                        placeholder="Search by product name or item code"
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setSearchTerm(e.target.value)
                        }
                      />
                    </InputGroup>
                  </Form>
                </Card.Header>
                <Card.Body>
                  <Table bordered striped hover>
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Product Name</th>
                        <th>Stock</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.itemCode}</td>
                          <td>{product.name}</td>
                          <td>{product.stock}</td>
                          <td>
                            <Button
                              variant="secondary"
                              onClick={() => handleAddProduct(product)}
                            >
                              Add
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Pagination>
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={index + 1 === currentPage}
                        onClick={() => handlePageChange(index + 1)}
                      >
                        {index + 1}
                      </Pagination.Item>
                    ))}
                  </Pagination>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Sales;

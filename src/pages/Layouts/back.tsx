import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
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
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Header } from "../Layouts/nav";
import { Sidebar } from "../Layouts/sidebar";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./SalesForm.css";

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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<string>("");
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const itemsPerPage = 10;

  useEffect(() => {
    window.electron.fetchSales().then(setSales);
    window.electron.fetchCustomers().then(setCustomers);
    window.electron.fetchProductsSales().then((fetchedProducts: Product[]) => {
      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);  // Initialize filteredProducts with all products
    });

    const stockUpdateListener = () => {
      window.electron.fetchProductsSales().then((updatedProducts: Product[]) => {
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts);
      });
    };
    window.electron.onStockUpdated(stockUpdateListener);

    return () => {
      window.electron.removeStockUpdatedListener(stockUpdateListener);
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
      const productWithQuantity = { ...product, quantity: 1 };
      setSelectedProducts((prevSelectedProducts) => [
        ...prevSelectedProducts,
        productWithQuantity,
      ]);
    } else {
      toast.error("Stock is not available for this product.");
    }
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    if (term === "") {
      setFilteredProducts(products);  // Reset to all products if search term is cleared
    } else {
      setFilteredProducts(
        products.filter((product: Product) =>
          product.name.toLowerCase().includes(term) ||
          product.itemCode.toLowerCase().includes(term)
        )
      );
    }
    setCurrentPage(1); // Reset to the first page on search
  };

  // getting paginated products
  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
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
      })
    );
  };

  const handleSellingPriceChange = (productId: string, sellingPrice: string) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.map((product) => {
        if (product.id === productId) {
          return { ...product, selling_price: parseFloat(sellingPrice) || 0 };
        }
        return product;
      })
    );
  };

  const updateTotal = () => {
    const newTotal = selectedProducts.reduce(
      (acc, product) =>
        acc +
        (product.selling_price! > 0
          ? product.selling_price!
          : product.buying_price) * product.quantity!,
      0
    );

    const newTotalTax = selectedProducts.reduce(
      (acc, product) =>
        acc +
        ((product.selling_price! > 0
          ? product.selling_price!
          : product.buying_price) *
          product.quantity! *
          (parseFloat(product.tax_codeValue) / 100)),
      0
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
      toast.error("Please select a customer.");
      return;
    }

    if (!transactionStatus) {
      toast.error("Please select a transaction status.");
      return;
    }

    if (!transactionType) {
      toast.error("Please select a transaction type.");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product.");
      return;
    }

    const newSale: Sale = {
      customer_id: customer,
      transaction_status: transactionStatus,
      transaction_type: transactionType,
      products: selectedProducts.map((product) => ({
        product_id: product.id,
        quantity: product.quantity!,
        price: product.selling_price! > 0 ? product.selling_price! : product.buying_price,
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
        toast.success("Sale added successfully!");
      })
      .catch(() => {
        toast.error("Error adding sale.");
      });
  };

  const paginatedProducts = getPaginatedProducts();

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.filter((product) => product.id !== productId)
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
                        <option value="">Select Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
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
                        <option value="">Select Type</option>
                        <option value="cash">Cash</option>
                        <option value="credit">Credit</option>
                      </FormControl>
                    </Form.Group>
                    <Form.Group>
                      <Table bordered hover responsive className="mt-4">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Selling Price</th>
                            <th>Total</th>
                            <th>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProducts.map((product) => (
                            <tr key={product.id}>
                              <td>{product.name}</td>
                              <td>
                                <Form.Control
                                  type="number"
                                  min="1"
                                  max={product.stock}
                                  value={product.quantity!}
                                  onChange={(e) =>
                                    handleQuantityChange(product.id, e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  value={product.selling_price!}
                                  onChange={(e) =>
                                    handleSellingPriceChange(product.id, e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                {(
                                  (product.selling_price! > 0
                                    ? product.selling_price!
                                    : product.buying_price) * product.quantity!
                                ).toFixed(2)}
                              </td>
                              <td>
                                <Button
                                className="bi bi-trash-fill"
                                  variant="danger"
                                  onClick={() => handleRemoveProduct(product.id)}
                                >

                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Form.Group>
                    <Form.Group>
                      <h4>Total: {total.toFixed(2)}</h4>
                      <h5>Total Tax: {totalTax.toFixed(2)}</h5>
                    </Form.Group>
                    <Button variant="secondary" type="submit">
                      Submit Sale
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Product List</h5>
                  <InputGroup className="mb-3">
                    <FormControl
                      placeholder="Search by name or code"
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </InputGroup>
                </Card.Header>
                <Card.Body>
                  <Table bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Stock</th>
                        <th>Tax</th>
                        <th>Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.itemCode}</td>
                          <td>{product.stock}</td>
                          <td>{product.tax_codeValue}</td>
                          <td>
                            <Button
                              variant="secondary"
                              className="bi bi-plus-circle-fill"
                              onClick={() => handleAddProduct(product)}
                            >

                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Pagination>
                    {Array.from({ length: totalPages }, (_, index) => (
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

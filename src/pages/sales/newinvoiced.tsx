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

// Your existing interfaces...

const Sales: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<string>("");
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>(""); // Add state for search term
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
      const productWithQuantity = { ...product, quantity: 1 };
      setSelectedProducts((prevSelectedProducts) => [
        ...prevSelectedProducts,
        productWithQuantity,
      ]);
    } else {
      toast.error("Stock is not available for this product.");
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
      total_tax: totalTax
    };

    window.electron.addSale(newSale).then((newSale: Sale) => {
      setSales([...sales, newSale]);
      setSelectedProducts([]);
      setTotal(0);
      setTotalTax(0);
      toast.success("Sale added successfully!");
    }).catch(() => {
      toast.error("Error adding sale.");
    });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <Col md={10} className="p-5 content" style={{marginTop:20}}>
          <Row>
            <Col md={6}>
              {/* Your existing code for the sales form... */}
            </Col>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Product List</h5>
                  <FormControl
                    type="text"
                    placeholder="Search products"
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSearchTerm(e.target.value)
                    }
                    className="mt-2"
                  />
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th> Price</th>
                        <th>Stock</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.itemCode}</td>
                          <td>TZS {product.buying_price}</td>
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
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
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

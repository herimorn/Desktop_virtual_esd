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
import { useParams, useNavigate } from 'react-router-dom';
import "../../pages/sales/SalesForm.css";
import { ArrowLeft, Download } from 'react-bootstrap-icons';
import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'

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
  itemType: string;
}

interface Profoma {
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

const Profoma: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Profoma[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredproducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<string>("");
  const [transactionStatus, setTransactionStatus] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [invoiceNote, setInvoiceNote] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>(""); //
  const itemsPerPage = 10;
  const [note, setNote] = useState<string>("");
  console.log(filteredproducts)

  useEffect(() => {
    window.electron.fetchSales().then(setSales);
    window.electron.fetchCustomers().then(setCustomers);
    window.electron.fetchProductsSales().then((fetchedProducts: Product[]) => {
      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);  // Initialize filteredProducts with all products
    });

  }, []);

  useEffect(() => {
    updateTotal();
  }, [selectedProducts]);
  const handleAddProduct = (product: Product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      return;
    }

    const productWithQuantity = { ...product, quantity: 1 };
    setSelectedProducts(prev => [...prev, productWithQuantity]);
  };

  const EditorModules = {
    toolbar: [
      [{ header: '1' }, { header: '2' }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      [{ align: [] }],
      ['clean'], // Add a button to clear formatting
    ],
  };
  // Specify the formats to use in the editor
  const EditorFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'list',
    'bullet',
    'link',
    'image',
    'align',
  ];
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    console.log('search term',term)
    setSearchTerm(term);
    setFilteredProducts(
      products.filter((product:Product) =>
        product.name.toLowerCase().includes(term) ||
      product.itemCode.toLowerCase().includes(term)
        // customer.email.toLowerCase().includes(term) ||
        // (parsePhoneNumberFromString(customer.phone)?.number || '').toLowerCase().includes(term) ||
        // customer.address.toLowerCase().includes(term) ||
        // customer.tin.toLowerCase().includes(term) ||
        // customer.outstanding.toString().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  //getting product pagination
  const getPaginatedCustomers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredproducts.slice(startIndex, endIndex);
  };

  // const totalPages = Math.ceil(filteredproducts.length / itemsPerPage);



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
        acc + (product.selling_price || product.buying_price) * product.quantity!,
      0
    );

    const newTotalTax = selectedProducts.reduce(
      (acc, product) =>
        acc +
        ((product.selling_price || product.buying_price) *
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
      if (invoiceNote.trim() === '') {
        toast.error('Please enter invoice note.');
        return;
      }

    }

    const newProforma = {
      customer_id: customer,
      transaction_status: transactionStatus,
      transaction_type: transactionType,
      products: selectedProducts.map((product) => ({
        product_id: product.id,
        product_name: product.name,
        quantity: product.quantity,
        price: product.selling_price || product.buying_price,
        buying_price: product.buying_price,
        tax: product.tax_codeValue,
      })),
      total: total,
      total_tax: totalTax,
      invoice_note: invoiceNote
    };

    // Navigate to preview page with proforma data
    navigate('/profoma/preview', { state: { proforma: newProforma } });
  };

  const paginatedProducts = filteredproducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.filter((product) => product.id !== productId)
    );
  };

  const handleBack = (e:any) => {
    e.preventDefault();
    navigate('/all-profoma');
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity);
    if (numQuantity < 1) return;

    setSelectedProducts((prevSelectedProducts) =>
      prevSelectedProducts.map((product) => {
        if (product.id === productId) {
          const originalProduct = products.find(p => p.id === productId);
          if (originalProduct) {
            // For service products, allow any quantity
            if ((originalProduct.itemType?.toLowerCase() || '') === 'service') {
              return { ...product, quantity: numQuantity };
            }
            // For non-service products, check stock
            if (numQuantity > originalProduct.stock) {
              toast.error(`Only ${originalProduct.stock} items available in stock`);
              return product;
            }
            return { ...product, quantity: numQuantity };
          }
          return product;
        }
        return product;
      })
    );
  };

  return (
    <Container fluid className="p-0"style={{fontFamily:'CustomFont'}}>
      <ToastContainer />
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{marginTop:20}}>
          <Row>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Create Profoma</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSell}>
                    <Form.Group controlId="formCustomer">
                      <Form.Label>Customer</Form.Label>
                      <InputGroup>

                        <FormControl
                          as="select"
                          value={customer}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomer(e.target.value)}
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionStatus(e.target.value)}
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionType(e.target.value)}
                      >
                        <option value="">Choose Transaction Type</option>
                        <option value="Copy">Copy</option>
                        <option value="Normal">Normal</option>
                        <option value="Proforma">Proforma</option>
                        <option value="Training">Training</option>
                      </FormControl>
                    </Form.Group>

                    {selectedProducts.length > 0 && (
                      <div className="selected-products-container mt-3">
                        {selectedProducts.map((product) => (
                          <div key={product.id} className="selected-product">
                            <Row>
                              <Col md={6}>
                                <p><strong>Name:</strong> {product.name}</p>
                                <p><strong>Code:</strong> {product.itemCode}</p>
                                <p><strong>Price:</strong> TZS {new Intl.NumberFormat('en-US', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(product.selling_price || product.buying_price)}</p>
                              </Col>
                              <Col md={6}>
                                <Form.Group controlId={`quantity-${product.id}`}>
                                  <Form.Label>Quantity</Form.Label>
                                  <FormControl
                                    type="number"
                                    min="1"
                                    value={product.quantity}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                      handleQuantityChange(product.id, e.target.value)
                                    }
                                  />
                                </Form.Group>
                                <Form.Group controlId={`sellingPrice-${product.id}`}>
                                  <Form.Label>Selling Price</Form.Label>
                                  <FormControl
                                    type="text"
                                    value={product.selling_price || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                      handleSellingPriceChange(product.id, e.target.value)
                                    }
                                  />
                                </Form.Group>
                                <div className="mt-2">
                                  <p><strong>Tax:</strong> {product.tax_codeValue}%</p>
                                  <p>
                                    <strong>Amount:</strong> TZS {new Intl.NumberFormat('en-US', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0
                                    }).format(
                                      (product.selling_price || product.buying_price) *
                                      (1 + parseFloat(product.tax_codeValue) / 100) *
                                      product.quantity!
                                    )}
                                  </p>
                                </div>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveProduct(product.id)}
                                  className="mt-2"
                                >
                                  Remove
                                </Button>

                   
                              </Col>
                            </Row>
                            <hr />
                            
                          </div>
                        ))}
                      </div>
                    )}
             
             <Form.Group controlId="InvoiceNote">
                      <Form.Label>Profoma Invoice</Form.Label>
                      <ReactQuill
                        value={invoiceNote}
                        onChange={(value: string) => setInvoiceNote(value)}
                        modules={EditorModules}
                        formats={EditorFormats}
                      />
                      <Form.Text className="text-muted">
                        {invoiceNote.length} characters
                      </Form.Text>
                    </Form.Group>
                    <div className="mt-3">
                      <strong>Total:</strong> TZS {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' ,    minimumFractionDigits: 0,
      maximumFractionDigits: 0}).format(total.toFixed(2))}
                    </div>
                    <div className="mt-3">
                      <strong>Total Tax:</strong> TZS {totalTax.toFixed(2)}
                    </div>

                    <Button variant="secondary" type="submit" className="mt-3">
                      Add Profoma
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>

<Button
        onClick={handleBack}
        className="mb-3"
        style={{ width: '5%', marginLeft: '95%', backgroundColor: '#6c757d' }}
        className="font  no-print"
      >
        <ArrowLeft /> {/* Added the back icon here */}
      </Button>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Product List</h5>
                  <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Price</th>
                        <th>Available Stock</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.itemCode}</td>
                          <td>TZS {new Intl.NumberFormat('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(product.buying_price || 0)}</td>
                          <td>
                            {product.itemtype === 'Service'
                              ? 'Service'
                              : (product.stock || 0)
                            }
                          </td>
                          <td>
                            <Button
                              variant="secondary"
                              onClick={() => handleAddProduct(product)}
                              disabled={false}
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
export default Profoma;

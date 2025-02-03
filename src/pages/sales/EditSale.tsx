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
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useParams, useNavigate } from 'react-router-dom';
import './SalesForm.css';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  codeValue: string;
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
  sale_id: number;
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

const EditSales: React.FC = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [total, setTotal] = useState<number>(0);
  const [totalTax, setTotalTax] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [invoiceNote, setInvoiceNote] = useState(sale?.invoice_note);
  console.log("transactionStatus",transactionStatus);

  const itemsPerPage = 10;
  console.log("the filtered products", filteredProducts)

  console.log('the customers', customers)
  // const saleId = sale.sale_id;
  console.log('the sale data ',sale)
  console.log('the selected products are',selectedProducts)
  console.log('the calculated products are',products)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedProducts = await window.electron.fetchProducts();
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);

        if(saleId){
          //all logic should be here
          const saleData = await window.electron.fetchSaleById(saleId);
          setSale(saleData)
          const fetchedCustomers = await window.electron.getCustomerById(saleData.customer_id);
          setCustomers(fetchedCustomers.rows);
          setTransactionStatus(saleData.transaction_status);
                setTransactionType(saleData.transaction_type);

                const selectedProductsData = saleData.products.map((product: { product_id: any; quantity: any; price: any; tax: any; }) => ({
                  ...fetchedProducts.find(p => p.id === product.product_id),
                  quantity: product.sold_quantity,
                  selling_price: product.selling_price,
                  buying_price: product.buying_price,
                  tax_codeValue: product.tax,
                })) as Product[];
                setSelectedProducts(selectedProductsData);

                calculateTotals(selectedProductsData);


      }
        //impliment fetching customers since we can be able to get the customer id
      }catch (error:any) {
        toast.error('Failed to fetch data. Please try again later.',error);
      }
     };

    fetchData();
  }, [saleId]);



  const handleSell = (event: FormEvent) => {
    event.preventDefault();

    // if (!customer || !transactionStatus || !transactionType || !selectedProducts.length || invoiceNote?.trim() === '') {
    //   toast.error('Please fill in all required fields.');
    //   return;
    // }

    const updatedSale: Sale = {
      customer_id: sale?.customer_id,
      transaction_status:transactionStatus,
      transaction_type: transactionType,
      invoice_note: invoiceNote.trim(),
      products: selectedProducts.map(product => ({
        product_id: product.id,
        quantity: product.quantity!,
        price: product.selling_price!,
        buying_price: product.buying_price!,
        tax: product.codeValue,
      })),
      total,
      total_tax: totalTax,
    };
    console.log('the updated sale', updatedSale)
    window.electron.updateSale(sale?.sale_id, updatedSale).then(() => {
      toast.success('Sale updated successfully.');
      navigate(-1);
    });
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim()) {
      setFilteredProducts(products.filter(product =>
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        product.itemCode.toLowerCase().includes(term.toLowerCase())
      ));
    } else {
      setFilteredProducts(products);
    }
  };

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleAddProduct = (product: Product) => {
    if (selectedProducts.some(p => p.id === product.id)) {
      toast.error('Product already added.');
      return;
    }
    setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    calculateTotals([...selectedProducts, { ...product, quantity: 1 }]);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const updatedProducts = selectedProducts.map(product =>
      product.id === productId ? { ...product, quantity } : product
    );
    setSelectedProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  const calculateTotals = (products: Product[]) => {
    const totalAmount = products.reduce(
      (sum, product) => sum + (product.selling_price! * product.quantity!),
      0
    );
    const totalTaxAmount = products.reduce(
      (sum, product) => sum + (parseFloat(product.codeValue) * product.quantity!),
      0
    );
    setTotal(totalAmount);
    setTotalTax(totalTaxAmount);
  };

  return (
    <Container fluid className="p-0 font">
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
                  <h5>Edit Sale</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSell}>
                  <InputGroup>
                  <FormControl
                    type="text"
                    placeholder="Search..."
                    value={customers.name}
                      readOnly
                    />
                  </InputGroup>

                    <Form.Group controlId="formTransactionStatus">
                      <Form.Label>Transaction Status</Form.Label>
                      <InputGroup>
                        <FormControl
                          as="select"
                          value={transactionStatus}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setTransactionStatus(e.target.value)
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                        </FormControl>
                      </InputGroup>
                    </Form.Group>
                    <Form.Group controlId="formTransactionType">
                      <Form.Label>Transaction Type</Form.Label>
                      <InputGroup>
                        <FormControl
                          as="select"
                          value={transactionType}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setTransactionType(e.target.value)
                          }
                        >
                          <option value="cash">Cash</option>
                          <option value="credit">Credit</option>
                        </FormControl>
                      </InputGroup>
                    </Form.Group>
                    <div>
            <h4>Previous Invoice Note:</h4>
            <div dangerouslySetInnerHTML={{ __html: sale?.invoice_note }} />

            <h4>Edit Invoice Note:</h4>
            <ReactQuill value={invoiceNote} onChange={setInvoiceNote} />
        </div>
                    <Button  style={{marginTop:10}} variant="secondary" type="submit" block>
                      Update Sale
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="fontCss">
                <Card.Header>
                  <h5>Products</h5>
                </Card.Header>
              </Card>
              <Card className="fontCss mt-3">
                <Card.Header>
                  <h5>Selected Products</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th> Name</th>
                        <th>Quantity</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.itemCode}</td>
                          <td>{product.name}</td>
                          <td>
                            <FormControl
                              type="number"
                              min="1"
                              value={product.quantity || 1}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleQuantityChange(product.id, parseInt(e.target.value))
                              }
                            />
                          </td>


                          <td>
                            {(product.selling_price! * (product.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Row>
                    <Col>
                      <h5>Total: {total}</h5>
                      <h5>Total Tax: {totalTax}</h5>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default EditSales;

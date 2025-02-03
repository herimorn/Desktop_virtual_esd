import React, { FC, useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button, Form, Modal, Pagination, Spinner } from 'react-bootstrap';
import Select from 'react-select'; // For searchable dropdowns
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { RouteComponentProps } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import './product.css';
import data from '../../../database/data.json';

// Define interfaces for your data
interface County {
  name: string;
  code: string;
}

interface ItemType {
  name: string;
  code: string;
}

interface PackagingUnit {
  name: string;
  code: string;
}

interface QuantityUnit {
  name: string;
  code: string;
}

interface PaymentType {
  name: string;
  code: string;
}

interface TaxOption {
  id: string;
  codeType: string;
  codeValue: string;
}

interface Product {
  id: number | null;
  name: string;
  description: string;
  price: number;
  quantity: number;
  tax: string;
  unit: string;
  county: string;
  itemType: string;
  packagingUnit: string;
  quantityUnit: string;
  paymentType: string;
  itemCode: string;
}

// Sample Data Arrays
const counties: County[] = [
  { name: "Tanzania", code: "TZ" },
  { name: "Kenya", code: "KE" },
  { name: "Uganda", code: "UG" },
  { name: "Rwanda", code: "RW" },
  { name: "Burundi", code: "BR" },
  { name: "Congo", code: "CO" },
];

const itemTypes: ItemType[] = [
  { name: "Raw Material", code: "1" },
  { name: "Finished Product", code: "2" },
  { name: "Service", code: "3" },
];

const packagingUnits: PackagingUnit[] = [
  { name: "Ampoule", code: "AM" },
  { name: "Barrel", code: "BA" },
  { name: "Bottlecrate", code: "BC" },
  { name: "Bundle", code: "BE" },
  { name: "Balloon", code: "BF" },
  { name: "Bag", code: "BG" },
  { name: "Bucket", code: "BJ" },
  { name: "Basket", code: "BS" },
  { name: "Bale", code: "BL" },
  { name: "Bottle", code: "BQ" },
  { name: "Bar", code: "BR" },
  { name: "Bottle, bulbous", code: "BV" },
  { name: "Can", code: "CA" },
  { name: "Chest", code: "CH" },
  { name: "Coffin", code: "CF" },
  { name: "COil", code: "CL" },
  { name: "Wooden Box", code: "CR" },
  { name: "Cassete", code: "CS" },
];

const quantityUnits: QuantityUnit[] = [
  { name: "kg", code: "KG" },
  { name: "gram", code: "G" },
  { name: "litres", code: "L" },
  { name: "tones", code: "T" },
  { name: "ml", code: "ML" },
  { name: "oz", code: "OZ" },
  { name: "pounds", code: "LB" },
  { name: "gallons", code: "GAL" },
  { name: "cuft", code: "CUFT" },
  { name: "cuin", code: "CUIN" },
];

const paymentTypes: PaymentType[] = [
  // Add payment types if necessary
];

// Define the component
const AllProduct: FC<RouteComponentProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchParams, setSearchParams] = useState<{ name: string; itemCode: string }>({ name: '', itemCode: '' });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product>({
    id: null,
    name: '',
    description: '',
    price: 0,
    quantity: 0,
    tax: '',
    unit: '',
    county: '',
    itemType: '',
    packagingUnit: '',
    quantityUnit: '',
    paymentType: '',
    itemCode: '',
  });
  const [productToView, setProductToView] = useState<Product | null>(null);
  const [taxOptions, setTaxOptions] = useState<{ value: string; label: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [countyOptions, setCountyOptions] = useState<{ value: string; label: string }[]>([]);
  const [itemTypeOptions, setItemTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [packagingUnitOptions, setPackagingUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [quantityUnitOptions, setQuantityUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchProducts();
    fetchTaxOptions();
    fetchOptionsFromJson();
  }, []);

  const fetchMaxProductId = async (): Promise<number> => {
    try {
      const response: Product[] = await window.electron.fetchProducts();
      const maxId = response.reduce((max, product) => product.id && product.id > max ? product.id : max, 0);
      return maxId;
    } catch (error) {
      console.error('Error fetching maximum product ID:', error);
      return 0;
    }
  };

  const fetchProducts = async () => {
    try {
      const response: Product[] = await window.electron.fetchProducts();
      setProducts(response);
      setFilteredProducts(response);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxOptions = async () => {
    try {
      const response: TaxOption[] = await window.electron.fetchtaxOptions();
      setTaxOptions(response.map(tax => ({
        value: tax.id,
        label: `${tax.codeType} - ${tax.codeValue}`
      })));
    } catch (error) {
      console.error('Error fetching tax options:', error);
      setTaxOptions([]);
    }
  };

  const fetchOptionsFromJson = () => {
    setCountyOptions(counties.map(county => ({ value: county.name, label: county.name })));
    setItemTypeOptions(itemTypes.map(itemType => ({ value: itemType.name, label: itemType.name })));
    setPackagingUnitOptions(packagingUnits.map(unit => ({ value: unit.name, label: unit.name })));
    setQuantityUnitOptions(quantityUnits.map(unit => ({ value: unit.name, label: unit.name })));
    setPaymentTypeOptions(paymentTypes.map(payment => ({ value: payment.name, label: payment.name })));
  };

  const handleSearch = () => {
    const { name = '', itemCode = '' } = searchParams;

    const filtered = products.filter(product =>
      (name === '' || (product.name && product.name.toLowerCase().includes(name.toLowerCase()))) &&
      (itemCode === '' || (product.itemCode && product.itemCode.toLowerCase().includes(itemCode.toLowerCase())))
    );

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductToEdit(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const itemCode = await generateItemCode(productToEdit);
      const newProduct = { ...productToEdit, itemCode };

      if (productToEdit.id === null) {
        await window.electron.addProduct(newProduct);
      } else {
        await window.electron.updateProduct(newProduct);
      }

      setShowModal(false);
      fetchProducts();
      toast.success('Product saved successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product.');
    }
  };

  const generateItemCode = async (product: Product): Promise<string> => {
    if (product.itemCode) return product.itemCode;

    const maxId = await fetchMaxProductId();
    const newId = maxId + 1;
    const generatedCode = `${product.county}-${product.itemType}-${newId}`;
    return generatedCode;
  };

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setShowModal(true);
  };

  const handleView = (product: Product) => {
    setProductToView(product);
    setShowViewModal(true);
  };

  const handleDelete = async (id: number | null) => {
    try {
      await window.electron.deleteProduct(id);
      fetchProducts();
      toast.success('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product.');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target?.result as string;
        parseCsvData(csvData);
      };
      reader.readAsText(file);
    }
  };

  const parseCsvData = (csvData: string) => {
    const rows = csvData.split('\n').filter(row => row.trim());
    const parsedProducts: Product[] = rows.map((row, index) => {
      const [name, description, price, quantity, tax, unit, county, itemType, packagingUnit, quantityUnit, paymentType] = row.split(',');
      return {
        id: index + 1,
        name,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        tax,
        unit,
        county,
        itemType,
        packagingUnit,
        quantityUnit,
        paymentType,
        itemCode: `${county}-${itemType}-${index + 1}`,
      };
    });
    setProducts(prevProducts => [...prevProducts, ...parsedProducts]);
  };

  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Container fluid>
      <Row>
        <Col xs={2} id="sidebar-wrapper">
          <Sidebar />
        </Col>
        <Col xs={10} id="page-content-wrapper">
          <Header />
          <Container>
            <Row className="my-3">
              <Col>
                <h4>Product Management</h4>
              </Col>
              <Col className="text-right">
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  Add New Product
                </Button>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form>
                  <Form.Row>
                    <Col md={4}>
                      <Form.Group controlId="searchName">
                        <Form.Control
                          type="text"
                          placeholder="Search by Product Name"
                          name="name"
                          value={searchParams.name}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group controlId="searchItemCode">
                        <Form.Control
                          type="text"
                          placeholder="Search by Item Code"
                          name="itemCode"
                          value={searchParams.itemCode}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Button variant="primary" onClick={handleSearch}>
                        Search
                      </Button>
                    </Col>
                  </Form.Row>
                </Form>
              </Col>
            </Row>
            <Row>
              <Col>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Tax</th>
                      <th>Unit</th>
                      <th>County</th>
                      <th>Item Type</th>
                      <th>Packaging Unit</th>
                      <th>Quantity Unit</th>
                      <th>Payment Type</th>
                      <th>Item Code</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="text-center">
                          <Spinner animation="border" />
                        </td>
                      </tr>
                    ) : (
                      currentProducts.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.description}</td>
                          <td>{product.price}</td>
                          <td>{product.quantity}</td>
                          <td>{product.tax}</td>
                          <td>{product.unit}</td>
                          <td>{product.county}</td>
                          <td>{product.itemType}</td>
                          <td>{product.packagingUnit}</td>
                          <td>{product.quantityUnit}</td>
                          <td>{product.paymentType}</td>
                          <td>{product.itemCode}</td>
                          <td>
                            <Button
                              variant="info"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleView(product)}
                            >
                              View
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEdit(product)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
                <Pagination>
                  {[...Array(Math.ceil(filteredProducts.length / itemsPerPage))].map((_, index) => (
                    <Pagination.Item
                      key={index + 1}
                      active={index + 1 === currentPage}
                      onClick={() => handlePageChange(index + 1)}
                    >
                      {index + 1}
                    </Pagination.Item>
                  ))}
                </Pagination>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.File
                  label="Import CSV"
                  custom
                  onChange={handleCsvImport}
                />
              </Col>
            </Row>
          </Container>

          {/* Add/Edit Modal */}
          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>{productToEdit.id ? 'Edit Product' : 'Add Product'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="productName">
                  <Form.Label>Product Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter product name"
                    name="name"
                    value={productToEdit.name}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productDescription">
                  <Form.Label>Product Description</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter product description"
                    name="description"
                    value={productToEdit.description}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productPrice">
                  <Form.Label>Product Price</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter product price"
                    name="price"
                    value={productToEdit.price}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productQuantity">
                  <Form.Label>Product Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter product quantity"
                    name="quantity"
                    value={productToEdit.quantity}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productTax">
                  <Form.Label>Tax</Form.Label>
                  <Select
                    options={taxOptions}
                    value={taxOptions.find(option => option.value === productToEdit.tax)}
                    onChange={option => setProductToEdit({ ...productToEdit, tax: option?.value || '' })}
                  />
                </Form.Group>
                <Form.Group controlId="productUnit">
                  <Form.Label>Unit</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter unit"
                    name="unit"
                    value={productToEdit.unit}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productCounty">
                  <Form.Label>County</Form.Label>
                  <Select
                    options={countyOptions}
                    value={countyOptions.find(option => option.value === productToEdit.county)}
                    onChange={option => setProductToEdit({ ...productToEdit, county: option?.value || '' })}
                  />
                </Form.Group>
                <Form.Group controlId="productItemType">
                  <Form.Label>Item Type</Form.Label>
                  <Select
                    options={itemTypeOptions}
                    value={itemTypeOptions.find(option => option.value === productToEdit.itemType)}
                    onChange={option => setProductToEdit({ ...productToEdit, itemType: option?.value || '' })}
                  />
                </Form.Group>
                <Form.Group controlId="productPackagingUnit">
                  <Form.Label>Packaging Unit</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter packaging unit"
                    name="packagingUnit"
                    value={productToEdit.packagingUnit}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productQuantityUnit">
                  <Form.Label>Quantity Unit</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter quantity unit"
                    name="quantityUnit"
                    value={productToEdit.quantityUnit}
                    onChange={handleProductChange}
                  />
                </Form.Group>
                <Form.Group controlId="productPaymentType">
                  <Form.Label>Payment Type</Form.Label>
                  <Select
                    options={paymentTypeOptions}
                    value={paymentTypeOptions.find(option => option.value === productToEdit.paymentType)}
                    onChange={option => setProductToEdit({ ...productToEdit, paymentType: option?.value || '' })}
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleSaveProduct}>
                Save Product
              </Button>
            </Modal.Footer>
          </Modal>

          {/* View Modal */}
          <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>View Product</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p><strong>Product Name:</strong> {productToView.name}</p>
              <p><strong>Description:</strong> {productToView.description}</p>
              <p><strong>Price:</strong> {productToView.price}</p>
              <p><strong>Quantity:</strong> {productToView.quantity}</p>
              <p><strong>Tax:</strong> {productToView.tax}</p>
              <p><strong>Unit:</strong> {productToView.unit}</p>
              <p><strong>County:</strong> {productToView.county}</p>
              <p><strong>Item Type:</strong> {productToView.itemType}</p>
              <p><strong>Packaging Unit:</strong> {productToView.packagingUnit}</p>
              <p><strong>Quantity Unit:</strong> {productToView.quantityUnit}</p>
              <p><strong>Payment Type:</strong> {productToView.paymentType}</p>
              <p><strong>Item Code:</strong> {productToView.itemCode}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductManagement;


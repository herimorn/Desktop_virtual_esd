import React, { FC, useState,useRef, useEffect, ReactNode } from 'react';
import { Container, Row, Col, Table, Button, Form, Modal, Pagination, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { RouteComponentProps } from 'react-router-dom';
import Select from 'react-select'; // For searchable dropdowns
import '../../renderer/getStarted.css';
import { Header } from '../Layouts/nav';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Sidebar } from '../Layouts/sidebar';
import "./product.css";
import data from '../../../database/data.json';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import productApi from '../api/productApi'; // Import the provided API

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
  tax_id: any;
  codeType: string;
  codeValue:string;
  country:string;
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
const counties = [
  { name: "Tanzania", code: "TZ" },
  { name: "Kenya", code: "KE" },
  { name: "Uganda", code: "UG" },
  { name: "Rwanda", code: "RW" },
  { name: "Burundi", code: "BR" },
  { name: "Congo", code: "CO" },
];

const itemTypes = [
  { name: "Raw Material", code: "1" },
  { name: "Finished Product", code: "2" },
  { name: "Service", code: "3" }
];

const packagingUnits = [
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
  { name: "Cassete", code: "CS" }
];

const quantityUnits = [
  { name: "kg", code: "KG" },
  { name: "gram", code: "G" },
  { name: "litres", code: "L" },
  { name: "tones", code: "T" },
  { name: "ml", code: "ML" },
  { name: "oz", code: "OZ" },
  { name: "pounds", code: "LB" },
  { name: "gallons", code: "GAL" },
  { name: "cuft", code: "CUFT" },
  { name: "cuin", code: "CUIN" }
];

const paymentTypes = [

];
// Define the component
const AllProduct: FC<RouteComponentProps> = () => {

  const format_number = (num: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TSH',minimumFractionDigits: 0,
      maximumFractionDigits: 0}).format(num);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const fileInputRef = useRef(null);
  const [userData, setUserData] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<{
    itemCode: string | number | string[] | undefined; name: string; description: string; price: string; quantity: string
}>({ name: '', description: '', price: '', quantity: '' });
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
    itemCode: ''
  });
  const [productToView, setProductToView] = useState<Product | null>(null);
  const [taxOptions, setTaxOptions] = useState<{ value: string; label: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [countyOptions, setCountyOptions] = useState<{ value: string; label: string }[]>([]);
  const [itemTypeOptions, setItemTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [packagingUnitOptions, setPackagingUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [quantityUnitOptions, setQuantityUnitOptions] = useState<{ value: string; label: string }[]>([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState<boolean>(true);
  console.log(productToView)
  console.log("the user data are",userData);

  useEffect(() => {
    fetchProducts();
    fetchTaxOptions();
    fetchUserData();
    fetchOptionsFromJson();
  }, []);

  const fetchMaxProductId = async (): Promise<number> => {
    try {
      // Fetch all products to get the maximum ID
      const response: Product[] = await window.electron.fetchProducts();
      const maxId = response.reduce((max, product) => product.id && product.id > max ? product.id : max, 0);
      return maxId;
    } catch (error) {
      console.error('Error fetching maximum product ID:', error);
      return 0;
    }
  };

   // Fetch user data on component mount
  //  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = await window.electron.fetchUserData();
        // Convert BLOB data to Base64 if needed
        if (user.profile && user.profile instanceof Blob) {
          user.profile = await convertBlobToBase64(user.profile);
        }
        setUserData(user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
  //   fetchUserData();
  // }, []); // Empty dependency array means this runs once on mount
  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.get('/');
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error fetching products.');
    } finally {
      setLoading(false);
    }
  };
  const fetchTaxOptions = async () => {
    try {
      const response: TaxOption[] = await window.electron.fetchtaxOptions();
      console.log("the tax response is",response)
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
        // Add new product
        await productApi.post('/', productToEdit);
        toast.success('Product added successfully!');
      } else {
        // Update existing product
        await productApi.put(`/${productToEdit.id}`, productToEdit);
        toast.success('Product updated successfully!');
      }
      fetchProducts(); // Refresh the product list
      setShowModal(false); // Close the modal
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error saving product.');
    }
  };

  // const handleSave = async () => {
  //   try {
  //     const itemCode = await generateItemCode(productToEdit);
  //     const newProduct = { ...productToEdit, itemCode };

  //     // Ensure `newProduct` is a plain object
  //     if (productToEdit.id === null) {
  //       await window.electron.addProduct(newProduct);
  //     } else {
  //       await window.electron.updateProduct(newProduct);
  //     }

  //     fetchProducts(); // Refresh the product list
  //     setShowModal(false); // Close the modal
  //   } catch (error) {
  //     console.error('Error saving product:', error);
  //   }
  // };

const generateItemCode = async (product: Product): Promise<string> => {
  const maxProductId = await fetchMaxProductId();
  const newProductId = maxProductId ? maxProductId + 1 : 1;

  const countryCode = counties.find(c => c.name === product.county)?.code || '';
  const itemTypeCode = itemTypes.find(it => it.name === product.itemType)?.code || '';
  const packagingUnitCode = packagingUnits.find(pu => pu.name === product.packagingUnit)?.code || '';
  const quantityUnitCode = quantityUnits.find(qu => qu.name === product.quantityUnit)?.code || '';

  return `${countryCode}${itemTypeCode}${packagingUnitCode}${quantityUnitCode}000000${newProductId}`;
};

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setShowModal(true);
  };

  const handleView = (product: Product) => {
    setProductToView(product);
    setShowViewModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setShowViewModal(false);
    setProductToEdit({
      id: null,
      name: '',
      description: '',
      price: 0,
      quantity: 0,
      tax: '',
      unit: '',
      country: '',
      itemType: '',
      packagingUnit: '',
      quantityUnit: '',
      paymentType: '',
      itemCode: '',
    });
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await productApi.delete(`/${id}`);
        toast.success('Product deleted successfully!');
        fetchProducts(); // Refresh the product list
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Error deleting product.');
      }
    }
  };
  //fetch user data..

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const transformCodeType = (codeType: string) => {
    switch (codeType) {
      case 'codeE':
        return 'Exempted';
      case 'codeD':
        return 'SR';
      default:
        return codeType.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
  };

    // Transform taxOptions labels
    const transformedTaxOptions = taxOptions.map(option => ({
      ...option,
      label: transformCodeType(option.label)
    }));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

   let number=1

  const handleImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        Papa.parse(event.target.files[0], {
            header: true,
            skipEmptyLines: true,
            complete: async (results: { data: Product[]; }) => {
                // Ensure each product has an itemCode generated if it's missing
                const csvData: Product[] = await Promise.all(
                    results.data.map(async (row) => {
                        // Use your generateItemCode function if itemCode is not provided
                        const itemCode = row.itemCode || await generateItemCode(row);
                        return {
                            id: row.id ? Number(row.id) : null, // Convert to number, handle missing IDs
                            name: row.name || '',
                            description: row.description || '',
                            price: parseFloat(row.price || '0'), // Convert price to float
                            quantity: parseInt(row.quantity || '0'), // Convert quantity to integer
                            tax: row.tax || '',
                            unit: row.unit || '',
                            county:userData.country || '',
                            itemType: row.itemType || '',
                            packagingUnit: row.packagingUnit || '',
                            quantityUnit: row.quantityUnit || '',
                            paymentType: row.paymentType || '',
                            itemCode, // Generated or existing itemCode
                        };
                    })
                );

                try {
                    const existingProducts = await window.electron.fetchProducts(); // Fetch existing products
                    const existingProductMap = new Map(
                        existingProducts.map((product: { itemCode: any; }) => [product.itemCode, product]) // Map products by `itemCode`
                    );

                    for (const product of csvData) {
                        if (existingProductMap.has(product.itemCode)) {
                            // Product exists, update it
                            const existingProduct = existingProductMap.get(product.itemCode);
                            const updatedProduct = { ...existingProduct, ...product };
                            await window.electron.updateProduct(updatedProduct);
                        } else {
                            // Product doesn't exist, add it
                            await window.electron.addProduct(product);
                        }
                    }

                    fetchProducts(); // Refresh product list after import
                    toast.success('Data import successfully!');
                } catch (error) {
                    console.error('Error importing CSV data:', error);
                    toast.error('Error importing CSV data.');
                }
            }
        });
    }
};

const handleDownloadExcel = () => {
  // Define the data based on your screenshot
  const data = [
    { id: 1, name: 'Dettol', description: 'dettol', price: 10, quantity: 1, tax: 0, itemType: 'Raw Material', packagingUnit: 'Ampoule', quantityUnit: 'kg' },
    { id: 2, name: 'Azam Embe', description: 'Test', price: 800, quantity: 0, tax: 4, itemType: 'Raw Material', packagingUnit: 'Ampoule', quantityUnit: 'gram' },
    { id: 3, name: 'Mo enery', description: 'dettol', price: 10, quantity: 0, tax: 5, itemType: 'Raw Material', packagingUnit: 'Ampoule', quantityUnit: 'kg' },
    { id: 4, name: 'Azam Tunda', description: 'Test', price: 800, quantity: 0, tax: 1, itemType: 'Raw Material', packagingUnit: 'Ampoule', quantityUnit: 'gram' }
  ];

  // Create a worksheet from the data
  const worksheet = XLSX.utils.json_to_sheet(data);
  // Set column widths to improve readability
  worksheet['!cols'] = [
    { wch: 5 },  // ID column width
    { wch: 15 }, // Name column width
    { wch: 20 }, // Description column width
    { wch: 10 }, // Price column width
    { wch: 10 }, // Quantity column width
    { wch: 5 },  // Tax column width
    { wch: 15 }, // Item Type column width
    { wch: 15 }, // Packaging Unit column width
    { wch: 15 }  // Quantity Unit column width
  ];

  // Add bold headers with a background color
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4F81BD" } },
    alignment: { horizontal: "center" }
  };

  // Apply styles to headers
  const headers = [
    "id", "name", "description", "price", "quantity",
    "tax", "itemType", "packagingUnit", "quantityUnit"
  ];
  headers.forEach((header, index) => {
    const cellAddress = XLSX.utils.encode_cell({ c: index, r: 0 });
    worksheet[cellAddress].s = headerStyle;
  });

  // Create a new workbook and append the styled worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  // Trigger file download
  XLSX.writeFile(workbook, "Products.csv");
};



  return (
    <>
      <Header />
      <Container fluid className="p-0 " style={{fontFamily:'CustomFont'}}>
      <Header />
    <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{marginTop:18}}>
          <h3 style={{marginTop:4}} className="mb-3" >All Product</h3>
            <Form className='mb-3 flex-1'>
              <div style={{display:'flex',maxWidth:'100%',flexWrap:'wrap', gap:20}} >
              <Form.Group controlId='searchName'>
                <Form.Control type='text' placeholder='Enter product name' name='name' value={searchParams.name} onChange={handleInputChange}
                style={{width:300}} />
              </Form.Group>
              <Form.Group controlId='searchQuantity'>
                <Form.Control type='text' placeholder='Enter Item code' name='itemCode' value={searchParams.itemCode} onChange={handleInputChange}
                style={{width:300}}/>
              </Form.Group>
              <Button size="sm" variant="secondary" onClick={handleSearch}
              className='btn-sm rounded-pill'
              style={{width:150, height:40, marginTop:2}}>
                <i className="bi bi-search">{' '}search </i>
              </Button>
              <Button
              style={{height:30, marginTop:2, maxWidth:100}}
    size="sm"
    variant="danger"
    className="btn-sm rounded-pill d-flex align-items-center flex-fill" // Add flex-fill for equal width
    onClick={handleDownloadExcel}
  >
    <i className="bi bi-plus-circle me-2"></i>
    Download
  </Button>


          <Col
  style={{
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '20px',
    alignItems: 'center',
    marginLeft: '70%'
  }}
  md={3}
  className="text-right d-flex" // Add d-flex here
>


  <Button
    size="sm"
    variant="secondary"
    className="btn-sm rounded-pill d-flex align-items-center flex-fill" // Add flex-fill for equal width
    onClick={handleImport}
  >
    <i className="bi bi-plus-circle me-2"></i>
    Import
  </Button>

  <input
    type="file"
    ref={fileInputRef}
    style={{ display: 'none' }}
    accept=".csv"
    onChange={handleFileChange}
  />

  <Button
    size="sm"
    variant="danger"
    onClick={() => setShowModal(true)}
    className="btn-sm rounded-pill flex-fill" // Add flex-fill for equal width
  >
    <i className="bi bi-plus-circle">{' '}</i>Add Product
  </Button>
</Col>

              </div>
            </Form>
            {loading ? (
              <Spinner animation='border' />
            ) : (
              <Table striped bordered hover className='Product' style={{marginTop:-10}}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Name</th>
                    <th>Item Code</th>
                    <th>Price/unit</th>
                    <th style={{width:'10%',height:5}}>Actions</th>
                  </tr>
                </thead>
                <tbody>

                  {paginatedProducts.map((product, index) => (

                    <tr key={product.id} style={{height:2}}>
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{product.name}</td>
                      <td>{product.itemCode}</td>
                      <td>{format_number(product.price)}</td>
                      <td style={{
                        display: 'flex',
                        gap: '4px',  // Reduced gap
                        padding: '4px 8px',  // Reduced padding
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                      }}>
                        <Button
                        className='editButton'
                          variant='outline-warning'
                          onClick={() => handleEdit(product)}

                          title="Edit"
                        >
                          <i className="bi bi-pencil" style={{ position: 'relative', top: '-1px' }}></i>
                        </Button>
                        <Button
                        className='viewButton'
                          variant='outline-secondary'
                          onClick={() => handleView(product)}

                          title="View"
                        >
                          <i className="bi bi-eye" style={{ position: 'relative', top: '-1px' }}></i>
                        </Button>
                        <Button
                        className='deleteButton'
                          variant='outline-danger'
                          onClick={() => handleDelete(product.id!)}

                          title="Delete"
                        >
                          <i className="bi bi-trash" style={{ position: 'relative', top: '-1px' }}></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

<Pagination style={{marginLeft:'45%'}}>
              {Array.from({ length: Math.ceil(filteredProducts.length / itemsPerPage) }).map((_, index) => (
                <Pagination.Item key={index + 1} active={index + 1 === currentPage} onClick={() => handlePageChange(index + 1)}>
                  {index + 1}
                </Pagination.Item>
              ))}
            </Pagination>
          </Col>
        </Row>

        {/* Add/Edit Product Modal */}
      <Modal show={showModal} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>{productToEdit.id ? 'Edit Product' : 'Add Product'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
            <Row className="mb-2">
            <Col md={6}>
              <Form.Group controlId='productName'>
                <Form.Label>Product Name</Form.Label>
                <Form.Control type='text' name='name' value={productToEdit.name} onChange={handleProductChange} />
              </Form.Group>
              </Col>
              <Col md={6}>
              <Form.Group controlId='productDescription'>
                <Form.Label>Description</Form.Label>
                <Form.Control type='text' name='description' value={productToEdit.description} onChange={handleProductChange} />
              </Form.Group>
              </Col>
              </Row>
              <Row className='mt-4'>
              <Col md={6}>
              <Form.Group controlId='productPrice'>
                <Form.Label>Price/Unit</Form.Label>
                <Form.Control type='number' name='price' value={productToEdit.price} onChange={handleProductChange} />
              </Form.Group>
              </Col>
              <Col md={6}>
              <Form.Group controlId='productTax'>
        <Form.Label>Tax</Form.Label>
        <Select
          options={transformedTaxOptions}
          onChange={(option) => setProductToEdit(prevState => ({ ...prevState, tax: option?.value || '' }))}
          value={transformedTaxOptions.find(option => option.value === productToEdit.tax)}
        />
      </Form.Group>
              </Col>
              </Row>

              <Row className='mt-4'>
                <Col md={6}>
                <Form.Group controlId='productCounty'>
                <Form.Label>County</Form.Label>
                <Select options={countyOptions} onChange={(option) => setProductToEdit(prevState => ({ ...prevState, county: option?.value || '' }))} value={countyOptions.find(option => option.value === productToEdit.county)} />
              </Form.Group>
              </Col>
              <Col md={6}>
              <Form.Group controlId='productItemType'>
                <Form.Label>Item Type</Form.Label>
                <Select options={itemTypeOptions} onChange={(option) => setProductToEdit(prevState => ({ ...prevState, itemType: option?.value || '' }))} value={itemTypeOptions.find(option => option.value === productToEdit.itemType)} />
              </Form.Group>
              </Col>
              </Row>
              <Row className='mt-4'>
               <Col md={6}>
               <Form.Group controlId='productPackagingUnit'>
                <Form.Label>Packaging Unit</Form.Label>
                <Select options={packagingUnitOptions} onChange={(option) => setProductToEdit(prevState => ({ ...prevState, packagingUnit: option?.value || '' }))} value={packagingUnitOptions.find(option => option.value === productToEdit.packagingUnit)} />
              </Form.Group>
              </Col>
              <Col md={6}>
              <Form.Group controlId='productQuantityUnit'>
                <Form.Label>Quantity Unit</Form.Label>
                <Select options={quantityUnitOptions} onChange={(option) => setProductToEdit(prevState => ({ ...prevState, quantityUnit: option?.value || '' }))} value={quantityUnitOptions.find(option => option.value === productToEdit.quantityUnit)} />
              </Form.Group>
              </Col>
              </Row>

              <Row className='mt-4'>
              <Col md={6}>

              </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant='secondary' onClick={handleClose} style={{width:80}}>Close</Button>
            <Button variant='danger' onClick={handleSave} style={{width:80}}>{productToEdit.id ? 'Save Changes' : 'Add'}</Button>
          </Modal.Footer>
        </Modal>

        {/* View Product Modal */}
        <Modal show={showViewModal} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Product Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {productToView && (
              <>
                <p><strong>Name:</strong> {productToView.name}</p>
                <p><strong>Description:</strong> {productToView.description}</p>
                <p><strong>Price:</strong> {format_number(productToView.price)}</p>
                <p><strong>Quantity:</strong> {productToView.quantity}</p>
                <p>
                <strong>Tax:</strong>
{productToView.codeType === 'codeE'
  ? 'Exempted'
  : productToView.codeType === 'codeD'
  ? 'SR'
  : `${productToView.codeType}- ${productToView.codeValue}%`}
</p>
  <p><strong>ItemCode:</strong> {productToView.itemCode}</p>
                <p><strong>County:</strong> {productToView.country}</p>
                <p><strong>Item Type:</strong> {productToView.itemType}</p>
                <p><strong>Packaging Unit:</strong> {productToView.packagingUnit}</p>
                <p><strong>Quantity Unit:</strong> {productToView.quantityUnit}</p>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant='secondary' onClick={handleClose}>Close</Button>
          </Modal.Footer>
        </Modal>
        <ToastContainer/>
      </Container>
    </>
  );
};

export default AllProduct;

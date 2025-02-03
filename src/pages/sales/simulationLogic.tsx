import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
// import { Container, Button, Table } from 'react-bootstrap';
import jsQR from 'jsqr'; // Import jsQR
import { Margin } from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Cursor,
  Crop,
  ArrowsMove,
  ArrowsAngleExpand,
  Scissors,
  AspectRatio,
  SlashCircle,
} from 'react-bootstrap-icons';
import "./customization.css";
import CustomizationPreview from './customizationPreview';

export const Customization: React.FC = () => {
  const [fontSize, setFontSize] = useState<string>('16px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [imageSize, setImageSize] = useState<number>(100);
  const [editMode, setEditMode] = useState<boolean>(false);
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [isBackButtonVisible, setIsBackButtonVisible] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string>('cursor');
  const [selectionArea, setSelectionArea] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [currentTool, setCurrentTool] = useState(''); // Current selected tool
  const [selectedElement, setSelectedElement] = useState(null); // Currently selected element
  const canvasRef = useRef(null); // Canvas reference
  const [elements, setElements] = useState([]); // All elements on the canvas
  const link="https://virtual.tra.go.tz/efdmsRctVerify/";


  useEffect(() => {
    const handleAfterPrint = () => {
      setIsBackButtonVisible(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw elements on the canvas
    elements.forEach(element => {
      if (element.type === 'text') {
        ctx.font = `${element.fontSize}px ${element.fontFamily}`;
        ctx.fillText(element.text, element.x, element.y);
      } else if (element.type === 'image') {
        const img = new Image();
        img.src = element.src;
        img.onload = () => {
          ctx.drawImage(img, element.x, element.y, element.width, element.height);
        };
      }
    });
  }, [elements]);

  const handleToolSelect = (tool) => {
    setCurrentTool(tool);
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'select') {
      // Check if an element is clicked
      const element = elements.find(el => isPointInsideElement(x, y, el));
      if (element) {
        setSelectedElement(element);
      }
    } else if (currentTool === 'move' && selectedElement) {
      // Update the selected element's position
      const updatedElements = elements.map(el =>
        el === selectedElement ? { ...el, x, y } : el
      );
      setElements(updatedElements);
    }
    // Add more tool handling as necessary
  };

  const isPointInsideElement = (x, y, element) => {
    if (element.type === 'text') {
      const width = element.text.length * element.fontSize;
      return x >= element.x && x <= element.x + width && y >= element.y - element.fontSize && y <= element.y;
    } else if (element.type === 'image') {
      return x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height;
    }
    return false;
  };

  const handleSave = () => {
    // Logic to save the canvas content or export as an image
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    console.log('Canvas saved as image:', dataURL);
  };


  const downloadInvoiceAsPDF = async () => {
    const invoiceElement = document.getElementById('invoice');
    if (invoiceElement) {
      try {
        const canvas = await html2canvas(invoiceElement);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' for size

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Calculate height to maintain aspect ratio

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save('invoice.pdf');
      } catch (error) {
        console.error('Error generating or downloading PDF:', error);
      }
    }
  };


  // Convert BLOB to Base64
  const convertBlobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Fetch user data on component mount
  useEffect(() => {
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
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchSaleDetails();
  }, [saleId]);

  const fetchSaleDetails = async () => {
    try {
      const response: Sale[] = await window.electron.fetchSalesDetails();
      const saleDetail = response.find(sale => sale.sale_id.toString() === saleId);
      console.log('Sale details:', saleDetail);
      setSale(saleDetail || null);
      if (saleDetail) {
        const invoiceDetails = await window.electron.fetchBarcodeDetails(saleDetail.sale_id, saleDetail.invoice_number);
        console.log('Invoice Details:', invoiceDetails);
        setQrCodeUrl(invoiceDetails.qr_code_image_url);
        if (invoiceDetails.qr_code_image_url) {
          await extractUrlFromQRCode(invoiceDetails.qr_code_image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
    }
  };

  const extractUrlFromQRCode = async (imageUrl: string) => {
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        if (code && code.data) {
          setExtractedUrl(code.data);
        } else {
          console.error('No QR code found in the image.');
        }
      }
    };
    img.onerror = () => {
      console.error('Error loading image.');
    };
  };

  const calculateTotal = () => {
    if (!sale) return 0;
    return sale.products.reduce((sum, product) => sum + product.selling_price * product.sold_quantity, 0);
  };

  const printInvoice = () => {
    //handle preview before printing
    window.print();
  };

  if (!sale) {
    return <div>Loading...</div>;
  }

  const sendToTRA = async () => {
    if (!sale || !userData) {
      console.error("Sale or user data is missing");
      return;
    }

    const saleData = {
      ...sale,
      company_name: userData.companyName,
      company_email: userData.email,
      company_country: userData.country,
      company_profile: userData.profile,
    };

    try {
      const response = await window.electron.sendSaleDataToTRA(saleData);
      console.log('Data sent to TRA:', response);
      if (response.success) {
        toast.success('Data sent successfully to TRA!');
        sessionStorage.setItem('traResponse', JSON.stringify({ success: response.success, message }));
        navigate(-1);
      } else {
        console.error('Failed to send data:', response.error);
        sessionStorage.setItem('traResponse', JSON.stringify({ success: false, message: 'Error sending data to TRA. Please try again.' }));
        alert('Failed to send data to TRA. Please try again.');
      }
    } catch (error) {
      console.error('Error sending data to TRA:', error);
      alert('Error sending data to TRA. Please try again.');
    }
  };

  const calculateExclusiveAmount = () => {
    if (!sale) return 0;
    return sale.products.reduce((sum, product) => sum + product.selling_price * product.sold_quantity, 0);
  };

  const calculateTaxAmount = (exclusiveAmount: number) => {
    if (!sale || !sale.tax_codeValue) return 0;
    const taxPercentage = parseFloat(sale.tax_codeValue) / 100;
    return exclusiveAmount * taxPercentage;
  };

  const calculateGrandTotal = (exclusiveAmount: number, taxAmount: number) => {
    return exclusiveAmount + taxAmount;
  };

  const exclusiveAmount = calculateExclusiveAmount();
  const taxAmount = calculateTaxAmount(exclusiveAmount);
  const grandTotal = calculateGrandTotal(exclusiveAmount, taxAmount);
  const total = calculateTotal();

  // const handleSave = () => {
  //   sessionStorage.setItem('customization', JSON.stringify({ fontSize, fontFamily, imageSize }));
  //   alert('Customization saved!');
  // };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  // useEffect(() => {
  //   // Optional: You can update the preview component in real-time
  // }, [fontSize, fontFamily, imageSize]); // Dependency array

  return (
    <Container fluid className="customization-container">
      <Row className="mb-4 align-items-center">
        <Col>
          <h1 className="fw-bold">Customize Invoice</h1>
        </Col>
        <Col className="text-end">
          <Button variant="secondary" onClick={toggleEditMode} className="edit-mode-btn">
            {editMode ? 'View Mode' : 'Edit Mode'}
          </Button>
        </Col>
      </Row>
      <Row>
        <Col md={editMode ? 8 : 12}>
          {/* Preview component updates in real-time */}
          <>
      <style>
        {`
          @media print {
            .no-print {
              display: none;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
               /* Ensure that all colors are preserved during printing */
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          margin:0,
          padding:0,
        }
        .invoiceContainer {
          background-color: #ffffff;
          color: #000000;

        }
        .invoiceTitle {
          color: #b45f06; /* Color is enforced for print */
        }
        .tableHeader {
          background-color: #b45f06;
          color: #ffffff;
        }
        .tableFooter {
          background-color: #f4f4f4;
          color: #000000;
        }


          }
        `}
      </style>
      <Container id="invoice" style={styles.invoiceContainer}>
        <div style={styles.invoiceHeader}>
          <div style={styles.companyInfo}>
            <br/>
            <strong>{userData?.companyName}</strong>
            <br/>
            {userData?.address}, {userData?.country}
            <br/>
            Phone no.: {userData?.phone}
            <br/>
            Email: {userData?.email}
          </div>
          {userData?.profile && (
            <img src={userData?.profile} alt="Company Logo" style={{width:imageSize}} />
          )}
        </div>
        <hr style={styles.hrStyle} />
        <h1 style={styles.invoiceTitle}>COMMERCIAL INVOICE </h1>
        <div style={styles.invoiceDetails}>
          <div style={styles.billTo}>
            <strong>Bill To</strong>
            <strong>Custumizationnhhhhh</strong>
            <br/>
            <br />
            <strong>COMPANY NAME:</strong>{'  '}{sale.customer_name}
            <br />
            <strong>TIN:</strong>{'   '}{sale.tin}
            <br />
            <strong>ADDRESS:</strong>{'   '}{sale.address}
            <br />
            <strong>MOB:</strong>{'   '}{sale.phone}
            <br />
            <strong>EMAIL:</strong>{'   '}{sale.email}
            <br />
          </div>
          <div style={styles.invoiceInfo}>
            <strong>Invoice No.: </strong>{sale.invoice_number}
            <br />
            <strong>Date: </strong>{new Date(sale.date).toLocaleDateString()}
            <br />
          </div>
        </div>
        <Table bordered style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th>#</th>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Price/Unit</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.products.map((product, index) => (
              <tr key={product.product_id}>
                <td>{index + 1}</td>
                <td>{product.product_name}</td>
                <td>{product.sold_quantity}</td>
                <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(product.selling_price)}</td>
                <td>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0,
      maximumFractionDigits: 0}).format(product.selling_price * product.sold_quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot style={styles.tableFooter}>
            <tr>
              <td colSpan={4} style={styles.textRight}><strong>Total</strong></td>
              <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',minimumFractionDigits: 0, }).format(total)}</strong></td>
            </tr>
          </tfoot>
        </Table>
        <div style={styles.descriptionSection}>
          <Table bordered style={styles.totalTable}>
            <tbody>
              <tr>
                <td style={styles.textRight}><strong>Exclusive Amount</strong></td>
                <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',    minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(exclusiveAmount)}</strong></td>
              </tr>
              <tr>
                <td style={styles.textRight}><strong>Tax Amount</strong></td>
                <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',    minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(taxAmount)}</strong></td>
              </tr>
              <tr>
                <td style={styles.textRight}><strong>Grand Total</strong></td>
                <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS' ,    minimumFractionDigits: 0,
      maximumFractionDigits: 0}).format(grandTotal)}</strong></td>
              </tr>
            </tbody>
          </Table>
        </div>
        {/* <div style={styles.bankDetails}>
          <p><strong>BANK DETAILS</strong></p>
          <p><strong>Bank Name:</strong> CRDB</p>
          <p><strong>Acc Number:</strong> 0150823309400</p>
          <p><strong>Acc Name:</strong> {userData?.companyName}</p>
          <p><strong>Swift Code:</strong> CORUTZTZ</p>
          <p><strong>Currency:</strong> TZS</p>
        </div> */}
        <div style={styles.invoiceFooter}>
        <div dangerouslySetInnerHTML={{ __html: sale.invoice_description }} />
          <p><strong>Authorized Signature custumization</strong></p>
          <p>For: {userData?.companyName}</p>
        </div>




        {qrCodeUrl && (
          <div style={styles.qrCodeContainer}>
            <img src={qrCodeUrl} alt="QR Code" style={styles.qrCodeImage} />
            {extractedUrl && (
              <a style={{marginTop:'5%'}}
              href={`https://virtual.tra.go.tz/efdmsRctVerify/${extractedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.extractedUrl}
            >
              {extractedUrl}
            </a>
            )}
          </div>
        )}
      </Container>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <Button style={{ width: 300, marginLeft: 700, marginTop: 20 }} variant="secondary" className="btn-sm no-print mr-2" onClick={printInvoice}>
          Print Invoice
        </Button>

      </div>
    </>
        </Col>
        {editMode && (
          <Col md={4} className="edit-tools-container">
            <div className="edit-tools p-3 rounded shadow-sm">
              <h3 className="mb-3">Edit Tools</h3>
              <Form>
                <Form.Group controlId="fontFamily" className="mb-3">
                  <Form.Label>Font Family</Form.Label>
                  <Form.Control
                    type="text"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                  />
                </Form.Group>
                <Form.Group controlId="fontSize" className="mb-3">
                  <Form.Label>Font Size</Form.Label>
                  <Form.Control
                    type="text"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                  />
                </Form.Group>
                <Form.Group controlId="imageSize" className="mb-4">
                  <Form.Label>Image Size (in px)</Form.Label>
                  <Form.Control
                    type="number"
                    value={imageSize}
                    onChange={(e) => setImageSize(Number(e.target.value))}
                  />
                </Form.Group>
                <h4 className="mb-3">Tools</h4>
                <div className="tool-buttons d-flex flex-wrap">
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Selection Tool" onClick={() => handleToolSelect('cursor')}>
                    <Cursor size={24} />
                    <span className="ms-2">Select</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Move Tool"onClick={() => handleToolSelect('move')}>
                    <ArrowsMove size={24} />
                    <span className="ms-2">Move</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Crop Tool" onClick={() => handleToolSelect('crop')}>
                    <Crop size={24} />
                    <span className="ms-2">Crop</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Resize Tool" onClick={() => handleToolSelect('resize')}>
                    <ArrowsAngleExpand size={24} />
                    <span className="ms-2">Resize</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Cut Tool">
                    <Scissors size={24} />
                    <span className="ms-2">Cut</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Aspect Ratio Tool">
                    <AspectRatio size={24} />
                    <span className="ms-2">Aspect</span>
                  </Button>
                  <Button variant="outline-primary" className="me-2 mb-2 tool-btn" title="Remove Background">
                    <SlashCircle size={24} />
                    <span className="ms-2">Remove BG</span>
                  </Button>
                </div>
                <Button variant="primary" onClick={handleSave} className="mt-4 w-100">
                  Save Customizations
                </Button>
              </Form>
            </div>
          </Col>
        )}
      </Row>
    </Container>
  );
};


const styles = {
  invoiceContainer: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'CustomFont',
  },
  invoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin:0,// Removes margins from the container
    padding: 0,
  },
  companyInfo: {
    fontSize: '15px',

    color: '#000000',
    margin:0,
    padding:0,
  },
  invoiceLogo: {
    width: '100px',
    height: 'auto',
  },
  invoiceTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#b45f06',
    textAlign: 'center',
    marginBottom: '20px',
  },
  invoiceDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  billTo: {
    fontSize: '14px',
    color: '#000000',
  },
  invoiceInfo: {
    fontSize: '14px',
    color: '#000000',
  },
  table: {
    fontSize: '14px',
    color: '#000000',
    marginBottom: '20px',
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    backgroundColor: '#b45f06',
    color: '#000000',
    textAlign: 'center',
  },
  tableFooter: {
    maxWidth:'50px',
    backgroundColor: '#f4f4f4',
    color: '#000000',
  },
  textRight: {
    textAlign: 'right',
  },
  descriptionSection: {
    width:'50%',
     marginLeft: 'auto',
  },
  totalTable: {
    fontSize: '14px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  bankDetails: {
    fontSize: '14px',
    color: '#000000',
     marginTop:'-17%',
    // backgroundColor: '#ffffff',
  },
  invoiceFooter: {
    fontSize: '14px',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  actionButtons: {
    marginTop: '20px',
    width: '80px',
    display: 'flex',
    gap: 5,
  },
  qrCodeContainer: {
    width: '100px',
    height: '100px',
marginLeft: '48%',
marginTop: '5%',
    marginRight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrCodeImage: {
    width: '100%',
    height: 'auto',
  },
  extractedUrl: {
    marginTop: '10px',
    fontSize: '14px'
  },
  hrStyle:{
    // background:'red',
    border:'solid red 1px',
    position:'relative',
    top:'-20px',
  },
};




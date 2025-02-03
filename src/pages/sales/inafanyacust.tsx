import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Button, Table } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import jsQR from 'jsqr'; // Import jsQR
import { Margin } from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Draggable from 'react-draggable';
import "./invoice.css";
import { ArrowLeft } from 'react-bootstrap-icons';
import Spinner from 'react-bootstrap/Spinner';



interface Product {
  description: ReactNode;
  product_id: number;
  product_name: string;
  itemCode: string;
  sold_quantity: number;
  selling_price: number;
}

interface Sale {
  invoice_description: any;
  phone: React.ReactNode;
  tin: React.ReactNode;
  email: React.ReactNode;
  address: React.ReactNode;
  invoice_number: string;
  sale_id: number;
  date: string;
  total_amount: number;
  customer_name: string;
  products: Product[];
  qr_code_image_url?: string;
}

const Invoice: React.FC = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [isBackButtonVisible, setIsBackButtonVisible] = useState(true);
  const [saleDetail, setSaleDetail] = useState([]);
  const [imageSize, setImageSize] = useState(0);
  const [positions, setPositions] = useState({});
  const link = 'https://virtual.tra.go.tz/efdmsRctVerify/';
  const [selectedSections, setSelectedSections] = useState([]);
  console.log("the saleDetails is",saleDetail);
  const defaultPosition = { x: 0, y: 0 };


  const [customStyles, setCustomStyles] = useState({
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    color: '#000000',
    backgroundColor: '#ffffff',
  });

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsBackButtonVisible(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);
  const handleDragStop = (e, data:any, sectionId:any) => {
    console.log(`drag sto data is`,data,e,sectionId);
    console.log('the position of the drag stop is',positions)
    setPositions(prevPositions => ({
      ...prevPositions,
      [sectionId]: { x: data.x, y: data.y }
    }));
  };
  const handleSectionClick = (sectionId) => {
    // setSelectedSections(prevSelectedSections => {
    //   if (prevSelectedSections.includes(sectionId)) {
    //     // If the section is already selected, deselect it
    //     return prevSelectedSections.filter(id => id !== sectionId);
    //   } else {
    //     // Otherwise, select it
    //     return [...prevSelectedSections, sectionId];
    //   }
    // });
  };
  const handleBack = (e:any) => {
    e.preventDefault();
    navigate('/all-sales');
  };


  // Convert BLOB to Base64
  const convertBlobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const applyCustomStyles = (sectionId: string) => {
      return selectedSections.includes(sectionId) ? customStyles : {};
    };


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
        // Add a 5-second delay before setting loading to false
        setTimeout(() => {
          setLoading(false);
        }, 3000);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    fetchSaleDetails();
    fetchCustomizations();
    fetchCustumizations();
  }, [saleId]);

  const fetchCustomizations = async () => {
    try {
      const response = await window.electron.fetchCustomizationData();

      // Check if response is null or undefined
      if (!response) {
        console.error('Customization response is null or undefined.');
        return;
      }

      // Check if imageSize is present
      if (response.imageSize == null) { // This checks for both null and undefined
        console.warn('Image size is not defined in the response.');
        return; // Optionally return or set a default value
      }

      console.log('Customizations response is:', response);
      setImageSize(response.imageSize);
    } catch (error) {
      console.error('Error fetching customization data:', error);
    }
  };


  // fetchCustomizations();
  const fetchCustumizations=()=>{
    window.electron.fetchStyles().then(data => {
      console.log("the custumizations data is",data)
      const styles = {};
      const pos = {};
      data.forEach(({ sectionId, styles: sectionStyles, position }) => {
        styles[sectionId] = sectionStyles;
        pos[sectionId] = position;
      });
      setCustomStyles(styles);
      setPositions(pos);
    });
  }

  const fetchSaleDetails = async () => {
    try {
      const response: Sale[] = await window.electron.fetchSalesDetails();
      const saleDetail = response.find(
        (sale) => sale.sale_id.toString() === saleId,
      );

      setSaleDetail(saleDetail);
      setSale(saleDetail || null);

      if (saleDetail) {
        const invoiceDetails = await window.electron.fetchBarcodeDetails(
          saleDetail.sale_id,
          saleDetail.invoice_number,
        );

        // Check if invoiceDetails is defined and has qr_code_image_url
        if (invoiceDetails && invoiceDetails.qr_code_image_url) {
          setQrCodeUrl(invoiceDetails.qr_code_image_url);
          await extractUrlFromQRCode(invoiceDetails.qr_code_image_url);
        } else {
          console.warn('Invoice details are undefined or QR code image URL is missing.');
          setQrCodeUrl(null); // Optionally handle the absence of a QR code URL
        }
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
    }
  };


  const extractUrlFromQRCode = async (imageUrl: string) => {
    const img = new Image();
    img.src = imageUrl;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
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
    return sale.products.reduce(
      (sum, product) => sum + product.selling_price * product.sold_quantity,
      0,
    );
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
      console.error('Sale or user data is missing');
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
        navigate("/all-sales");
      } else {
        console.error('Failed to send data:', response.error);
        sessionStorage.setItem(
          'traResponse',
          JSON.stringify({
            success: false,
            message: 'Error sending data to TRA. Please try again.',
          }),
        );
        alert('Failed to send data to TRA. Please try again.');
      }
    } catch (error) {
      console.error('Error sending data to TRA:', error);
      alert('Error sending data to TRA. Please try again.');
    }
  };

  const calculateExclusiveAmount = () => {
    if (!sale) return 0;
    return sale.products.reduce(
      (sum, product) => sum + product.selling_price * product.sold_quantity,
      0,
    );
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

  return (
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
          color: #000;
        }
        .tableFooter {
          background-color: #f4f4f4;
          color: #000000;
        }


          }
        `}
      </style>

      <Button onClick={handleBack} className="mb-3 no-print" style={{width:'5%',marginLeft:'95%',backgroundColor:'#6c757d'}} className="font">
            <ArrowLeft />  {/* Added the back icon here */}
          </Button>

      <Link to={`/customization/${saleId}`}>
        <button className="btn btn-secondary btn-sm no-print" style={{position:'relative',top:-45,width:100}}> Customize</button>
      </Link>
      <Container id="invoice" style={styles.invoiceContainer} className="font" >


<div style={styles.invoiceHeader}>
   <Draggable position={positions.companyInfo || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'companyInfo')} disabled={true}  >
  <div id="companyInfo"
onClick={() => handleSectionClick('companyInfo')}
style={{ ...styles.companyInfo, ...applyCustomStyles('companyInfo') }}>
    <br/>
    <strong>{userData?.companyName}</strong>
    <br/>
    {userData?.address}, {userData?.country}
    <br/>
    Phone no.: {userData?.phone}
    <br/>
    Email: {userData?.email}
  </div>
  </Draggable>
    <div id="companyLogo" onClick={() => handleSectionClick('companyLogo')}
style={{ ...styles.companyLogo, ...applyCustomStyles('companyLogo') }}>
   <Draggable  position={positions.companyLogo || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'companyLogo')}  disabled={true} >

  {userData?.profile && (
    <img src={userData?.profile} alt="Company Logo" style={{width:parseInt(imageSize)}} />
  )}
  </Draggable>
  </div>
</div>

<hr
id="hrStyle"
 onClick={() => handleSectionClick('hrStyle')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('hrStyle'),border:'solid red 1px' }} />
<Draggable position={positions.invoiceTitle || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceTitle')}  disabled={true} >
<h1  id="invoiceTitle"  onClick={() => handleSectionClick('invoiceTitle')}
 style={{ ...styles.invoiceTitle, ...applyCustomStyles('invoiceTitle') }} >TAX  INVOICE </h1>
</Draggable>
<div id='invoiceDetails'  onClick={() => handleSectionClick('invoiceDetails')}
 style={{ ...styles.invoiceDetails, ...applyCustomStyles('invoiceDetails') }} >
  <Draggable position={positions.invoiceDetails || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceDetails')}  disabled={true} disabled={true} >
  <div id="billTo" onClick={() => handleSectionClick('billTo')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('billTo') }} >

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
  </Draggable>
  <Draggable
            position={positions.invoiceInfo || { x: 0, y: 0 }}
            onStop={(e, data) => handleDragStop(e, data, 'invoiceInfo')}
            disabled={true}
          >
            <div
              id="invoiceInfo"
              onClick={() => handleSectionClick('invoiceInfo')}
              style={{
                ...styles.invoiceInfo,
                ...applyCustomStyles('invoiceInfo'),
              }}
            >
              <strong>INVOICE NO.: </strong>
              {sale.invoice_number}
              <br />
              <strong>Date: </strong>
              {new Date(sale.date).toLocaleDateString()}
              <br />
              {/* <strong>TIN: </strong>
              {sale.tin}
              <br /> */}
              <strong>VRN: </strong>
              {sale.VRN}
              <br />
            </div>
          </Draggable>
</div>

<Draggable position={positions.table || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'table')}  disabled={true} >
<Table bordered id="table" onClick={() => handleSectionClick('table')}
 style={{ ...styles.table, ...applyCustomStyles('table') }}>
  <thead id="tableHeader" onClick={() => handleSectionClick('tableHeader')}
 style={{ ...styles.tableHeader, ...applyCustomStyles('tableHeader') }}>
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
  <tfoot  id="tableFooter" onClick={() => handleSectionClick('tableFooter')}
 style={{ ...styles.tableFooter, ...applyCustomStyles('tableFooter') }}>
    <tr>
      <td colSpan={4} style={styles.textRight}><strong>Total</strong></td>
      <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',minimumFractionDigits: 0, }).format(total)}</strong></td>
    </tr>
  </tfoot>
</Table>
</Draggable>
<Draggable position={positions.descriptionSection || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'descriptionSection')}  disabled={true} >
<div   id="descriptionSection" onClick={() => handleSectionClick('descriptionSection')}
 style={{ ...styles.descriptionSection, ...applyCustomStyles('descriptionSection') }}>

  <Table bordered  id="totalTable" onClick={() => handleSectionClick('totalTable')}
 style={{ ...styles.totalTable, ...applyCustomStyles('totalTable') }}>
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
</Draggable>
<div className="approval-section" >
        <p>Prepared by: ........................................</p>
        <p>Approved by: ........................................</p>
        <p>Checked by: ........................................</p>
      </div>
{/* <div style={styles.bankDetails}>
  <p><strong>BANK DETAILS</strong></p>
  <p><strong>Bank Name:</strong> CRDB</p>
  <p><strong>Acc Number:</strong> 0150823309400</p>
  <p><strong>Acc Name:</strong> {userData?.companyName}</p>
  <p><strong>Swift Code:</strong> CORUTZTZ</p>
  <p><strong>Currency:</strong> TZS</p>
</div> */}

<div  id="invoiceFooter" onClick={() => handleSectionClick('invoiceFooter')}
 style={{ ...styles.invoiceFooter, ...applyCustomStyles('invoiceFooter') }} >
  <Draggable  position={positions.invoice_description || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoice_description')}  disabled={true} >
<div>
<div dangerouslySetInnerHTML={{ __html: sale.invoice_description }} />
  <p><strong>Authorized Signature</strong></p>
  <p>For: {userData?.companyName}</p>
  </div>
  </Draggable>
</div>



<Draggable position={positions.qrCodeContainer || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'qrCodeContainer')}  disabled={true} >
<div id="qrCodeContainer" onClick={() => handleSectionClick('qrCodeContainer')}
 style={{ ...styles.qrCodeContainer, ...applyCustomStyles('qrCodeContainer') }}>

{qrCodeUrl && (
  <div style={styles.qrCodeContainer}>
    <img src={qrCodeUrl} alt="QR Code" style={styles.qrCodeImage} />
    {extractedUrl && (
      <a style={{marginTop:'5%'}}
      href={`${extractedUrl}`}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.extractedUrl}
    >
      {extractedUrl}
    </a>
    )}


  </div>


)}
</div>
</Draggable>

<div
  className="footer"
  style={{
    position: 'absolute',
    bottom: 15, // Sets footer 15px above the container bottom
    margin: 0,
    padding: 0,
    width: '95%', // Ensures it stretches across the container
  }}
>
  <div className='footer-highlight'>
    <em>
      Telecommunication Infrastructure, Consultancy Services and Investors.
    </em>
  </div>
  <div>
    <div className="company-info">
      <p style={{ marginBottom: 0 }}>
        {userData?.companyName} –{userData?.address} – {userData.country}
      </p>
      <p style={{ marginTop: 0 }}>
      Tel: +{userData?.phone} | Cell: +255 629 122 111 | Email:{' '}
        <a href="mailto:info@utel.cco.tz">{userData?.email}</a> | Web:{' '}
        <a href="http://www.utel.co.tz">{}</a>
      </p>
    </div>
  </div>
</div>


</Container>


{!qrCodeUrl && (
  <div style={{
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '20px',
  }}>
    <Button
      style={{ width: 300, marginLeft: 700, marginTop: 20 }}
      variant="secondary"
      className="btn-sm no-print mr-2"
      onClick={sendToTRA}
      disabled={loading}
    >
      {loading ? (
        <>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
          <span style={{ marginLeft: 10 }}>Sending...</span>
        </>
      ) : (
        'Send To TRA'
      )}
    </Button>
  </div>
)}


    </>
  );
};

const styles = {
  invoiceContainer: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    position:'relative',
    fontFamily: 'CustomFont',
  },
  invoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 0, // Removes margins from the container
    padding: 0,
  },
  companyInfo: {
    fontSize: '15px',

    color: '#000000',
    margin: 0,
    padding: 0,
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
    backgroundColor: '#000',
  },
  tableHeader: {
    backgroundColor: '#b45f06',
    color: '#000',
    textAlign: 'center',
  },
  tableFooter: {
    maxWidth: '50px',
    backgroundColor: '#f4f4f4',
    color: '#000000',
  },
  textRight: {
    textAlign: 'right',
  },
  descriptionSection: {
    width: '50%',
    marginLeft: 'auto',
  },
  totalTable: {
    fontSize: '14px',
    color: '#000',
    backgroundColor: '#ffffff',
  },
  bankDetails: {
    fontSize: '14px',
    color: '#000000',
    marginTop: '-17%',
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
    fontSize: '14px',
  },
  hrStyle: {
    // background:'red',
    // border: 'solid red 1px',
    position: 'relative',
    top: '-20px',
  },
};

export default Invoice;

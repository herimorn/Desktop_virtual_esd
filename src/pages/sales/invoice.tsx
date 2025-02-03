import React, { useEffect, useState,useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Button, Table } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import jsQR from 'jsqr'; // Import jsQR
import { Margin } from '@mui/icons-material';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Draggable from 'react-draggable';
import "./invoice.css";
import { ArrowLeft, Download } from 'react-bootstrap-icons';
import { BsDownload,BsGear ,BsGear, BsEnvelope,BsPrinter } from "react-icons/bs";


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
  proforma_number?: string;
}

const Invoice: React.FC = () => {
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
  const [saleDetail,setSaleDetail] = useState([]);
  const [imagePosition, setImagePosition] = useState<number>(0);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [positions, setPositions] = useState({});
  // const [customStyles, setCustomStyles] = useState({});
  const [sectionsData, setSectionsData] = useState({});
  // console.log("why invoice number is" ,sale.invoice_number)
  const defaultPosition = { x: 0, y: 0 };
  const [headerImage, setHeaderImage] = useState<string>(userData?.profile || '');
  const [footerImage, setFooterImage] = useState<string>(userData?.profile || '');

  const fontFamilies = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'PT Sans', label: 'PT Sans' },
    { value: 'Merriweather', label: 'Merriweather' },
    {value :'font', label:'font'},
    // Add more fonts as needed
  ];
const [customStyles, setCustomStyles] = useState({
  fontFamily: 'Arial, sans-serif',
  fontSize: '16px',
  color: '#000000',
  backgroundColor: '#ffffff',
});

  const fetchAllStyleCustomization = async () => {
    try {
      const response = await window.electron.fetchImageHeader();
      console.log('Style customization data:', response);

      if (response && response[0]) {
        // Handle Header Image
        if (response[0].header_images) {
          const headerSection = document.querySelector('.invoice-header');
          if (headerSection) {
            // Clear existing background containers first
            const existingBg = headerSection.querySelector('.bg-container');
            if (existingBg) {
              existingBg.remove();
            }

            // Create a container for the background image
            const bgContainer = document.createElement('div');
            bgContainer.className = 'bg-container';
            bgContainer.style.cssText = `
              position: absolute;
              top: -10;
              left: -18;
              width: 105%;
              height: 100%;
              z-index: 1;
            `;

            const headerImg = document.createElement('img');
            headerImg.src = response[0].header_images;
            headerImg.style.cssText = `
              width: 100%;
              margin-top:0px;
              margin-left: -20px;
              height: 110%;
              object-fit: cover;
            `;

            bgContainer.appendChild(headerImg);
            headerSection.style.position = 'relative';
            headerSection.style.minHeight = '150px';

            // Insert background container as first child
            headerSection.insertBefore(bgContainer, headerSection.firstChild);
          }
        }

        // Handle Footer Image
        if (response[0].footer_images) {
          const footerSection = document.querySelector('.footer');
          if (footerSection) {
            // Clear existing background containers first
            const existingBg = footerSection.querySelector('.bg-container');
            if (existingBg) {
              existingBg.remove();
            }

            // Create a container for the background image
            const bgContainer = document.createElement('div');
            bgContainer.className = 'bg-container';
            bgContainer.style.cssText = `
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 1;
            `;

            const footerImg = document.createElement('img');
            footerImg.src = response[0].footer_images;
            footerImg.style.cssText = `
              width: 107%;
              height: 100%;
              object-fit: cover;
            `;

            bgContainer.appendChild(footerImg);
            footerSection.style.position = 'relative';
            footerSection.style.minHeight = '150px';

            // Insert background container as first child
            footerSection.insertBefore(bgContainer, footerSection.firstChild);
          }
        }
      }
    } catch (error) {
      console.error('Error applying customizations:', error);
    }
  };

  useEffect(() => {
    fetchSaleDetails();
    fetchCustumizations();
    fetchCustomizations();
    fetchAllStyleCustomization();
  }, [saleId, sale?.invoice_number]);

//   // Fetch custom styles and positions from the backend when the component mounts
//   window.electron.fetchStyles(sale.invoice_number).then(data => {
//     console.log("fetched  custumisation data is",data)
//     const styles = {};
//     const pos = {};
//     data.forEach(({ sectionId, styles: sectionStyles, position }) => {
//       // styles[sectionId] = sectionStyles;
//       pos[sectionId] = position;
//     });
//     // setCustomStyles(styles);
//     setPositions(pos);
//   });
// }, [sale.invoice_number]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsBackButtonVisible(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);
  const handleToolSelection = (tool: string) => {
    setSelectedTool(tool);
    if (tool !== 'crop') {
      setSelectionArea(null); // Reset selection when switching tools
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'selection' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setSelectionArea({ x, y, width: 100, height: 100 }); // Example size, you can customize this
    }
  };

  const handleCrop = () => {
    if (selectedTool === 'crop' && selectionArea && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const { x, y, width, height } = selectionArea;
        const croppedImage = context.getImageData(x, y, width, height);
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        context.putImageData(croppedImage, 0, 0);
        setImageSize(width); // Adjust the image size if needed
      }
    }
  };
  //handling the customer selection and be able to change the font family and font size also

  const handleSectionClick = (sectionId) => {
    setSelectedSections(prevSelectedSections => {
      if (prevSelectedSections.includes(sectionId)) {
        // If the section is already selected, deselect it
        return prevSelectedSections.filter(id => id !== sectionId);
      } else {
        // Otherwise, select it
        return [...prevSelectedSections, sectionId];
      }
    });
  };

  const applyCustomStyles = (sectionId: string) => {
    return selectedSections.includes(sectionId) ? customStyles : {};
  };

  const handleStyleChange = (newStyles: { fontFamily: string; fontSize: string; color: string; backgroundColor: string; }) => {
    setCustomStyles(prevStyles => ({
      ...prevStyles,
      ...newStyles
    }));
  };
  // const CustomizationTools = ({ selectedSection, setFontFamily, setFontSize, setColor, setBackgroundColor }) => {

  // }
  const handleFontFamilyChange = (selectedOption: { value: any; }) => {
    setCustomStyles({ ...customStyles, fontFamily: selectedOption.value });
  };
//saving the data to the database
// const handleSave = () => {
//   setShowPopup(true);
// };

const handleSaveForThisInvoice = () => {
  setShowPopup(false);
  selectedSections.forEach(sectionId => {
    window.electron.saveStyles(sectionId, customStyles, positions[sectionId]);
  });
  const customizationData = JSON.stringify({
    fontSize,
    fontFamily,
    imageSize
});

window.electron.sendCustomizationData(customizationData);

//console.log("the custumization is",customizationData)
alert('Customization saved!');
sessionStorage.removeItem('customization');
navigate(`/invoice/${saleId}`);

};
const handleDragStop = (e: any, data: any, sectionId: string) => {
  setPositions(prevPositions => ({
    ...prevPositions,
    [sectionId]: { x: data.x, y: data.y }
  }));
};

const handleSaveForAllInvoices = async () => {
  setShowPopup(false);
  // await saveStylesToBackend(null, styles, positions);  // Pass null for invoiceId
};


//then please save the data to the backend database




  // const onDragEnd = (result:any) => {
  //   const { destination, source, draggableId } = result;

  //   if (!destination) return; // If no destination, return early

  //   // Update image position based on the drag result
  //   const newPosition = result.destination.index;
  //   console.log(newPosition)
  //   setImagePosition(newPosition);

  //   if (destination.droppableId === source.droppableId && destination.index === source.index) {
  //     return; // If dropped in the same place, do nothing
  //   }

  //   // Update your state or perform actions based on drag result
  //   console.log('Item moved:', draggableId);
  // };




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
    fetchCustumizations();
    fetchCustomizations();
  fetchAllStyleCustomization();

  }, [saleId,sale?.invoice_number]);
  const  fetchCustomizations = async () =>{
    try {

    const  response = await window.electron.fetchCustomizationData(saleDetail.sale_id,saleDetail.invoice_number);
    console.log('Customizations response is now:', response);
    setImageSize(response.imageSize)
    }
    catch (error) {
      console.error('Error fetching sale details:', error);
    }

    }




  const fetchSaleDetails = async () => {
    try {
      const response: Sale[] = await window.electron.fetchSalesDetails();
      const saleDetail = response.find(sale => sale.sale_id.toString() === saleId);
      console.log('Sale details:', saleDetail);
      setSaleDetail(saleDetail);
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
  //function to fetch the invoice number
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

  const handleSave = () => {
    console.log(sale.id,sale.invoice_number)
    setShowPopup(false);
    selectedSections.forEach(sectionId => {
      window.electron.saveStyles(sectionId, customStyles, positions[sectionId]);
    });
    const customizationData = JSON.stringify({
      fontSize,
      fontFamily,
      imageSize
  });

  window.electron.sendCustomizationData(customizationData);

  //console.log("the custumization is",customizationData)
  alert('Customization saved!!!!');
  sessionStorage.removeItem('customization');

    // setShowPopup(true);


    // saleDetail_id=saleDetail.sale_id,
    // saleDetailInvoice=saleDetail.invoice_number,
    // console.log(sale.id, sale.invoice_number);

    // const customizationData = JSON.stringify({
    //     fontSize,
    //     fontFamily,
    //     imageSize,
    //     saleId: saleDetail.sale_id,
    //     invoiceNumber: saleDetail.invoice_number
    // });

    // window.electron.sendCustomizationData(customizationData);

    // console.log("the custumization is",customizationData)
    // alert('Customization saved!');
    // sessionStorage.removeItem('customization');
    // navigate(-1);
  };
  const downloadInvoiceAndSendEmail = async (customerEmail: string) => {
    try {
      const invoiceElement = document.getElementById('invoice');
      if (!invoiceElement) {
        alert('Could not generate PDF: Invoice element not found');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // Render invoice using html2canvas with cloned styles
      const fullCanvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc: Document) => {
          // Ensure all necessary styles are retained
          const clonedInvoice = clonedDoc.getElementById('invoice');
          if (clonedInvoice) {
            // Ensure custom or external styles are fully applied
          }
        },
      });

      const margin = 10;
      const usableWidth = 210 - 2 * margin;

      pdf.addImage(
        fullCanvas,
        'JPEG',
        margin,
        margin,
        usableWidth,
        (fullCanvas.height * usableWidth) / fullCanvas.width
      );

      // Convert PDF to ArrayBuffer
      const pdfBlob = pdf.output('arraybuffer');

      // Send request to save and email the PDF
      const response = await window.electron.saveAndSendInvoice(customerEmail, pdfBlob);

      if (response.success) {
        alert('Email sent successfully!');
      } else {
        alert(`Failed to send email: ${response.error}`);
      }
    } catch (error) {
      console.error('Error in downloadInvoiceAndSendEmail:', error);
      alert(`Error: ${error.message}`);
    }
  };



  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  const handleBack = (e:any) => {
      e.preventDefault();
      navigate('/all-sales');
    };

  // useEffect(() => {
  //   // Optional: You can update the preview component in real-time
  // }, [fontSize, fontFamily, imageSize]); // Dependency array
   const handleUpdateHeader = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleImageUpload(e as React.ChangeEvent<HTMLInputElement>, 'header');
    input.click();
  };

  const handleUpdateFooter = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleImageUpload(e as React.ChangeEvent<HTMLInputElement>, 'footer');
    input.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'footer') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Update state based on type
      if (type === 'header') {
        setHeaderImage(base64Image);
      } else {
        setFooterImage(base64Image);
      }

      // Save to database
      await window.electron.updateCustomization({
        [`${type}_images`]: base64Image,
        invoice_number: sale.invoice_number
      });

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} image updated successfully!`);
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      toast.error(`Failed to update ${type} image`);
    }
  };
  const downloadInvoiceAsPDF = async () => {
    try {
      const invoiceElement = document.getElementById('invoice');
      if (!invoiceElement) {
        toast.error('Could not generate PDF: Invoice element not found');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const options = {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc: Document) => {
          // Ensure styles are preserved
          const clonedInvoice = clonedDoc.getElementById('invoice');
          if (clonedInvoice) {
            // Copy necessary styles if needed
          }
        },
      };

      const fullCanvas = await html2canvas(invoiceElement, options);
      const margin = 10;
      const usableWidth = 210 - 2 * margin;

      pdf.addImage(
        fullCanvas,
        'JPEG',
        margin,
        margin,
        usableWidth,
        (fullCanvas.height * usableWidth) / fullCanvas.width
      );

      pdf.save(`invoice-${sale?.invoice_number || 'download'}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error in downloadInvoiceAsPDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };


  // Example of how to wrap a draggable section
  const DraggableWrapper = ({ children, sectionId }: { children: React.ReactNode, sectionId: string }) => {
    return (
      <Draggable
        defaultPosition={{ x: 0, y: 0 }}
        position={positions[sectionId] || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, sectionId)}
        disabled={!editMode} // Add editMode state if you want to control when dragging is enabled
        bounds="parent"
      >
        <div>{children}</div>
      </Draggable>
    );
  };

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
              /* Remove any explicit page breaks */
            }
            /* Ensure content flows naturally */
            #invoice {
              page-break-inside: auto;
            }
            /* Allow tables to break across pages */
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            /* Prevent orphaned headers */
            thead {
              display: table-header-group;
            }
            /* Prevent orphaned footers */
            tfoot {
              display: table-footer-group;
            }
            /* Ensure footer stays at bottom of each page */
            .footer {
              position: fixed;
              bottom: 0;
              width: 100%;
              page-break-after: always;
            }
          }
        `}
      </style>
      <div style={{marginRight:'90%', gap:30}}>

<Button
        onClick={handleBack}
        className="mb-3"
        style={{ width: '30%', marginLeft: '55%', backgroundColor: '#6c757d' }}
        className="font  no-print"
      >
        <ArrowLeft /> {/* Added the back icon here */}
      </Button>

      <Link to={`/customization/${saleId}`}>
        <button className="btn btn-dark btn-sm no-print" style={{position:'relative',top:-45,width:'50%'}}>

        <BsGear />

        </button>
      </Link>


</div>



      <div
  style={{
    display: 'flex',
    justifyContent: 'center', // Centers the buttons
    gap: '10px', // Reduces space between buttons
    marginBottom: '20px',
   marginLeft:'90%',
   position: 'relative', top: -80
  //  marginTop: '50%'
  }}
>
<Button
    style={{ width: 50, marginTop: 10 }}
    variant="secondary"
    size="sm"
    lable="print"
    className="no-print"
    onClick={printInvoice}
  >
    <BsPrinter />
  </Button>
  <Button
    style={{ width: 50, marginTop: 10 }}
    variant="danger"
    size="sm"
    className="no-print"
    label="download"
    onClick={downloadInvoiceAsPDF}
  >
    <BsDownload />
  </Button>

  <Button
    style={{ width: 50, marginTop: 10 }}
    variant="dark"
    size="sm"
    className="no-print"
    onClick={() => downloadInvoiceAndSendEmail(sale.email)}
  >
    <BsEnvelope />
  </Button>

</div>

      <Container id="invoice" style={{
        ...styles.invoiceContainer,
        minHeight: '100vh', // Ensure container takes full height
        display: 'flex',
        flexDirection: 'column',
      }} className="font" >


      <div className="invoice-header" style={styles.invoiceHeader}>
   <DraggableWrapper sectionId="companyInfo">
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
  </DraggableWrapper>
    <DraggableWrapper sectionId="companyLogo">
  <div id="companyLogo" onClick={() => handleSectionClick('companyLogo')}
style={{ ...styles.companyLogo, ...applyCustomStyles('companyLogo') }}>
   {userData?.profile && (
    <img src={userData?.profile} alt="Company Logo" style={{width:parseInt(imageSize)}} />
  )}
  </div>
  </DraggableWrapper>
</div>

<hr
id="hrStyle"
 onClick={() => handleSectionClick('hrStyle')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('hrStyle'),border:'solid red 1px' }} />
<Draggable position={positions.invoiceTitle || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceTitle')}  disabled={true} >
<h1  id="invoiceTitle"  onClick={() => handleSectionClick('invoiceTitle')}
 style={{ ...styles.invoiceTitle, ...applyCustomStyles('invoiceTitle') }} ></h1>
</Draggable>
<div id='invoiceDetails' onClick={() => handleSectionClick('invoiceDetails')}
 style={{ ...styles.invoiceDetails, ...applyCustomStyles('invoiceDetails') }} >
  <Draggable position={positions.invoiceDetails || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceDetails')} disabled={true}>
  <div id="billTo" onClick={() => handleSectionClick('billTo')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('billTo') }} >
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

      <strong>Invoice no: </strong>
      {sale.invoice_number}
      <br />
      {sale.profoma_number && (
        <div style={{ fontSize: '14px', color: '#000', marginBottom: '5px' }}>
          <strong>Ref Proforma no: </strong>{sale.profoma_number}
        </div>
      )}
      <strong>Date: </strong>
      {new Date(sale.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).split(' ').join('-')}
      <br />
      {/* <strong>VRN: </strong>
      {sale.VRN}
      <br /> */}
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
      <th>Item Description</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
  {sale.products && sale.products.length > 0 ? (
    sale.products.map((product, index) => (
      <tr key={product.product_id}>
        <td className="fixed-white-bg">{index + 1}</td>
        <td className="fixed-white-bg">{product.product_name}</td>
        <td className="fixed-white-bg">{product.product_description}</td>
        <td className="fixed-white-bg">{product.sold_quantity}</td>
        <td className="fixed-white-bg">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(product.selling_price)}
        </td>
        <td className="fixed-white-bg">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(product.selling_price * product.sold_quantity)}
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={6} className="fixed-white-bg" style={{ textAlign: 'center' }}>No products available</td>
    </tr>
  )}
</tbody>


  <tfoot id="tableFooter" onClick={() => handleSectionClick('tableFooter')}
 style={{ ...styles.tableFooter, ...applyCustomStyles('tableFooter') }}>
    <tr>
      <td colSpan={5} style={styles.textRight}><strong>Subtotal</strong></td>
      <td style={styles.textRight} colSpan={2}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(total)}</strong></td>
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
      {/* <tr>
        <td style={styles.textRight}><strong>Exclusive Amount</strong></td>
        <td style={styles.textRight}><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS',    minimumFractionDigits: 0,
maximumFractionDigits: 0 }).format(exclusiveAmount)}</strong></td>
      </tr> */}
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
  <p><strong>Authorized Signature </strong></p>
  <p>For: {userData?.companyName}</p>
  </div>
  </Draggable>
</div>



<Draggable position={positions.qrCodeContainer || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'qrCodeContainer')}  disabled={true} >
<div id="qrCodeContainer" className="qr-code-section" onClick={() => handleSectionClick('qrCodeContainer')}
 style={{ ...styles.qrCodeContainer, ...applyCustomStyles('qrCodeContainer') }}>
  {qrCodeUrl && (
    <div style={styles.qrCodeContainer}>
      <img src={qrCodeUrl} alt="QR Code" style={styles.qrCodeImage}  />
      {extractedUrl && (
        <a className='qr-url'style={{marginTop:'5%'}}
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

  <div>
    <div className="company-info">
      <p style={{ marginBottom: 0 }}>
        {userData?.companyName} –{userData?.address} – {userData?.country}
      </p>
      <p style={{ marginTop: 0 }}>
      Tel: {userData?.phone}  Email:{userData?.email}
        {userData?.email}

      </p>
    </div>
  </div>
</div>


</Container>
{/* <div
  style={{
    display: 'flex',
    justifyContent: 'center', // Centers the buttons
    gap: '20px', // Adds space between buttons
    marginBottom: '20px',
  }}
>
  <Button
    style={{ width: 300, marginTop: 20 }}
    variant="secondary"
    className="btn-sm no-print"
    onClick={printInvoice}
  >
Print Invoice
  </Button>
  <Button
    style={{ width: 300, marginRight:40, marginTop: 20 }}
    variant="danger"
    className="btn-sm no-print"
    onClick={downloadInvoiceAsPDF}
  >
    Download
  </Button>
  <Button
    style={{ width: 300, marginRight:40, marginTop: 20 }}
    variant="danger"
    className="btn-sm no-print"
    onClick={() => downloadInvoiceAndSendEmail(sale.email)}
  >
    Email
  </Button>

</div> */}

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
    position: 'relative',
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

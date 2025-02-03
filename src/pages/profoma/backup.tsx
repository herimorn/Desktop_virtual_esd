import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Button, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Draggable from 'react-draggable';
import { ArrowLeft } from 'react-bootstrap-icons';

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

const ProfomaDetails: React.FC = () => {
  const [state, setState] = useState({
    fontSize: '16px',
    fontFamily: 'Arial',
    imageSize: 100,
    editMode: false,
    sale: null,
    userData: null,
    loading: false,
    qrCodeUrl: null,
    extractedUrl: null,
    isBackButtonVisible: true,
    selectedTool: 'cursor',
    selectionArea: null,
    currentTool: '',
    selectedElement: null,
    canvasRef: useRef(null),
    elements: [],
    saleDetail: [],
    imagePosition: 0,
    selectedSection: null,
    selectedSections: [],
    showPopup: false,
    positions: {},
    sectionsData: {},
    headerImage: '',
    footerImage: '',
  });

  const { profoma_id } = useParams<{ profoma_id: string }>();
  const navigate = useNavigate();

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


  const fetchAllStyleCustomization = async () => {
    try {
      const response = await window.electron.fetchImagePraformaHeader();
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
    fetchAllStyleCustomization();
  }, [profoma_id, state.sale?.invoice_number]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setState(prev => ({ ...prev, isBackButtonVisible: false }));
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handleToolSelection = (tool: string) => {
    setState(prev => ({ ...prev, selectedTool: tool }));
    if (tool !== 'crop') {
      setState(prev => ({ ...prev, selectionArea: null }));
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.selectedTool === 'selection' && state.canvasRef.current) {
      const rect = state.canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setState(prev => ({ ...prev, selectionArea: { x, y, width: 100, height: 100 } }));
    }
  };

  const handleCrop = () => {
    if (state.selectedTool === 'crop' && state.selectionArea && state.canvasRef.current) {
      const context = state.canvasRef.current.getContext('2d');
      if (context) {
        const { x, y, width, height } = state.selectionArea;
        const croppedImage = context.getImageData(x, y, width, height);
        context.clearRect(0, 0, state.canvasRef.current.width, state.canvasRef.current.height);
        context.putImageData(croppedImage, 0, 0);
        setState(prev => ({ ...prev, imageSize: width }));
      }
    }
  };

  const handleSectionClick = (sectionId) => {
    setState(prev => ({
      ...prev,
      selectedSections: prev.selectedSections.includes(sectionId)
        ? prev.selectedSections.filter(id => id !== sectionId)
        : [...prev.selectedSections, sectionId]
    }));
  };

  const applyCustomStyles = (sectionId: string) => {
    return state.selectedSections.includes(sectionId) ? state.customStyles : {};
  };

  const handleStyleChange = (newStyles: { fontFamily: string; fontSize: string; color: string; backgroundColor: string; }) => {
    setState(prev => ({
      ...prev,
      customStyles: {
        ...prev.customStyles,
        ...newStyles
      }
    }));
  };

  const handleFontFamilyChange = (selectedOption: { value: any; }) => {
    setState(prev => ({
      ...prev,
      customStyles: {
        ...prev.customStyles,
        fontFamily: selectedOption.value
      }
    }));
  };

  const handleSaveForThisInvoice = () => {
    setState(prev => ({ ...prev, showPopup: false }));
    state.selectedSections.forEach(sectionId => {
      window.electron.saveStyles(sectionId, state.customStyles, state.positions[sectionId]);
    });
    const customizationData = JSON.stringify({
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      imageSize: state.imageSize,
    });

    window.electron.sendCustomizationData(customizationData);
    alert('Customization saved!');
    sessionStorage.removeItem('customization');
    navigate(`/profomaCustomazation/${profoma_id}`);
  };

  const handleDragStop = (e: any, data: any, sectionId: string) => {
    setState(prev => ({
      ...prev,
      positions: {
        ...prev.positions,
        [sectionId]: { x: data.x, y: data.y }
      }
    }));
  };

  const handleSaveForAllInvoices = async () => {
    setState(prev => ({ ...prev, showPopup: false }));
    // await saveStylesToBackend(null, styles, positions);  // Pass null for invoiceId
  };

  const convertBlobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  useEffect(() => {
    const fetchUserData = async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        const user = await window.electron.fetchUserData();
        // Convert BLOB data to Base64 if needed
        if (user.profile && user.profile instanceof Blob) {
          user.profile = await convertBlobToBase64(user.profile);
        }
        setState(prev => ({ ...prev, userData: user }));
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    };
    fetchUserData();
  }, []);

  const fetchSaleDetails = async () => {
    try {
      const response: Sale[] = await window.electron.fetchSalesDetails();
      const saleDetail = response.find(sale => sale.sale_id.toString() === profoma_id);
      console.log('Sale details:', saleDetail);
      setState(prev => ({ ...prev, saleDetail: saleDetail }));
      setState(prev => ({ ...prev, sale: saleDetail || null }));
      if (saleDetail) {
        const invoiceDetails = await window.electron.fetchBarcodeDetails(saleDetail.sale_id, saleDetail.invoice_number);
        console.log('Invoice Details:', invoiceDetails);
        setState(prev => ({ ...prev, qrCodeUrl: invoiceDetails.qr_code_image_url }));
        if (invoiceDetails.qr_code_image_url) {
          await extractUrlFromQRCode(invoiceDetails.qr_code_image_url);
        }
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
    }
  };

  const fetchCustumizations = () => {
    window.electron.fetchStyles().then(data => {
      console.log("the custumizations data is",data)
      const styles = {};
      const pos = {};
      data.forEach(({ sectionId, styles: sectionStyles, position }) => {
        styles[sectionId] = sectionStyles;
        pos[sectionId] = position;
      });
      setState(prev => ({ ...prev, customStyles: styles }));
      setState(prev => ({ ...prev, positions: pos }));
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
          setState(prev => ({ ...prev, extractedUrl: code.data }));
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
    if (!state.sale) return 0;
    return state.sale.products.reduce((sum, product) => sum + product.selling_price * product.sold_quantity, 0);
  };

  const printInvoice = () => {
    //handle preview before printing
    window.print();
  };

  if (!state.sale) {
    return <div>Loading...</div>;
  }

  const calculateExclusiveAmount = () => {
    if (!state.sale) return 0;
    return state.sale.products.reduce((sum, product) => sum + product.selling_price * product.sold_quantity, 0);
  };

  const calculateTaxAmount = (exclusiveAmount: number) => {
    if (!state.sale || !state.sale.tax_codeValue) return 0;
    const taxPercentage = parseFloat(state.sale.tax_codeValue) / 100;
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
    console.log(state.sale.id, state.sale.invoice_number)
    setState(prev => ({ ...prev, showPopup: false }));
    state.selectedSections.forEach(sectionId => {
      window.electron.saveStyles(sectionId, state.customStyles, state.positions[sectionId]);
    });
    const customizationData = JSON.stringify({
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      imageSize: state.imageSize,
    });

    window.electron.sendCustomizationData(customizationData);
    alert('Customization saved!!!!');
    sessionStorage.removeItem('customization');
  };

  const toggleEditMode = () => {
    setState(prev => ({ ...prev, editMode: !prev.editMode }));
  };

  const handleBack = (e:any) => {
      e.preventDefault();
      navigate('/all-profoma');
    };

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
        setState(prev => ({ ...prev, headerImage: base64Image }));
      } else {
        setState(prev => ({ ...prev, footerImage: base64Image }));
      }

      // Save to database
      await window.electron.updateCustomization({
        [`${type}_images`]: base64Image,
        invoice_number: state.sale.invoice_number
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

      // Create PDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Get page dimensions
      const pageRect = invoiceElement.getBoundingClientRect();

      // Get all required elements
      const qrSection = invoiceElement.querySelector('.qr-code-section');
      const footer = invoiceElement.querySelector('.footer');
      const footerImage = footer?.querySelector('.bg-container img');

      if (qrSection && footer && footerImage) {
        // Constants with exact measurements
        const A4_HEIGHT_PX = 1123;
        const PAGE_MARGIN = 20;
        const FOOTER_HEIGHT = 150;
        const BASE_PADDING = 20;
        const TOLERANCE_PX = 8;

        // Calculate positions
        const qrBottom = qrSection.getBoundingClientRect().bottom - pageRect.top;
        const contentBottom = qrBottom;

        const totalNeededHeight = contentBottom + FOOTER_HEIGHT + BASE_PADDING + PAGE_MARGIN;
        const shortage = totalNeededHeight - A4_HEIGHT_PX;
        const willFitOnPage = shortage <= TOLERANCE_PX;

        if (willFitOnPage) {
          // Temporarily move footer up by 90px
          const originalBottom = footer.style.bottom;
          footer.style.bottom = '75px'; // 15px (original) + 90px

          const fullCanvas = await html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
            logging: true,
            height: Math.ceil(totalNeededHeight + 50)
          });

          // Restore original footer position
          footer.style.bottom = originalBottom;

          // Add main content
          const margin = 10;
          const usableWidth = 210 - (2 * margin);
          pdf.addImage(
            fullCanvas,
            'JPEG',
            margin,
            margin,
            usableWidth,
            (fullCanvas.height * usableWidth) / fullCanvas.width
          );

        } else {
          // Keep existing multi-page code unchanged
          const mainCanvas = await html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
            logging: true,
            onclone: (clonedDoc) => {
              const clonedInvoice = clonedDoc.getElementById('invoice');
              if (clonedInvoice) {
                const clonedFooter = clonedInvoice.querySelector('.footer');
                if (clonedFooter) clonedFooter.remove();
              }
            }
          });

          // Add main content
          const margin = 10;
          const usableWidth = 210 - (2 * margin);
          pdf.addImage(
            mainCanvas,
            'JPEG',
            margin,
            margin,
            usableWidth,
            (mainCanvas.height * usableWidth) / mainCanvas.width
          );

          // Add footer to new page
          pdf.addPage();
          const footerImgSrc = footerImage.getAttribute('src');
          const img = new Image();
          img.crossOrigin = "Anonymous";

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = footerImgSrc;
          });

          const imgAspectRatio = img.width / img.height;
          const footerWidth = 190;
          const footerHeight = footerWidth / imgAspectRatio;

          pdf.addImage(
            img,
            'PNG',
            10,
            10,
            footerWidth,
            footerHeight
          );
        }
      }

      // Save PDF
      pdf.save(`invoice-${state.sale?.invoice_number || 'download'}.pdf`);
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
        position={state.positions[sectionId] || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, sectionId)}
        disabled={!state.editMode} // Add editMode state if you want to control when dragging is enabled
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

      <Button onClick={handleBack} className="mb-3 no-print" style={{ width: '5%', marginLeft: '95%', backgroundColor: '#6c757d' }}>
        <ArrowLeft />
      </Button>

      <Link to={`/profomaCustomazation/${profoma_id}`}>
        <button className="btn btn-secondary btn-sm no-print" style={{position:'relative',top:-45,width:100}}> Customize</button>
      </Link>
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
    <strong>{state.userData?.companyName}</strong>
    <br/>
    {state.userData?.address}, {state.userData?.country}
    <br/>
    Phone no.: {state.userData?.phone}
    <br/>
    Email: {state.userData?.email}
  </div>
  </DraggableWrapper>
    <DraggableWrapper sectionId="companyLogo">
  <div id="companyLogo" onClick={() => handleSectionClick('companyLogo')}
style={{ ...styles.companyLogo, ...applyCustomStyles('companyLogo') }}>
   {state.userData?.profile && (
    <img src={state.userData?.profile} alt="Company Logo" style={{width:parseInt(state.imageSize)}} />
  )}
  </div>
  </DraggableWrapper>
</div>

<hr
id="hrStyle"
 onClick={() => handleSectionClick('hrStyle')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('hrStyle'),border:'solid red 1px' }} />
<Draggable position={state.positions.invoiceTitle || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceTitle')}  disabled={true} >
<h1  id="invoiceTitle"  onClick={() => handleSectionClick('invoiceTitle')}
 style={{ ...styles.invoiceTitle, ...applyCustomStyles('invoiceTitle') }} >TAX  INVOICE </h1>
</Draggable>
<div id='invoiceDetails'  onClick={() => handleSectionClick('invoiceDetails')}
 style={{ ...styles.invoiceDetails, ...applyCustomStyles('invoiceDetails') }} >
  <Draggable position={state.positions.invoiceDetails || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceDetails')}  disabled={true} disabled={true} >
  <div id="billTo" onClick={() => handleSectionClick('billTo')}
 style={{ ...styles.hrStyle, ...applyCustomStyles('billTo') }} >

    <br/>
    <br />
    <strong>COMPANY NAME:</strong>{'  '}{state.sale.customer_name}
    <br />
    <strong>TIN:</strong>{'   '}{state.sale.tin}
    <br />
    <strong>ADDRESS:</strong>{'   '}{state.sale.address}
    <br />
    <strong>MOB:</strong>{'   '}{state.sale.phone}
    <br />
    <strong>EMAIL:</strong>{'   '}{state.sale.email}
    <br />
  </div>
  </Draggable>
  <Draggable
            position={state.positions.invoiceInfo || { x: 0, y: 0 }}
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
              {state.sale.invoice_number}
              <br />
              <strong>Date: </strong>
              {new Date(state.sale.date).toLocaleDateString()}
              <br />
              {/* <strong>TIN: </strong>
              {state.sale.tin}
              <br /> */}
              <strong>VRN: </strong>
              {state.sale.VRN}
              <br />
            </div>
          </Draggable>
</div>

<Draggable position={state.positions.table || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'table')}  disabled={true} >
<Table bordered id="table" onClick={() => handleSectionClick('table')}
 style={{ ...styles.table, ...applyCustomStyles('table') }}>
  <thead id="tableHeader" onClick={() => handleSectionClick('tableHeader')}
 style={{ ...styles.tableHeader, ...applyCustomStyles('tableHeader') }}>
    <tr>
      <th>#</th>
      <th>Item Name</th>
      <th>Description</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Amount</th>
    </tr>
  </thead>
  <tbody>
    {state.sale.products.map((product, index) => (
      <tr key={product.product_id}>
        <td>{index + 1}</td>
        <td>{product.product_name}</td>
        <td>{product.product_description}</td>
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
<Draggable position={state.positions.descriptionSection || { x: 0, y: 0 }}
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
  <p><strong>Acc Name:</strong> {state.userData?.companyName}</p>
  <p><strong>Swift Code:</strong> CORUTZTZ</p>
  <p><strong>Currency:</strong> TZS</p>
</div> */}

<div  id="invoiceFooter" onClick={() => handleSectionClick('invoiceFooter')}
 style={{ ...styles.invoiceFooter, ...applyCustomStyles('invoiceFooter') }} >
  <Draggable  position={state.positions.invoice_description || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoice_description')}  disabled={true} >
<div>
<div dangerouslySetInnerHTML={{ __html: state.sale.invoice_description }} />
  <p><strong>Authorized Signature </strong></p>
  <p>For: {state.userData?.companyName}</p>
  </div>
  </Draggable>
</div>



{/* <Draggable position={state.positions.qrCodeContainer || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'qrCodeContainer')}  disabled={true} >
<div id="qrCodeContainer" className="qr-code-section" onClick={() => handleSectionClick('qrCodeContainer')}
 style={{ ...styles.qrCodeContainer, ...applyCustomStyles('qrCodeContainer') }}>
  {state.qrCodeUrl && (
    <div style={styles.qrCodeContainer}>
      <img src={state.qrCodeUrl} alt="QR Code" style={styles.qrCodeImage}  />
      {state.extractedUrl && (
          target="_blank"
          rel="noopener noreferrer"
          style={styles.extractedUrl}
        >
          {state.extractedUrl}
        </a>
      )}
    </div>
  )}
</div>
</Draggable> */}

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
        {state.userData?.companyName} –{state.userData?.address} – {state.userData?.country}
      </p>
      <p style={{ marginTop: 0 }}>
      Tel: {state.userData?.phone}  Email:{state.userData?.email}
        {state.userData?.email}

      </p>
    </div>
  </div>
</div>


</Container>
<div
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
</div>

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

export default ProfomaDetails;

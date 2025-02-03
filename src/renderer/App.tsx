import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
// import './App.css';
import Desk from '../pages/Desk';
import Accounts from '../pages/Accounts';
import Configuration from '../pages/configuration';
import ProfitLossStatement from '../pages/ProfitSummary';
import Registration from '../pages/Registration';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import GetStarted from '../pages/GetStarted';
import Purchase from '../pages/purchase/Purchase';
import Sales from '../pages/sales/Sales';
import Forget from '../pages/ForgetPass';
import CreatePassword from '../pages/CreatePassword';
import TraRegistration from '../pages/RegistrationtoTRA';
import Pfx from '../pages/Pfx';
import CustomerForm from '../pages/Customers';
import Allcustomer from '../pages/Allcustomer';
import AllProduct from '../pages/products/AllProduct';
import Supplier from '../pages/Supllier/Supplier';
import PurcheseItems from '../pages/purchase/PurcheseItems';
import SalesItems from '../pages/sales/SalesItems';
import Report from '../pages/report/report';
import PurchaseDetails from '../pages/purchase/PurchaseDetails';
import AllExpenses from '../pages/Expenses/expense';
import Stock from '../pages/stock/stock';
import Allstock from '../pages/stock/Allstock';
import Allsales from '../pages/sales/Allsales';
import SalesDetails from '../pages/sales/sales_details';
import Invoice from '../pages/sales/invoice';
import Setting from '../pages/setting/settings';
import AllProfoma from '../pages/profoma/Allprofoma';
import Profoma from '../pages/profoma/Profoma';
import ProfomaDetails from '../pages/profoma/Profomadetails';
import Preview from '../pages/sales/preview';
import EditSale from '../pages/sales/EditSale';
import { Customization } from '../pages/sales/Customization';
import CustomizationPreview from '../pages/sales/customizationPreview';
import Tra from '../pages/tra/tra';
import TraDetails from '../pages/tra/tra_details';
import ReceiptsPage from '../pages/tra/ReceiptsPage';
import ReceiptItemsPage from '../pages/tra/ReceiptItemsPage';
import ReportPage from '../pages/tra/ReportsPage';
import AllReceipt from 'pages/receipt/all-receipt';
import ReceiptItems from 'pages/receipt/recepeitItems';
import EditProfile from 'pages/EditProfile';
import Services from 'pages/service/services';
import ServiceInvoice from 'pages/sales/serviceInvoice';
import ServiceDetails from 'pages/sales/service_details';
import { ServiceCustumization } from 'pages/sales/serviceCostumization';
import { ProfomaCustomazation } from '../pages/profoma/profomaCustomazation';
import ProformaPreview from 'pages/profoma/proforma_preview';
//


// import Services from '../../changes/pages/services/service';


function Main() {
  const navigate = useNavigate();
  const [redirectToLogin, setRedirectToLogin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTable = async () => {
      try {
        const redirectToLogin = await window.electron.checkUsersTable();
        console.log('Redirect to login:', redirectToLogin); // Log the value for debugging
        setRedirectToLogin(redirectToLogin);
      } catch (error) {
        console.error('Error checking users table:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTable();
  }, []);

  useEffect(() => {
    if (!loading) {
      navigate(redirectToLogin ? '/login' : '/desk');
    }
  }, [redirectToLogin, loading, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/desk" element={<Desk />} />
        <Route path="/account" element={<Accounts />} />
        <Route path="/configuration" element={<Configuration/>} />
        <Route path="/profitSumary/:id" element={<ProfitLossStatement />} />
        <Route path='/all-product' element={<AllProduct/>} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/getstarted" element={<GetStarted />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/forgot-password" element={<Forget />} />
        <Route path="/create-password" element={<CreatePassword />} />
        <Route path="/register" element={<TraRegistration />} />
        <Route path="/pfx" element={<Pfx />} />
        <Route path="/customer" element={<CustomerForm />} />
        <Route path="/all-customer" element={<Allcustomer />} />
        <Route path="/supplier" element={<Supplier/>} />
        <Route path="/purchase-item" element={<PurcheseItems/>} />
        <Route path="/sales-item" element={<SalesItems/>} />
        <Route path="/report" element={<Report/>} />
        <Route path="/details" element={<PurchaseDetails/>} />
        <Route path="/all_expenses" element={<AllExpenses/>} />
        <Route path="/stock" element={<Stock/>} />
        <Route path="/all-stock" element={<Allstock/>} />
        <Route path="/profoma/preview" element={<ProformaPreview />} />
        <Route path="/all-sales" element={<Allsales/>} />
        <Route path="/sales-details/:saleId" element={<SalesDetails />} />
        <Route path="/service-details/:saleId" element={<ServiceDetails />} />
        <Route path="/edit-sale/:saleId" element={<EditSale />} />
        <Route path="/invoice/:saleId" element={<Invoice />} />
        <Route path="/Serviceinvoice/:saleId" element={<ServiceInvoice />} />
        <Route path="/setting" element={<Setting />} />
        <Route path='/all-profoma' element={<AllProfoma/>}/>
        <Route path='/profoma' element={<Profoma/>}/>
        <Route path='/edit_profile/:id' element={<EditProfile/>}/>
        {/* <Route path="/" element={<ReportsPage />} /> */}

        <Route path="/tra" element={<ReportPage/>} />
        <Route path="/receipts/:reportId" element={<ReceiptsPage />} />
        <Route path="/receipt-items/:receiptId" element={<ReceiptItemsPage />} />
        <Route path='/tra_details' element={<TraDetails/>}/>
        <Route path="/profoma-details/:profoma_id" element={<ProfomaDetails/>}/>
        <Route path="/profomaCustomazation/:profoma_id" element={<ProfomaCustomazation/>}/>
        <Route path='/review-sale' element={<Preview/>}/>
        <Route path="/customization/:saleId" element={<Customization/>} />

        <Route path="/ServiceCustumization/:saleId" element={<ServiceCustumization/>} />
        <Route path="/all-receipt" element={<AllReceipt/>} />
        <Route path="/Allreceipt/:receiptId" element={<ReceiptItems/>} />
        <Route path="/services" element={<Services/>} />

        {/* <Route path="/customizationPreview/:saleId" element={<CustomizationPreview/>} /> */}
       <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

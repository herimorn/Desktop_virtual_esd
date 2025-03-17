import { contextBridge, ipcRenderer, dialog } from 'electron';
import axios from 'axios';
import { toast } from 'react-toastify';
import api from 'pages/api';

import fs = require('fs');
import path = require('path');


contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (fileName: any, data: any) => {
        ipcRenderer.invoke('save-file', fileName, data);
    }
});

// Define the functions to handle PFX upload events
const pfxUploadListeners = {
  onPfxUploadProgress: (callback: () => void) =>
    ipcRenderer.on('pfx-upload-progress', (_, message) => {
      toast.info(message); // Display progress message
      callback();
    }),

  onPfxUploadSuccess: (callback: () => void) =>
    ipcRenderer.on('pfx-upload-success', (_, message) => {
      toast.success(message); // Display success message
      callback();
    }),

  onPfxUploadError: (callback: () => void) =>
    ipcRenderer.on('pfx-upload-error', (_, errorMessage) => {
      toast.error(errorMessage); // Display error message
      callback();
    }),

  removePfxUploadListeners: () => {
    ipcRenderer.removeAllListeners('pfx-upload-progress');
    ipcRenderer.removeAllListeners('pfx-upload-success');
    ipcRenderer.removeAllListeners('pfx-upload-error');
  },
};

contextBridge.exposeInMainWorld('electron', {
  register: (data: any) => ipcRenderer.send('register', data),
  update: (data: any) => ipcRenderer.send('update', data),
  fetchAccounts: async () => {
    return await ipcRenderer.invoke('fetch-accounts');
  },
  calculateProfitLoss: async (filters) => {
    return await ipcRenderer.invoke('calculate-profit-loss', filters);
  },
//Email handlers
saveAndSendInvoice: (email, pdfBlob) => ipcRenderer.invoke('save-and-send-invoice', { email, pdfBlob }),
  login: (data: any) => ipcRenderer.send('login', data),
  onRegisterResponse: (callback: (response: any) => void) => ipcRenderer.on('register-response', (event, response) => callback(response)),
  checkUsersTable: () => ipcRenderer.invoke('check-users-table'),
  onCheckTableResult: (callback: (arg0: any) => void) => ipcRenderer.on('check-table-result', (event, result) => callback(result)),
  onLoginResponse: (callback: (response: any) => void) => ipcRenderer.on('login-response', (event, response) => callback(response)),
  onRedirectToLogin: (callback: (arg0: any) => void) => ipcRenderer.on('redirect-to-login', (event, redirectToLogin) => callback(redirectToLogin)),
  removeRedirectToLoginListener: () => ipcRenderer.removeAllListeners('redirect-to-login'),
  onRedirectToDesk: (callback: () => void) => ipcRenderer.on('redirect-to-desk', callback),
  onSerialVerify: (callback: (response: any) => void) => ipcRenderer.on('email-response', (event, response) => callback(response)),
  serialVerify: (data: any) => ipcRenderer.send('emailVerify', data),
  setPassword: (data: any) => ipcRenderer.send('set-password', data),
  requestToken: () => ipcRenderer.invoke('request-token'),
  onTokenResponse: (callback: (response: any) => void) => ipcRenderer.on('token-response', (event, response) => callback(response)),
  onSetPasswordResponse: (callback: (response: any) => void) => ipcRenderer.on('set-password-response', (event, response) => callback(response)),
  sendRegistrationData: async (data: any) => {
    try {
      const response = await api.post('/registrationData', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending registration data:', error.message);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(error.message);
      }
    }
  },



  // fetch banks
  fetchBanks: async (params: any) => {
    try {
      const response = await api.get('/bank-accounts', {
        params,
        headers: {
          'Content-Type': 'application/json'
        }
      });
     console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending registration data:', error.message);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(error.message);
      }
    }
  },


  fetchEmailConfiguration: () => ipcRenderer.invoke('fetch-email-configuration'),
  addOrUpdateEmailConfiguration: (email: string, password: string) =>
    ipcRenderer.invoke('add-or-update-email-configuration', email, password),
  // edit data
  UpdateData: async (data: any) => {
    try {
      const response = await axios.post('http://204.12.227.240:8080/update', data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending registration data:', error.message);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error(error.message);
      }
    }
  },
  sendCustomizationData: (customization: any) => ipcRenderer.invoke('store-customization', customization),
  sendPraformaCustomizationData: (customization: any) => ipcRenderer.invoke('storePraforma-customization', customization),
  fetchCustomizationData: (saleId:any,invoice_number:any) => ipcRenderer.invoke('fetch-customization',saleId,invoice_number),

  checkPfxExists: () => ipcRenderer.invoke('check-pfx-exists'),
  checkRegisterTra:()=>ipcRenderer.invoke('check-register-tra'),

  //add the product modules to handle this
  fetchProducts: () => ipcRenderer.invoke('fetch-products'),
  fetchProductsSales: () => ipcRenderer.invoke('fetch-products_sales'),
  addProduct: (product:any) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product:any) => ipcRenderer.invoke('update-product', product),
  getCompanyById: () => ipcRenderer.invoke('getCompanyById'),
  deleteProduct: (id:any) => ipcRenderer.invoke('delete-product', id),
  //ending of the product modules here
  //suplier crude
  addSupplier: (supplier:any) => ipcRenderer.invoke('add-supplier', supplier),
  updateSupplier: (supplier:any) => ipcRenderer.invoke('update-supplier', supplier),
  deleteSupplier: (id:any) => ipcRenderer.invoke('delete-supplier', id),
  fetchSuppliers: () => ipcRenderer.invoke('fetch-suppliers'),
   // Customer CRUD operations
   fetchPurchases: () => ipcRenderer.invoke('fetch-purchases'),
   addPurchase:(purchase:any) => ipcRenderer.invoke('add-purchase',purchase),
   //delete pirchase
   deletePurchase:(id:any)=>ipcRenderer.invoke('delete-purchase',id),

   addPurchaseItem: (item:any) => ipcRenderer.invoke('addPurchaseItem', item),
   updatePurchase:(purchase:any)=>ipcRenderer.invoke('update-purchase', purchase),
   updatePurchaseItems: (purchaseId:any, items:any) => ipcRenderer.invoke('updatePurchaseItems', purchaseId, items),

   addCustomer: (customer: any) => ipcRenderer.invoke('add-customer', customer),
   updateCustomer: (customer: any) => ipcRenderer.invoke('update-customer', customer),
   deleteCustomer: (id: any) => ipcRenderer.invoke('delete-customer', id),
   //fetch customer by id
   getCustomerById:(id:any)=>ipcRenderer.invoke('get_customer_by_id',id),
   //handling purchases and purchase items
   fetchCustomers: () => ipcRenderer.invoke('fetch-customers'),
  fetchtaxOptions: () => ipcRenderer.invoke('fetch-tax-codes'),
  fetchUserData: () => ipcRenderer.invoke('fetch-user-data'),
fetchAllReceptQue: () => ipcRenderer.invoke('AllReceipt'),
fetchReceiptItems:(id:any)=>ipcRenderer.invoke('fetch-receipt-items',id),
  fetchTaxes:()=>ipcRenderer.invoke('fetch-taxes'),
// count all receipt
fetchCountPending:()=>ipcRenderer.invoke('CountPendingReceipts'),
fetchCountSuccess:()=>ipcRenderer.invoke('CountSuccessReceipts'),
fetchCountProcess:()=>ipcRenderer.invoke('CountProcessingReceipts'),

  //preload script for expenses
  fetchExpenses: () => ipcRenderer.invoke('fetch-expenses'),

  addExpense: (expense:any) => ipcRenderer.invoke('add-expense', expense),

  updateExpense: (expense:any) => ipcRenderer.invoke('update-expense', expense),

  deleteExpense: (id:any) => ipcRenderer.invoke('delete-expense', id),

  onExpenseAdded: (callback:any) => ipcRenderer.on('expense-added', callback),

  onExpenseUpdated: (callback:any) => ipcRenderer.on('expense-updated', callback),

  onExpenseDeleted: (callback:any) => ipcRenderer.on('expense-deleted', callback),

  //end of the expense preload sceipt
  //handling sales oparations
  fetchSales: () => ipcRenderer.invoke('fetch-sales'),
  fetchServiceSales:()=>ipcRenderer.invoke('fetch-sales-service'),
  addSale: (sale: any) => ipcRenderer.invoke('add-sale', sale),
  updateSale: (id: any,updateSale:any) => ipcRenderer.invoke('update-sale', id,updateSale),
  deleteSale: (id: any) => ipcRenderer.invoke('delete-sale', id),
  fetchSalesDetails: () => ipcRenderer.invoke('fetch-sales-details'),
  fetchServiceDetails: () => ipcRenderer.invoke('fetch-service-details'),
  fetchProductsService:()=> ipcRenderer.invoke('fetch-service-products'),
  onStockUpdated: (callback: () => void) => ipcRenderer.on('stock-updated', callback),
  ...pfxUploadListeners,

// profoma invoice handling
addProfoma: (profoma: any) => ipcRenderer.invoke('add-profoma', profoma),
fetchProfoma: () => ipcRenderer.invoke('fetch-profomas'),
fetchProfomaById: (profoma_id:any) => ipcRenderer.invoke('fetch-profomasDetails', profoma_id),
  registerTra: (tin: string, certKey: string) => ipcRenderer.invoke('register-to-tra', tin, certKey),
  uploadPfx: (data: { fileData: ArrayBuffer | string | null, password: string }) => ipcRenderer.send('upload-pfx', data),
  fetchTokenStatus: () => ipcRenderer.invoke('fetch-token-status'),
  onUploadPfxResponse: (callback: (response: any) => void) => ipcRenderer.on('upload-pfx-response', (event, response) => callback(response)),
  //stock  management
  updateStock: (data:any) => ipcRenderer.send('update-stock', data),
  fetchAllStock: () => ipcRenderer.invoke('fetch-all-stock'),
  fetchSaleById: (saleId:any) => ipcRenderer.invoke('fetch-sale-by-id', saleId),
  //handling the invoice oparation
  fetchInvoice: () => ipcRenderer.invoke('fetch-invoice'),
  addOrUpdateInvoice: (invoice: { invoice_number: string; invoice_string: string }) => ipcRenderer.invoke('add-or-update-invoice', invoice),
  sendSaleDataToTRA: (saleData: any) => ipcRenderer.invoke('send-receipt', saleData),
  //write the things here..
   getCustomersCount: () => ipcRenderer.invoke('getCustomersCount'),

   RegisterSerial: (formData) => ipcRenderer.invoke('insert-serial', formData),

   CheckSerial:() => ipcRenderer.invoke('select-serial'),
   GetSerial: () => ipcRenderer.invoke('get-serial'),
  getProductsCount: () => ipcRenderer.invoke('getProductsCount'),
  getSuppliersCount: () => ipcRenderer.invoke('getSuppliersCount'),
  getTotalSales: () => ipcRenderer.invoke('getTotalSales'),
  getCustomersChartData: () => ipcRenderer.invoke('getCustomersChartData'),
  getSuppliersPieData: () => ipcRenderer.invoke('getSuppliersPieData'),
  getProfitLossData: () => ipcRenderer.invoke('getProfitLossData'),
  fetchImageHeader: () => ipcRenderer.invoke('fetch-customizations'),
  fetchImagePraformaHeader: () => ipcRenderer.invoke('fetch-Praformacustomizations'),

  //dispaly all report
  // ReportAll: () => ipcRenderer.invoke('ReportsAll'),
  fetchReportsByDate: (reportDate:any) => ipcRenderer.invoke('fetch-reports-by-date', reportDate),
  fetchReceiptsByReport: (reportId:number) => ipcRenderer.invoke('fetch-receipts-by-report', reportId),
  fetchReceiptItems: (receiptId:number) => ipcRenderer.invoke('fetch-receipt-items', receiptId),


  // fetchSaleById: (saleId) => ipcRenderer.invoke('fetch-sale-by-id', saleId),
  // updateSale: (saleId, saleData) => ipcRenderer.invoke('update-sale', saleId, saleData),
  // fetchCustomers: () => ipcRenderer.invoke('fetch-customers'),
  // fetchProducts: () => ipcRenderer.invoke('fetch-products'),

  fetchBarcodeDetails:(sale_id:number, invoice_number: string) => ipcRenderer.invoke('fetch-bar-code', sale_id, invoice_number),
  //sending report to TRA
  sendReport: () => ipcRenderer.invoke('send-report'),
  //handling the import and export on database
  importDatabase: () => ipcRenderer.invoke('import-database'),
  onImportProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on('import-progress', (_event, progress) => callback(progress)),

//the custumizations styles
saveStyles: (sectionId:any, styles:any, position:any) => ipcRenderer.invoke('save-styles', sectionId, styles, position),
fetchStyles: () => ipcRenderer.invoke('fetch-styles'),
  fetchSumStockGroupedByProduct: () => ipcRenderer.invoke('fetch-sum-stock-grouped-by-product'),
  ...pfxUploadListeners,
  updateCustomization: (data: any) => ipcRenderer.invoke('update-customization', data),
  updatePraformaCustomization: (data: any) => ipcRenderer.invoke('update-Praformacustomization', data),
  convertProformaToInvoice: async (profomaId: number): Promise<any> => {
    try {
      const result = await ipcRenderer.invoke('convert-proforma-to-invoice', profomaId);
      return result;
    } catch (error) {
      console.error('Error in convertProformaToInvoice:', error);
      throw error;
    }
  },
});

// Add the type definition
declare global {
  interface Window {
    electron: {
      register(arg0: { formData: { serial_number: any; }; }): unknown;
      checkUsersTable(): unknown;
      // ... existing types ...
      convertProformaToInvoice: (profomaId: number) => Promise<any>;
    }
  }
}


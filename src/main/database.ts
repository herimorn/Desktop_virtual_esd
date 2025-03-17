import path from 'path';
import sqlite3 from 'sqlite3';
import { app } from 'electron';
import webpackPaths from '../../.erb/configs/webpack.paths'; // Adjust the path if needed

const sqlite3Verbose = sqlite3.verbose();
let db: sqlite3.Database;

const databaseName = "virtual_esd.sqlite3";
const sqlPath_dev = path.join(webpackPaths.appPath, 'sql', databaseName);
const sqlPath_prod = path.join(app.getPath('userData'), databaseName);
const sqlPath = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'
  ? sqlPath_dev
  : sqlPath_prod;

const sqlPathsInfo = [sqlPath, sqlPath_dev, sqlPath_prod, process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'];

// Function to c
//connect to the database
export function connectToDatabase(): sqlite3.Database {
  db = new sqlite3Verbose.Database(sqlPath, (err) => {
    if (err) {
      console.error('Error connecting to the SQLite database:', err.message);
    } else {
      // console.log('Connected to the SQLite database.');
      createTables();
    }
  });
  return db;
}

export function createTables(): void {
    // const db=connectToDatabase();
    db.serialize(() => {
      // 1. Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          companyName TEXT,
          fullName TEXT,
          email TEXT UNIQUE,
          country TEXT,
          address TEXT,
          currency TEXT,
          bankName TEXT,
          phone TEXT,
          chartOfAccounts TEXT,
          fiscalYearStart TEXT,
          fiscalYearEnd TEXT,
          serialNumber TEXT,
          password TEXT,
          profile TEXT
        )
      `);

      // 2. PFX Table
      db.run(`
        CREATE TABLE IF NOT EXISTS pfx (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          password TEXT NOT NULL,
          serialNumber TEXT NOT NULL,
          signature TEXT NOT NULL,
          privateKey TEXT NOT NULL
        )
      `);

      // 3. Invoices Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          invoice_string TEXT NOT NULL
        )
      `);

      // 4. ReportCredential Table
      db.run(`
        CREATE TABLE IF NOT EXISTS reportCredential (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gc INTEGER NOT NULL,
          rctnum INTEGER NOT NULL,
          dc INTEGER NOT NULL,
          znum INTEGER NOT NULL,
          time TEXT,
          rct_date TEXT NOT NULL
        )
      `);

      // 5. Token Table
      db.run(`
        CREATE TABLE IF NOT EXISTS token (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL,
          expiration TIMESTAMP NOT NULL
        )
      `);

      // 6. TRA Table
      db.run(`
        CREATE TABLE IF NOT EXISTS TRA (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tin TEXT NOT NULL,
          certKey TEXT NOT NULL,
          regId TEXT,
          username TEXT,
          password TEXT,
          gc TEXT,
          receiptCode TEXT,
          user TEXT,
          mobile TEXT,
          vrn TEXT,
          tax_office TEXT,
          street TEXT,
          city TEXT,
          registrationDate TEXT,
          UNIQUE(tin, certKey)
        )
      `);

      // 7. Tax Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Tax (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codeType TEXT NOT NULL,
          codeValue TEXT NOT NULL
        )
      `);

      // 8. Customers Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          phone TEXT,
          tin TEXT,
          email TEXT,
          outstanding REAL DEFAULT 0,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          VRN Text,
          UNIQUE(tin)
        )
      `);

      // 9. Suppliers Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          tin TEXT NULL,
          outstanding_balance REAL DEFAULT 0,
          tax_id INTEGER,
          FOREIGN KEY (tax_id) REFERENCES Tax(id),
          UNIQUE(tin)
        )
      `);

      // 10. Products Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          quantity INTEGER DEFAULT 0,
          tax_id INTEGER,
          country TEXT NOT NULL,
          itemType TEXT NOT NULL,
          packagingUnit NULL,
          quantityUnit TEXT NULL,
          productNumber INTEGER,
          itemCode TEXT NULL,
          paymentType TEXT NULL,
          unit NULL,
          FOREIGN KEY (tax_id) REFERENCES Tax(id)
        )
      `);

      // 11. Proforma & ProformaItems Table - Updated with status and relations
      db.run(`
        CREATE TABLE IF NOT EXISTS profoma (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          total_amount REAL NOT NULL,
          transaction_status TEXT NOT NULL,
          transaction_type TEXT NOT NULL,
          profoma_number TEXT NOT NULL UNIQUE,
          total_tax REAL NOT NULL,
          converted_to_sale BOOLEAN DEFAULT FALSE,
          invoice_description TEXT NULL,
          sale_id INTEGER,
          FOREIGN KEY (customer_id) REFERENCES Customers(id),
          FOREIGN KEY (sale_id) REFERENCES Sales(id)
        )
      `);

      db.run(`

        CREATE TABLE IF NOT EXISTS profomaItems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profoma_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          tax TEXT NOT NULL,
          FOREIGN KEY (profoma_id) REFERENCES profoma(id),
          FOREIGN KEY (product_id) REFERENCES Products(id)
        )
      `);

      // 12. Sales & SalesItems Table - Updated with proforma reference
      db.run(`
        CREATE TABLE IF NOT EXISTS Sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          proforma_id INTEGER,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_amount REAL NOT NULL,
          transaction_type TEXT,
          transaction_status TEXT,
          outstanding_amount REAL DEFAULT 0,
          tax_id INTEGER,
          invoice_number TEXT UNIQUE,
          status TEXT,
          invoice_description TEXT NULL,
          FOREIGN KEY (customer_id) REFERENCES Customers(id),
          FOREIGN KEY (tax_id) REFERENCES Tax(id),
          FOREIGN KEY (proforma_id) REFERENCES profoma(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS SalesItems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          tax_id INTEGER,
          FOREIGN KEY (sale_id) REFERENCES Sales(id),
          FOREIGN KEY (product_id) REFERENCES Products(id),
          FOREIGN KEY (tax_id) REFERENCES Tax(id)
        )
      `);

      // 13. Purchases & PurchaseItems Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_id INTEGER NOT NULL,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total_amount REAL NOT NULL,
          outstanding_amount REAL DEFAULT 0,
          tax_id INTEGER,
          payment_type TEXT NULL,
          FOREIGN KEY (supplier_id) REFERENCES Suppliers(id),
          FOREIGN KEY (tax_id) REFERENCES Tax(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS PurchaseItems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          purchase_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          tax_id INTEGER,
          FOREIGN KEY (purchase_id) REFERENCES Purchases(id),
          FOREIGN KEY (product_id) REFERENCES Products(id),
          FOREIGN KEY (tax_id) REFERENCES Tax(id)
        )
      `);

      // 14. Expenses & ExpensePurchase Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          category TEXT NOT NULL
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS office_expense(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          category TEXT NOT NULL,
          ammount FLOAT NOT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS check_serial(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          serial  TEXT NOT NULL,
          fullName TEXT  Null

        )
      `);


      db.run(`
        CREATE TABLE IF NOT EXISTS ExpensePurchase (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expense_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          item_id INTEGER,
          purchase_id INTEGER,
          FOREIGN KEY (expense_id) REFERENCES Expenses(id),
          FOREIGN KEY (purchase_id) REFERENCES Purchases(id),
          FOREIGN KEY (item_id) REFERENCES PurchaseItems(id)
        )
      `);

      // 15. Stock Table
      db.run(`
        CREATE TABLE IF NOT EXISTS Stock (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER,
          stock INTEGER,
          sold_item INTEGER DEFAULT 0,
          stock_amount REAL,
          buying_price REAL,
          sold_amount REAL DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES Products(id),
          UNIQUE(product_id, buying_price)
        )
      `);

      // 16. Report & Related Tables
      db.run(`
        CREATE TABLE IF NOT EXISTS report (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_date DATE NOT NULL,
          report_xml TEXT NULL,
          totalReceipts INTEGER,
          totalExclTax REAL,
          totalInclTax REAL,
          totalTax REAL,
          status INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS report_receipt (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id INTEGER NOT NULL,
          receipt_id INTEGER NOT NULL,
          FOREIGN KEY (report_id) REFERENCES report(id),
          FOREIGN KEY (receipt_id) REFERENCES receipt_que(id)
        )
      `);

      db.run(`CREATE TABLE IF NOT EXISTS receipt_que (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        receipt TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        rctnum TEXT,
        gc TEXT,
        dc TEXT,
        znum TEXT,
        receiptCode TEXT,
        customer_name TEXT,
        sanitizedPhone TEXT,
        totalTaxExcl REAL,
        totalTaxIncl REAL,
        invoice_number TEXT,
        totalTax REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES Sales(id)
      )`);
    db.run(`CREATE TABLE IF NOT EXISTS receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        amount REAL,
        tax_code TEXT,
        FOREIGN KEY (receipt_id) REFERENCES receipt_credential(id)
      )`);
    //custumer style table
    db.run(`CREATE TABLE IF NOT EXISTS custom_styles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id NULL,
      styles NULL,
      position TEXT NULL,
      UNIQUE(section_id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS InvoiceDetails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      qr_code_image_url TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES Sales(id)
    )`);
   db.run(`CREATE TABLE IF NOT EXISTS locks (
      sale_id INTEGER PRIMARY KEY,
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

   db.run(`CREATE TABLE IF NOT EXISTS customizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fontSize TEXT,
      fontFamily TEXT,
      imageSize TEXT,
      header_images TEXT,
      footer_images TEXT

    )`);

    db.run(`CREATE TABLE IF NOT EXISTS praformaCustomization (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      fontSize TEXT DEFAULT '12px',
      fontFamily TEXT DEFAULT 'Arial',
      imageSize TEXT DEFAULT '15px',
      header_images TEXT DEFAULT 'default_header.png',
      footer_images TEXT DEFAULT 'default_footer.png'
    )`);

    db.run(`INSERT OR IGNORE INTO praformaCustomization (id, fontSize) VALUES (1, '14px')`);

    });

    db.run(`CREATE TABLE IF NOT EXISTS email_configuration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )`);

  }

// IPC communication to show paths info
export function setupIpcHandlers(): void {
  const { ipcMain } = require('electron'); // Require here to avoid circular dependencies

  ipcMain.on('ipc-show-userDataPaths', (event) => {
    event.reply('ipc-show-userDataPaths', sqlPathsInfo);
  });

  ipcMain.on('asynchronous-sql-command', async (event, sql) => {
    const db =connectToDatabase();
    db.all(sql, (err, result) => {
      if (err) {
        console.error('SQL command error: ', err);
        event.reply('asynchronous-sql-reply', { error: err.message });
      } else {
        event.reply('asynchronous-sql-reply', result);
      }
    });
  });
}

// Export db for reuse
export { db };

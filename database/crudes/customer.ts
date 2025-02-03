// main/customers.ts
import { ipcMain } from 'electron';
import {connectToDatabase } from '../../src/main/database';
import { Database } from 'sqlite3';



const db = connectToDatabase();

const fetchCustomers = async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM customers', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const fetchCustomerById = async (id: number) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT name,id FROM customers WHERE id = ?', id, (err,rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
};

const addCustomer = async (customer: any) => {
  const { name, email, phone, outstanding,address,tin,VRN} = customer;
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO customers (name, email, phone,address,tin,outstanding,VRN) VALUES (?, ?, ?, ?,?,?,?)',
      [name, email, phone, address,tin,outstanding,VRN],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...customer });
        }
      }
    );
  });
};

const updateCustomer = async (customer: any) => {
  const { id, name, email, phone,address,tin,outstanding,VRN} = customer;
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address=?,tin =?,outstanding = ? ,VRN=? WHERE id = ?',
      [name, email, phone,address,tin,outstanding, VRN,id],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(customer);
        }
      }
    );
  });
};

const deleteCustomer = async (id: number) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM customers WHERE id = ?', id, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ id });
      }
    });
  });
};

ipcMain.handle('fetch-customers', async () => {
  try {
    const customers = await fetchCustomers();
    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
});

//pic handler for fetch customer by id
// get_customer_by_id
ipcMain.handle('get_customer_by_id', async (event, id) => {
  try {
    const fetched_customer = await fetchCustomerById(id);
    return fetched_customer;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
});

ipcMain.handle('add-customer', async (event, customer) => {
  try {
    const newCustomer = await addCustomer(customer);
    return newCustomer;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
});

ipcMain.handle('update-customer', async (event, customer) => {
  try {
    const updatedCustomer = await updateCustomer(customer);
    return updatedCustomer;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (event, id) => {
  try {
    const deletedCustomer = await deleteCustomer(id);
    return deletedCustomer;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
});

import { Database } from 'sqlite3';

const db = new Database('./your-database-file.db');

interface Filters {
  date?: string;
  month?: number;
  year?: number;
}

interface ProfitLossResult {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  profitOrLoss: number;
}

export const calculateProfitLoss = (filters: Filters): Promise<ProfitLossResult> => {
  return new Promise((resolve, reject) => {
    const { date, month, year } = filters;
    let salesQuery = 'SELECT SUM(total_amount) as totalSales FROM Sales WHERE 1=1';
    let purchasesQuery = 'SELECT SUM(total_amount) as totalPurchases FROM Purchases WHERE 1=1';
    let expensesQuery = 'SELECT SUM(amount) as totalExpenses FROM ExpensePurchase WHERE 1=1';

    if (date) {
      salesQuery += ` AND date(date) = date('${date}')`;
      purchasesQuery += ` AND date(date) = date('${date}')`;
      expensesQuery += ` AND date(date) = date('${date}')`;
    }

    if (month) {
      salesQuery += ` AND strftime('%m', date) = '${month.toString().padStart(2, '0')}'`;
      purchasesQuery += ` AND strftime('%m', date) = '${month.toString().padStart(2, '0')}'`;
      expensesQuery += ` AND strftime('%m', date) = '${month.toString().padStart(2, '0')}'`;
    }

    if (year) {
      salesQuery += ` AND strftime('%Y', date) = '${year}'`;
      purchasesQuery += ` AND strftime('%Y', date) = '${year}'`;
      expensesQuery += ` AND strftime('%Y', date) = '${year}'`;
    }

    db.all(salesQuery, (err, salesRows) => {
      if (err) return reject(err);
      const totalSales = salesRows[0]?.totalSales || 0;

      db.all(purchasesQuery, (err, purchasesRows) => {
        if (err) return reject(err);
        const totalPurchases = purchasesRows[0]?.totalPurchases || 0;

        db.all(expensesQuery, (err, expensesRows) => {
          if (err) return reject(err);
          const totalExpenses = expensesRows[0]?.totalExpenses || 0;

          const profitOrLoss = totalSales - (totalPurchases + totalExpenses);

          resolve({ totalSales, totalPurchases, totalExpenses, profitOrLoss });
        });
      });
    });
  });
};

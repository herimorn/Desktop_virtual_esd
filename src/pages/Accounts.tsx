import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Button,InputGroup, FormControl } from 'react-bootstrap';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { Link } from 'react-router-dom'; // Import Link for navigation

interface Account {
  id: number;
  type: string;
  date: string;
  amount: number;
}

const Account: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [purchase, setPurchase] = useState<number>(0);
  const [sale, setSale] = useState<number>(0);
  const [expense, setExpense] = useState<number>(0);
  const [profit, setProfit] = useState<number>(0);
  const [grossProfitMargin,setGrossProfitMargin]=useState<number>(0);
  const[expenseCategory,setExpenseCategories]=useState('');
  console.log('the expense categories is', expenseCategory)
  const[cogs,setCogs]=useState<number>(0)
  const keyValues = [
    { key: "COGS", value: "Cost of Goods Sold" },
   
  ];
  
console.log("the account is",accounts);
  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    calculateTotals(filteredAccounts);
  }, [filteredAccounts]);

  const fetchAccounts = async () => {
    try {
      const filters = { startDate, endDate };
      const response: Account[] = await window.electron.fetchAccounts(filters);
      setAccounts(response);
      setFilteredAccounts(response);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleDateFilterChange = () => {
    const filtered = accounts.filter((account) => {
      const accountDate = new Date(account.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      return (!start || accountDate >= start) && (!end || accountDate <= end);
    });
    setFilteredAccounts(filtered);
  };
  const calculateTotals = (data: Account[]) => {
    const saleTotal = data
      .filter((account) => account.type === "Sale")
      .reduce((sum, account) => sum + account.amount, 0);
  
    const cogsTotal = data
      .filter((account) => account.type === "COGS")
      .reduce((sum, account) => sum + account.amount, 0);
  
    const expenseData = data
      .filter((account) => account.type === "Expense")
      .reduce((acc, account) => {
        const { category, amount } = account;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += amount; // Sum the expenses for each category
        return acc;
      }, {} as Record<string, number>); // Using an object to group by category
  
    const purchaseTotal = data
      .filter((account) => account.type === "Purchase")
      .reduce((sum, account) => sum + account.amount, 0);
  
    // **Correct Profit Calculation**
    const grossProfit = saleTotal - cogsTotal;
    const netProfit = grossProfit - Object.values(expenseData).reduce((sum, expense) => sum + expense, 0);
  
    // **Gross Profit Margin (%)**
    const grossProfitMargin = saleTotal > 0 ? (grossProfit / saleTotal) * 100 : 0;
  
    setPurchase(purchaseTotal);
    setSale(saleTotal);
    setCogs(cogsTotal);
    setExpense(Object.values(expenseData).reduce((sum, expense) => sum + expense, 0)); // Total expenses
    setProfit(netProfit);
    setGrossProfitMargin(grossProfitMargin);
  
    // Optionally, store categorized expenses if you want to use them elsewhere
    // Example: storing in a state for rendering
    setExpenseCategories(expenseData);
  };
  


  return (
    <Container fluid className="p-0"  style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5" >
          <h3  className="p-3">Profit and Loss</h3>
          <div
          className="mb-3"
          style={{
            display: 'flex',

            gap: '20px',
            alignItems: 'center',
            marginLeft: '38%',
          }}
          >
            <InputGroup style={{ width: '95%' }}>
              <FormControl
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <FormControl
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Button
                size="sm"
                variant="secondary"
              className="btn-sm rounded-pill   p-1"
              onClick={handleDateFilterChange}
               style={{ width: 150, margin: 10 }}


              >
                Filter Data
              </Button>
            </InputGroup>
          </div>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>purchase</th>
                <th>COGS</th>
                <th>Sale</th>
                <th>Expense</th>
                <th>Profit</th>
                <th>Action</th> {/* Added column for View button */}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>{purchase.toLocaleString()}</td>
                <td>{cogs.toLocaleString()}</td>
                <td>{sale.toLocaleString()}</td>
                <td>{expense.toLocaleString()}</td>
                <td>{profit.toLocaleString()}</td>
                <td>
                <Link
  to={`/profitSumary/${1}?startDate=${startDate}&endDate=${endDate}&purchase=${purchase}&sale=${sale}&expense=${expense}&expenseCategories=${encodeURIComponent(JSON.stringify(expenseCategory))}&profit=${profit}&cogs=${cogs}&grossProfitMargin=${grossProfitMargin}`}
  className="btn btn-secondary btn-sm bi bi-eye"
>
</Link>


                </td>
              </tr>
            </tbody>
     

          </Table>
          <Table striped bordered hover style={{position:'relative',bottom:0,width:'50%'}}>
      <thead>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {keyValues.map((item, index) => (
          <tr key={index}>
            <td>{item.key}</td>
            <td>{item.value}</td>
          </tr>
        ))}
      </tbody>
    </Table>


        </Col>
      </Row>
    </Container>
  );
};

export default Account;

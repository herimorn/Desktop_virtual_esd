/* eslint-disable prettier/prettier */
/* eslint-disable react/function-component-definition */
import React, { FC, useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaUsers, FaBoxOpen, FaTruck, FaDollarSign } from 'react-icons/fa';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import '../renderer/getStarted.css';
import { Header } from './Layouts/nav';
import { Sidebar } from './Layouts/sidebar';
import { RouteComponentProps } from 'react-router-dom';


// Registering the components with Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

const Dashboard: FC<RouteComponentProps> = () => {
  // State variables to store dynamic data
  const [customersCount, setCustomersCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [suppliersCount, setSuppliersCount] = useState<number>(0);
  const [totalSales, setTotalSales] = useState<number>(0);

  const [customersData, setCustomersData] = useState<any>(null);

  const [suppliersPieData, setSuppliersPieData] = useState<any>(null);
  const [profitLossData, setProfitLossData] = useState<any>(null);
  console.log('the customer data is ',customersData)

  useEffect(() => {
    // Fetch customers count
    window.electron.getCustomersCount().then((count: React.SetStateAction<number>) => setCustomersCount(count));

    // Fetch products count
    window.electron.getProductsCount().then((count: React.SetStateAction<number>) => setProductsCount(count));

    // Fetch suppliers count
    window.electron.getSuppliersCount().then((count: React.SetStateAction<number>) => setSuppliersCount(count));

    // Fetch total sales
    window.electron.getTotalSales().then((total: React.SetStateAction<number>) => setTotalSales(total));

    // Fetch chart data for customers
    window.electron.getCustomersChartData().then((data: any) => setCustomersData(data));

    // Fetch chart data for suppliers
    window.electron.getSuppliersPieData().then((data: any) => setSuppliersPieData(data));

    // Fetch profit and loss data
    window.electron.getProfitLossData().then((data: any) => setProfitLossData(data));
  }, []);

  const formatNumber = (num: number | null | undefined): string => {
    if (num == null) {
      return '0';
    }

    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  };


  return (
    <Container fluid className="p-0 fontCustomer"style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="pt-5 content" style={{ marginTop: 20 }}>
          <h3 className="mb-4">Dashboard</h3>

          <Row>
            <Col md={3} className="mb-4" style={{fontFamily:'CustomFont'}}>
              <Card className="shadow-sm border-light rounded" style={{ background: 'linear-gradient(135deg, #fff, #fff)', color: '#000' }}>
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="mb-2">Customers</Card.Title>
                    <h1 className="display-4">{customersCount}</h1>
                    <p className="text-light">Total Customers</p>
                  </div>
                  <FaUsers size={50} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-4">
              <Card className="shadow-sm border-light rounded" style={{ background: 'linear-gradient(135deg, #fff, #fff)', color: '#000' }}>
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="mb-2">Products</Card.Title>
                    <h1 className="display-4">{productsCount}</h1>
                    <p className="text-light">Total Products</p>
                  </div>
                  <FaBoxOpen size={50} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-4">
              <Card className="shadow-sm border-light rounded" style={{ background: 'linear-gradient(135deg, #fff, #fff)', color: '#000' }}>
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="mb-2">Suppliers</Card.Title>
                    <h1 className="display-4">{suppliersCount}</h1>
                    <p className="text-black">Total Suppliers</p>
                  </div>
                  <FaTruck size={50} />
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} className="mb-4">
              <Card className="shadow-sm border-light rounded" style={{ background: 'linear-gradient(135deg, #fff, #fff)', color: '#000' }}>
                <Card.Body className="d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="mb-2">Sales</Card.Title>
                    <h1 className="display-4">
                    {formatNumber(totalSales)}
                    </h1>
                    <p className="text-light">Total Sales</p>
                  </div>
                TSH
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6} className="mb-4">
              <Card className="shadow-sm border-light rounded">
                <Card.Body >
                  <Card.Title className="mb-3">Customers</Card.Title>
                  <div className="chart-container">
                    {customersData ? <Bar data={customersData} /> : <p>Loading chart data...</p>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card className="shadow-sm border-light rounded">
                <Card.Body>
                  <Card.Title className="mb-3">Suppliers</Card.Title>
                  <div className="chart-container" style={{maxHeight:260,marginLeft:'25%',maxWidth:250}}>
                    {suppliersPieData ? <Pie data={suppliersPieData} /> : <p>Loading chart data...</p>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={12} className="mb-4">
              <Card className="shadow-sm border-light rounded">
                <Card.Body>
                  <Card.Title className="mb-3">Profit and Loss</Card.Title>
                  <div className="chart-container">
                    {profitLossData ? <Line data={profitLossData} /> : <p>Loading chart data...</p>}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;

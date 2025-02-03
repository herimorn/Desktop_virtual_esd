import React, { useState, useEffect } from "react";
import { Button, Container, Image } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "react-bootstrap-icons";

const ProfitLossStatement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const queryParams = new URLSearchParams(location.search);
  const purchase = parseFloat(queryParams.get("purchase") || "0");
  const sale = parseFloat(queryParams.get("sale") || "0");
  const expense = parseFloat(queryParams.get("expense") || "0");
  const profit = parseFloat(queryParams.get("profit") || "0");
  const cogs = parseFloat(queryParams.get("cogs") || "0");
  const grossProfitMargin = parseFloat(queryParams.get("grossProfitMargin") || "0");

  const expenseCategories = JSON.parse(
    decodeURIComponent(queryParams.get("expenseCategories") || "{}")
  );

  const startDate = queryParams.get("startDate");
  const endDate = queryParams.get("endDate");

  const handleBack = () => navigate("/account");
  const handlePrint = () => window.print();

   useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const user = await window.electron.fetchUserData();
        if (user.profile && user.profile instanceof Blob) {
          user.profile = await convertBlobToBase64(user.profile);
        }
        setUserData(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className="mt-4 d-flex flex-column align-items-center">
      {/* Back button outside the card */}
      <div className="mb-2 w-100" style={{ maxWidth: "800px" }}>
        <Button

          onClick={handleBack}
          style={{ backgroundColor: "#6c757d", border: "none", width:100 }}
        >
          <ArrowLeft /> Back
        </Button>
      </div>

      <Container
        className="p-4 bg-white shadow-lg rounded border border-light CustomFont position-relative"
        style={{ maxWidth: "800px" }}
      >
        {/* Title and Profile Picture */}
        <div className="text-center mb-4 position-relative">
          <h3 className="fw-bold CustomFont">{userData?.companyName}</h3>
          <h4 className="text-uppercase text-dark CustomFont">
            Profit and Loss Statement
          </h4>

          {/* Profile Picture Positioned to the Right */}
          {userData?.profile && (
            <Image
              src={userData.profile}
              roundedCircle
              className="position-absolute"
              style={{ top: -25,   right: "10px", width: "150px", height: "100px" }}
              alt="Profile"
            />
          )}
      </div>

      {/* Revenue Section */}
      <div className="mb-4 border rounded shadow-sm p-3">
          <h3 className="bg-secondary text-white p-2 rounded-top">INCOME</h3>
        <div className="d-flex justify-content-between py-2">
          <span className="fw-semibold">Sales Revenue</span>
          <span>Tsh {sale.toLocaleString()}</span>
        </div>
        <div className="d-flex justify-content-between py-2 fw-bold border-top">
          <span className="fw-semibold">Total Revenue</span>
          <span>Tsh {sale.toLocaleString()}</span>
        </div>
      </div>

      {/* Cost of Goods Sold Section */}
      <div className="mb-4 border rounded shadow-sm p-3">
        <h3 className="bg-danger text-white p-2 rounded-top">EXPENSES</h3>
        <div className="d-flex justify-content-between py-2">
            <span className="fw-semibold">CoGS</span>
          <span>Tsh {cogs.toLocaleString()}</span>
        </div>
        <div className="d-flex justify-content-between py-2 fw-bold border-top">
          <span className="fw-semibold">Total CoGS</span>
          <span>Tsh {cogs.toLocaleString()}</span>
        </div>
      </div>

      {/* Gross Profit/Loss */}
      <div className="mb-4 d-flex justify-content-between fw-bold fs-5 py-2 border-top">
  <span>Gross Profit/Loss</span>
  <span>Tsh {profit.toLocaleString()}</span>
</div>
<div className="mb-4 d-flex justify-content-between fw-bold fs-5 py-2">
  <span>Gross Profit Margin</span>
  <span>{grossProfitMargin.toFixed(2)}%</span>
</div>

     {/* Other Expenses */}
<div className="mb-4 border rounded shadow-sm p-3">
  <h3 className="bg-black text-white p-2 rounded-top">OTHER EXPENSES</h3>

  {Object.keys(expenseCategories).length > 0 ? (
    <div>
      {Object.entries(expenseCategories).map(([category, amount], index) => (
        <div key={index} className="d-flex justify-content-between py-1">
          <span className="fw-semibold">{category}</span>
          <span>Tsh {amount.toLocaleString()}</span>
        </div>
      ))}
    </div>
  ) : (
    <p>No categorized expenses available.</p>
  )}

    <div className="d-flex justify-content-between py-2">
    <span className="fw-bold">Total Expenses</span>
            <span className="fw-bold">Tsh {expense.toLocaleString()}</span>
  </div>
</div>

      {/* Print Button */}
      <div className="text-center mt-4">
        <Button
          onClick={handlePrint}
          variant="danger"
          size="lg"
          className="px-4 py-2 rounded-3 shadow"
        >
          Print Statement
        </Button>
      </div>
    </Container>
    </div>
  );
};

export default ProfitLossStatement;

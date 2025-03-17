import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "../renderer/desk.css";

const Desk: React.FC = () => {
  const [progress, setProgress] = useState<number | null>(null);
  const navigate = useNavigate();
  return (
    <div className="form-Desk" style={{fontFamily:'CustomFont'}}>
      <div className="form-box">
        <h3 className="form-title">Welcome to AdvaPOS</h3>
        <form>
          {/* <Link to="/registration">
            <button type="button" className="btn btn-danger">
              <i className="fas fa-plus" style={{ margin: 3 }} /> New Company
            </button>
          </Link> */}
          <Link to="/verify-serial">
            <button type="button" className="btn btn-secondary">
              <i className="fas fa-plus" style={{ margin: 3 }} /> Verify Serial Number
            </button>
          </Link>
        </form>

      </div>
    </div>
  );
};

export default Desk;

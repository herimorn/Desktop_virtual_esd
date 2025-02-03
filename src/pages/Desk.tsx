import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import "../renderer/desk.css";

const Desk: React.FC = () => {
  const [progress, setProgress] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleImportClick = async () => {
    setProgress(0);
    window.electron.onImportProgress(setProgress);
    const result = await window.electron.importDatabase();
    if (result.success) {
      alert('Database imported successfully!');
      navigate('/login'); // Navigate to the login route
    } else {
      alert('Failed to import database.');
    }
    setProgress(null);
  };

  return (
    <div className="form-Desk" style={{fontFamily:'CustomFont'}}>
      <div className="form-box">
        <h3 className="form-title">Welcome to AdvaPOS</h3>
        <form>
          <Link to="/registration">
            <button type="button" className="btn btn-danger">
              <i className="fas fa-plus" style={{ margin: 3 }} /> New Company
            </button>
          </Link>
          <button type="button" className="btn btn-secondary" onClick={handleImportClick}>
            <i className="fas fa-upload" style={{ margin: 5 }} /> Existing Company
          </button>
        </form>
        {progress !== null && <div className="progress-bar">{progress}%</div>}
      </div>
    </div>
  );
};

export default Desk;

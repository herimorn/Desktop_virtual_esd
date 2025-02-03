import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ProformaPreview from './pages/profoma/ProformaPreview';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/profoma/preview" element={<ProformaPreview />} />
      </Routes>
    </Router>
  );
};

export default App;

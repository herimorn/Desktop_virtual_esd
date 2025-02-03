import React, { useState, useEffect, ChangeEvent } from 'react';
import { Table, Form, InputGroup, FormControl } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
// import { Report } from '../types';

interface ReportListProps {
  reports: Report[];
}

const ReportList: React.FC<ReportListProps> = ({ reports }) => {
  const [filteredReports, setFilteredReports] = useState<Report[]>(reports);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setFilteredReports(filterReports());
  }, [reports, searchQuery, dateFilter, monthFilter, yearFilter]);

  const filterReports = () => {
    return reports.filter((report) => {
      return (
        (searchQuery === '' || report.rctnum.includes(searchQuery)) &&
        (dateFilter === null || new Date(report.report_date).toDateString() === dateFilter.toDateString()) &&
        (monthFilter === '' || new Date(report.report_date).getMonth() === parseInt(monthFilter)) &&
        (yearFilter === '' || new Date(report.report_date).getFullYear() === parseInt(yearFilter))
      );
    });
  };

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDateFilterChange = (date: Date | null) => {
    setDateFilter(date);
  };

  const handleMonthFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMonthFilter(e.target.value);
  };

  const handleYearFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setYearFilter(e.target.value);
  };

  return (
    <div style={{fontFamily:'CustomFont'}}>
      <InputGroup className="mb-3">
        <FormControl
          placeholder="Search by RCT Number"
          aria-label="Search"
          aria-describedby="basic-addon1"
          onChange={handleSearch}
        />
      </InputGroup>
      <InputGroup className="mb-3">
        <DatePicker selected={dateFilter} onChange={handleDateFilterChange} placeholderText="Filter by Date" />
        <Form.Select onChange={handleMonthFilterChange} value={monthFilter}>
          <option value="">Month</option>
          {/* Generate month options */}
          {[...Array(12).keys()].map((m) => (
            <option key={m} value={m}>
              {new Date(0, m).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </Form.Select>
        <Form.Select onChange={handleYearFilterChange} value={yearFilter}>
          <option value="">Year</option>
          {/* Generate year options dynamically */}
          {Array.from(new Set(reports.map((r) => new Date(r.report_date).getFullYear()))).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Form.Select>
      </InputGroup>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Report Date</th>
            <th>RCT Number</th>
            <th>Total Receipts</th>
            <th>Gross Amount</th>
            <th>Tax Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((report) => (
            <tr key={report.id}>
              <td>{report.report_date}</td>
              <td>{report.rctnum}</td>
              <td>{report.totalReceipts}</td>
              <td>{report.gross_amount}</td>
              <td>{report.tax_amount}</td>
              <td>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/receipts/${report.id}`)}
                >
                  View Receipts
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ReportList;

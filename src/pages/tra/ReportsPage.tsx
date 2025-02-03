import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Table, Button, Form, Pagination, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { Eye } from 'react-bootstrap-icons';
import { ToastContainer, toast } from 'react-toastify';

interface Report {
  id: number;
  report_date: string;
  totalReceipts: number;
}

const ReportPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  console.log("the reports are",reports)
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchDate, setSearchDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4;
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, [searchDate]);

  const fetchReports = async () => {
    try {
      const result: Report[] = await window.electron.fetchReportsByDate(searchDate || '2024-09-10');
      setReports(result);
      setFilteredReports(result);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error fetching reports.');
    }
  };

  const handleViewReceipts = (reportId: number) => {
    navigate(`/receipts/${reportId}`);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchDate(event.target.value);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getPaginatedReports = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReports.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  return (
    <Container fluid className="p-0 font" style={{fontFamily:'CustomFont'}}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content"  style={{marginTop:20}}>
          <h2 className="my-3" style={{position:'relative',top:-20}}>Reports</h2>
          <Form.Control style={{position:'relative',marginTop:-20,width:'25rem'}}
            type="date"
            placeholder="Search by report date"
            onChange={handleSearch}
            value={searchDate}
            className="mb-3"
          />
          <Table striped bordered hover  style={{marginTop:82}}>
            <thead>
              <tr>
                <th>#</th>
                <th>Report Date</th>
                <th>Total Excl Tax</th>
                <th>Total Incl Tax </th>
                <th>Total Receipts</th>
                <th style={{width:'10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedReports().length > 0 ? (
                getPaginatedReports().map((report: Report) => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
                    <td>{report.report_date}</td>
                    <td>{report.totalExclTax}</td>
                    <td>{report.totalInclTax}</td>
                    <td>{report.totalReceipts}</td>
                    <td>
                    <Button className='viewButton' onClick={() => handleViewReceipts(report.id)} variant="secondary">
                    <Eye />
</Button>

                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
          </Pagination>

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default ReportPage;

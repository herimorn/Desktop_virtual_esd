import React, { useState, useEffect, ChangeEvent } from 'react';
import { Container, Row, Col, Button, Form, Table, Modal, Pagination } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import productCategoryApi from '../../pages/api/productCategoryApi';

interface Category {
  id: number;
  name: string;
  description: string;
}

const Category: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>('');
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { userInfo } = useSelector((state: RootState) => state.user);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const response = await productCategoryApi.get(`/${userInfo.company.id}/categories`);
      console.log('Fetched data:', response.data);

      // Access the `data` property inside the response
      const categoriesData = Array.isArray(response.data.data) ? response.data.data : [];

      setFilteredCategories(categoriesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error fetching categories.');
      setFilteredCategories([]); // Ensure it's an empty array on error
    }
  };

  // Add Category Modal
  const handleAdd = () => {
    setModalType('Add');
    setCurrentCategory({ id: 0, name: '', description: '' });
    setShowModal(true);
  };

  // Edit Category Modal
  const handleEdit = (category: Category) => {
    setModalType('Edit');
    setCurrentCategory(category);
    setShowModal(true);
  };

  // Delete Category
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await productCategoryApi.delete(`/${id}`);
        toast.success('Category deleted successfully!');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Error deleting category.');
      }
    }
  };

  const handleSave = async () => {
    if (!currentCategory) return;

    try {
      const payload = {
       ...currentCategory,
        company_id: userInfo.company.id, // Include company ID
      };

      if (modalType === 'Add') {
        // POST request for adding a new category
        await productCategoryApi.post(`/${userInfo.company.id}/categories`, payload);
        toast.success('Category added successfully!');
      } else if (modalType === 'Edit') {
        // PUT request for updating an existing category
        await productCategoryApi.put(`/${currentCategory.id}/categories`, payload);
        toast.success('Category updated successfully!');
      }

      setShowModal(false); // Close the modal
      fetchCategories(); // Refresh the category list
    } catch (error: any) {
      console.error(`Error ${modalType === 'Add' ? 'adding' : 'updating'} category:`, error);
      toast.error(
        error?.response?.data?.message ||
        `Error ${modalType === 'Add' ? 'adding' : 'updating'} category.`
      );
    }
  };

  // Search Categories
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredCategories(
      categories.filter((category: Category) =>
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term)
      )
    );
    setCurrentPage(1); // Reset to first page on search
  };

  // Pagination Logic
  const handlePageChange = (newPage: number) => setCurrentPage(newPage);

  const getPaginatedCategories = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCategories.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  return (
    <Container fluid className="p-0" style={{ fontFamily: 'CustomFont' }}>
      <Header />
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
          <Sidebar />
        </Col>
        <Col md={10} className="p-5 content" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 4 }} className="mb-3">
            All Categories
          </h3>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </Col>
            <div className="text-end mb-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAdd}
                className="btn-sm rounded-pill text-white"
                style={{
                  width: 150,
                  margin: 10,
                  backgroundColor: '#6c757d', // Gray background
                  border: 'none',
                }}
              >
                <i className="bi bi-plus-circle"></i> Add Category
              </Button>
            </div>
          </Row>
          <Table striped bordered hover className="fontCss">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Description</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedCategories().length > 0 ? (
                getPaginatedCategories().map((category: Category, index: number) => (
                  <tr key={category.id}>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>{category.name}</td>
                    <td>{category.description}</td>
                    <td
                      style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '4px 8px',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                      }}
                    >
                      <Button
                        className="viewButton"
                        size="sm"
                        variant="warning"
                        onClick={() => handleEdit(category)}
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      <Button
                        className="deleteButton"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(category.id)}
                      >
                        <i className="bi bi-trash"></i>
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
            <Pagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => handlePageChange(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </Pagination>

          {/* Category Modal for Add/Edit */}
          <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalType === 'Add' ? 'Add Category' : 'Edit Category'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group controlId="formName" className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter category name"
                    value={currentCategory?.name || ''}
                    onChange={(e) =>
                      setCurrentCategory((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                  />
                </Form.Group>
                <Form.Group controlId="formDescription" className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter category description"
                    value={currentCategory?.description || ''}
                    onChange={(e) =>
                      setCurrentCategory((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                    }
                  />
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{ width: 80 }}>
                Close
              </Button>
              <Button variant="danger" onClick={handleSave} style={{ width: 80 }}>
                Save
              </Button>
            </Modal.Footer>
          </Modal>

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
        </Col>
      </Row>
    </Container>
  );
};

export default Category;


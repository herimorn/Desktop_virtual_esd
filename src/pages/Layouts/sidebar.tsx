/* eslint-disable react/self-closing-comp */
/* eslint-disable import/prefer-default-export */
/* eslint-disable prettier/prettier */
/* eslint-disable react/function-component-definition */
import React, { useEffect, useState } from 'react';
import { Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Import Bootstrap Icons
import "../../pages/Layouts/sidebar.css"
import { NavLink, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';

export const Sidebar: React.FC = () => {
const navigate = useNavigate();

const [isDropdownOpen, setDropdownOpen] = useState(false);
const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);
const dropdownMenuStyle = {
  backgroundColor: "grey", // Grey background for the dropdown menu
};

const dropdownItemStyle = {
  color: "#fff", // White text for the items
  backgroundColor: "grey", // Grey background for the items
};

  const activeStyle = {
    backgroundColor: '#57585a',
    color: 'white'
  };
  const handleLogout = () => {
    // Remove the session from localStorage
    console.log("logout")
    localStorage.removeItem('userSession');
    // Navigate to the login page
    navigate('/login');
  };

  return (
    <Nav variant="pills" className="flex-column nav pt-5 font">
      <NavLink
        to="/getstarted"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-play-circle"></i> Get Started
      </NavLink>
      <NavLink
        to="/dashboard"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-speedometer2"></i> Dashboard
      </NavLink>
      <NavLink
        to="/all-customer"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-people"></i> Customer
      </NavLink>
      <NavLink
        to="/supplier"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-truck"></i> Supplier
      </NavLink>
      <NavLink
        to="/all-product"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-box"></i> Product
      </NavLink>
      <NavLink
        to="/all_expenses"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-wallet2"></i> Expenses
      </NavLink>
      <NavLink
        to="/purchase"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-cart"></i> Purchase
      </NavLink>
      {/* profoma */}
      <NavLink
        to="/all-profoma"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-receipt"></i> Profoma
      </NavLink>
      <NavLink
        to="/all-sales"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-receipt"></i> Sales
      </NavLink>
      {/* <NavLink
        to="/services"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-receipt"></i> Services
      </NavLink> */}
      <NavLink
        to="/tra"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-file-earmark-text"></i> Tra
      </NavLink>
      <NavLink
        to="/stock"
        className="nav-link"
        style={({ isActive }) => (isActive ? activeStyle : undefined)}
      >
        <i className="bi bi-boxes"></i> Stock
      </NavLink>
      {/* <Dropdown show={isDropdownOpen} onToggle={toggleDropdown} className="nav-item dropdown">
  <Dropdown.Toggle
    as="a"
    className="nav-link dropdown-toggle"
    onClick={toggleDropdown}
    style={{ backgroundColor: '#57585a', color: 'white' }} // Match background color and text
  >
    <i className="bi bi-file-earmark-text"></i> Reports
  </Dropdown.Toggle>

  <Dropdown.Menu style={dropdownMenuStyle}>
    <NavLink
      to="/all-sales"
      className="dropdown-item"
      style={dropdownItemStyle}
    >
      All Sales
    </NavLink>

    <NavLink
      to="/purchase"
      className="dropdown-item"
      style={dropdownItemStyle}
    >
      All Purchase
    </NavLink>
  </Dropdown.Menu>
</Dropdown> */}


      <NavLink
      to="/login"
      className="nav-link"
      style={({ isActive }) => (isActive ? activeStyle : undefined)}
      onClick={handleLogout}
    >
      <i className="bi bi-box-arrow-right"></i> Logout
    </NavLink>

    </Nav>
  );
};

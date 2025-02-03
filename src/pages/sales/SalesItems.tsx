/* eslint-disable prettier/prettier */
/* eslint-disable react/function-component-definition */
import React from 'react';
import { Container, Row, Col,  } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {  } from 'react-router-dom';
import '../../renderer/getStarted.css';
import { Header } from '../Layouts/nav';
import { Sidebar } from '../Layouts/sidebar';

const SalesItems = () => {
  return (

    <Container fluid className="p-0 font">
     <Header/>
      <Row noGutters>
        <Col md={2} className="bg-light sidebar p-3">
         <Sidebar/>
        </Col>
        <Col md={10} className="p-4 content">
          <h3 className="mb-4">Sales   Items</h3>
          </Col>
        </Row>
    </Container>
  );
};

export default SalesItems;

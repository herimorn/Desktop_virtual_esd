<div id='invoiceDetails' onClick={() => handleSectionClick('invoiceDetails')}
 style={{ ...styles.invoiceDetails, ...applyCustomStyles('invoiceDetails') }} >
  <Draggable position={positions.billTo || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'billTo')} disabled={true}>
    <div id="billTo" onClick={() => handleSectionClick('billTo')}
     style={{ ...styles.billTo, ...applyCustomStyles('billTo') }}>
      <strong>COMPANY NAME:</strong>{'  '}{sale.customer_name}
      <br />
      <strong>TIN:</strong>{'   '}{sale.tin}
      <br />
      <strong>ADDRESS:</strong>{'   '}{sale.address}
      <br />
      <strong>MOB:</strong>{'   '}{sale.phone}
      <br />
      <strong>EMAIL:</strong>{'   '}{sale.email}
      <br />
    </div>
  </Draggable>
  <Draggable position={positions.invoiceInfo || { x: 0, y: 0 }}
        onStop={(e, data) => handleDragStop(e, data, 'invoiceInfo')} disabled={true}>
    <div id="invoiceInfo" onClick={() => handleSectionClick('invoiceInfo')}
     style={{ ...styles.invoiceInfo, ...applyCustomStyles('invoiceInfo') }}>
      {sale.profoma_number && (
        <div style={{ fontSize: '14px', color: '#000', marginBottom: '5px' }}>
          <strong>PROFORMA NO: </strong>{sale.profoma_number}
        </div>
      )}
      <strong>INVOICE NO.: </strong>
      {sale.invoice_number}
      <br />
      <strong>Date: </strong>
      {new Date(sale.date).toLocaleDateString()}
      <br />
      <strong>VRN: </strong>
      {sale.VRN}
      <br />
    </div>
  </Draggable>
</div>

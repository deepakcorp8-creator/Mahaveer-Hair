import { Entry } from '../types';

export const generateInvoice = (entry: Entry) => {
  const invoiceWindow = window.open('', '_blank');
  if (!invoiceWindow) {
    alert('Please allow popups to generate the invoice.');
    return;
  }

  // Logo URL
  const LOGO_URL = "https://i.ibb.co/hhB5D9r/MAHAVEER-Logo-1920x1080-1.png";

  // Current Date for the Invoice Print Date
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${entry.clientName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          color: #1f2937;
          line-height: 1.5;
          margin: 0;
          padding: 20px;
          background: #fff;
        }

        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e5e7eb;
          padding: 40px;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logo-img {
          width: 80px;
          height: 80px;
          object-fit: contain;
          display: block;
        }
        .logo-text-fallback {
          display: none;
          width: 80px;
          height: 80px;
          background: #4f46e5;
          color: white;
          font-weight: 800;
          font-size: 40px;
          text-align: center;
          line-height: 80px;
          border-radius: 12px;
        }
        .company-name {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }
        .company-details {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-label {
          font-size: 32px;
          font-weight: 800;
          color: #4f46e5;
          margin: 0;
        }
        .invoice-meta {
          margin-top: 10px;
          font-size: 14px;
          color: #374151;
        }

        /* Client & Info */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        .info-box h3 {
          font-size: 14px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .info-content {
          font-size: 15px;
          font-weight: 600;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        /* Table */
        .table-container {
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #f9fafb;
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 700;
          border-bottom: 2px solid #e5e7eb;
        }
        td {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        .col-price {
          text-align: right;
          font-weight: 600;
        }

        /* Totals */
        .total-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 60px;
        }
        .total-box {
          width: 250px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
        }
        .grand-total {
          border-top: 2px solid #111827;
          margin-top: 10px;
          padding-top: 10px;
          font-weight: 800;
          font-size: 18px;
          color: #4f46e5;
        }

        /* Footer */
        .footer {
          border-top: 1px dashed #e5e7eb;
          padding-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }
        .terms {
          margin-top: 40px;
          font-size: 11px;
          text-align: left;
          color: #6b7280;
        }

        /* Print Button (Hide when printing) */
        .no-print {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #4f46e5;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
        }

        @media print {
          .no-print { display: none; }
          .invoice-container { border: none; padding: 0; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        
        <!-- Header -->
        <header class="header">
          <div class="logo-section">
            <img 
                src="${LOGO_URL}" 
                alt="Logo" 
                class="logo-img" 
                referrerpolicy="no-referrer"
                onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='block';"
            />
            <div id="logo-fallback" class="logo-text-fallback">M</div>
            <div>
              <div class="company-name">Mahaveer Hair Solution</div>
              <div class="company-details">Vyapar Vihar, Bilaspur, Chhattisgarh</div>
              <div class="company-details">+91 91234 56789 | support@mahaveer.com</div>
            </div>
          </div>
          <div class="invoice-title">
            <h1 class="invoice-label">INVOICE</h1>
            <div class="invoice-meta">Date: ${entry.date}</div>
            <div class="invoice-meta">Invoice #: INV-${Math.floor(Math.random() * 10000)}</div>
          </div>
        </header>

        <!-- Info -->
        <div class="info-grid">
          <div class="info-box">
            <h3>Bill To</h3>
            <div class="info-content">
              <div>${entry.clientName}</div>
              <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">${entry.address || 'N/A'}</div>
              <div style="font-size: 13px; color: #4b5563;">Ph: ${entry.contactNo}</div>
            </div>
          </div>
          <div class="info-box">
            <h3>Service Details</h3>
            <div class="info-content">
              <div class="info-row"><span>Branch:</span> <span>${entry.branch}</span></div>
              <div class="info-row"><span>Technician:</span> <span>${entry.technician}</span></div>
              <div class="info-row"><span>Method:</span> <span>${entry.patchMethod}</span></div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Description / Service</th>
                <th style="text-align: center">Qty</th>
                <th class="col-price">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${entry.serviceType} APPLICATION</strong>
                  ${entry.patchSize ? `<br/><span style="font-size: 12px; color: #6b7280">Size/Item: ${entry.patchSize}</span>` : ''}
                  <br/><span style="font-size: 12px; color: #9ca3af">${entry.remark || ''}</span>
                </td>
                <td style="text-align: center">1</td>
                <td class="col-price">₹${entry.amount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="total-section">
          <div class="total-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${entry.amount}</span>
            </div>
            <div class="total-row">
              <span>Tax (0%):</span>
              <span>₹0.00</span>
            </div>
            <div class="total-row grand-total">
              <span>Total:</span>
              <span>₹${entry.amount}</span>
            </div>
             <div class="total-row" style="font-size: 12px; color: #6b7280; margin-top: 5px;">
              <span>Payment Via:</span>
              <span style="font-weight: bold; color: #111827;">${entry.paymentMethod}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="terms">
          <strong>Terms & Conditions:</strong>
          <p>1. Goods once sold will not be taken back.<br>2. Please retain this invoice for future service references.<br>3. Hair patch maintenance guidelines must be followed for warranty.</p>
        </div>

        <div class="footer">
          <p>Thank you for choosing Mahaveer Hair Solution!</p>
          <p>Printed on: ${printDate}</p>
        </div>

        <button class="no-print" onclick="window.print()">Print / Download PDF</button>

      </div>
    </body>
    </html>
  `;

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
  // Optional: Auto print
  // invoiceWindow.print();
};
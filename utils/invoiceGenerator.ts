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

  const invoiceNumber = `INV-${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${entry.clientName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
          font-family: 'Inter', Helvetica, Arial, sans-serif;
          color: #374151;
          background: #f9fafb;
          padding: 40px 0;
          margin: 0;
          line-height: 1.5;
        }

        .invoice-box {
          max-width: 800px;
          margin: auto;
          padding: 40px;
          border: 1px solid #e5e7eb;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* Header Section */
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 20px;
        }

        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 10px;
        }

        .company-name {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          margin: 5px 0;
          letter-spacing: 0.5px;
        }

        .company-details {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.6;
        }

        .company-details strong {
            color: #374151;
        }

        /* Invoice Meta Bar */
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          background: #f9fafb;
          padding: 10px 20px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 30px;
          font-size: 13px;
        }

        .meta-item strong {
          color: #111827;
          margin-right: 5px;
        }

        /* Info Columns */
        .info-columns {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 40px;
        }

        .info-col {
          flex: 1;
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
        }

        .info-text {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 2px;
        }
        
        .info-sub {
          font-size: 13px;
          color: #6b7280;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }

        th {
          background: #111827;
          color: white;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          padding: 12px;
          text-align: left;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #374151;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .item-row:last-child td {
            border-bottom: none;
        }

        /* Totals */
        .totals-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }

        .totals-box {
          width: 300px;
          border-top: 2px solid #111827;
          padding-top: 10px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 14px;
        }

        .total-row.final {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          border-top: 1px solid #e5e7eb;
          margin-top: 5px;
          padding-top: 10px;
        }

        /* Footer */
        .footer {
          border-top: 2px solid #f3f4f6;
          padding-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .terms {
          flex: 1;
          font-size: 11px;
          color: #9ca3af;
          padding-right: 40px;
        }
        
        .terms h5 {
            margin: 0 0 5px 0;
            color: #6b7280;
            text-transform: uppercase;
        }

        .signature {
          text-align: center;
          width: 200px;
        }

        .sign-line {
          border-bottom: 1px solid #111827;
          height: 40px;
          margin-bottom: 5px;
        }
        
        .sign-text {
            font-size: 12px;
            font-weight: 600;
            color: #111827;
        }

        .print-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        @media print {
          body { background: white; padding: 0; }
          .invoice-box { border: none; box-shadow: none; max-width: 100%; padding: 0; }
          .print-btn { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        
        <!-- Header -->
        <div class="header">
           <img src="${LOGO_URL}" class="logo" alt="Logo" onerror="this.style.display='none'"/>
           <div class="company-name">MAHAVEER HAIR SOLUTION</div>
           <div class="company-details">
              First Floor, Opp. Ayurvedic College & Anupam Garden, Near Amit Sales, G.E. Road, Raipur, Chhattisgarh<br>
              <strong>Mobile:</strong> +91-9691699382, +91-9144939828, +91-9993239828<br>
              <strong>Email:</strong> info@mahaveerhairsolution.com, mahaveerhairwig@gmail.com
           </div>
        </div>

        <!-- Meta Bar -->
        <div class="invoice-meta">
            <div class="meta-item"><strong>Invoice No:</strong> ${invoiceNumber}</div>
            <div class="meta-item"><strong>Date:</strong> ${entry.date}</div>
            <div class="meta-item"><strong>Branch:</strong> ${entry.branch}</div>
        </div>

        <!-- Info Columns -->
        <div class="info-columns">
            <div class="info-col">
                <div class="section-title">Billed To</div>
                <div class="info-text" style="font-size: 16px; font-weight: 700;">${entry.clientName}</div>
                <div class="info-sub">${entry.address || 'Address not provided'}</div>
                <div class="info-sub">Phone: ${entry.contactNo}</div>
            </div>
            <div class="info-col" style="text-align: right;">
                <div class="section-title">Service Details</div>
                <div class="info-text">Technician: <span style="font-weight: 400;">${entry.technician}</span></div>
                <div class="info-text">Method: <span style="font-weight: 400;">${entry.patchMethod}</span></div>
                <div class="info-text">Service #: <span style="font-weight: 400;">${entry.numberOfService}</span></div>
            </div>
        </div>

        <!-- Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr class="item-row">
                    <td>
                        <div style="font-weight: 600; color: #111827;">${entry.serviceType} APPLICATION</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                            ${entry.patchSize ? `Size/Item: ${entry.patchSize} | ` : ''}
                            ${entry.remark ? `Note: ${entry.remark}` : 'Standard Service'}
                        </div>
                    </td>
                    <td class="text-center">1</td>
                    <td class="text-right">₹${entry.amount}</td>
                    <td class="text-right">₹${entry.amount}</td>
                </tr>
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-container">
            <div class="totals-box">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>₹${entry.amount}</span>
                </div>
                <div class="total-row">
                    <span>Tax (0%)</span>
                    <span>₹0.00</span>
                </div>
                <div class="total-row final">
                    <span>Grand Total</span>
                    <span>₹${entry.amount}</span>
                </div>
                <div class="total-row" style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                    <span>Paid via ${entry.paymentMethod}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="terms">
                <h5>Terms & Conditions</h5>
                <p>1. Goods once sold will not be taken back.<br>
                2. Please retain this invoice for future service references.<br>
                3. Hair patch maintenance guidelines must be followed for warranty.</p>
            </div>
            <div class="signature">
                <div class="sign-line"></div>
                <div class="sign-text">Authorized Signatory</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #9ca3af;">
            Computer Generated Invoice • Printed on ${printDate}
        </div>

        <button class="print-btn" onclick="window.print()">Print Invoice</button>

      </div>
    </body>
    </html>
  `;

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
};

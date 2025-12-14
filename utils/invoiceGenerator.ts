
import { Entry } from '../types';

export const generateInvoice = (entry: Entry) => {
  const invoiceWindow = window.open('', '_blank');
  if (!invoiceWindow) {
    alert('Please allow popups to generate the invoice.');
    return;
  }

  // Logo URL
  const LOGO_URL = "https://i.ibb.co/hhB5D9r/MAHAVEER-Logo-1920x1080-1.png";

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  // BRANCH SPECIFIC ADDRESS LOGIC
  let branchAddress = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
  let branchContact = "+91-9144939828";

  // Check branch code (Handle case insensitivity)
  const branchCode = (entry.branch || 'RPR').toUpperCase();

  if (branchCode === 'JDP') {
      branchAddress = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
      branchContact = "09725567348";
  }
  // Default (RPR and BSP) uses the Raipur Address defined above

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${entry.clientName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        @page {
          size: A4;
          margin: 0;
        }

        body {
          font-family: 'Inter', Helvetica, Arial, sans-serif;
          background: #525252;
          margin: 0;
          padding: 20px 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          display: flex;
          justify-content: center;
        }

        .invoice-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 15mm; /* Standard Print Margin */
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          position: relative;
          color: #374151;
          line-height: 1.4;
        }

        /* Header */
        .header {
          text-align: center;
          border-bottom: 2px solid #111827;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .logo {
          height: 60px;
          margin-bottom: 5px;
          object-fit: contain;
        }

        .brand {
          font-size: 20px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .address {
          font-size: 10px;
          color: #6b7280;
          max-width: 80%;
          margin: 0 auto;
        }

        /* Info Grid */
        .grid-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
        }

        .box {
          flex: 1;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 11px;
        }

        .box-title {
          font-size: 9px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .box-content {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
        }
        
        .box-sub {
          font-size: 11px;
          font-weight: 400;
          color: #4b5563;
        }

        /* Invoice Meta */
        .meta-row {
          display: flex;
          justify-content: space-between;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 15px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }

        th {
          background: #111827;
          color: white;
          text-transform: uppercase;
          padding: 8px 10px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
        }

        td {
          padding: 8px 10px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        .item-desc {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
        }
        .item-sub {
          font-size: 10px;
          color: #6b7280;
          margin-top: 2px;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }

        /* Totals */
        .totals {
          display: flex;
          justify-content: flex-end;
        }

        .totals-table {
          width: 250px;
          border-collapse: collapse;
        }

        .totals-table td {
          padding: 4px 0;
          border: none;
        }

        .grand-total {
          border-top: 2px solid #111827 !important;
          padding-top: 8px !important;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
        }

        /* Footer */
        .footer {
          position: absolute;
          bottom: 15mm;
          left: 15mm;
          right: 15mm;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
          font-size: 10px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .terms p { margin: 2px 0; }
        
        .signature {
          text-align: center;
          width: 150px;
        }
        .sign-line {
          border-bottom: 1px solid #111827;
          height: 30px;
          margin-bottom: 4px;
        }

        /* Action Buttons */
        .actions-bar {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 10px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          display: flex;
          gap: 12px;
          z-index: 1000;
          border: 1px solid #e5e7eb;
        }

        .btn {
            padding: 10px 24px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
        }
        
        .btn-print { 
            background: #f3f4f6; 
            color: #374151; 
            border: 1px solid #d1d5db;
        }
        .btn-print:hover { background: #e5e7eb; }

        .btn-download { 
            background: #2563eb; 
            color: white; 
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .btn-download:hover { background: #1d4ed8; transform: translateY(-1px); }

        @media print {
          body { padding: 0; background: white; display: block; }
          .invoice-page { 
            width: 100%; 
            height: 100%; 
            margin: 0; 
            box-shadow: none; 
            padding: 10mm; /* Slightly tighter for print */
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div id="invoice-element" class="invoice-page">
        
        <!-- Header -->
        <div class="header">
           <img src="${LOGO_URL}" class="logo" alt="Mahaveer Logo" onerror="this.style.display='none'" />
           <div class="brand">Mahaveer Hair Solution</div>
           <div class="address">
              ${branchAddress}<br>
              <strong>Contact:</strong> ${branchContact} | <strong>Email:</strong> info@mahaveerhairsolution.com
           </div>
        </div>

        <!-- Meta -->
        <div class="meta-row">
            <span>Invoice #: ${invoiceNumber}</span>
            <span>Date: ${entry.date}</span>
            <span>Branch: ${entry.branch}</span>
        </div>

        <!-- Info Grid -->
        <div class="grid-container">
            <div class="box">
                <div class="box-title">Bill To</div>
                <div class="box-content">${entry.clientName}</div>
                <div class="box-sub">${entry.address || 'Address N/A'}</div>
                <div class="box-sub">Ph: ${entry.contactNo}</div>
            </div>
            <div class="box">
                <div class="box-title">Service Details</div>
                <div class="box-sub">Type: <strong style="color:#111">${entry.serviceType}</strong></div>
                <div class="box-sub">Tech: ${entry.technician}</div>
                <div class="box-sub">Method: ${entry.patchMethod}</div>
            </div>
        </div>

        <!-- Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 50%">Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="item-desc">${entry.serviceType} APPLICATION</div>
                        <div class="item-sub">
                            ${entry.patchSize ? `Patch Size: ${entry.patchSize}` : ''}
                            ${entry.remark ? `<br/>Note: ${entry.remark}` : ''}
                        </div>
                    </td>
                    <td class="text-center">1</td>
                    <td class="text-right">₹${entry.amount}</td>
                    <td class="text-right"><strong>₹${entry.amount}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td>Subtotal</td>
                    <td class="text-right">₹${entry.amount}</td>
                </tr>
                <tr>
                    <td>Pending Due</td>
                    <td class="text-right" style="color: #dc2626;">₹${entry.pendingAmount || 0}</td>
                </tr>
                <tr>
                    <td>Payment Mode</td>
                    <td class="text-right" style="text-transform: uppercase;">${entry.paymentMethod}</td>
                </tr>
                <tr>
                    <td class="grand-total">Grand Total</td>
                    <td class="text-right grand-total">₹${entry.amount}</td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="terms">
                <strong style="color: #6b7280; text-transform: uppercase;">Terms & Conditions:</strong>
                <p>1. Goods once sold will not be returned.</p>
                <p>2. Subject to Raipur Jurisdiction.</p>
                <p style="margin-top: 5px;">Thank you for your business!</p>
            </div>
            <div class="signature">
                <div class="sign-line"></div>
                <strong>Authorized Signatory</strong>
            </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-bar no-print">
          <button onclick="handleDownload()" class="btn btn-download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button onclick="window.print()" class="btn btn-print">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
      </div>

      <script>
        function handleDownload() {
            const element = document.getElementById('invoice-element');
            const btns = document.querySelector('.actions-bar');
            const originalShadow = element.style.boxShadow;
            
            // Clean up visual styles before capture
            btns.style.display = 'none';
            element.style.boxShadow = 'none'; // Remove shadow for clean PDF
            
            const opt = {
              margin: 0,
              filename: 'Invoice_${entry.clientName}_${entry.date}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                // Restore buttons
                btns.style.display = 'flex';
                element.style.boxShadow = originalShadow;
            }).catch(err => {
                console.error(err);
                alert('Error generating PDF. Please use the Print button.');
                btns.style.display = 'flex';
                element.style.boxShadow = originalShadow;
            });
        }
      </script>
    </body>
    </html>
  `;

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
};

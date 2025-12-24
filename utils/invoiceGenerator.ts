
import { Entry } from '../types';

export const generateInvoice = (entry: Entry) => {
  const invoiceWindow = window.open('', '_blank');
  if (!invoiceWindow) {
    alert('Please allow popups to generate the invoice.');
    return;
  }

  // DIRECT IMAGE LINK (Landscape)
  const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  // DATE FORMATTING (YYYY-MM-DD -> DD/MM/YYYY)
  let formattedDate = entry.date;
  try {
      if (entry.date && entry.date.includes('-')) {
          const parts = entry.date.split('-');
          if (parts.length === 3) {
              formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
      } else if (entry.date) {
          const d = new Date(entry.date);
          formattedDate = d.toLocaleDateString('en-GB'); // dd/mm/yyyy
      }
  } catch (e) {
      formattedDate = entry.date;
  }

  // BRANCH SPECIFIC ADDRESS LOGIC
  let branchAddress = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
  let branchContact = "+91-9144939828";

  // Check branch code (Handle case insensitivity)
  const branchCode = (entry.branch || 'RPR').toUpperCase();

  if (branchCode === 'JDP') {
      branchAddress = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
      branchContact = "09725567348";
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${entry.clientName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet">
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
          padding: 40px;
          box-sizing: border-box;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          position: relative;
          color: #333;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          text-align: center;
          margin-bottom: 25px;
        }

        .logo {
          font-size: 32px; 
          font-weight: 900; 
          margin-bottom: 0px; 
          letter-spacing: -1px; 
          text-transform: uppercase; 
          color: #000;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .logo span { color: #0ea5e9; }

        /* Fallback if image fails */
        img.logo-img {
            max-height: 60px;
            margin-bottom: 5px;
        }

        .tagline { font-size: 10px; letter-spacing: 2px; color: #555; margin-bottom: 12px; text-transform: uppercase; font-weight: 700; }

        .address {
          font-size: 10px;
          color: #555;
          max-width: 80%;
          margin: 0 auto;
          line-height: 1.5;
        }
        
        .divider { border-bottom: 2px solid #000; margin: 25px 0; }

        /* Meta Box */
        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
        }
        .meta-group { display: flex; flex-direction: column; }
        .meta-label { font-size: 9px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 2px; }
        .meta-val { font-size: 12px; font-weight: 700; color: #000; }

        /* Info Grid */
        .grid-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          gap: 20px;
        }

        .box {
          flex: 1;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #fafafa;
          vertical-align: top;
        }

        .box-title {
          font-size: 9px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 900;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }

        .box-name { font-size: 13px; font-weight: 900; margin-bottom: 2px; color: #000; }
        .box-detail { font-size: 11px; color: #4b5563; line-height: 1.4; font-weight: 500; }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }

        th {
          background-color: #111;
          color: #fff;
          text-transform: uppercase;
          padding: 10px;
          text-align: left;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        td {
          padding: 12px 10px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
          font-size: 11px;
          font-weight: 500;
          color: #333;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: 700; color: #000; }

        /* Totals */
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: auto; /* Push footer down */
        }

        .totals-table {
          width: 260px;
          border-collapse: collapse;
        }

        .totals-table td {
          padding: 6px 0;
          border: none;
        }
        
        .total-label { text-align: left; font-size: 11px; color: #4b5563; font-weight: 500; }
        .total-val { text-align: right; font-size: 12px; font-weight: 900; color: #000; }

        .grand-total {
          border-top: 2px solid #000 !important;
          border-bottom: 2px solid #000 !important;
          padding: 10px 0 !important;
        }
        .grand-total .total-val {
          font-size: 14px;
        }

        /* Professional Footer */
        .footer-wrapper {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        
        .footer-cols {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .terms {
            font-size: 9px;
            color: #666;
            max-width: 55%;
            line-height: 1.6;
        }
        .terms-title { font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #111; }

        .signature {
          text-align: right;
          width: 220px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .for-company {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            margin-bottom: 10px;
        }
        
        /* System Generated Badge */
        .sys-gen-badge {
            font-size: 9px;
            font-weight: 700;
            background: #f3f4f6;
            color: #374151;
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .no-sign {
            font-size: 8px;
            color: #9ca3af;
            margin-top: 4px;
            font-weight: 500;
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
            padding: 40px;
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div id="invoice-element" class="invoice-page">
        
        <!-- Header -->
        <div class="header">
           <div class="logo">MAHAVEER <span>HAIR</span></div>
           <div class="tagline">Solution For Better Shine</div>
           <div class="address">
              ${branchAddress}<br>
              <strong>Contact:</strong> ${branchContact} &nbsp;|&nbsp; <strong>Email:</strong> info@mahaveerhairsolution.com
           </div>
        </div>
        
        <div class="divider"></div>

        <!-- Meta -->
        <div class="meta-row">
            <div class="meta-group">
                <span class="meta-label">Invoice Number</span>
                <span class="meta-val">${invoiceNumber}</span>
            </div>
            <div class="meta-group" style="text-align:center">
                <span class="meta-label">Date Issued</span>
                <span class="meta-val">${formattedDate}</span>
            </div>
            <div class="meta-group" style="text-align:right">
                <span class="meta-label">Branch Code</span>
                <span class="meta-val">${branchCode}</span>
            </div>
        </div>

        <!-- Info Grid -->
        <div class="grid-container">
            <div class="box">
                <div class="box-title">Bill To</div>
                <div class="box-name">${entry.clientName}</div>
                <div class="box-detail">${entry.address || 'Address not provided'}</div>
                <div class="box-detail">Ph: ${entry.contactNo}</div>
            </div>
            <div class="box">
                <div class="box-title">Service Info</div>
                <div class="box-name">${entry.serviceType} Application</div>
                <div class="box-detail">Technician: ${entry.technician}</div>
                <div class="box-detail">Method: ${entry.patchMethod}</div>
            </div>
        </div>

        <!-- Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 55%">Description</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="bold">${entry.serviceType} Service</div>
                        <div class="box-detail" style="margin-top:2px;">
                            ${entry.patchSize ? `Size: ${entry.patchSize}` : ''}
                            ${entry.remark ? `<br/>Note: ${entry.remark}` : ''}
                        </div>
                    </td>
                    <td class="text-center bold">1</td>
                    <td class="text-right bold">₹${entry.amount}</td>
                    <td class="text-right bold">₹${entry.amount}</td>
                </tr>
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal</td>
                    <td class="total-val">₹${entry.amount}</td>
                </tr>
                <tr>
                    <td class="total-label">Pending Amount</td>
                    <td class="total-val" style="${(entry.pendingAmount || 0) > 0 ? 'color:red' : 'color:#333'}">₹${entry.pendingAmount || 0}</td>
                </tr>
                <tr>
                    <td class="total-label">Payment Mode</td>
                    <td class="total-val" style="text-transform: uppercase;">${entry.paymentMethod}</td>
                </tr>
                <tr>
                    <td class="total-label grand-total" style="color:black; font-weight:900;">Total Paid</td>
                    <td class="total-val grand-total">₹${Math.max(0, Number(entry.amount) - (Number(entry.pendingAmount) || 0))}</td>
                </tr>
            </table>
        </div>

        <!-- Professional Footer -->
        <div class="footer-wrapper">
            <div class="footer-cols">
                <div class="terms">
                    <div class="terms-title">Terms & Conditions</div>
                    • Goods once sold will not be returned.<br>
                    • Subject to Raipur Jurisdiction only.<br>
                    • Interest @ 24% p.a. will be charged if bill is not paid on due date.<br>
                    • E. & O.E.
                </div>
                <div class="signature">
                    <div class="for-company">For, Mahaveer Hair Solution</div>
                    <div class="sys-gen-badge">System Generated Invoice</div>
                    <div class="no-sign">No physical signature required</div>
                </div>
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
            element.style.boxShadow = 'none'; 
            
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

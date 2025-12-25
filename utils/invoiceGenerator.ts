
import { Entry } from '../types';

export const generateInvoice = (entry: Entry) => {
  const invoiceWindow = window.open('', '_blank');
  if (!invoiceWindow) {
    alert('Please allow popups to generate the invoice.');
    return;
  }

  // FIXED: Using stable public URL instead of signed AppSheet URL which expires/blocks access
  const LOGO_URL = "https://i.ibb.co/WpNJYmKV/MAHAVEER-Logo-1920x1080-1.png";

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
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #111; font-size: 12px; padding: 30px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; }
        
        .header-container { text-align: center; margin-bottom: 30px; }
        .logo-img { max-width: 250px; height: auto; display: block; margin: 0 auto 10px auto; }
        .address { font-size: 11px; color: #555; line-height: 1.4; }
        
        .meta-table { width: 100%; margin-bottom: 25px; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
        .meta-table td { padding: 12px 0; vertical-align: top; }
        .meta-label { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.05em; }
        .meta-val { font-size: 13px; font-weight: 700; color: #111827; }
        
        .box-table { width: 100%; margin-bottom: 30px; }
        .box-cell { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
        .box-title { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; letter-spacing: 0.05em; }
        .box-content { font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 2px; }
        .box-sub { font-size: 12px; color: #4b5563; }
        
        .item-table { width: 100%; margin-bottom: 30px; }
        .item-table th { background-color: #f3f4f6; color: #374151; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 700; border-bottom: 2px solid #e5e7eb; }
        .item-table td { border-bottom: 1px solid #f3f4f6; padding: 15px 10px; font-size: 12px; color: #374151; }
        .item-name { font-weight: 700; color: #111; font-size: 13px; }
        
        .totals-container { float: right; width: 300px; }
        .totals-table { width: 100%; }
        .totals-table td { padding: 6px 0; text-align: right; }
        .totals-label { font-size: 11px; color: #6b7280; font-weight: 600; }
        .totals-val { font-size: 13px; font-weight: 700; color: #1f2937; }
        
        .grand-total { border-top: 2px solid #111; padding-top: 12px; margin-top: 6px; }
        .grand-label { font-size: 12px; font-weight: 800; color: #111; }
        .grand-val { font-size: 18px; font-weight: 900; color: #111; }
        
        .footer { margin-top: 80px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; }
        .footer-table td { vertical-align: top; }
        .terms-title { font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 5px; }
        
        .badge { display: inline-block; padding: 4px 8px; background: #f3f4f6; color: #4b5563; font-size: 10px; font-weight: 600; border-radius: 4px; }
        
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .box-cell { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
            .item-table th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
        }
        
        .btn-print { 
            position: fixed; bottom: 30px; right: 30px; 
            background: #111; color: white; 
            padding: 12px 24px; border-radius: 50px; 
            text-decoration: none; font-weight: 700; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: sans-serif;
        }
        .btn-print:hover { background: #000; }
      </style>
    </head>
    <body>
      
      <div class="header-container">
        <img src="${LOGO_URL}" class="logo-img" alt="Mahaveer Hair Solution" />
        <div class="address">
          ${branchAddress}<br>
          <strong>Contact:</strong> ${branchContact} | <strong>Email:</strong> info@mahaveerhairsolution.com
        </div>
      </div>

      <table class="meta-table">
        <tr>
          <td width="33%">
            <span class="meta-label">Invoice Number</span>
            <span class="meta-val">${invoiceNumber}</span>
          </td>
          <td width="33%" align="center">
            <span class="meta-label">Date Issued</span>
            <span class="meta-val">${formattedDate}</span>
          </td>
          <td width="33%" align="right">
            <span class="meta-label">Branch Code</span>
            <span class="meta-val">${branchCode}</span>
          </td>
        </tr>
      </table>

      <table class="box-table">
        <tr>
          <td width="48%" valign="top">
            <div class="box-cell">
              <div class="box-title">Bill To</div>
              <div class="box-content">${entry.clientName}</div>
              <div class="box-sub">${entry.address || ''}</div>
              <div class="box-sub" style="margin-top:2px;"><strong>Ph:</strong> ${entry.contactNo}</div>
            </div>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            <div class="box-cell">
              <div class="box-title">Service Details</div>
              <div class="box-content">${entry.serviceType} Application</div>
              <div class="box-sub" style="margin-top:4px;">
                <strong>Technician:</strong> ${entry.technician}<br>
                <strong>Method:</strong> ${entry.patchMethod}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <table class="item-table">
        <thead>
          <tr>
            <th width="50%">Description</th>
            <th align="center">Qty</th>
            <th align="right">Price</th>
            <th align="right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-name">${entry.serviceType} Service</div>
              <div style="color:#6b7280; font-size:11px; margin-top:2px;">
                ${entry.patchSize ? 'Size: ' + entry.patchSize : ''} 
                ${entry.remark ? (entry.patchSize ? ' | ' : '') + entry.remark : ''}
              </div>
            </td>
            <td align="center">1</td>
            <td align="right">₹${entry.amount}</td>
            <td align="right"><strong>₹${entry.amount}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="totals-container">
        <table class="totals-table">
          <tr>
            <td class="totals-label">Subtotal</td>
            <td class="totals-val">₹${entry.amount}</td>
          </tr>
          <tr>
            <td class="totals-label">Pending Amount</td>
            <td class="totals-val" style="color:${(entry.pendingAmount||0)>0?'#ef4444':'inherit'}">₹${entry.pendingAmount||0}</td>
          </tr>
          <tr>
            <td class="totals-label">Payment Mode</td>
            <td class="totals-val" style="text-transform:uppercase">${entry.paymentMethod}</td>
          </tr>
          <tr class="grand-total">
            <td class="grand-label">Total Paid</td>
            <td class="grand-val">₹${Math.max(0, Number(entry.amount) - (Number(entry.pendingAmount)||0))}</td>
          </tr>
        </table>
      </div>
      <div style="clear:both;"></div>

      <div class="footer">
        <table class="footer-table" width="100%">
          <tr>
            <td width="60%">
              <div class="terms-title">Terms & Conditions</div>
              <ul style="margin:0; padding-left:15px; line-height:1.6;">
                <li>Goods once sold will not be returned.</li>
                <li>Subject to Raipur Jurisdiction only.</li>
                <li>This is a system generated invoice.</li>
                <li>E. & O.E.</li>
              </ul>
            </td>
            <td width="40%" align="right" valign="bottom">
              <div style="text-align:right;">
                <strong>For, MAHAVEER HAIR SOLUTION</strong><br><br><br>
                <span class="badge">Authorized Signatory</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <a href="javascript:window.print()" class="btn-print no-print">Print Invoice</a>

    </body>
    </html>
  `;

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
};

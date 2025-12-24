
import { Entry } from '../types';

export const generateInvoice = (entry: Entry) => {
  const invoiceWindow = window.open('', '_blank');
  if (!invoiceWindow) {
    alert('Please allow popups to generate the invoice.');
    return;
  }

  // LOGO URL
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
        body { font-family: sans-serif; color: #111; font-size: 11px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        .header-table td { text-align: center; vertical-align: middle; }
        .logo-img { width: 100%; max-width: 300px; height: auto; display: block; margin: 0 auto; margin-bottom: 10px; }
        .address { font-size: 10px; color: #666; margin-top: 5px; line-height: 1.4; }
        
        .meta-table { margin-top: 30px; border-top: 1px solid #ddd; margin-bottom: 20px; }
        .meta-table td { padding: 15px 0; vertical-align: top; }
        .label { font-size: 9px; color: #888; font-weight: bold; display: block; margin-bottom: 3px; text-transform: uppercase; }
        .val { font-size: 12px; font-weight: bold; color: #000; }
        
        .box-table { margin-bottom: 25px; }
        .box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #fcfcfc; }
        .box-title { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .box-content { font-size: 12px; font-weight: bold; line-height: 1.5; color: #333; }
        .box-sub { font-size: 11px; font-weight: normal; color: #555; }
        
        .item-table { margin-bottom: 20px; }
        .item-table th { background-color: #111; color: #fff; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: bold; }
        .item-table td { border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 11px; color: #333; }
        .item-name { font-weight: bold; font-size: 12px; }
        
        .totals-table { width: 300px; float: right; margin-bottom: 20px; }
        .totals-table td { padding: 5px 0; text-align: right; }
        .totals-label { font-size: 11px; color: #666; font-weight: bold; }
        .totals-val { font-size: 12px; font-weight: bold; color: #000; }
        .grand-total { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; }
        .grand-val { font-size: 14px; font-weight: bold; }
        
        .footer { margin-top: 80px; border-top: 1px solid #eee; padding-top: 20px; }
        .terms { font-size: 9px; color: #777; line-height: 1.6; }
        .terms-title { font-weight: bold; color: #000; text-transform: uppercase; margin-bottom: 5px; }
        .sign { text-align: right; font-weight: bold; font-size: 10px; text-transform: uppercase; }
        .badge { background: #f0f0f0; color: #555; padding: 4px 8px; border-radius: 3px; font-size: 9px; display: inline-block; margin-top: 5px; }
        
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
        .btn-print { position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    <body>
      
      <table class="header-table">
        <tr>
          <td>
            <img src="${LOGO_URL}" class="logo-img" />
            <div class="address">
              ${branchAddress}<br>
              Contact: ${branchContact} | Email: info@mahaveerhairsolution.com
            </div>
          </td>
        </tr>
      </table>

      <table class="meta-table">
        <tr>
          <td width="33%">
            <span class="label">Invoice Number</span>
            <span class="val">${invoiceNumber}</span>
          </td>
          <td width="33%" align="center">
            <span class="label">Date Issued</span>
            <span class="val">${formattedDate}</span>
          </td>
          <td width="33%" align="right">
            <span class="label">Branch Code</span>
            <span class="val">${branchCode}</span>
          </td>
        </tr>
      </table>

      <table class="box-table">
        <tr>
          <td width="48%" valign="top">
            <div class="box">
              <div class="box-title">Bill To</div>
              <div class="box-content">${entry.clientName}</div>
              <div class="box-sub">${entry.address || ''}<br>Ph: ${entry.contactNo}</div>
            </div>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top">
            <div class="box">
              <div class="box-title">Service Info</div>
              <div class="box-content">${entry.serviceType} Application</div>
              <div class="box-sub">Tech: ${entry.technician}<br>Method: ${entry.patchMethod}</div>
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
              <div style="color:#666; font-size:10px;">${entry.patchSize ? 'Size: ' + entry.patchSize : ''} ${entry.remark ? '| ' + entry.remark : ''}</div>
            </td>
            <td align="center">1</td>
            <td align="right">Rs. ${entry.amount}</td>
            <td align="right"><strong>Rs. ${entry.amount}</strong></td>
          </tr>
        </tbody>
      </table>

      <table class="totals-table">
        <tr>
          <td class="totals-label">Subtotal</td>
          <td class="totals-val">Rs. ${entry.amount}</td>
        </tr>
        <tr>
          <td class="totals-label">Pending Amount</td>
          <td class="totals-val" style="color:${(entry.pendingAmount||0)>0?'red':'inherit'}">Rs. ${entry.pendingAmount||0}</td>
        </tr>
        <tr>
          <td class="totals-label">Payment Mode</td>
          <td class="totals-val" style="text-transform:uppercase">${entry.paymentMethod}</td>
        </tr>
        <tr>
          <td class="grand-total totals-label" style="color:black;">Total Paid</td>
          <td class="grand-total grand-val">Rs. ${Math.max(0, Number(entry.amount) - (Number(entry.pendingAmount)||0))}</td>
        </tr>
      </table>
      <div style="clear:both;"></div>

      <div class="footer">
        <table width="100%">
          <tr>
            <td width="60%" valign="top">
              <div class="terms">
                <div class="terms-title">Terms & Conditions</div>
                • Goods once sold will not be returned.<br>
                • Subject to Raipur Jurisdiction only.<br>
                • Interest @ 24% p.a. will be charged if bill is not paid on due date.<br>
                • E. & O.E.
              </div>
            </td>
            <td width="40%" valign="bottom">
              <div class="sign">
                For, Mahaveer Hair Solution<br><br>
                <div class="badge">System Generated Invoice</div><br>
                <span style="font-weight:normal; font-size:9px; color:#888;">No signature required</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <a href="#" onclick="window.print(); return false;" class="btn-print no-print">Print Invoice</a>

    </body>
    </html>
  `;

  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
};

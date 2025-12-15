
// =====================================================================================
// ⚠️ MAHUVEER WEB APP - BACKEND SCRIPT (V5 - Final Logo Fix)
// =====================================================================================

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action == 'getOptions') return getOptions(ss);
  if (action == 'getPackages') return getPackages(ss);
  if (action == 'getEntries') return getEntries(ss);
  if (action == 'getUsers') return getUsers(ss);
  if (action == 'getAppointments') return getAppointments(ss);

  return response({error: "Invalid action"});
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // 1. ADD ENTRY
  if (action == 'addEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    if (!dbSheet) return response({error: "Sheet 'DATA BASE' not found"});

    var invoiceUrl = "";
    // Only generate invoice if amount is greater than 0
    if (Number(data.amount) > 0) {
      try { invoiceUrl = createInvoice(data); } catch (e) { invoiceUrl = "Error: " + e.toString(); }
    }

    // APPEND ROW - Strict Order
    dbSheet.appendRow([
      data.date,              // Col 1
      data.clientName,        // Col 2
      data.contactNo,         // Col 3
      data.address,           // Col 4
      data.branch,            // Col 5
      data.serviceType,       // Col 6
      data.patchMethod,       // Col 7
      data.technician,        // Col 8
      data.workStatus,        // Col 9
      data.amount,            // Col 10
      data.paymentMethod,     // Col 11
      data.remark,            // Col 12
      data.numberOfService,   // Col 13
      invoiceUrl,             // Col 14
      data.patchSize || '',   // Col 15
      data.pendingAmount || 0 // Col 16
    ]);
    
    return response({status: "success", invoiceUrl: invoiceUrl});
  }

  // 2. ADD PACKAGE
  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    pkgSheet.appendRow([
      data.startDate, data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING'
    ]);
    return response({status: "success"});
  }

  // 3. UPDATE PACKAGE
  if (action == 'updatePackageStatus') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.getRange(rowId, 6).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 4. DELETE PACKAGE
  if (action == 'deletePackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.deleteRow(rowId);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 5. EDIT PACKAGE
  if (action == 'editPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.getRange(rowId, 1).setValue(data.startDate);
        pkgSheet.getRange(rowId, 3).setValue(data.packageName);
        pkgSheet.getRange(rowId, 4).setValue(data.totalCost);
        pkgSheet.getRange(rowId, 5).setValue(data.totalServices);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 6. UPDATE ENTRY STATUS
  if (action == 'updateEntryStatus') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        dbSheet.getRange(rowId, 9).setValue(data.status); // Col 9 is Status
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // 7. EDIT ENTRY
  if (action == 'editEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        dbSheet.getRange(rowId, 8).setValue(data.technician);     // Col 8
        dbSheet.getRange(rowId, 6).setValue(data.serviceType);    // Col 6
        dbSheet.getRange(rowId, 10).setValue(data.amount);        // Col 10
        dbSheet.getRange(rowId, 11).setValue(data.paymentMethod); // Col 11
        dbSheet.getRange(rowId, 12).setValue(data.remark);        // Col 12
        dbSheet.getRange(rowId, 16).setValue(data.pendingAmount || 0); // Col 16
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // 8. ADD CLIENT
  if (action == 'addClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      clientSheet.appendRow([data.name, data.contact, data.address, data.gender, data.email, data.dob]);
      return response({status: "success"});
  }

  // 9. ADD USER
  if (action == 'addUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      const users = loginSheet.getDataRange().getValues();
      if (users.some(row => row[0].toString().toLowerCase() === data.username.toLowerCase())) {
          return response({status: "error", message: "Exists"});
      }
      loginSheet.appendRow([data.username, data.password, data.role, data.department, data.permissions]);
      return response({status: "success"});
  }

  // 10. DELETE USER
  if (action == 'deleteUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      const dataRange = loginSheet.getDataRange();
      const values = dataRange.getValues();
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === data.username.toString().trim().toLowerCase()) {
              loginSheet.deleteRow(i + 1);
              return response({status: "success"});
          }
      }
      return response({error: "Not found"});
  }

  // 11. ADD APPOINTMENT
  if (action == 'addAppointment') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const id = 'appt_' + new Date().getTime();
    apptSheet.appendRow([id, data.date, data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time]);
    return response({status: "success", id: id});
  }

  // 12. UPDATE APPOINTMENT
  if (action == 'updateAppointmentStatus') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const values = apptSheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            apptSheet.getRange(i + 1, 7).setValue(data.status); // Col 7 is Status
            return response({status: "success"});
        }
    }
    return response({error: "Not found"});
  }
  
  return response({error: "Unknown action"});
}

// --- HELPER TO HANDLE SHEET NAME TYPOS ---
function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) return sheet;
    if (name == "APPOINTMENT") return ss.getSheetByName("APPOINTMNET") || ss.getSheetByName("Appointment") || ss.getSheetByName("Appointments");
    if (name == "PACKAGE PLAN") return ss.getSheetByName("PACKAG PLAN") || ss.getSheetByName("Package Plan") || ss.getSheetByName("Packages");
    if (name == "CLIENT MASTER") return ss.getSheetByName("Client Master") || ss.getSheetByName("Clients");
    if (name == "DATA BASE") return ss.getSheetByName("Data Base") || ss.getSheetByName("Database") || ss.getSheetByName("DB");
    if (name == "LOGIN") return ss.getSheetByName("Login") || ss.getSheetByName("Users");
    if (name == "EMPLOYEE DETAILS") return ss.getSheetByName("Employee Details") || ss.getSheetByName("Technicians");
    if (name == "ITEM MASTER") return ss.getSheetByName("Item Master") || ss.getSheetByName("Items");
    return ss.insertSheet(name);
}

// --- DATA FETCHING HELPERS ---
function getPackages(ss) {
    const sheet = getSheet(ss, "PACKAGE PLAN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), startDate: formatDate(row[0]), clientName: row[1],
      packageName: row[2], totalCost: row[3], totalServices: row[4], status: row[5] || 'PENDING' 
    })));
}

function getEntries(ss) {
    const sheet = getSheet(ss, "DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const lastCol = Math.max(16, sheet.getLastColumn());
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), 
      date: formatDate(row[0]), 
      clientName: row[1], 
      contactNo: row[2], 
      address: row[3],
      branch: row[4], 
      serviceType: row[5], 
      patchMethod: row[6], 
      technician: row[7], 
      workStatus: row[8],
      amount: Number(row[9]), 
      paymentMethod: row[10], 
      remark: row[11], 
      numberOfService: row[12],
      invoiceUrl: row[13], 
      patchSize: row[14], 
      pendingAmount: Number(row[15] || 0)
    })).reverse());
}

function getAppointments(ss) {
    const sheet = getSheet(ss, "APPOINTMENT");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map((row) => ({
      id: row[0], date: formatDate(row[1]), clientName: row[2], contact: row[3], address: row[4], note: row[5], status: row[6] || 'PENDING', branch: row[7] || '', time: row[8] ? String(row[8]) : '' 
    })));
}

function getOptions(ss) {
    const clientSheet = getSheet(ss, "CLIENT MASTER");
    const techSheet = getSheet(ss, "EMPLOYEE DETAILS");
    const itemSheet = getSheet(ss, "ITEM MASTER");
    let clients = [], technicians = [], items = [];
    if (clientSheet && clientSheet.getLastRow() > 1) {
        clients = clientSheet.getRange(2, 1, clientSheet.getLastRow()-1, 6).getValues().filter(r => r[0])
          .map(row => ({ name: row[0], contact: row[1], address: row[2], gender: row[3], email: row[4], dob: formatDate(row[5]) }));
    }
    if (techSheet && techSheet.getLastRow() > 1) {
        technicians = techSheet.getRange(2, 1, techSheet.getLastRow()-1, 2).getValues().filter(r => r[0])
          .map(row => ({ name: row[0], contact: row[1] }));
    }
    if (itemSheet && itemSheet.getLastRow() > 1) {
        items = itemSheet.getRange(2, 1, itemSheet.getLastRow()-1, 3).getValues().filter(r => r[0])
          .map(row => ({ code: row[0], name: row[1], category: row[2] }));
    }
    return response({ clients, technicians, items });
}

function getUsers(ss) {
    const sheet = getSheet(ss, "LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    return response(data.map(row => ({ username: row[0], password: row[1], role: row[2], department: row[3], permissions: row[4] })));
}

// --- PROFESSIONAL PDF GENERATOR (FIXED LOGO) ---
function createInvoice(data) {
  try {
    // 1. Branch Address Logic
    var address = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
    var contact = "+91-9144939828";
    
    if (data.branch && data.branch.toString().toUpperCase().trim() === 'JDP') {
       address = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
       contact = "09725567348";
    }

    // 2. Date Formatting
    var dateStr = data.date;
    try {
        var dateParts = data.date.split('-'); // Assumes YYYY-MM-DD
        if (dateParts.length === 3) {
            dateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        }
    } catch(e) {}
    
    var invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 10000);
    // NEW DIRECT PNG LINK
    var logoUrl = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

    // 3. HTML Template (Centered Professional Layout)
    var html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #333; padding: 40px; margin: 0; }
            .container { max-width: 700px; margin: 0 auto; }
            
            /* Header */
            .header { text-align: center; margin-bottom: 25px; }
            /* Logo CSS specifically for wide/landscape logos */
            .logo { width: 300px; height: auto; max-height: 100px; object-fit: contain; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto; }
            
            .brand-name { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #000; margin-top: 10px; }
            .address-line { font-size: 10px; color: #555; margin-top: 5px; line-height: 1.4; max-width: 80%; margin-left: auto; margin-right: auto; }
            .divider { border-bottom: 1px solid #ddd; margin: 20px 0; }
            
            /* Meta Row */
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-weight: bold; font-size: 10px; color: #444; }
            .meta-table td { padding: 5px; }
            .meta-label { text-transform: uppercase; color: #888; }
            
            /* Boxes */
            .box-container { width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 20px; }
            .info-box { border: 1px solid #eee; padding: 15px; border-radius: 4px; vertical-align: top; width: 48%; background-color: #fcfcfc; }
            .box-header { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 0.5px; }
            .box-text { font-size: 11px; font-weight: bold; color: #000; line-height: 1.4; }
            .box-sub { font-size: 10px; color: #555; font-weight: normal; }
            
            /* Item Table */
            .item-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .item-table th { border-bottom: 2px solid #000; text-align: left; padding: 10px 5px; font-size: 9px; text-transform: uppercase; color: #888; }
            .item-table td { border-bottom: 1px solid #eee; padding: 12px 5px; font-size: 11px; vertical-align: top; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; color: #000; }
            
            /* Totals */
            .total-table { width: 200px; margin-left: auto; border-collapse: collapse; }
            .total-table td { padding: 4px 0; font-size: 10px; }
            .grand-total { border-top: 1px solid #000; padding-top: 8px; font-size: 12px; font-weight: 900; }
            
            /* Footer */
            .footer-table { width: 100%; margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; }
            .terms { font-size: 9px; color: #666; line-height: 1.4; }
            .sign-box { text-align: center; }
            .sign-line { border-bottom: 1px solid #000; width: 150px; margin: 0 auto 5px auto; }
            .sign-label { font-size: 10px; font-weight: bold; }
            
          </style>
        </head>
        <body>
          <div class="container">
          
            <!-- Header -->
            <div class="header">
               <img src="${logoUrl}" class="logo" />
               <!-- Brand Name removed as it is likely in the logo, but keeping address -->
               <div class="address-line">${address}</div>
               <div class="address-line">Contact: ${contact} | Email: info@mahaveerhairsolution.com</div>
            </div>
            
            <div class="divider"></div>

            <!-- Meta Data -->
            <table class="meta-table">
               <tr>
                  <td><span class="meta-label">Invoice #:</span> ${invoiceNo}</td>
                  <td align="center"><span class="meta-label">Date:</span> ${dateStr}</td>
                  <td align="right"><span class="meta-label">Branch:</span> ${data.branch}</td>
               </tr>
            </table>

            <!-- Boxes -->
            <table class="box-container">
               <tr>
                  <td class="info-box">
                      <div class="box-header">BILL TO</div>
                      <div class="box-text">${data.clientName}</div>
                      <div class="box-sub">${data.address || 'Address N/A'}</div>
                      <div class="box-sub">Ph: ${data.contactNo}</div>
                  </td>
                  <td class="info-box">
                      <div class="box-header">SERVICE DETAILS</div>
                      <div class="box-text">${data.serviceType}</div>
                      <div class="box-sub">Tech: ${data.technician}</div>
                      <div class="box-sub">Method: ${data.patchMethod}</div>
                  </td>
               </tr>
            </table>

            <!-- Items -->
            <table class="item-table">
               <thead>
                  <tr>
                     <th width="50%">DESCRIPTION</th>
                     <th class="text-center">QTY</th>
                     <th class="text-right">PRICE</th>
                     <th class="text-right">TOTAL</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>
                        <div class="bold">${data.serviceType} APPLICATION</div>
                        <div style="font-size:9px; color:#666; margin-top:2px;">
                           ${data.patchSize ? 'Patch Size: ' + data.patchSize : ''} 
                           ${data.remark ? '<br/>' + data.remark : ''}
                        </div>
                     </td>
                     <td class="text-center">1</td>
                     <td class="text-right">Rs. ${data.amount}</td>
                     <td class="text-right bold">Rs. ${data.amount}</td>
                  </tr>
               </tbody>
            </table>

            <!-- Totals -->
            <table class="total-table">
               <tr>
                  <td>Subtotal</td>
                  <td class="text-right bold">Rs. ${data.amount}</td>
               </tr>
               <tr>
                  <td>Pending Due</td>
                  <td class="text-right bold" style="color:red;">Rs. ${data.pendingAmount || 0}</td>
               </tr>
               <tr>
                  <td>Payment Mode</td>
                  <td class="text-right bold" style="text-transform:uppercase;">${data.paymentMethod}</td>
               </tr>
               <tr>
                  <td class="grand-total">Grand Total</td>
                  <td class="text-right grand-total">Rs. ${data.amount}</td>
               </tr>
            </table>

            <!-- Footer -->
            <table class="footer-table">
               <tr>
                  <td width="60%" valign="bottom">
                     <div class="terms">
                        <strong>Terms & Conditions:</strong><br/>
                        1. Goods once sold will not be returned.<br/>
                        2. Subject to Raipur Jurisdiction.<br/>
                        Thank you for your business!
                     </div>
                  </td>
                  <td width="40%" valign="bottom" align="right">
                     <div class="sign-box">
                        <div class="sign-line"></div>
                        <div class="sign-label">Authorized Signatory</div>
                     </div>
                  </td>
               </tr>
            </table>
          
          </div>
        </body>
      </html>
    `;
    
    var blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
    var folder = DriveApp.getRootFolder();
    var file = folder.createFile(blob).setName("Inv_" + data.clientName + "_" + data.date + ".pdf");
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error: " + e.toString(); }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!date) return "";
  if (Object.prototype.toString.call(date) === '[object Date]') {
     try { const d = new Date(date); d.setHours(12); return d.toISOString().split('T')[0]; } catch (e) { return ""; }
  }
  return String(date);
}

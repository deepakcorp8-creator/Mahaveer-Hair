
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V4 - PDF Design Fix)
// =====================================================================================

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action == 'getOptions') return getOptions(ss);
  if (action == 'getPackages') return getPackages(ss);
  if (action == 'getEntries') return getEntries(ss);
  if (action == 'getUsers') return getUsers(ss);
  if (action == 'getAppointments') return getAppointments(ss);

  return response({error: "Invalid GET action: " + action});
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var data;
  
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return response({error: "Invalid JSON body"});
  }
  
  const action = data.action;

  // --- PACKAGES ---
  if (action == 'addPackage') {
      try {
        const pkgSheet = getSheet(ss, "PACKAGE PLAN");
        const row = [
          toSheetDate(data.startDate), 
          String(data.clientName || ''), 
          String(data.packageName || ''), 
          Number(data.totalCost || 0), 
          Number(data.totalServices || 0), 
          String(data.status || 'PENDING'),
          Number(data.oldServiceCount || 0),
          String(data.packageType || 'NEW')
        ];
        pkgSheet.appendRow(row);
        return response({status: "success", message: "Package created successfully"});
      } catch (err) {
        return response({error: "Failed to create package: " + err.toString()});
      }
  }

  if (action == 'updatePackageStatus') {
      const pkgSheet = getSheet(ss, "PACKAGE PLAN");
      const rowId = parseInt(data.id.split('_')[1]);
      if (rowId > 0) {
          pkgSheet.getRange(rowId, 6).setValue(data.status); 
          return response({status: "success"});
      }
      return response({error: "Invalid ID for Package"});
  }

  if (action == 'editPackage') {
      const pkgSheet = getSheet(ss, "PACKAGE PLAN");
      const rowId = parseInt(data.id.split('_')[1]);
      if (rowId > 0) {
          pkgSheet.getRange(rowId, 1).setValue(toSheetDate(data.startDate));
          pkgSheet.getRange(rowId, 3).setValue(data.packageName);
          pkgSheet.getRange(rowId, 4).setValue(data.totalCost);
          pkgSheet.getRange(rowId, 5).setValue(data.totalServices);
          if(data.oldServiceCount !== undefined) pkgSheet.getRange(rowId, 7).setValue(data.oldServiceCount);
          if(data.packageType) pkgSheet.getRange(rowId, 8).setValue(data.packageType);
          return response({status: "success"});
      }
      return response({error: "Invalid ID for Edit"});
  }

  if (action == 'deletePackage') {
      const pkgSheet = getSheet(ss, "PACKAGE PLAN");
      const rowId = parseInt(data.id.split('_')[1]);
      if (rowId > 0) {
          pkgSheet.deleteRow(rowId);
          return response({status: "success"});
      }
      return response({error: "Invalid ID for Delete"});
  }

  // --- ENTRIES ---
  if (action == 'addEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    var invoiceUrl = "";
    // Generate invoice if amount > 0 and not explicitly skipped
    if (Number(data.amount) >= 0) {
        invoiceUrl = createInvoice(data);
    }
    const newRow = [
      toSheetDate(data.date), data.clientName, data.contactNo, data.address, data.branch, 
      data.serviceType, data.patchMethod, data.technician, data.workStatus, data.amount, 
      data.paymentMethod, String(data.remark || ""), data.numberOfService, invoiceUrl, 
      data.patchSize || '', data.pendingAmount || 0
    ];
    const nextRow = getSafeLastRow(dbSheet, 2) + 1;
    dbSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    dbSheet.getRange(nextRow, 1).setNumberFormat("dd/mm/yyyy");
    return response({status: "success", invoiceUrl: invoiceUrl, id: 'row_' + nextRow});
  }

  if (action == 'updateEntry') { 
      const dbSheet = getSheet(ss, "DATA BASE");
      const rowId = parseInt(data.id.split('_')[1]);
      if (rowId > 0 && rowId <= dbSheet.getMaxRows()) {
          if(data.technician) dbSheet.getRange(rowId, 8).setValue(data.technician);
          if(data.serviceType) dbSheet.getRange(rowId, 6).setValue(data.serviceType);
          if(data.patchMethod) dbSheet.getRange(rowId, 7).setValue(data.patchMethod);
          if(data.amount !== undefined) dbSheet.getRange(rowId, 10).setValue(data.amount);
          if(data.paymentMethod) dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
          if(data.remark) dbSheet.getRange(rowId, 12).setValue(data.remark);
          if(data.pendingAmount !== undefined) dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
          return response({status: "success"});
      }
      return response({error: "Row not found"});
  }

  if (action == 'deleteEntry') {
      const dbSheet = getSheet(ss, "DATA BASE");
      const rowId = parseInt(data.id.split('_')[1]);
      if (rowId > 0 && rowId <= dbSheet.getMaxRows()) {
          dbSheet.deleteRow(rowId);
          return response({status: "success"});
      }
      return response({error: "Delete failed"});
  }

  // --- CLIENTS ---
  if (action == 'addClient') {
    const clientSheet = getSheet(ss, "CLIENT MASTER");
    const clientRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
    const nextCl = getSafeLastRow(clientSheet, 1) + 1;
    clientSheet.getRange(nextCl, 1, 1, clientRow.length).setValues([clientRow]);
    clientSheet.getRange(nextCl, 6).setNumberFormat("dd/mm/yyyy");
    return response({status: "success"});
  }

  if (action == 'editClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      const clients = clientSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < clients.length; i++) {
          if (clients[i][0] == data.originalName) {
              rowIndex = i + 1;
              break;
          }
      }
      if (rowIndex !== -1) {
          const updatedRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
          clientSheet.getRange(rowIndex, 1, 1, 6).setValues([updatedRow]);
          return response({status: "success"});
      }
      return response({error: "Client not found"});
  }

  // --- APPOINTMENTS ---
  if (action == 'addAppointment') {
      const apptSheet = getSheet(ss, "APPOINTMENT");
      const id = 'apt_' + new Date().getTime();
      const row = [id, toSheetDate(data.date), data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time];
      apptSheet.appendRow(row);
      return response({status: "success", id: id});
  }

  if (action == 'updateAppointmentStatus') {
      const apptSheet = getSheet(ss, "APPOINTMENT");
      const row = findRowById(apptSheet, data.id, 0); 
      if (row > 0) {
          apptSheet.getRange(row, 7).setValue(data.status); 
          return response({status: "success"});
      }
      return response({error: "Appointment not found"});
  }

  if (action == 'deleteAppointment') {
      const apptSheet = getSheet(ss, "APPOINTMENT");
      const row = findRowById(apptSheet, data.id, 0);
      if (row > 0) {
          apptSheet.deleteRow(row);
          return response({status: "success"});
      }
      return response({error: "Appointment not found"});
  }

  // --- USERS ---
  if (action == 'addUser') {
      const userSheet = getSheet(ss, "LOGIN");
      // username, password, role, department, permissions
      const row = [
          data.username, 
          data.password || '123456', 
          data.role, 
          data.department, 
          data.permissions, 
          '', // dpUrl 
          '', // gender
          '', // dob
          ''  // address
      ];
      userSheet.appendRow(row);
      return response({status: "success"});
  }

  if (action == 'deleteUser') {
      const userSheet = getSheet(ss, "LOGIN");
      const users = userSheet.getDataRange().getValues();
      let row = -1;
      for (let i = 1; i < users.length; i++) {
          if (users[i][0] == data.username) {
              row = i + 1;
              break;
          }
      }
      if (row > 0) {
          userSheet.deleteRow(row);
          return response({status: "success"});
      }
      return response({error: "User not found"});
  }

  if (action == 'updateUser') {
      const userSheet = getSheet(ss, "LOGIN");
      const users = userSheet.getDataRange().getValues();
      let row = -1;
      for (let i = 1; i < users.length; i++) {
          if (users[i][0] == data.username) {
              row = i + 1;
              break;
          }
      }
      if (row > 0) {
          if(data.password) userSheet.getRange(row, 2).setValue(data.password);
          if(data.role) userSheet.getRange(row, 3).setValue(data.role);
          if(data.department) userSheet.getRange(row, 4).setValue(data.department);
          if(data.permissions) userSheet.getRange(row, 5).setValue(data.permissions);
          return response({status: "success"});
      }
      return response({error: "User not found"});
  }

  // --- PAYMENTS ---
  if (action == 'updatePaymentFollowUp') {
      const dbSheet = getSheet(ss, "DATA BASE");
      const collectionSheet = getSheet(ss, "PAYMENT COLLECTION");
      try {
          const rowId = parseInt(data.id.split('_')[1]);
          if (rowId > 0) {
              var screenshotUrl = data.existingScreenshotUrl || "";
              if (data.screenshotBase64 && data.screenshotBase64.indexOf('data:image') === 0) {
                  var splitData = data.screenshotBase64.split('base64,');
                  var contentType = splitData[0].split(':')[1].split(';')[0];
                  var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "pay_" + data.clientName + "_" + new Date().getTime());
                  var file = DriveApp.createFile(blob);
                  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                  screenshotUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
              }
              dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
              dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
              dbSheet.getRange(rowId, 12).setValue(String(data.remark || ""));
              
              const today = getTodayInSheetFormat();
              const collectionRow = [data.id, today, data.clientName, data.contactNo || '', data.address || '', data.pendingAmount || 0, Number(data.paidAmount || 0), screenshotUrl, String(data.remark || ""), toSheetDate(data.nextCallDate) || '', new Date().toString()];
              collectionSheet.appendRow(collectionRow);
              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
  }

  return response({error: "Unknown action: " + action});
}

function createInvoice(data) {
  try {
    // 1. Determine Branch Details
    var branchCode = (data.branch || 'RPR').toUpperCase();
    var branchAddress = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
    var branchContact = "+91-9144939828";
    
    if (branchCode == 'JDP') {
       branchAddress = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
       branchContact = "09725567348";
    }

    // 2. Generate Date Strings
    var invoiceDate = data.date ? toSheetDate(data.date) : getTodayInSheetFormat();
    var invNum = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 9000 + 1000);

    // 3. Build HTML (Design Fix to match Screenshot)
    var html = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #111; padding: 40px; font-size: 12px; background: white; }
            .header { text-align: center; margin-bottom: 25px; }
            .logo { font-size: 32px; font-weight: 900; margin-bottom: 0px; letter-spacing: -1px; text-transform: uppercase; color: #000; }
            .logo span { color: #0ea5e9; }
            .tagline { font-size: 10px; letter-spacing: 2px; color: #555; margin-bottom: 12px; text-transform: uppercase; font-weight: 700; }
            .address { font-size: 10px; color: #555; line-height: 1.5; max-width: 80%; margin: 0 auto; }
            
            .divider { border-bottom: 2px solid #000; margin: 25px 0; }
            
            .meta { display: table; width: 100%; margin-bottom: 25px; }
            .meta-col { display: table-cell; vertical-align: top; width: 33%; }
            .meta-label { font-size: 9px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 2px; }
            .meta-val { font-size: 12px; font-weight: 700; color: #000; }
            
            .boxes { margin-bottom: 25px; }
            .box-container { display: table; width: 100%; border-collapse: separate; border-spacing: 15px 0; margin: 0 -15px; }
            .box { display: table-cell; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; width: 48%; vertical-align: top; background: #fafafa; }
            .box-title { font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .box-name { font-size: 13px; font-weight: 900; margin-bottom: 2px; color: #000; }
            .box-detail { font-size: 11px; color: #4b5563; line-height: 1.4; font-weight: 500; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { background: #111; color: white; padding: 10px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
            td { border-bottom: 1px solid #e5e7eb; padding: 12px 10px; font-size: 11px; font-weight: 500; color: #333; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .totals { float: right; width: 260px; }
            .total-row { display: table; width: 100%; margin-bottom: 6px; }
            .total-label { display: table-cell; text-align: left; font-size: 11px; color: #4b5563; font-weight: 500; }
            .total-val { display: table-cell; text-align: right; font-size: 12px; font-weight: 900; color: #000; }
            .grand-total { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin-top: 10px; }
            .grand-total .total-val { font-size: 14px; }
            
            .footer-section { margin-top: 60px; display: table; width: 100%; border-top: 1px solid #eee; padding-top: 20px; }
            .footer-left { display: table-cell; width: 60%; vertical-align: top; }
            .footer-right { display: table-cell; width: 40%; vertical-align: bottom; text-align: right; }
            
            .terms { font-size: 9px; color: #666; line-height: 1.6; }
            .terms-head { font-weight: 900; color: #111; margin-bottom: 4px; text-transform: uppercase; }
            
            .sign-area { margin-top: 20px; font-weight: 900; font-size: 10px; text-transform: uppercase; color: #000; }
            .sys-badge { display: inline-block; background: #f3f4f6; padding: 5px 10px; border-radius: 4px; color: #374151; margin-top: 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
            .no-sign { font-size: 8px; color: #9ca3af; margin-top: 4px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
             <div class="logo">MAHAVEER <span>HAIR</span></div>
             <div class="tagline">Solution For Better Shine</div>
             <div class="address">${branchAddress}<br>Contact: ${branchContact} | Email: info@mahaveerhairsolution.com</div>
          </div>
          <div class="divider"></div>
          
          <div class="meta">
             <div class="meta-col">
               <div class="meta-label">Invoice Number</div>
               <div class="meta-val">${invNum}</div>
             </div>
             <div class="meta-col" style="text-align:center">
               <div class="meta-label">Date Issued</div>
               <div class="meta-val">${invoiceDate}</div>
             </div>
             <div class="meta-col" style="text-align:right">
               <div class="meta-label">Branch Code</div>
               <div class="meta-val">${branchCode}</div>
             </div>
          </div>
          
          <div class="boxes">
             <div class="box-container">
                <div class="box">
                   <div class="box-title">Bill To</div>
                   <div class="box-name">${data.clientName}</div>
                   <div class="box-detail">${data.address || ''}</div>
                   <div class="box-detail">Ph: ${data.contactNo}</div>
                </div>
                <div class="box">
                   <div class="box-title">Service Info</div>
                   <div class="box-name">${data.serviceType} Application</div>
                   <div class="box-detail">Technician: ${data.technician}</div>
                   <div class="box-detail">Method: ${data.patchMethod}</div>
                </div>
             </div>
          </div>
          
          <table>
             <thead>
               <tr>
                 <th width="50%">Description</th>
                 <th class="text-center">Qty</th>
                 <th class="text-right">Price</th>
                 <th class="text-right">Total</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td>
                   <div class="font-bold">${data.serviceType} Service</div>
                   <div style="font-size:9px; color:#666; margin-top:2px;">${data.patchSize ? 'Size: ' + data.patchSize : ''}</div>
                 </td>
                 <td class="text-center font-bold">1</td>
                 <td class="text-right font-bold">Rs. ${data.amount}</td>
                 <td class="text-right font-bold">Rs. ${data.amount}</td>
               </tr>
             </tbody>
          </table>
          
          <div class="totals">
             <div class="total-row">
               <div class="total-label">Subtotal</div>
               <div class="total-val">Rs. ${data.amount}</div>
             </div>
             <div class="total-row">
               <div class="total-label">Pending Amount</div>
               <div class="total-val" style="color:${(data.pendingAmount||0)>0?'red':'inherit'}">Rs. ${data.pendingAmount||0}</div>
             </div>
             <div class="total-row">
               <div class="total-label">Payment Mode</div>
               <div class="total-val" style="text-transform:uppercase">${data.paymentMethod}</div>
             </div>
             <div class="total-row grand-total">
               <div class="total-label" style="font-weight:900; color:black;">Total Paid</div>
               <div class="total-val">Rs. ${Math.max(0, data.amount - (data.pendingAmount||0))}</div>
             </div>
          </div>
          <div style="clear:both"></div>
          
          <div class="footer-section">
             <div class="footer-left">
                <div class="terms">
                   <div class="terms-head">Terms & Conditions</div>
                   &bull; Goods once sold will not be returned.<br>
                   &bull; Subject to Raipur Jurisdiction only.<br>
                   &bull; Interest @ 24% p.a. will be charged if bill is not paid on due date.<br>
                   &bull; E. & O.E.
                </div>
             </div>
             <div class="footer-right">
                <div class="sign-area">For, Mahaveer Hair Solution</div>
                <div class="sys-badge">System Generated Invoice</div>
                <div class="no-sign">No physical signature required</div>
             </div>
          </div>
        </body>
      </html>
    `;

    // 4. Save to Drive (Using provided Folder ID)
    var folderId = "1uOdikrd7tlLiFkTCzWCG1SNB-ibW164R";
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch(e) {
      var folders = DriveApp.getFoldersByName("MAHAVEER_INVOICES");
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("MAHAVEER_INVOICES");
    }

    var blob = Utilities.newBlob(html, 'text/html', 'Invoice_' + data.clientName + '.html');
    var pdf = folder.createFile(blob.getAs('application/pdf'));
    pdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return "https://drive.google.com/uc?export=view&id=" + pdf.getId();
  } catch (e) {
    Logger.log("Invoice Generation Error: " + e.toString());
    return ""; 
  }
}

// ... helper functions (toSheetDate, fromSheetDate, getSafeLastRow, etc.) ...
function toSheetDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr === "") return "";
  if (dateStr.includes('/') && dateStr.split('/').length === 3) return dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-'); 
    if (parts.length === 3 && parts[0].length === 4) return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return dateStr;
}

function fromSheetDate(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === '[object Date]') {
     const d = new Date(val);
     return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }
  return String(val).trim();
}

function getTodayInSheetFormat() {
  const d = new Date();
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}

function getSafeLastRow(sheet, colIndex) {
  var column = colIndex || 2; 
  var lastRow = sheet.getMaxRows();
  var values = sheet.getRange(1, column, lastRow).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] && values[i][0].toString().trim() !== "") {
      return i + 1;
    }
  }
  return 1;
}

function findRowById(sheet, id, idColIndex) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (id.startsWith('row_')) {
       if (('row_' + (i + 1)) === id) return i + 1;
    } else {
       if (data[i][idColIndex] == id) return i + 1;
    }
  }
  return -1;
}

function getEntries(ss) {
    const sheet = getSheet(ss, "DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
    return response(data.map((row, index) => ({
        id: 'row_' + (index + 2), 
        date: fromSheetDate(row[0]), 
        clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: Number(row[9] || 0), paymentMethod: row[10], remark: String(row[11] || ""), numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: Number(row[15] || 0)
    })).reverse().filter(e => e.clientName));
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        if (name === "DATA BASE") sheet.appendRow(["DATE","CLIENT NAME","CONTACT","ADDRESS","BRANCH","SERVICE","METHOD","TECH","STATUS","TOTAL BILL","MODE","REMARK","SRV_NO","INVOICE","SIZE","PENDING"]);
        if (name === "APPOINTMENT") sheet.appendRow(["ID", "DATE", "NAME", "CONTACT", "ADDRESS", "NOTE", "STATUS", "BRANCH", "TIME"]);
        if (name === "PACKAGE PLAN") sheet.appendRow(["START DATE", "CLIENT NAME", "PACKAGE", "COST", "SERVICES", "STATUS", "OLD SERVICE NUMBER", "PACKAGE TYPE"]);
    }
    return sheet;
}

function getOptions(ss) {
    const clientSheet = getSheet(ss, "CLIENT MASTER");
    const techSheet = getSheet(ss, "EMPLOYEE DETAILS");
    const itemSheet = getSheet(ss, "ITEM MASTER");
    let clients = [], technicians = [], items = [];
    if (clientSheet && clientSheet.getLastRow() > 1) {
        clients = clientSheet.getRange(2, 1, clientSheet.getLastRow()-1, 6).getValues().filter(r => r[0])
          .map(row => ({ name: row[0], contact: row[1], address: row[2], gender: row[3], email: row[4], dob: fromSheetDate(row[5]) }));
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

function getPackages(ss) {
    const sheet = getSheet(ss, "PACKAGE PLAN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), 
      startDate: fromSheetDate(row[0]), 
      clientName: row[1], 
      packageName: row[2], 
      totalCost: row[3], 
      totalServices: row[4], 
      status: row[5] || 'PENDING',
      oldServiceCount: Number(row[6] || 0),
      packageType: row[7] || 'NEW'
    })));
}

function getAppointments(ss) {
    const sheet = getSheet(ss, "APPOINTMENT");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map((row) => ({
      id: row[0], date: fromSheetDate(row[1]), clientName: row[2], contact: row[3], address: row[4], note: row[5], status: row[6] || 'PENDING', branch: row[7] || '', time: row[8] ? String(row[8]) : '' 
    })));
}

function getUsers(ss) {
    const sheet = getSheet(ss, "LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getDataRange().getValues();
    return response(data.slice(1).map(row => ({ 
      username: row[0], password: row[1], role: row[2], department: row[3], permissions: row[4], dpUrl: row[5], gender: row[6], 
      dob: fromSheetDate(row[7]), 
      address: row[8] 
    })));
}

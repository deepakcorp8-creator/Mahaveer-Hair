
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V7 - Base64 Logo Fix)
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

    // 2. Fetch Logo and convert to Base64 (Crucial for PDF)
    // Using high quality image provided
    var logoUrl = "https://i.ibb.co/WpNJYmKV/MAHAVEER-Logo-1920x1080-1.png";
    var logoBase64 = ""; 
    try {
        var resp = UrlFetchApp.fetch(logoUrl);
        var blob = resp.getBlob();
        logoBase64 = "data:image/png;base64," + Utilities.base64Encode(blob.getBytes());
    } catch(e) {
        // Fallback to URL if fetch fails (might not show in PDF but safer)
        logoBase64 = logoUrl;
        Logger.log("Logo fetch failed: " + e.toString());
    }

    // 3. Generate Date Strings
    var invoiceDate = data.date ? toSheetDate(data.date) : getTodayInSheetFormat();
    var invNum = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 9000 + 1000);

    // 4. Build HTML - ROBUST TABLE LAYOUT for Google PDF Engine
    var html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; color: #111; font-size: 11px; padding: 40px; }
            table { width: 100%; border-collapse: collapse; }
            .header-table { margin-bottom: 20px; }
            .header-table td { text-align: center; vertical-align: top; }
            .address { font-size: 10px; color: #666; margin-top: 5px; line-height: 1.4; }
            
            .meta-table { margin-top: 10px; border-top: 1px solid #ddd; margin-bottom: 20px; }
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
          </style>
        </head>
        <body>
          
          <table class="header-table">
            <tr>
              <td align="center">
                <img src="${logoBase64}" width="280" style="max-width:300px; height:auto; display:block; margin: 0 auto 10px auto;" />
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
                <span class="val">${invNum}</span>
              </td>
              <td width="33%" align="center">
                <span class="label">Date Issued</span>
                <span class="val">${invoiceDate}</span>
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
                  <div class="box-content">${data.clientName}</div>
                  <div class="box-sub">${data.address || ''}<br>Ph: ${data.contactNo}</div>
                </div>
              </td>
              <td width="4%"></td>
              <td width="48%" valign="top">
                <div class="box">
                  <div class="box-title">Service Info</div>
                  <div class="box-content">${data.serviceType} Application</div>
                  <div class="box-sub">Tech: ${data.technician}<br>Method: ${data.patchMethod}</div>
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
                  <div class="item-name">${data.serviceType} Service</div>
                  <div style="color:#666; font-size:10px;">${data.patchSize ? 'Size: ' + data.patchSize : ''} ${data.remark ? '| ' + data.remark : ''}</div>
                </td>
                <td align="center">1</td>
                <td align="right">Rs. ${data.amount}</td>
                <td align="right"><strong>Rs. ${data.amount}</strong></td>
              </tr>
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td class="totals-label">Subtotal</td>
              <td class="totals-val">Rs. ${data.amount}</td>
            </tr>
            <tr>
              <td class="totals-label">Pending Amount</td>
              <td class="totals-val" style="color:${(data.pendingAmount||0)>0?'red':'inherit'}">Rs. ${data.pendingAmount||0}</td>
            </tr>
            <tr>
              <td class="totals-label">Payment Mode</td>
              <td class="totals-val" style="text-transform:uppercase">${data.paymentMethod}</td>
            </tr>
            <tr>
              <td class="grand-total totals-label" style="color:black;">Total Paid</td>
              <td class="grand-total grand-val">Rs. ${Math.max(0, data.amount - (data.pendingAmount||0))}</td>
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

        </body>
      </html>
    `;

    // 5. Save to Drive (Using provided Folder ID)
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


// =====================================================================================
// ⚠️ MAHUVEER WEB APP - BACKEND SCRIPT (V2 - Robust)
// =====================================================================================
//
// 📋 REQUIRED SHEET TABS (Create these tabs in your Google Sheet):
// 1. "DATA BASE"       (Cols: Date, Name, Contact, Address, Branch, Service, Method, Tech, Status, Amount, PayMode, Remark, Svc#, Invoice, Size, Pending)
// 2. "CLIENT MASTER"   (Cols: Name, Contact, Address, Gender, Email, DOB)
// 3. "APPOINTMENT"     (Cols: ID, Date, Name, Contact, Address, Note, Status, Branch, Time)
// 4. "PACKAGE PLAN"    (Cols: StartDate, Client, PkgName, Cost, Services, Status)
// 5. "LOGIN"           (Cols: Username, Password, Role, Dept, Permissions)
// 6. "EMPLOYEE DETAILS"(Cols: Name, Contact)
// 7. "ITEM MASTER"     (Cols: Code, Name, Category)
//
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
      try { invoiceUrl = createInvoice(data); } catch (e) { invoiceUrl = ""; }
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

    // Try Common Variations
    if (name == "APPOINTMENT") return ss.getSheetByName("APPOINTMNET") || ss.getSheetByName("Appointment") || ss.getSheetByName("Appointments");
    if (name == "PACKAGE PLAN") return ss.getSheetByName("PACKAG PLAN") || ss.getSheetByName("Package Plan") || ss.getSheetByName("Packages");
    if (name == "CLIENT MASTER") return ss.getSheetByName("Client Master") || ss.getSheetByName("Clients");
    if (name == "DATA BASE") return ss.getSheetByName("Data Base") || ss.getSheetByName("Database") || ss.getSheetByName("DB");
    if (name == "LOGIN") return ss.getSheetByName("Login") || ss.getSheetByName("Users");
    if (name == "EMPLOYEE DETAILS") return ss.getSheetByName("Employee Details") || ss.getSheetByName("Technicians");
    if (name == "ITEM MASTER") return ss.getSheetByName("Item Master") || ss.getSheetByName("Items");

    // If still not found, create it (Safety Fallback)
    return ss.insertSheet(name);
}

// --- DATA FETCHING ---
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
    // Maps exact columns to JSON properties
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

// --- PDF GENERATOR (IMPROVED DETAILS) ---
function createInvoice(data) {
  try {
      var html = `
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #333;">Mahaveer Hair Solution</h2>
            <p style="font-size: 12px; color: #555;">Date: ${data.date} | Branch: ${data.branch}</p>
            <hr style="border: 0; border-top: 1px solid #ddd;" />
            
            <h3>INVOICE</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 5px;"><strong>Client:</strong></td><td>${data.clientName}</td></tr>
              <tr><td style="padding: 5px;"><strong>Service:</strong></td><td>${data.serviceType}</td></tr>
              <tr><td style="padding: 5px;"><strong>Technician:</strong></td><td>${data.technician}</td></tr>
            </table>

            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
                <tr style="background: #f0f0f0;">
                    <th style="border: 1px solid #000; padding: 8px;">Description</th>
                    <th style="border: 1px solid #000; padding: 8px;">Amount</th>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 8px;">${data.serviceType} (${data.patchMethod})</td>
                    <td style="border: 1px solid #000; padding: 8px;">Rs. ${data.amount}</td>
                </tr>
            </table>
            
            <p style="text-align: right; margin-top: 10px;"><strong>Total Paid: Rs. ${data.amount}</strong></p>
            ${data.pendingAmount > 0 ? `<p style="text-align: right; color: red;">Pending Due: Rs. ${data.pendingAmount}</p>` : ''}
            
            <br/><br/>
            <p style="text-align: center; font-size: 10px;">Thank you for your business!</p>
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


// =====================================================================================
// ⚠️ NEW SHEET SETUP CODE
// 1. Create a NEW Google Sheet.
// 2. Create these Tabs (Sheets) at the bottom with EXACT names:
//    - DATA BASE
//    - CLIENT MASTER
//    - APPOINTMNET
//    - PACKAG PLAN
//    - LOGIN
//    - EMPLOYEE DETAILS
//    - ITEM MASTER
//
// 3. Paste this code into Extensions > Apps Script.
// 4. Click "Deploy" -> "New Deployment" -> Select type "Web App".
// 5. Description: "v1", Execute as: "Me", Who has access: "Anyone".
// 6. Copy the Web App URL and paste it into 'constants.ts' in your code.
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
    const dbSheet = ss.getSheetByName("DATA BASE");
    if (!dbSheet) return response({error: "Sheet 'DATA BASE' not found. Please create it."});

    var invoiceUrl = "";
    try { invoiceUrl = createInvoice(data); } catch (e) { invoiceUrl = "Error: " + e.toString(); }

    dbSheet.appendRow([
      data.date, 
      data.clientName, 
      data.contactNo, 
      data.address, 
      data.branch,
      data.serviceType, 
      data.patchMethod, 
      data.technician, 
      data.workStatus, 
      data.amount, 
      data.paymentMethod, 
      data.remark, 
      data.numberOfService,
      invoiceUrl, 
      data.patchSize || '', 
      data.pendingAmount || 0
    ]);
    return response({status: "success", invoiceUrl: invoiceUrl});
  }

  // 2. ADD PACKAGE
  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAG PLAN");
    if (!pkgSheet) return response({error: "Sheet 'PACKAG PLAN' not found"});
    pkgSheet.appendRow([
      data.startDate, data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING'
    ]);
    return response({status: "success"});
  }

  // 3. UPDATE PACKAGE STATUS
  if (action == 'updatePackageStatus') {
    const pkgSheet = getSheet(ss, "PACKAG PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.getRange(rowId, 6).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 4. DELETE PACKAGE
  if (action == 'deletePackage') {
    const pkgSheet = getSheet(ss, "PACKAG PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.deleteRow(rowId);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 5. EDIT PACKAGE
  if (action == 'editPackage') {
    const pkgSheet = getSheet(ss, "PACKAG PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        // Assumes columns: StartDate(1), Client(2), PkgName(3), Cost(4), Services(5)
        pkgSheet.getRange(rowId, 1).setValue(data.startDate);
        pkgSheet.getRange(rowId, 3).setValue(data.packageName);
        pkgSheet.getRange(rowId, 4).setValue(data.totalCost);
        pkgSheet.getRange(rowId, 5).setValue(data.totalServices);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  // 6. UPDATE ENTRY STATUS
  if (action == 'updateEntryStatus') {
    const dbSheet = ss.getSheetByName("DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        dbSheet.getRange(rowId, 9).setValue(data.status);
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // 7. EDIT ENTRY
  if (action == 'editEntry') {
    const dbSheet = ss.getSheetByName("DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        // Update specific columns based on index (1-based)
        dbSheet.getRange(rowId, 8).setValue(data.technician);
        dbSheet.getRange(rowId, 6).setValue(data.serviceType);
        dbSheet.getRange(rowId, 10).setValue(data.amount);
        dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
        dbSheet.getRange(rowId, 12).setValue(data.remark);
        dbSheet.getRange(rowId, 16).setValue(data.pendingAmount || 0);
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // 8. ADD CLIENT
  if (action == 'addClient') {
      const clientSheet = ss.getSheetByName("CLIENT MASTER");
      if (clientSheet) clientSheet.appendRow([data.name, data.contact, data.address, data.gender, data.email, data.dob]);
      return response({status: "success"});
  }

  // 9. ADD USER
  if (action == 'addUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      if (!loginSheet) return response({error: "Sheet 'LOGIN' not found"});
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
    const apptSheet = ss.getSheetByName("APPOINTMNET");
    const id = 'appt_' + new Date().getTime();
    apptSheet.appendRow([id, data.date, data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time]);
    return response({status: "success", id: id});
  }

  // 12. UPDATE APPOINTMENT
  if (action == 'updateAppointmentStatus') {
    const apptSheet = ss.getSheetByName("APPOINTMNET");
    const values = apptSheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            apptSheet.getRange(i + 1, 7).setValue(data.status);
            return response({status: "success"});
        }
    }
    return response({error: "Not found"});
  }
  
  return response({error: "Unknown action"});
}

// --- HELPERS ---
function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet && name == "PACKAG PLAN") sheet = ss.getSheetByName("PACKAGE PLAN"); 
    if (!sheet && name == "LOGIN") sheet = ss.getSheetByName("Login");
    return sheet;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function createInvoice(data) {
  try {
      var html = `<html><body><h1>Invoice</h1><p>${data.clientName} - ${data.amount}</p></body></html>`;
      var blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
      var folder = DriveApp.getRootFolder();
      var file = folder.createFile(blob).setName("Inv_" + data.clientName + ".pdf");
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
  } catch (e) { return ""; }
}

function formatDate(date) {
  if (!date) return "";
  if (Object.prototype.toString.call(date) === '[object Date]') {
     try { const d = new Date(date); d.setHours(12); return d.toISOString().split('T')[0]; } catch (e) { return ""; }
  }
  return String(date);
}

// --- GETTERS ---
function getPackages(ss) {
    const sheet = getSheet(ss, "PACKAG PLAN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), startDate: formatDate(row[0]), clientName: row[1],
      packageName: row[2], totalCost: row[3], totalServices: row[4], status: row[5] || 'PENDING' 
    })));
}

function getEntries(ss) {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const lastCol = Math.max(16, sheet.getLastColumn());
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), date: formatDate(row[0]), clientName: row[1], contactNo: row[2], address: row[3],
      branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8],
      amount: Number(row[9]), paymentMethod: row[10], remark: row[11], numberOfService: row[12],
      invoiceUrl: row[13], patchSize: row[14], pendingAmount: Number(row[15] || 0)
    })).reverse());
}

function getAppointments(ss) {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map((row) => ({
      id: row[0], date: formatDate(row[1]), clientName: row[2], contact: row[3], address: row[4], note: row[5], status: row[6] || 'PENDING', branch: row[7] || '', time: row[8] ? String(row[8]) : '' 
    })));
}

function getOptions(ss) {
    const clientSheet = ss.getSheetByName("CLIENT MASTER");
    const techSheet = ss.getSheetByName("EMPLOYEE DETAILS");
    const itemSheet = ss.getSheetByName("ITEM MASTER");
    
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

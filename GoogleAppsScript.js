
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V37 - ROBUST ACTION FIX)
// =====================================================================================

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (action == 'getOptions') return getOptions(ss);
    if (action == 'getPackages') return getPackages(ss);
    if (action == 'getEntries') return getEntries(ss);
    if (action == 'getUsers') return getUsers(ss);
    if (action == 'getAppointments') return getAppointments(ss);
    return response({error: "Invalid action: " + action});
  } catch (err) {
    return response({error: err.toString()});
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return response({error: "Malformed JSON payload"});
  }
  
  const action = data.action;

  // --- PACKAGE ACTIONS (APPROVE / DELETE / EDIT) ---
  if (action == 'updatePackageStatus' || action == 'deletePackage' || action == 'editPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    if (!pkgSheet) return response({error: "Sheet 'PACKAGE PLAN' not found"});

    try {
      // Parse ID like 'row_5' -> 5
      const idStr = String(data.id || "");
      const rowId = parseInt(idStr.split('_')[1]);

      if (isNaN(rowId) || rowId < 2) {
        return response({error: "Invalid Row ID: " + idStr});
      }

      if (action == 'updatePackageStatus') {
        pkgSheet.getRange(rowId, 6).setValue(data.status); // Column F
        SpreadsheetApp.flush();
        return response({status: "success", message: "Status updated to " + data.status});
      }

      if (action == 'deletePackage') {
        pkgSheet.deleteRow(rowId);
        SpreadsheetApp.flush();
        return response({status: "success", message: "Row " + rowId + " deleted"});
      }

      if (action == 'editPackage') {
        const updatedRow = [
          toSheetDate(data.startDate), 
          data.clientName, 
          data.packageName, 
          data.totalCost, 
          data.totalServices, 
          data.status || 'PENDING', 
          data.oldServiceNumber || 0, 
          data.packageType || 'NEW'
        ];
        pkgSheet.getRange(rowId, 1, 1, updatedRow.length).setValues([updatedRow]);
        SpreadsheetApp.flush();
        return response({status: "success"});
      }
    } catch (err) {
      return response({error: "Operation failed: " + err.toString()});
    }
  }

  // --- OTHER POST ACTIONS ---
  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    const newRow = [toSheetDate(data.startDate), data.clientName, data.packageName, data.totalCost, data.totalServices, 'PENDING', data.oldServiceNumber || 0, data.packageType || 'NEW'];
    const nextRow = getSafeLastRow(pkgSheet, 2) + 1;
    pkgSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    pkgSheet.getRange(nextRow, 1).setNumberFormat("dd/mm/yyyy");
    SpreadsheetApp.flush();
    return response({status: "success", row: nextRow});
  }

  if (action == 'addEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    var invoiceUrl = "";
    if (Number(data.amount) >= 0) invoiceUrl = createInvoice(data);
    const newRow = [toSheetDate(data.date), data.clientName, data.contactNo, data.address, data.branch, data.serviceType, data.patchMethod, data.technician, data.workStatus, data.amount, data.paymentMethod, String(data.remark || ""), data.numberOfService, invoiceUrl, data.patchSize || '', data.pendingAmount || 0];
    const nextRow = getSafeLastRow(dbSheet, 2) + 1;
    dbSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    dbSheet.getRange(nextRow, 1).setNumberFormat("dd/mm/yyyy");
    return response({status: "success", invoiceUrl: invoiceUrl, id: 'row_' + nextRow});
  }

  if (action == 'deleteEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    const rowId = parseInt(String(data.id).split('_')[1]);
    if (rowId > 1) {
      dbSheet.deleteRow(rowId);
      return response({status: "success"});
    }
    return response({error: "Invalid entry ID"});
  }

  if (action == 'addClient') {
    const clientSheet = getSheet(ss, "CLIENT MASTER");
    const clientRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
    const nextCl = getSafeLastRow(clientSheet, 1) + 1;
    clientSheet.getRange(nextCl, 1, 1, clientRow.length).setValues([clientRow]);
    return response({status: "success"});
  }

  if (action == 'addAppointment') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const id = 'appt_' + new Date().getTime();
    const newRow = [id, toSheetDate(data.date), data.clientName, data.contact, data.address, data.note, data.status || 'PENDING', data.branch, data.time];
    const nextRow = getSafeLastRow(apptSheet, 2) + 1;
    apptSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    return response({status: "success", id: id});
  }

  return response({error: "Action not recognized: " + action});
}

// --- HELPERS ---

function getSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "PACKAGE PLAN") sheet.appendRow(["START DATE","CLIENT NAME","PACKAGE PLAN","TOTAL COST","TOTAL SERVICES","STATUS","OLD SERVICE NUMBER","PACKAGE TYPE"]);
    if (name === "DATA BASE") sheet.appendRow(["DATE","CLIENT NAME","CONTACT","ADDRESS","BRANCH","SERVICE","METHOD","TECH","STATUS","TOTAL BILL","MODE","REMARK","SRV_NO","INVOICE","SIZE","PENDING"]);
  }
  return sheet;
}

function getSafeLastRow(sheet, colIndex) {
  var column = colIndex || 2; 
  var values = sheet.getRange(1, column, sheet.getMaxRows()).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] && values[i][0].toString().trim() !== "") return i + 1;
  }
  return 1;
}

function toSheetDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return "";
  if (dateStr.includes('-')) {
    const p = dateStr.split('-');
    if (p.length === 3 && p[0].length === 4) return p[2] + "/" + p[1] + "/" + p[0];
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

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getPackages(ss) {
  const sheet = getSheet(ss, "PACKAGE PLAN");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return response([]);
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return response(data.map((row, index) => ({
    id: 'row_' + (index + 2),
    startDate: fromSheetDate(row[0]),
    clientName: row[1],
    packageName: row[2],
    totalCost: row[3],
    totalServices: row[4],
    status: String(row[5] || 'PENDING').trim().toUpperCase(),
    oldServiceNumber: Number(row[6] || 0),
    packageType: String(row[7] || 'NEW').trim().toUpperCase()
  })));
}

function getEntries(ss) {
  const sheet = getSheet(ss, "DATA BASE");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return response([]);
  const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
  return response(data.map((row, index) => ({
    id: 'row_' + (index + 2),
    date: fromSheetDate(row[0]),
    clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: Number(row[9] || 0), paymentMethod: row[10], remark: String(row[11] || ""), numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: Number(row[15] || 0)
  })).reverse());
}

function getUsers(ss) {
  const sheet = getSheet(ss, "LOGIN");
  const data = sheet.getDataRange().getValues();
  return response(data.slice(1).map(row => ({ username: row[0], password: row[1], role: row[2], department: row[3], permissions: row[4] })));
}

function getOptions(ss) {
  const clientSheet = getSheet(ss, "CLIENT MASTER");
  const techSheet = getSheet(ss, "EMPLOYEE DETAILS");
  const itemSheet = getSheet(ss, "ITEM MASTER");
  let clients = [], technicians = [], items = [];
  if (clientSheet.getLastRow() > 1) clients = clientSheet.getRange(2,1,clientSheet.getLastRow()-1,2).getValues().map(r => ({name: r[0], contact: r[1]}));
  if (techSheet.getLastRow() > 1) technicians = techSheet.getRange(2,1,techSheet.getLastRow()-1,1).getValues().map(r => ({name: r[0]}));
  if (itemSheet.getLastRow() > 1) items = itemSheet.getRange(2,1,itemSheet.getLastRow()-1,2).getValues().map(r => ({name: r[1], code: r[0]}));
  return response({ clients, technicians, items });
}

function getAppointments(ss) {
  const sheet = getSheet(ss, "APPOINTMENT");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return response([]);
  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  return response(data.map(row => ({ id: String(row[0]), date: fromSheetDate(row[1]), clientName: row[2], contact: row[3], status: row[6] || 'PENDING' })));
}

function createInvoice(data) { return ""; }

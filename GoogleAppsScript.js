
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V24 - GAP PROTECTION & PRECISE APPEND)
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

/**
 * Robustly finds the last row with actual data in a specific column (defaults to Column B/Client Name)
 * to prevent gaps caused by formatting or ghost rows.
 */
function getSafeLastRow(sheet, colIndex) {
  var column = colIndex || 2; // Default to Column B
  var lastRow = sheet.getMaxRows();
  var values = sheet.getRange(1, column, lastRow).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] && values[i][0].toString().trim() !== "") {
      return i + 1;
    }
  }
  return 1;
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action == 'addEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    if (!dbSheet) return response({error: "Sheet 'DATA BASE' not found"});

    var invoiceUrl = "";
    if (Number(data.amount) >= 0) {
      try { 
        invoiceUrl = createInvoice(data); 
      } catch (e) { 
        invoiceUrl = "Error: " + e.toString(); 
      }
    }

    const newRow = [
      toSheetDate(data.date),    // A
      data.clientName,           // B
      data.contactNo,            // C
      data.address,              // D
      data.branch,               // E
      data.serviceType,          // F
      data.patchMethod,          // G
      data.technician,           // H
      data.workStatus,           // I
      data.amount,               // J
      data.paymentMethod,        // K
      String(data.remark || ""), // L
      data.numberOfService,      // M
      invoiceUrl,                // N
      data.patchSize || '',      // O
      data.pendingAmount || 0    // P
    ];

    // FIX: Find actual next row instead of using appendRow
    const nextRow = getSafeLastRow(dbSheet, 2) + 1;
    dbSheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    // Formatting
    dbSheet.getRange(nextRow, 1).setNumberFormat("dd/mm/yyyy");
    dbSheet.getRange(nextRow, 12).setNumberFormat("@"); // Remark as text
    
    return response({status: "success", invoiceUrl: invoiceUrl});
  }

  if (action == 'updatePaymentFollowUp') {
      const dbSheet = getSheet(ss, "DATA BASE");
      const collectionSheet = getSheet(ss, "PAYMENT COLLECTION");
      try {
          const rowId = parseInt(data.id.split('_')[1]);
          if (rowId > 0 && rowId <= dbSheet.getLastRow()) {
              var screenshotUrl = data.existingScreenshotUrl || "";
              if (data.screenshotBase64 && data.screenshotBase64.indexOf('data:image') === 0) {
                  var splitData = data.screenshotBase64.split('base64,');
                  var contentType = splitData[0].split(':')[1].split(';')[0];
                  var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "pay_" + data.clientName + "_" + new Date().getTime());
                  var file = DriveApp.createFile(blob);
                  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                  screenshotUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
              }
              if (data.pendingAmount !== undefined) dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
              if (data.paymentMethod) dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
              
              const remarkCell = dbSheet.getRange(rowId, 12);
              remarkCell.setNumberFormat("@");
              remarkCell.setValue(String(data.remark || ""));
              
              const today = getTodayInSheetFormat();
              const nextCall = toSheetDate(data.nextCallDate);

              const collectionRow = [
                data.id, 
                today, 
                data.clientName, 
                data.contactNo || '', 
                data.address || '', 
                data.pendingAmount || 0, 
                Number(data.paidAmount || 0), 
                screenshotUrl, 
                String(data.remark || ""), 
                nextCall || '', 
                new Date().toString()
              ];

              // USE SAFE APPEND
              const nextC = getSafeLastRow(collectionSheet, 3) + 1; // Check by Client Name
              collectionSheet.getRange(nextC, 1, 1, collectionRow.length).setValues([collectionRow]);

              collectionSheet.getRange(nextC, 2).setNumberFormat("dd/mm/yyyy");
              collectionSheet.getRange(nextC, 9).setNumberFormat("@"); 
              collectionSheet.getRange(nextC, 10).setNumberFormat("dd/mm/yyyy");

              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
  }

  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    const pkgDate = toSheetDate(data.startDate);
    const pkgRow = [pkgDate, data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING'];
    
    const nextP = getSafeLastRow(pkgSheet, 2) + 1;
    pkgSheet.getRange(nextP, 1, 1, pkgRow.length).setValues([pkgRow]);
    pkgSheet.getRange(nextP, 1).setNumberFormat("dd/mm/yyyy");
    return response({status: "success"});
  }

  if (action == 'addClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      const clientRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
      
      const nextCl = getSafeLastRow(clientSheet, 1) + 1;
      clientSheet.getRange(nextCl, 1, 1, clientRow.length).setValues([clientRow]);
      clientSheet.getRange(nextCl, 6).setNumberFormat("dd/mm/yyyy");
      return response({status: "success"});
  }

  if (action == 'addAppointment') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const id = 'appt_' + new Date().getTime();
    const apptRow = [id, toSheetDate(data.date), data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time];
    
    const nextA = getSafeLastRow(apptSheet, 3) + 1;
    apptSheet.getRange(nextA, 1, 1, apptRow.length).setValues([apptRow]);
    apptSheet.getRange(nextA, 2).setNumberFormat("dd/mm/yyyy");
    return response({status: "success", id: id});
  }

  if (action == 'editEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        if (data.date) {
            const cell = dbSheet.getRange(rowId, 1);
            cell.setValue(toSheetDate(data.date));
            cell.setNumberFormat("dd/mm/yyyy");
        }
        if (data.technician) dbSheet.getRange(rowId, 8).setValue(data.technician);     
        if (data.serviceType) dbSheet.getRange(rowId, 6).setValue(data.serviceType);    
        if (data.amount !== undefined) dbSheet.getRange(rowId, 10).setValue(data.amount);
        if (data.paymentMethod) dbSheet.getRange(rowId, 11).setValue(data.paymentMethod); 
        
        if (data.remark !== undefined) {
            const rCell = dbSheet.getRange(rowId, 12);
            rCell.setNumberFormat("@");
            rCell.setValue(String(data.remark));
        }
        
        if (data.pendingAmount !== undefined) dbSheet.getRange(rowId, 16).setValue(data.pendingAmount); 
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // Identity logic
  if (action == 'addUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      const userRow = [data.username, data.password, data.role, data.department, data.permissions];
      const nextU = getSafeLastRow(loginSheet, 1) + 1;
      loginSheet.getRange(nextU, 1, 1, userRow.length).setValues([userRow]);
      return response({status: "success"});
  }

  return response({error: "Action processed"});
}

function toSheetDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr === "") return "";
  if (dateStr.includes('/') && dateStr.split('/').length === 3) return dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-'); 
    if (parts.length === 3) {
      if (parts[0].length === 4) {
          return parts[2] + "/" + parts[1] + "/" + parts[0];
      }
    }
  }
  return dateStr;
}

function fromSheetDate(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === '[object Date]') {
     const d = new Date(val);
     const year = d.getFullYear();
     const month = ("0" + (d.getMonth() + 1)).slice(-2);
     const day = ("0" + d.getDate()).slice(-2);
     return day + "/" + month + "/" + year;
  }
  return String(val).trim();
}

function getTodayInSheetFormat() {
  const d = new Date();
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

function getEntries(ss) {
    const sheet = getSheet(ss, "DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
    return response(data.map((row, index) => {
      const totalBill = Number(row[9] || 0);
      const payMethod = row[10];
      let pendingAmount = row[15];
      if ((pendingAmount === "" || pendingAmount === null || pendingAmount === undefined) && payMethod === "PENDING") {
          pendingAmount = totalBill;
      } else {
          pendingAmount = Number(pendingAmount || 0);
      }
      return {
        id: 'row_' + (index + 2), 
        date: fromSheetDate(row[0]), 
        clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: totalBill, paymentMethod: payMethod, remark: String(row[11] || ""), numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: pendingAmount
      };
    }).reverse().filter(e => e.clientName)); // Filter out truly empty rows
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
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), startDate: fromSheetDate(row[0]), clientName: row[1], packageName: row[2], totalCost: row[3], totalServices: row[4], status: row[5] || 'PENDING' 
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

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        if (name === "DATA BASE") sheet.appendRow(["DATE","CLIENT NAME","CONTACT","ADDRESS","BRANCH","SERVICE","METHOD","TECH","STATUS","TOTAL BILL","MODE","REMARK","SRV_NO","INVOICE","SIZE","PENDING"]);
    }
    return sheet;
}

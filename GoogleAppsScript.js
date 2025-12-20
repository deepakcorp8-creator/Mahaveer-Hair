
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V20 - Forced DD/MM/YYYY Formatting)
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

    dbSheet.appendRow([
      toSheetDate(data.date),              
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
    
    // FORCE FORMAT FOR THE NEW ROW (Column 1 is Date)
    dbSheet.getRange(dbSheet.getLastRow(), 1).setNumberFormat("dd/mm/yyyy");
    
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
              if (data.remark) dbSheet.getRange(rowId, 12).setValue(data.remark);
              
              const today = getTodayInSheetFormat();
              const nextCall = toSheetDate(data.nextCallDate);

              collectionSheet.appendRow([
                data.id, 
                today, 
                data.clientName, 
                data.contactNo || '', 
                data.address || '', 
                data.pendingAmount || 0, 
                Number(data.paidAmount || 0), 
                screenshotUrl, 
                data.remark || '', 
                nextCall || '', 
                new Date().toString()
              ]);

              // FORCE FORMAT: Date of Collection (Col 2) and Next Call Date (Col 10)
              const lastRow = collectionSheet.getLastRow();
              collectionSheet.getRange(lastRow, 2).setNumberFormat("dd/mm/yyyy");
              collectionSheet.getRange(lastRow, 10).setNumberFormat("dd/mm/yyyy");

              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
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
        if (data.remark !== undefined) dbSheet.getRange(rowId, 12).setValue(data.remark);        
        if (data.pendingAmount !== undefined) dbSheet.getRange(rowId, 16).setValue(data.pendingAmount); 
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  if (action == 'updateUserProfile') {
      const loginSheet = getSheet(ss, "LOGIN");
      const values = loginSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === data.username.toString().trim().toLowerCase()) {
              loginSheet.getRange(i + 1, 6).setValue(data.dpUrl || "");
              loginSheet.getRange(i + 1, 7).setValue(data.gender || "");
              const dobCell = loginSheet.getRange(i + 1, 8);
              dobCell.setValue(toSheetDate(data.dob) || "");
              dobCell.setNumberFormat("dd/mm/yyyy");
              loginSheet.getRange(i + 1, 9).setValue(data.address || "");
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }

  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    pkgSheet.appendRow([toSheetDate(data.startDate), data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING']);
    pkgSheet.getRange(pkgSheet.getLastRow(), 1).setNumberFormat("dd/mm/yyyy");
    return response({status: "success"});
  }

  if (action == 'editPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        const dateCell = pkgSheet.getRange(rowId, 1);
        dateCell.setValue(toSheetDate(data.startDate));
        dateCell.setNumberFormat("dd/mm/yyyy");
        pkgSheet.getRange(rowId, 3).setValue(data.packageName);
        pkgSheet.getRange(rowId, 4).setValue(data.totalCost);
        pkgSheet.getRange(rowId, 5).setValue(data.totalServices);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  if (action == 'addClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      clientSheet.appendRow([data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)]);
      clientSheet.getRange(clientSheet.getLastRow(), 6).setNumberFormat("dd/mm/yyyy");
      return response({status: "success"});
  }

  if (action == 'addAppointment') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const id = 'appt_' + new Date().getTime();
    apptSheet.appendRow([id, toSheetDate(data.date), data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time]);
    apptSheet.getRange(apptSheet.getLastRow(), 2).setNumberFormat("dd/mm/yyyy");
    return response({status: "success", id: id});
  }

  return response({error: "Action processed"});
}

// --- DATE UTILITIES ---

/** Converts YYYY-MM-DD (Frontend) to DD/MM/YYYY (Sheet) */
function toSheetDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // If it's already DD/MM/YYYY or similar, return it
  if (dateStr.includes('/') && dateStr.split('/').length === 3) return dateStr;
  
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-'); 
    if (parts.length === 3) {
      // Check if it's YYYY-MM-DD
      if (parts[0].length === 4) {
          return parts[2] + "/" + parts[1] + "/" + parts[0];
      }
    }
  }
  return dateStr;
}

/** Converts Sheet value (Date object or DD/MM/YYYY) back to YYYY-MM-DD for Frontend */
function fromSheetDate(val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === '[object Date]') {
     const d = new Date(val);
     const year = d.getFullYear();
     const month = ("0" + (d.getMonth() + 1)).slice(-2);
     const day = ("0" + d.getDate()).slice(-2);
     return year + "-" + month + "-" + day;
  }
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/'); 
    if (parts.length === 3) {
        // Handle DD/MM/YYYY to YYYY-MM-DD
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return y + "-" + m + "-" + d;
    }
  }
  // If sheet somehow has YYYY-MM-DD strings
  if (str.includes('-') && str.split('-')[0].length === 4) return str;
  
  return str;
}

/** Returns today's date in DD/MM/YYYY string */
function getTodayInSheetFormat() {
  const d = new Date();
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return day + "/" + month + "/" + year;
}

// --- DATA RETRIEVAL ---

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
        clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: totalBill, paymentMethod: payMethod, remark: row[11], numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: pendingAmount
      };
    }).reverse());
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
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map(row => ({ 
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


// =====================================================================================
// ⚠️ MAHUVEER WEB APP - BACKEND SCRIPT (V15 - Fixed Amount Corruptions)
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
    if (Number(data.amount) > 0) {
      try { invoiceUrl = createInvoice(data); } catch (e) { invoiceUrl = "Error: " + e.toString(); }
    }

    dbSheet.appendRow([
      data.date,              // Col 1 (A)
      data.clientName,        // Col 2 (B)
      data.contactNo,         // Col 3 (C)
      data.address,           // Col 4 (D)
      data.branch,            // Col 5 (E)
      data.serviceType,       // Col 6 (F)
      data.patchMethod,       // Col 7 (G)
      data.technician,        // Col 8 (H)
      data.workStatus,        // Col 9 (I)
      data.amount,            // Col 10 (J) - TOTAL BILL VALUE
      data.paymentMethod,     // Col 11 (K)
      data.remark,            // Col 12 (L)
      data.numberOfService,   // Col 13 (M)
      invoiceUrl,             // Col 14 (N)
      data.patchSize || '',   // Col 15 (O)
      data.pendingAmount || 0 // Col 16 (P) - REMAINING BALANCE
    ]);
    
    return response({status: "success", invoiceUrl: invoiceUrl});
  }

  // 14. UPDATE PAYMENT FOLLOW-UP
  if (action == 'updatePaymentFollowUp') {
      const dbSheet = getSheet(ss, "DATA BASE");
      const collectionSheet = getSheet(ss, "PAYMENT COLLECTION");
      
      try {
          const rowId = parseInt(data.id.split('_')[1]); // Extract row index
          
          if (rowId > 0 && rowId <= dbSheet.getLastRow()) {
              
              // 1. Handle Screenshot upload
              var screenshotUrl = data.existingScreenshotUrl || "";
              if (data.screenshotBase64 && data.screenshotBase64.indexOf('data:image') === 0) {
                  try {
                      var splitData = data.screenshotBase64.split('base64,');
                      var contentType = splitData[0].split(':')[1].split(';')[0];
                      var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "pay_" + data.clientName + "_" + new Date().getTime());
                      var file = DriveApp.createFile(blob);
                      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                      screenshotUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
                  } catch (e) { /* fail silently */ }
              }

              // 2. Update Data Base Sheet
              // CRITICAL FIX: We do NOT touch Col 10 (Total Bill). 
              // We only update Col 16 (Remaining Balance) and metadata.
              if (data.pendingAmount !== undefined) {
                  dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
              }
              if (data.paymentMethod) {
                  dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
              }
              if (data.remark) {
                  dbSheet.getRange(rowId, 12).setValue(data.remark);
              }

              // 3. Log to Collection History
              var formattedNextDate = "";
              if (data.nextCallDate) {
                  try {
                      var parts = data.nextCallDate.split('-'); 
                      if (parts.length === 3) formattedNextDate = parts[2] + '/' + parts[1] + '/' + parts[0];
                      else formattedNextDate = data.nextCallDate;
                  } catch(e) { formattedNextDate = ""; }
              }

              const today = new Date();
              const dateStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
              const paidNow = Number(data.paidAmount || 0);

              collectionSheet.appendRow([
                  data.id,                  // ID
                  dateStr,                  // Collection Date
                  data.clientName,          // Name
                  data.contactNo || '',     // Contact
                  data.address || '',       // Address
                  data.pendingAmount || 0,  // Remaining After this pay
                  paidNow,                  // Amount Paid now
                  screenshotUrl,            // Proof
                  data.remark || '',        // Note
                  formattedNextDate,        // Scheduled Next Call
                  new Date().toString()     // System Time
              ]);

              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
  }

  // 7. EDIT ENTRY
  if (action == 'editEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        if (data.technician) dbSheet.getRange(rowId, 8).setValue(data.technician);     
        if (data.serviceType) dbSheet.getRange(rowId, 6).setValue(data.serviceType);    
        // Safety: Only update amount if it's explicitly provided and valid
        if (data.amount !== undefined && !isNaN(data.amount)) {
            dbSheet.getRange(rowId, 10).setValue(data.amount);
        }
        if (data.paymentMethod) dbSheet.getRange(rowId, 11).setValue(data.paymentMethod); 
        if (data.remark !== undefined) dbSheet.getRange(rowId, 12).setValue(data.remark);        
        if (data.pendingAmount !== undefined) dbSheet.getRange(rowId, 16).setValue(data.pendingAmount); 
        return response({status: "success"});
    } catch(e) { return response({error: "Failed to Edit"}); }
  }

  // FIX: Added action to handle user profile updates (DP URL, Gender, DOB, Address)
  if (action == 'updateUserProfile') {
      const loginSheet = getSheet(ss, "LOGIN");
      const values = loginSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === data.username.toString().trim().toLowerCase()) {
              // Update profile fields starting from Col 6
              loginSheet.getRange(i + 1, 6).setValue(data.dpUrl || "");
              loginSheet.getRange(i + 1, 7).setValue(data.gender || "");
              loginSheet.getRange(i + 1, 8).setValue(data.dob || "");
              loginSheet.getRange(i + 1, 9).setValue(data.address || "");
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }

  // ... (Other actions like addPackage, addUser, etc. remain unchanged)
  if (action == 'addPackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    pkgSheet.appendRow([data.startDate, data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING']);
    return response({status: "success"});
  }

  if (action == 'updatePackageStatus') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.getRange(rowId, 6).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  if (action == 'deletePackage') {
    const pkgSheet = getSheet(ss, "PACKAGE PLAN");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        pkgSheet.deleteRow(rowId);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

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

  if (action == 'updateEntryStatus') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        dbSheet.getRange(rowId, 9).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  if (action == 'addClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      clientSheet.appendRow([data.name, data.contact, data.address, data.gender, data.email, data.dob]);
      return response({status: "success"});
  }

  if (action == 'addUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      loginSheet.appendRow([data.username, data.password, data.role, data.department, data.permissions]);
      return response({status: "success"});
  }

  if (action == 'deleteUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      const values = loginSheet.getDataRange().getValues();
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === data.username.toString().trim().toLowerCase()) {
              loginSheet.deleteRow(i + 1);
              return response({status: "success"});
          }
      }
      return response({error: "Not found"});
  }

  if (action == 'addAppointment') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
    const id = 'appt_' + new Date().getTime();
    apptSheet.appendRow([id, data.date, data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time]);
    return response({status: "success", id: id});
  }

  if (action == 'updateAppointmentStatus') {
    const apptSheet = getSheet(ss, "APPOINTMENT");
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

function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        if (name === "DATA BASE") sheet.appendRow(["DATE","CLIENT NAME","CONTACT","ADDRESS","BRANCH","SERVICE","METHOD","TECH","STATUS","TOTAL BILL","MODE","REMARK","SRV_NO","INVOICE","SIZE","PENDING"]);
        if (name === "PAYMENT COLLECTION") sheet.appendRow(["ID","DATE","CLIENT","PHONE","ADDRESS","REMAINING","PAID","PROOF","REMARK","NEXT_CALL","TIMESTAMP"]);
    }
    return sheet;
}

function getEntries(ss) {
    const sheet = getSheet(ss, "DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
    return response(data.map((row, index) => {
      const totalBill = Number(row[9] || 0);
      const payMethod = row[10];
      let pendingAmount = row[15];
      
      // AUTO-CORRECTION: If pending col is empty but method is PENDING, use totalBill
      if ((pendingAmount === "" || pendingAmount === null || pendingAmount === undefined) && payMethod === "PENDING") {
          pendingAmount = totalBill;
      } else {
          pendingAmount = Number(pendingAmount || 0);
      }

      return {
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
        amount: totalBill, 
        paymentMethod: payMethod, 
        remark: row[11], 
        numberOfService: row[12], 
        invoiceUrl: row[13], 
        patchSize: row[14], 
        pendingAmount: pendingAmount
      };
    }).reverse());
}

// ... (Other GET functions remain unchanged)
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

function getPackages(ss) {
    const sheet = getSheet(ss, "PACKAGE PLAN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    return response(data.map((row, index) => ({
      id: 'row_' + (index + 2), startDate: formatDate(row[0]), clientName: row[1],
      packageName: row[2], totalCost: row[3], totalServices: row[4], status: row[5] || 'PENDING' 
    })));
}

function getAppointments(ss) {
    const sheet = getSheet(ss, "APPOINTMENT");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map((row) => ({
      id: row[0], date: formatDate(row[1]), clientName: row[2], contact: row[3], address: row[4], note: row[5], status: row[6] || 'PENDING', branch: row[7] || '', time: row[8] ? String(row[8]) : '' 
    })));
}

// FIX: Updated getUsers to return profile fields (DP, Gender, DOB, Address) from the LOGIN sheet
function getUsers(ss) {
    const sheet = getSheet(ss, "LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map(row => ({ 
      username: row[0], 
      password: row[1], 
      role: row[2], 
      department: row[3], 
      permissions: row[4],
      dpUrl: row[5],
      gender: row[6],
      dob: row[7],
      address: row[8]
    })));
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

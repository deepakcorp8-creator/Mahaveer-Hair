
// =====================================================================================
// ⚠️ MAHUVEER WEB APP - BACKEND SCRIPT (V14 - Auto-Fix Headers)
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
      data.date,              // Col 1
      data.clientName,        // Col 2
      data.contactNo,         // Col 3
      data.address,           // Col 4
      data.branch,            // Col 5
      data.serviceType,       // Col 6
      data.patchMethod,       // Col 7
      data.technician,        // Col 8
      data.workStatus,        // Col 9
      data.amount,            // Col 10 (Total Paid Initially)
      data.paymentMethod,     // Col 11
      data.remark,            // Col 12
      data.numberOfService,   // Col 13
      invoiceUrl,             // Col 14
      data.patchSize || '',   // Col 15
      data.pendingAmount || 0 // Col 16 (P) - Initial Pending
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
              
              // --- 1. HANDLE SCREENSHOT UPLOAD ---
              var screenshotUrl = data.existingScreenshotUrl || "";
              if (data.screenshotBase64 && data.screenshotBase64.indexOf('data:image') === 0) {
                  try {
                      var splitData = data.screenshotBase64.split('base64,');
                      var contentType = splitData[0].split(':')[1].split(';')[0];
                      var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "pay_" + data.clientName + "_" + new Date().getTime());
                      var file = DriveApp.createFile(blob);
                      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                      screenshotUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
                  } catch (e) {
                      // Silently fail upload
                  }
              }

              // --- 2. UPDATE DATA BASE SHEET (Financials) ---
              const currentTotalPaid = Number(dbSheet.getRange(rowId, 10).getValue() || 0);
              const paidNow = Number(data.paidAmount || 0); 
              
              if (paidNow > 0) {
                  dbSheet.getRange(rowId, 10).setValue(currentTotalPaid + paidNow);
              }
              if (data.pendingAmount !== undefined) {
                  dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
              }
              if (data.paymentMethod) {
                  dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
              }
              if (data.remark) {
                  dbSheet.getRange(rowId, 12).setValue(data.remark);
              }

              // --- 3. INSERT INTO PAYMENT COLLECTION SHEET ---
              var formattedNextDate = "";
              if (data.nextCallDate) {
                  try {
                      var parts = data.nextCallDate.split('-'); 
                      if (parts.length === 3) {
                          formattedNextDate = parts[2] + '/' + parts[1] + '/' + parts[0];
                      } else {
                          formattedNextDate = data.nextCallDate;
                      }
                  } catch(e) { formattedNextDate = ""; }
              }

              const today = new Date();
              const dateStr = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
              
              collectionSheet.appendRow([
                  data.id,                  // ID
                  dateStr,                  // Date of transaction
                  data.clientName,          // Client Name
                  data.contactNo || '',     // Contact
                  data.address || '',       // Address
                  data.pendingAmount || 0,  // Pending Amount (Remaining)
                  paidNow,                  // Paid Amount (Current Transaction)
                  screenshotUrl,            // Screenshot URL
                  data.remark || '',        // Followup Remark
                  formattedNextDate,        // Next Follow up Date
                  new Date().toString()     // Timestamp
              ]);

              return response({status: "success", screenshotUrl: screenshotUrl});
          } else {
              return response({error: "Invalid Row ID"});
          }
      } catch(e) {
          return response({error: "Update Failed: " + e.message});
      }
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
        dbSheet.getRange(rowId, 9).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  // 7. EDIT ENTRY
  if (action == 'editEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
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

  // 13. UPDATE USER PROFILE
  if (action == 'updateUser') {
      const loginSheet = getSheet(ss, "LOGIN");
      const dataRange = loginSheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) { 
          if (values[i][0].toString().toLowerCase() === data.username.toLowerCase()) {
              var finalDpUrl = data.dpUrl || '';
              if (finalDpUrl.toString().indexOf('data:image') === 0) {
                  try {
                      var splitData = finalDpUrl.split('base64,');
                      var contentType = splitData[0].split(':')[1].split(';')[0];
                      var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "profile_" + data.username + "_" + new Date().getTime());
                      var file = DriveApp.createFile(blob);
                      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                      finalDpUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
                  } catch (e) {
                      finalDpUrl = values[i][4]; 
                  }
              }
              const row = i + 1;
              loginSheet.getRange(row, 5).setValue(finalDpUrl);   
              loginSheet.getRange(row, 6).setValue(data.gender || ''); 
              loginSheet.getRange(row, 7).setValue(data.dob || '');     
              loginSheet.getRange(row, 8).setValue(data.address || ''); 
              return response({status: "success", newDpUrl: finalDpUrl});
          }
      }
      return response({error: "User not found"});
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

// ⚠️ REVISED GET SHEET FUNCTION TO AUTO-RESTORE HEADERS
function getSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    
    // Fallbacks for specific sheet names
    if (!sheet && name == "DATA BASE") {
        sheet = ss.getSheetByName("Data Base") || ss.getSheetByName("Database") || ss.getSheetByName("DB");
    }

    // Create if doesn't exist
    if (!sheet) {
        sheet = ss.insertSheet(name);
    }

    // --- AUTO-HEADER RECOVERY LOGIC ---
    // If the sheet is empty (no rows or rows exist but row 1 is empty), check and restore headers.
    // getLastRow() == 0 means completely empty.
    if (sheet.getLastRow() === 0) {
        if (name === "APPOINTMENT") {
            // Recreating Appointment Headers
            var headers = ["ID", "DATE", "CLIENT NAME", "CONTACT NO", "ADDRESS", "NOTE", "STATUS", "BRANCH", "TIME"];
            sheet.appendRow(headers);
            // Style them
            sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e7ff");
        }
        else if (name === "PAYMENT COLLECTION") {
             // Recreating Payment Collection Headers
             var headers = ["ID", "DATE", "CLIENT NAME", "CONTACT NO", "ADDRESS", "PENDING AMOUNT", "PAID AMOUNT", "SCREENSHOT URL", "FOLLOWUP REMARK", "NEXT FOLLOW UP DATE", "TIMESTAMP"];
             sheet.appendRow(headers);
             sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#d1fae5");
        }
        else if (name === "PACKAGE PLAN") {
             var headers = ["START DATE", "CLIENT NAME", "PACKAGE NAME", "TOTAL COST", "TOTAL SERVICES", "STATUS"];
             sheet.appendRow(headers);
             sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }
    }
    
    return sheet;
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
    
    // Read only up to Col 16 (P) since Q,R,S are removed from main DB
    const lastCol = Math.min(16, sheet.getLastColumn()); 
    
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
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    
    return response(data.map(row => ({ 
        username: row[0], 
        password: row[1], 
        role: row[2], 
        department: row[3], 
        permissions: '', 
        branch: row[3], 
        dpUrl: row[4],  
        gender: row[5], 
        dob: formatDate(row[6]), 
        address: row[7] 
    })));
}

function createInvoice(data) {
  try {
    var address = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
    var contact = "+91-9144939828";
    if (data.branch && data.branch.toString().toUpperCase().trim() === 'JDP') {
       address = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
       contact = "09725567348";
    }
    var dateStr = data.date;
    try {
        var dateParts = data.date.split('-');
        if (dateParts.length === 3) {
            dateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
        }
    } catch(e) {}
    var invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 10000);
    var logoUrl = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";
    var logoSrc = logoUrl;
    try {
        var imageBlob = UrlFetchApp.fetch(logoUrl).getBlob();
        var base64Image = Utilities.base64Encode(imageBlob.getBytes());
        logoSrc = "data:image/png;base64," + base64Image;
    } catch(e) { logoSrc = logoUrl; }

    var html = `<html><body>Invoice Content</body></html>`; 
    
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

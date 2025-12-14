
// =====================================================================================
// ⚠️ STEP 1: Select "fixPermissions" from the dropdown above and click RUN.
// ⚠️ STEP 2: Review Permissions -> Allow.
// ⚠️ STEP 3: Click "Deploy" > "New Deployment" > "Web App" > "Deploy".
// ⚠️ IMPORTANT: In Deployment settings, set "Execute as" to "Me".
// =====================================================================================

function fixPermissions() {
  console.log("1. Initializing Drive Access...");
  
  // This line forces the script to ask for "Full Drive Scope" (https://www.googleapis.com/auth/drive)
  // instead of just "drive.file". This is required to access folders you created manually.
  const root = DriveApp.getRootFolder(); 
  
  const FOLDER_ID = "1KmraYm_2xR6IPaR83IM1BL5cuNYcvqkE"; // Your specific folder
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    console.log("✅ FOLDER FOUND: " + folder.getName());
    
    const file = folder.createFile("Permission_Test.txt", "If you see this, permissions are fixed!");
    file.setTrashed(true); // Delete immediately
    
    console.log("✅ WRITE ACCESS CONFIRMED.");
    console.log("👉 You can now DEPLOY the app.");
  } catch (e) {
    console.log("❌ ERROR: " + e.toString());
    console.log("TIP: Ensure you are the owner of the folder, or have Edit access.");
  }
}

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
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet) return response({error: "Sheet 'DATA BASE' not found"});

    // GENERATE PDF & GET LINK
    var invoiceUrl = "";
    try { 
      invoiceUrl = createInvoicePDF(data); 
    } catch(e) { 
      invoiceUrl = "Error: " + e.message; 
    }

    // Append Row
    sheet.appendRow([
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

  // --- OTHER ACTIONS ---

  if (action == 'addPackage') {
    const sheet = getPackageSheet(ss);
    if (!sheet) return response({error: "Sheet not found"});
    sheet.appendRow([data.startDate, data.clientName, data.packageName, data.totalCost, data.totalServices, data.status || 'PENDING']);
    return response({status: "success"});
  }

  if (action == 'updatePackageStatus') {
    const sheet = getPackageSheet(ss);
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.getRange(rowId, 6).setValue(data.status); 
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  if (action == 'deletePackage') {
    const sheet = getPackageSheet(ss);
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.deleteRow(rowId);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  if (action == 'editPackage') {
    const sheet = getPackageSheet(ss);
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.getRange(rowId, 1).setValue(data.startDate);
        sheet.getRange(rowId, 3).setValue(data.packageName);
        sheet.getRange(rowId, 4).setValue(data.totalCost);
        sheet.getRange(rowId, 5).setValue(data.totalServices);
        return response({status: "success"});
    } catch(e) { return response({error: e.message}); }
  }

  if (action == 'updateEntryStatus') {
    const sheet = ss.getSheetByName("DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.getRange(rowId, 9).setValue(data.status);
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  if (action == 'editEntry') {
    const sheet = ss.getSheetByName("DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.getRange(rowId, 8).setValue(data.technician);
        sheet.getRange(rowId, 6).setValue(data.serviceType);
        sheet.getRange(rowId, 10).setValue(data.amount);
        sheet.getRange(rowId, 11).setValue(data.paymentMethod);
        sheet.getRange(rowId, 12).setValue(data.remark);
        sheet.getRange(rowId, 16).setValue(data.pendingAmount || 0);
        return response({status: "success"});
    } catch(e) { return response({error: "Failed"}); }
  }

  if (action == 'addClient') {
      const sheet = ss.getSheetByName("CLIENT MASTER");
      if (sheet) sheet.appendRow([data.name, data.contact, data.address, data.gender, data.email, data.dob]);
      return response({status: "success"});
  }

  if (action == 'addUser') {
      const sheet = ss.getSheetByName("LOGIN");
      const users = sheet.getDataRange().getValues();
      if (users.some(row => row[0].toString().toLowerCase() === data.username.toLowerCase())) {
          return response({status: "error", message: "Exists"});
      }
      sheet.appendRow([data.username, data.password, data.role, data.department, data.permissions]);
      return response({status: "success"});
  }

  if (action == 'deleteUser') {
      const sheet = ss.getSheetByName("LOGIN");
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === data.username.toString().trim().toLowerCase()) {
              sheet.deleteRow(i + 1);
              return response({status: "success"});
          }
      }
      return response({error: "Not found"});
  }

  if (action == 'addAppointment') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    const id = 'appt_' + new Date().getTime();
    sheet.appendRow([id, data.date, data.clientName, data.contact, data.address, data.note, data.status, data.branch, data.time]);
    return response({status: "success", id: id});
  }

  if (action == 'updateAppointmentStatus') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            sheet.getRange(i + 1, 7).setValue(data.status);
            return response({status: "success"});
        }
    }
    return response({error: "Not found"});
  }
  
  return response({error: "Unknown action"});
}

function getPackageSheet(ss) {
    var sheet = ss.getSheetByName("PACKAG PLAN");
    if (!sheet) sheet = ss.getSheetByName("PACKAGE PLAN"); 
    return sheet;
}

// --- DATA FETCHING FUNCTIONS ---

function getPackages(ss) {
    const sheet = getPackageSheet(ss);
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
      id: row[0], 
      date: formatDate(row[1]), 
      clientName: row[2], 
      contact: row[3], 
      address: row[4], 
      note: row[5], 
      status: row[6] || 'PENDING',
      branch: row[7] || '', 
      time: row[8] ? String(row[8]) : '' 
    })));
}

function getOptions(ss) {
    const clientSheet = ss.getSheetByName("CLIENT MASTER");
    const techSheet = ss.getSheetByName("EMPLOYEE DETAILS");
    const itemSheet = ss.getSheetByName("ITEM MASTER");
    
    let clients = [], technicians = [], items = [];
    if (clientSheet && clientSheet.getLastRow() > 1) {
        clients = clientSheet.getRange(2, 1, clientSheet.getLastRow()-1, 6).getValues()
          .filter(r => r[0]).map(row => ({ name: row[0], contact: row[1], address: row[2], gender: row[3], email: row[4], dob: formatDate(row[5]) }));
    }
    if (techSheet && techSheet.getLastRow() > 1) {
        technicians = techSheet.getRange(2, 1, techSheet.getLastRow()-1, 2).getValues()
          .filter(r => r[0]).map(row => ({ name: row[0], contact: row[1] }));
    }
    if (itemSheet && itemSheet.getLastRow() > 1) {
        items = itemSheet.getRange(2, 1, itemSheet.getLastRow()-1, 3).getValues()
          .filter(r => r[0]).map(row => ({ code: row[0], name: row[1], category: row[2] }));
    }
    return response({ clients, technicians, items });
}

function getUsers(ss) {
    const sheet = ss.getSheetByName("LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    return response(data.map(row => ({ username: row[0], password: row[1], role: row[2], department: row[3], permissions: row[4] })));
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!date) return "";
  try { const d = new Date(date); d.setHours(12); return d.toISOString().split('T')[0]; } catch (e) { return String(date); }
}

// --- OPTIMIZED PDF GENERATOR ---
function createInvoicePDF(data) {
  // 1. SPECIFIC FOLDER ID
  const FOLDER_ID = "1KmraYm_2xR6IPaR83IM1BL5cuNYcvqkE";
  
  // 2. Get Folder (This line requires FULL DRIVE permissions)
  // If this fails, 'fixPermissions' was not run or user denied access.
  var folder = DriveApp.getFolderById(FOLDER_ID);

  var invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 10000);
  
  var branchAddress = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
  var branchContact = "+91-9144939828";

  if (data.branch && data.branch.toString().toUpperCase() === 'JDP') {
      branchAddress = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Jagdalpur-494001, Chhattisgarh";
      branchContact = "09725567348";
  }

  var formattedDate = data.date;
  if (data.date && data.date.indexOf('-') > -1) {
      var parts = data.date.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
          formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
      }
  }

  var html = 
    "<html><body style='font-family: sans-serif; color: #374151; padding: 0; margin: 0; background: white;'>" +
      "<div style='width: 90%; max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;'>" +
        
        "<div style='text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px;'>" +
          "<h1 style='margin: 0; font-size: 20px; color: #111;'>MAHAVEER HAIR SOLUTION</h1>" +
          "<p style='margin: 5px 0; font-size: 10px; color: #555;'>" +
             branchAddress + "<br>" +
             "Mobile: " + branchContact + " | Email: info@mahaveerhairsolution.com" +
          "</p>" +
        "</div>" +
        
        "<div style='background: #f9f9f9; padding: 10px; font-size: 11px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; margin-bottom: 20px;'>" +
           "<span><strong>Invoice:</strong> " + invoiceNo + "</span>" +
           "<span style='margin-left: 20px;'><strong>Date:</strong> " + formattedDate + "</span>" +
           "<span style='float: right;'><strong>Branch:</strong> " + data.branch + "</span>" +
        "</div>" +

        "<div style='margin-bottom: 20px; font-size: 12px;'>" +
           "<div style='font-weight: bold; font-size: 14px;'>" + data.clientName + "</div>" +
           "<div>" + (data.address || "") + "</div>" +
           "<div>Phone: " + data.contactNo + "</div>" +
        "</div>" +

        "<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;'>" +
          "<tr style='background: #111; color: white;'>" +
             "<th style='padding: 8px; text-align: left;'>Service</th>" +
             "<th style='padding: 8px; text-align: right;'>Amount</th>" +
          "</tr>" +
          "<tr>" +
             "<td style='padding: 10px; border-bottom: 1px solid #eee;'>" + 
                "<strong>" + data.serviceType + "</strong><br>" +
                "<span style='color: #666;'>Tech: " + data.technician + " | " + data.patchMethod + "</span>" +
             "</td>" +
             "<td style='padding: 10px; border-bottom: 1px solid #eee; text-align: right;'>₹" + data.amount + "</td>" +
          "</tr>" +
        "</table>" +

        "<div style='text-align: right; margin-top: 10px; font-size: 14px; font-weight: bold;'>" +
           "Total: ₹" + data.amount +
        "</div>" +
        
        "<div style='margin-top: 40px; font-size: 9px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px;'>" +
           "Computer Generated Invoice" +
        "</div>" +

      "</div>" +
    "</body></html>";

  var blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
  blob.setName("INV_" + data.clientName + "_" + formattedDate.replace(/\//g, '-') + ".pdf");
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

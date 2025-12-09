
// COPY THIS CODE INTO YOUR GOOGLE APPS SCRIPT EDITOR
// SAVE IT.
// SELECT "requestPermissions" function from the top dropdown and click RUN.
// YOU MUST APPROVE THE PERMISSIONS TO "CREATE/EDIT" FILES.

function requestPermissions() {
  // Folder ID from your URL
  const folderId = "1yNT2OJZ192AmNLF_3xxwCew_h3jCnEP_";
  
  try {
    // 1. Get Folder (Read Permission)
    const folder = DriveApp.getFolderById(folderId);
    console.log("Folder found: " + folder.getName());

    // 2. Create a dummy file (Triggers WRITE Permission)
    // This step is CRITICAL to fix the "createFile" error
    const testFile = folder.createFile("System_Check.txt", "This file verifies write permissions.");
    console.log("Write permission verified.");

    // 3. Delete dummy file
    testFile.setTrashed(true);
    console.log("System check complete. You can now Deploy.");
    
  } catch (e) {
    console.log("ERROR: " + e.message);
    console.log("Please run this function again and approve all permissions.");
  }
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action == 'getOptions') {
    return getOptions(ss);
  }
  
  if (action == 'getPackages') {
    return getPackages(ss);
  }
  
  if (action == 'getEntries') {
     return getEntries(ss);
  }
  
  if (action == 'getUsers') {
     return getUsers(ss);
  }

  if (action == 'getAppointments') {
      return getAppointments(ss);
  }

  return response({error: "Invalid action"});
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  // --- PACKAGE ACTIONS ---

  if (action == 'addPackage') {
    const sheet = getPackageSheet(ss);
    if (!sheet) return response({error: "Sheet 'PACKAG PLAN' not found"});
    
    sheet.appendRow([
      data.startDate,
      data.clientName,
      data.packageName,
      data.totalCost,
      data.totalServices,
      data.status || 'PENDING' 
    ]);
    
    return response({status: "success", message: "Package added"});
  }

  if (action == 'updatePackageStatus') {
    const sheet = getPackageSheet(ss);
    if (!sheet) return response({error: "Sheet not found"});
    
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        if (isNaN(rowId) || rowId < 2) return response({error: "Invalid Row ID"});
        sheet.getRange(rowId, 6).setValue(data.status); 
        return response({status: "success"});
    } catch(e) {
        return response({error: "Error: " + e.message});
    }
  }

  if (action == 'deletePackage') {
    const sheet = getPackageSheet(ss);
    if (!sheet) return response({error: "Sheet not found"});

    try {
        const rowId = parseInt(data.id.split('_')[1]);
        if (isNaN(rowId) || rowId < 2) return response({error: "Invalid Row ID"});
        sheet.deleteRow(rowId);
        return response({status: "success"});
    } catch(e) {
        return response({error: "Error: " + e.message});
    }
  }

  if (action == 'editPackage') {
    const sheet = getPackageSheet(ss);
    if (!sheet) return response({error: "Sheet not found"});

    try {
        const rowId = parseInt(data.id.split('_')[1]);
        if (isNaN(rowId) || rowId < 2) return response({error: "Invalid Row ID"});
        
        sheet.getRange(rowId, 1).setValue(data.startDate);
        sheet.getRange(rowId, 3).setValue(data.packageName);
        sheet.getRange(rowId, 4).setValue(data.totalCost);
        sheet.getRange(rowId, 5).setValue(data.totalServices);

        return response({status: "success"});
    } catch(e) {
        return response({error: "Error: " + e.message});
    }
  }

  // --- OTHER ACTIONS ---

  if (action == 'addEntry') {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet) return response({error: "Sheet 'DATA BASE' not found"});

    // GENERATE INVOICE URL
    var invoiceUrl = "";
    try {
        invoiceUrl = createInvoicePDF(data);
    } catch(e) {
        invoiceUrl = "Error: " + e.message;
    }

    // Append 15 columns (Columns A to O)
    // Column O (Index 14) is Patch Size
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
      invoiceUrl,         // Column N
      data.patchSize || '' // Column O
    ]);
    return response({status: "success", invoiceUrl: invoiceUrl});
  }

  if (action == 'updateEntryStatus') {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet) return response({error: "Sheet 'DATA BASE' not found"});
    
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        sheet.getRange(rowId, 9).setValue(data.status);
        return response({status: "success"});
    } catch(e) {
        return response({error: "Failed to update status"});
    }
  }

  if (action == 'addClient') {
      const sheet = ss.getSheetByName("CLIENT MASTER");
      if (sheet) {
        sheet.appendRow([
            data.name,
            data.contact,
            data.address,
            data.gender,
            data.email,
            data.dob
        ]);
      }
      return response({status: "success"});
  }

  if (action == 'addUser') {
      const sheet = ss.getSheetByName("LOGIN");
      if (!sheet) return response({error: "Sheet 'LOGIN' not found"});
      
      const users = sheet.getDataRange().getValues();
      const exists = users.some(row => row[0].toString().toLowerCase() === data.username.toLowerCase());
      if (exists) {
          return response({status: "error", message: "User already exists"});
      }

      sheet.appendRow([
          data.username,
          data.password,
          data.role,
          data.department,
          data.permissions
      ]);
      return response({status: "success"});
  }

  if (action == 'deleteUser') {
      const sheet = ss.getSheetByName("LOGIN");
      if (!sheet) return response({error: "Sheet 'LOGIN' not found"});
      
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const targetUser = data.username.toString().trim().toLowerCase();
      
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString().trim().toLowerCase() === targetUser) {
              sheet.deleteRow(i + 1);
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }

  if (action == 'addAppointment') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet) return response({error: "Sheet 'APPOINTMNET' not found"});
    
    const id = 'appt_' + new Date().getTime();
    
    sheet.appendRow([
      id,              
      data.date,       
      data.clientName, 
      data.contact,    
      data.address,    
      data.note,       
      data.status      
    ]);
    
    return response({status: "success", id: id});
  }

  if (action == 'updateAppointmentStatus') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet) return response({error: "Sheet 'APPOINTMNET' not found"});
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            sheet.getRange(i + 1, 7).setValue(data.status);
            return response({status: "success"});
        }
    }
    return response({error: "Appointment not found"});
  }
  
  return response({error: "Unknown action"});
}

// --- HELPER TO FIND SHEET WITH TYPO TOLERANCE ---
function getPackageSheet(ss) {
    var sheet = ss.getSheetByName("PACKAG PLAN");
    if (!sheet) sheet = ss.getSheetByName("PACKAGE PLAN"); 
    return sheet;
}

function getPackages(ss) {
    const sheet = getPackageSheet(ss);
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    const packages = data.map((row, index) => ({
      id: 'row_' + (index + 2), 
      startDate: formatDate(row[0]),
      clientName: row[1],
      contact: '',
      packageName: row[2],
      totalCost: row[3],
      totalServices: row[4],
      status: row[5] || 'PENDING' 
    }));
    return response(packages);
}

function getEntries(ss) {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    
    // Read 15 columns now (A to O)
    // Use getLastColumn() if dynamic, or fixed 15
    const lastCol = Math.max(15, sheet.getLastColumn());
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
    
    const entries = data.map((row, index) => ({
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
      invoiceUrl: row[13], // Column N
      patchSize: row[14]   // Column O
    }));
    return response(entries.reverse());
}

function getAppointments(ss) {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    const appointments = data.map((row) => ({
      id: row[0],         
      date: formatDate(row[1]), 
      clientName: row[2], 
      contact: row[3],    
      address: row[4],    
      note: row[5],       
      status: row[6] || 'PENDING' 
    }));
    return response(appointments);
}

function getOptions(ss) {
    const clientSheet = ss.getSheetByName("CLIENT MASTER");
    const techSheet = ss.getSheetByName("EMPLOYEE DETAILS");
    const itemSheet = ss.getSheetByName("ITEM MASTER");
    
    let clients = [];
    if (clientSheet && clientSheet.getLastRow() > 1) {
        clients = clientSheet.getRange(2, 1, clientSheet.getLastRow()-1, 6).getValues()
          .filter(r => r[0])
          .map(row => ({
            name: row[0],
            contact: row[1],
            address: row[2],
            gender: row[3],
            email: row[4],
            dob: formatDate(row[5])
          }));
    }

    let technicians = [];
    if (techSheet && techSheet.getLastRow() > 1) {
        technicians = techSheet.getRange(2, 1, techSheet.getLastRow()-1, 2).getValues()
          .filter(r => r[0])
          .map(row => ({ name: row[0], contact: row[1] }));
    }
      
    let items = [];
    if (itemSheet && itemSheet.getLastRow() > 1) {
        items = itemSheet.getRange(2, 1, itemSheet.getLastRow()-1, 3).getValues()
          .filter(r => r[0])
          .map(row => ({ code: row[0], name: row[1], category: row[2] }));
    }

    return response({
      clients: clients,
      technicians: technicians,
      items: items
    });
}

function getUsers(ss) {
    const sheet = ss.getSheetByName("LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    const users = data.map(row => ({
        username: row[0],
        password: row[1],
        role: row[2],
        department: row[3],
        permissions: row[4]
    }));
    return response(users);
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    d.setHours(12); 
    return d.toISOString().split('T')[0];
  } catch (e) {
    return String(date);
  }
}

// --- NEW FUNCTION TO CREATE PDF INVOICE ---
function createInvoicePDF(data) {
  const folderId = "1yNT2OJZ192AmNLF_3xxwCew_h3jCnEP_";
  var folder;
  
  try {
     folder = DriveApp.getFolderById(folderId);
  } catch(e) {
     return "Error: Could not access folder. Please run requestPermissions() in editor. " + e.message;
  }

  // Generate Invoice Number
  var invoiceNo = "INV-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 10000);
  
  // Professional HTML Template
  var html = 
    "<html><body style='font-family: \"Helvetica Neue\", Helvetica, Arial, sans-serif; color: #374151; padding: 40px; line-height: 1.6; background-color: #ffffff;'>" +
      "<div style='max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 40px;'>" +
        
        // Header
        "<div style='text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px;'>" +
          "<h1 style='margin: 0; color: #111827; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;'>MAHAVEER HAIR SOLUTION</h1>" +
          "<p style='margin: 5px 0; font-size: 12px; color: #6b7280;'>" +
             "First Floor, Opp. Ayurvedic College & Anupam Garden, Near Amit Sales, G.E. Road, Raipur<br>" +
             "Mobile: +91-9691699382, +91-9144939828 | Email: info@mahaveerhairsolution.com" +
          "</p>" +
        "</div>" +
        
        // Meta Info
        "<div style='display: flex; justify-content: space-between; background: #f9fafb; padding: 15px; border-radius: 6px; font-size: 13px; margin-bottom: 30px;'>" +
           "<div><strong>Invoice No:</strong> " + invoiceNo + "</div>" +
           "<div><strong>Date:</strong> " + data.date + "</div>" +
           "<div><strong>Branch:</strong> " + data.branch + "</div>" +
        "</div>" +

        // Client Info
        "<div style='margin-bottom: 30px;'>" +
           "<h3 style='font-size: 11px; text-transform: uppercase; color: #9ca3af; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px;'>Billed To</h3>" +
           "<div style='font-size: 16px; font-weight: bold; color: #111;'>" + data.clientName + "</div>" +
           "<div style='font-size: 14px; color: #666;'>" + (data.address || "Address not provided") + "</div>" +
           "<div style='font-size: 14px; color: #666;'>Phone: " + data.contactNo + "</div>" +
        "</div>" +

        // Table
        "<table style='width: 100%; border-collapse: collapse; margin-bottom: 30px;'>" +
          "<tr style='background: #111827; color: #fff; text-transform: uppercase; font-size: 12px;'>" +
             "<th style='padding: 12px; text-align: left;'>Service Description</th>" +
             "<th style='padding: 12px; text-align: center;'>Qty</th>" +
             "<th style='padding: 12px; text-align: right;'>Amount</th>" +
          "</tr>" +
          "<tr>" +
             "<td style='padding: 15px; border-bottom: 1px solid #e5e7eb;'>" + 
                "<strong>" + data.serviceType + " Service</strong><br>" +
                "<span style='font-size: 12px; color: #6b7280;'>Method: " + data.patchMethod + " | Tech: " + data.technician + "</span>" +
                (data.remark ? "<br><span style='font-size: 12px; font-style: italic; color: #6b7280;'>Note: " + data.remark + "</span>" : "") +
             "</td>" +
             "<td style='padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: center;'>1</td>" +
             "<td style='padding: 15px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;'>₹" + data.amount + "</td>" +
          "</tr>" +
        "</table>" +

        // Totals
        "<div style='text-align: right; margin-top: 20px; border-top: 2px solid #111; padding-top: 15px;'>" +
           "<div style='font-size: 20px; font-weight: 800; color: #111;'>Total: ₹" + data.amount + "</div>" +
           "<div style='font-size: 12px; color: #6b7280; margin-top: 5px;'>Paid via " + data.paymentMethod + "</div>" +
        "</div>" +
        
        // Footer
        "<div style='margin-top: 50px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;'>" +
           "<p style='margin:0'>Thank you for your business. Terms & Conditions Apply.</p>" +
           "<p style='margin:5px 0 0 0; opacity: 0.7;'>Copyright © " + new Date().getFullYear() + " Mahaveer Hair Solution | Developed by Deepak Sahu</p>" +
        "</div>" +

      "</div>" +
    "</body></html>";

  // Create Blob and File
  var blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
  blob.setName("INV_" + data.clientName + "_" + data.date + ".pdf");
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

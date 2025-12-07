// COPY THIS CODE INTO YOUR GOOGLE APPS SCRIPT EDITOR
// REMEMBER TO DEPLOY AS "NEW VERSION"

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
        // ID format expected: "row_12" where 12 is the actual spreadsheet row number
        const rowId = parseInt(data.id.split('_')[1]);
        if (isNaN(rowId) || rowId < 2) return response({error: "Invalid Row ID"});

        // Column 6 is F (Status)
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
        
        // Update columns A, C, D, E (Indexes 1, 3, 4, 5)
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
      data.numberOfService
    ]);
    return response({status: "success"});
  }

  if (action == 'updateEntryStatus') {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet) return response({error: "Sheet 'DATA BASE' not found"});
    
    try {
        // ID format: "row_12"
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
    
    // Map with EXACT ROW NUMBER
    // Data starts at Row 2. So Index 0 = Row 2.
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
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
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
      numberOfService: row[12]
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
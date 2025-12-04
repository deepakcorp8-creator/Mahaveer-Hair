// COPY THIS CODE INTO YOUR GOOGLE APPS SCRIPT EDITOR
// (Extensions > Apps Script in your Google Sheet)

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

  // Fallback for appointments if needed, currently empty array
  if (action == 'getAppointments') {
      return response([]);
  }

  return response({error: "Invalid action"});
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action == 'addPackage') {
    const sheet = ss.getSheetByName("PACKAG PLAN");
    if (!sheet) return response({error: "Sheet 'PACKAG PLAN' not found"});
    
    sheet.appendRow([
      data.startDate,
      data.clientName,
      data.packageName,
      data.totalCost,
      data.totalServices
    ]);
    
    return response({status: "success", message: "Package added"});
  }

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
      
      // Check if user already exists
      const users = sheet.getDataRange().getValues();
      const exists = users.some(row => row[0].toString().toLowerCase() === data.username.toLowerCase());
      if (exists) {
          return response({status: "error", message: "User already exists"});
      }

      sheet.appendRow([
          data.username,
          data.password,
          data.role,
          data.department
      ]);
      return response({status: "success"});
  }

  if (action == 'deleteUser') {
      const sheet = ss.getSheetByName("LOGIN");
      if (!sheet) return response({error: "Sheet 'LOGIN' not found"});
      
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString() === data.username) {
              sheet.deleteRow(i + 1); // Row index is 1-based
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }
  
  return response({error: "Unknown action"});
}

// --- Helpers ---

function getEntries(ss) {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);

    // Get all data from Row 2 to Last Row, Columns 1 to 13 (A to M)
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
    
    // Map array to JSON based on your sheet columns
    const entries = data.map((row, index) => ({
      id: 'row_' + (index + 2), // generate a unique ID based on row number
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

    // Return most recent first
    return response(entries.reverse());
}

function getPackages(ss) {
    const sheet = ss.getSheetByName("PACKAG PLAN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    const packages = data.map((row, index) => ({
      id: 'pkg_' + index,
      startDate: formatDate(row[0]),
      clientName: row[1],
      contact: '',
      packageName: row[2],
      totalCost: row[3],
      totalServices: row[4],
      status: 'ACTIVE'
    }));

    return response(packages);
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

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const users = data.map(row => ({
        username: row[0],
        password: row[1],
        role: row[2],
        department: row[3]
    }));
    return response(users);
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!date) return "";
  try {
    // Handle Google Sheet date objects
    const d = new Date(date);
    d.setHours(12); 
    return d.toISOString().split('T')[0];
  } catch (e) {
    return String(date);
  }
}

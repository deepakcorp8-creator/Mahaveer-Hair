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

  if (action == 'getAppointments') {
      return getAppointments(ss);
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

  if (action == 'updateEntryStatus') {
    const sheet = ss.getSheetByName("DATA BASE");
    if (!sheet) return response({error: "Sheet 'DATA BASE' not found"});
    
    // We assume ID is 'row_X' where X is the row number
    try {
        const rowId = parseInt(data.id.split('_')[1]);
        // Work Status is column I (9th column)
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
      
      for (let i = 0; i < values.length; i++) {
          if (values[i][0].toString() === data.username) {
              sheet.deleteRow(i + 1);
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }

  // --- APPOINTMENT ACTIONS (Updated to match APPOINTMNET Sheet) ---
  if (action == 'addAppointment') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet) return response({error: "Sheet 'APPOINTMNET' not found"});
    
    // Generate simple ID based on timestamp
    const id = 'appt_' + new Date().getTime();
    
    // Mapping to Sheet Columns:
    // A: S.No (ID)
    // B: Date
    // C: Name
    // D: Contacts
    // E: Address (User provided)
    // F: Note
    // G: Done (Status)

    sheet.appendRow([
      id,              // S.No
      data.date,       // Date
      data.clientName, // Name
      data.contact,    // Contacts
      data.address,    // Address (From frontend)
      data.note,       // Note
      data.status      // Done (Status: PENDING, CLOSED, etc.)
    ]);
    
    return response({status: "success", id: id});
  }

  if (action == 'updateAppointmentStatus') {
    const sheet = ss.getSheetByName("APPOINTMNET");
    if (!sheet) return response({error: "Sheet 'APPOINTMNET' not found"});
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find row by ID (Column A)
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == data.id) {
            // Update "Done" Column (G -> 7th Column)
            sheet.getRange(i + 1, 7).setValue(data.status);
            return response({status: "success"});
        }
    }
    return response({error: "Appointment not found"});
  }
  
  return response({error: "Unknown action"});
}

// --- Helpers ---

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

    // Fetch up to Column G (7)
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    
    const appointments = data.map((row) => ({
      id: row[0],         // A: S.No
      date: formatDate(row[1]), // B: Date
      clientName: row[2], // C: Name
      contact: row[3],    // D: Contacts
      address: row[4],    // E: Address
      note: row[5],       // F: Note
      status: row[6] || 'PENDING' // G: Done (Status)
    }));
    
    return response(appointments);
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
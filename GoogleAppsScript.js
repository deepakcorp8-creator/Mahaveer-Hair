
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V27 - ENTRY DELETE CAPABILITY)
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

function getSafeLastRow(sheet, colIndex) {
  var column = colIndex || 2; 
  var lastRow = sheet.getMaxRows();
  var values = sheet.getRange(1, column, lastRow).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] && values[i][0].toString().trim() !== "") {
      return i + 1;
    }
  }
  return 1;
}

function createInvoice(data) {
  try {
    const folderName = "MAHAVEER_INVOICES";
    let folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    const date = data.date || new Date().toLocaleDateString();
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; border: 1px solid #eee;">
        <h1 style="color: #B51A2B; text-align: center;">MAHAVEER HAIR SOLUTION</h1>
        <p style="text-align: center; font-size: 12px; color: #666;">Official Service Invoice</p>
        <hr/>
        <table style="width: 100%; margin-top: 20px;">
          <tr>
            <td><strong>Client:</strong> ${data.clientName}</td>
            <td style="text-align: right;"><strong>Date:</strong> ${date}</td>
          </tr>
          <tr>
            <td><strong>Contact:</strong> ${data.contactNo}</td>
            <td style="text-align: right;"><strong>Branch:</strong> ${data.branch}</td>
          </tr>
        </table>
        <table style="width: 100%; margin-top: 30px; border-collapse: collapse;">
          <tr style="background: #f8f8f8;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Description</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Amount</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${data.serviceType} (${data.patchMethod})</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${data.amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>Total Paid</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>₹${data.amount - (data.pendingAmount || 0)}</strong></td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: red;"><strong>Pending</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: red;"><strong>₹${data.pendingAmount || 0}</strong></td>
          </tr>
        </table>
        <p style="margin-top: 50px; font-size: 10px; color: #888; text-align: center;">This is a system-generated invoice. No signature required.</p>
      </div>
    `;
    
    const blob = Utilities.newBlob(html, 'text/html', `Invoice_${data.clientName}_${Date.now()}.html`);
    const pdf = folder.createFile(blob.getAs('application/pdf'));
    pdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return "https://drive.google.com/uc?export=view&id=" + pdf.getId();
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

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

  if (action == 'editEntry') {
      const dbSheet = getSheet(ss, "DATA BASE");
      try {
          const rowId = parseInt(data.id.split('_')[1]);
          if (rowId > 1) {
              const updatedRow = [toSheetDate(data.date), data.clientName, data.contactNo, data.address, data.branch, data.serviceType, data.patchMethod, data.technician, data.workStatus, data.amount, data.paymentMethod, String(data.remark || ""), data.numberOfService, data.invoiceUrl || "", data.patchSize || '', data.pendingAmount || 0];
              dbSheet.getRange(rowId, 1, 1, updatedRow.length).setValues([updatedRow]);
              return response({status: "success"});
          }
      } catch(e) { return response({error: e.message}); }
  }

  if (action == 'deleteEntry') {
      const dbSheet = getSheet(ss, "DATA BASE");
      try {
          const rowId = parseInt(data.id.split('_')[1]);
          if (rowId > 1) {
              dbSheet.deleteRow(rowId);
              return response({status: "success"});
          }
      } catch(e) { return response({error: e.message}); }
  }

  if (action == 'addClient') {
    const clientSheet = getSheet(ss, "CLIENT MASTER");
    const clientRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
    const nextCl = getSafeLastRow(clientSheet, 1) + 1;
    clientSheet.getRange(nextCl, 1, 1, clientRow.length).setValues([clientRow]);
    clientSheet.getRange(nextCl, 6).setNumberFormat("dd/mm/yyyy");
    return response({status: "success"});
  }

  if (action == 'editClient') {
      const clientSheet = getSheet(ss, "CLIENT MASTER");
      const clients = clientSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < clients.length; i++) {
          if (clients[i][0] == data.originalName) {
              rowIndex = i + 1;
              break;
          }
      }
      if (rowIndex !== -1) {
          const updatedRow = [data.name, data.contact, data.address, data.gender, data.email, toSheetDate(data.dob)];
          clientSheet.getRange(rowIndex, 1, 1, 6).setValues([updatedRow]);
          clientSheet.getRange(rowIndex, 6).setNumberFormat("dd/mm/yyyy");
          return response({status: "success"});
      }
      return response({error: "Client not found"});
  }

  if (action == 'updatePaymentFollowUp') {
      const dbSheet = getSheet(ss, "DATA BASE");
      const collectionSheet = getSheet(ss, "PAYMENT COLLECTION");
      try {
          const rowId = parseInt(data.id.split('_')[1]);
          if (rowId > 0 && rowId <= dbSheet.getMaxRows()) {
              var screenshotUrl = data.existingScreenshotUrl || "";
              if (data.screenshotBase64 && data.screenshotBase64.indexOf('data:image') === 0) {
                  var splitData = data.screenshotBase64.split('base64,');
                  var contentType = splitData[0].split(':')[1].split(';')[0];
                  var blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, "pay_" + data.clientName + "_" + new Date().getTime());
                  var file = DriveApp.createFile(blob);
                  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                  screenshotUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
              }
              dbSheet.getRange(rowId, 16).setValue(data.pendingAmount);
              dbSheet.getRange(rowId, 11).setValue(data.paymentMethod);
              dbSheet.getRange(rowId, 12).setValue(String(data.remark || ""));
              
              const today = getTodayInSheetFormat();
              const nextCall = toSheetDate(data.nextCallDate);
              const collectionRow = [data.id, today, data.clientName, data.contactNo || '', data.address || '', data.pendingAmount || 0, Number(data.paidAmount || 0), screenshotUrl, String(data.remark || ""), nextCall || '', new Date().toString()];

              const nextC = getSafeLastRow(collectionSheet, 3) + 1;
              collectionSheet.getRange(nextC, 1, 1, collectionRow.length).setValues([collectionRow]);
              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
  }

  return response({error: "Action processed"});
}

function toSheetDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr === "") return "";
  if (dateStr.includes('/') && dateStr.split('/').length === 3) return dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-'); 
    if (parts.length === 3 && parts[0].length === 4) return parts[2] + "/" + parts[1] + "/" + parts[0];
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

function getTodayInSheetFormat() {
  const d = new Date();
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}

function getEntries(ss) {
    const sheet = getSheet(ss, "DATA BASE");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();
    return response(data.map((row, index) => ({
        id: 'row_' + (index + 2), 
        date: fromSheetDate(row[0]), 
        clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: Number(row[9] || 0), paymentMethod: row[10], remark: String(row[11] || ""), numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: Number(row[15] || 0)
    })).reverse().filter(e => e.clientName));
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

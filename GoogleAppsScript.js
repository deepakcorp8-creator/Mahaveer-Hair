
// =====================================================================================
// ⚠️ MAHAVEER WEB APP - BACKEND SCRIPT (V18 - Matches Professional Image Format)
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

  // --- PROFESSIONAL INVOICE GENERATOR (MATCHES IMAGE) ---
  function createInvoice(data) {
    const docName = "Invoice_" + data.clientName + "_" + data.date;
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();
    body.clear();
    body.setMarginTop(30);
    body.setMarginBottom(30);
    body.setMarginLeft(40);
    body.setMarginRight(40);
    
    const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";
    const invoiceNo = "INV-2025-" + Math.floor(1000 + Math.random() * 9000);
    
    // 1. Logo
    try {
      const resp = UrlFetchApp.fetch(LOGO_URL);
      const logo = body.insertImage(0, resp.getBlob());
      logo.setWidth(200);
      logo.setHeight(60);
      const imgPara = body.getChild(0).asParagraph();
      imgPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    } catch(e) {}
    
    // 2. Address Header
    let branchAddr = "2nd Floor Rais Reality, front Anupam garden, GE Road Raipur Chhattisgarh";
    let branchContact = "+91-9144939828";
    if (data.branch === 'JDP') {
      branchAddr = "Varghese Wings, Near Vishal Mega Mart Dharampura, Jagdalpur, Chhattisgarh";
      branchContact = "09725567348";
    }
    
    const headerPara = body.appendParagraph(branchAddr + "\nContact: " + branchContact + " | Email: info@mahaveerhairsolution.com");
    headerPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    headerPara.setFontSize(9);
    headerPara.setForegroundColor('#666666');
    
    body.appendHorizontalRule();
    
    // 3. Meta Row (Invoice #, Date, Branch)
    const metaTable = body.appendTable([
      ["INVOICE NUMBER", "DATE ISSUED", "BRANCH CODE"],
      [invoiceNo, data.date, data.branch || "RPR"]
    ]);
    metaTable.setBorderWidth(0);
    metaTable.getRow(0).setAttributes({[DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 8, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#888888'});
    metaTable.getRow(1).setAttributes({[DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 10});
    metaTable.setColumnWidth(0, 150);
    metaTable.setColumnWidth(1, 150);
    
    body.appendParagraph("\n");
    
    // 4. Detail Boxes (Bill To vs Service Info)
    const detailTable = body.appendTable([
      ["BILL TO", "SERVICE INFO"],
      [
        data.clientName.toUpperCase() + "\n" + (data.address || "RAIPUR") + "\nPh: " + data.contactNo,
        "SERVICE Application\nTechnician: " + (data.technician || "N/A").toUpperCase() + "\nMethod: " + (data.patchMethod || "TAPING")
      ]
    ]);
    detailTable.setBorderWidth(1);
    detailTable.setBorderColor('#dddddd');
    
    const labelRow = detailTable.getRow(0);
    labelRow.setAttributes({[DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.BACKGROUND_COLOR]: '#ffffff', [DocumentApp.Attribute.FONT_SIZE]: 8, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#444444'});
    
    const contentRow = detailTable.getRow(1);
    contentRow.setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 10, [DocumentApp.Attribute.BOLD]: true});
    
    body.appendParagraph("\n");
    
    // 5. Main Item Table
    const itemTable = body.appendTable([
      ["DESCRIPTION", "QTY", "PRICE", "TOTAL"],
      ["SERVICE " + data.serviceType, "1", "₹" + data.amount, "₹" + data.amount]
    ]);
    
    const itemHeader = itemTable.getRow(0);
    itemHeader.setAttributes({
      [DocumentApp.Attribute.BOLD]: true,
      [DocumentApp.Attribute.BACKGROUND_COLOR]: '#333333',
      [DocumentApp.Attribute.FOREGROUND_COLOR]: '#ffffff',
      [DocumentApp.Attribute.FONT_SIZE]: 9
    });
    
    const itemData = itemTable.getRow(1);
    itemData.setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 10});
    itemTable.setColumnWidth(0, 250);
    
    body.appendParagraph("\n");
    
    // 6. Totals Section
    const paidAmount = Number(data.amount) - (Number(data.pendingAmount) || 0);
    const totalTable = body.appendTable([
      ["Subtotal", "₹" + data.amount],
      ["Pending Amount", "₹" + (data.pendingAmount || 0)],
      ["Payment Mode", data.paymentMethod],
      ["Total Paid", "₹" + paidAmount]
    ]);
    totalTable.setBorderWidth(0);
    totalTable.setColumnWidth(0, 350);
    
    for (let r=0; r<4; r++) {
      totalTable.getRow(r).getCell(0).setAttributes({[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.RIGHT, [DocumentApp.Attribute.FONT_SIZE]: 9, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#666666'});
      totalTable.getRow(r).getCell(1).setAttributes({[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.RIGHT, [DocumentApp.Attribute.FONT_SIZE]: 10, [DocumentApp.Attribute.BOLD]: true});
    }
    
    const finalRow = totalTable.getRow(3);
    finalRow.getCell(0).setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 12, [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000'});
    finalRow.getCell(1).setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 14, [DocumentApp.Attribute.BOLD]: true});
    
    // 7. Footer
    body.appendParagraph("\n\n\n");
    body.appendHorizontalRule();
    
    const footerTable = body.appendTable([
      [
        "TERMS & CONDITIONS\n• Goods once sold will not be returned.\n• Subject to Raipur Jurisdiction only.\n• Interest @ 24% p.a. will be charged if bill is not paid.\n• E. & O.E.",
        "FOR, MAHAVEER HAIR SOLUTION\n\n\nSYSTEM GENERATED INVOICE\nNo physical signature required"
      ]
    ]);
    footerTable.setBorderWidth(0);
    footerTable.getCell(0).setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 7, [DocumentApp.Attribute.FOREGROUND_COLOR]: '#888888'});
    footerTable.getCell(1).setAttributes({[DocumentApp.Attribute.FONT_SIZE]: 8, [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.RIGHT});
    
    doc.saveAndClose();
    const file = DriveApp.getFileById(doc.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return doc.getUrl();
  }

  // --- OTHER ACTIONS ---
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
              collectionSheet.appendRow([data.id, new Date().toLocaleDateString(), data.clientName, data.contactNo || '', data.address || '', data.pendingAmount || 0, Number(data.paidAmount || 0), screenshotUrl, data.remark || '', data.nextCallDate || '', new Date().toString()]);
              return response({status: "success", screenshotUrl: screenshotUrl});
          }
      } catch(e) { return response({error: e.message}); }
  }

  if (action == 'editEntry') {
    const dbSheet = getSheet(ss, "DATA BASE");
    try {
        const rowId = parseInt(data.id.split('_')[1]);
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
              loginSheet.getRange(i + 1, 8).setValue(data.dob || "");
              loginSheet.getRange(i + 1, 9).setValue(data.address || "");
              return response({status: "success"});
          }
      }
      return response({error: "User not found"});
  }

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
      if ((pendingAmount === "" || pendingAmount === null || pendingAmount === undefined) && payMethod === "PENDING") {
          pendingAmount = totalBill;
      } else {
          pendingAmount = Number(pendingAmount || 0);
      }

      return {
        id: 'row_' + (index + 2), date: formatDate(row[0]), clientName: row[1], contactNo: row[2], address: row[3], branch: row[4], serviceType: row[5], patchMethod: row[6], technician: row[7], workStatus: row[8], amount: totalBill, paymentMethod: payMethod, remark: row[11], numberOfService: row[12], invoiceUrl: row[13], patchSize: row[14], pendingAmount: pendingAmount
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
      id: 'row_' + (index + 2), startDate: formatDate(row[0]), clientName: row[1], packageName: row[2], totalCost: row[3], totalServices: row[4], status: row[5] || 'PENDING' 
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

function getUsers(ss) {
    const sheet = getSheet(ss, "LOGIN");
    if (!sheet || sheet.getLastRow() <= 1) return response([]);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    return response(data.map(row => ({ username: row[0], password: row[1], role: row[2], department: row[3], permissions: row[4], dpUrl: row[5], gender: row[6], dob: row[7], address: row[8] })));
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

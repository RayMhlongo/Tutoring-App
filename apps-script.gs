// Data Insights by Ray - Google Apps Script Sync API
// Deploy as Web App: Execute as "Me", Who has access: "Anyone"

var TABLE_SHEETS = {
  students: "Students",
  tutors: "Tutors",
  lessons: "Lessons",
  assignments: "Assignments",
  attendance: "Attendance",
  payments: "Payments",
  schedule: "Schedule",
  expenses: "Expenses",
  messages: "Messages",
  notifications: "Notifications",
  performanceMetrics: "PerformanceMetrics",
  businessMetrics: "BusinessMetrics",
  reports: "Reports"
};

var ROW_HEADERS = ["id", "tenantId", "accountId", "createdAt", "updatedAt", "deleted", "payload"];
var SYNC_HEADERS = ["changeId", "tenantId", "accountId", "table", "recordId", "timestamp", "status"];

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    var action = (e.parameter && e.parameter.action) || "";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return json({ ok: true, time: new Date().toISOString() });
    }

    if (action === "syncChange") {
      var changeId = text(e.parameter.changeId);
      var tenantId = text(e.parameter.tenantId);
      var accountId = text(e.parameter.accountId);
      var table = text(e.parameter.table);
      var recordId = text(e.parameter.recordId);
      var op = text(e.parameter.op) || "upsert";
      var payloadObj = parseJSON(e.parameter.payload, {});
      return json(handleSyncChange(ss, {
        changeId: changeId,
        tenantId: tenantId,
        accountId: accountId,
        table: table,
        recordId: recordId,
        op: op,
        payload: payloadObj
      }));
    }

    if (action === "getAll") {
      var snapshot = buildSnapshot(ss, text(e.parameter.accountId), text(e.parameter.tenantId));
      return json({ ok: true, data: snapshot });
    }

    if (action === "exportSnapshot") {
      var targetAccountId = text(e.parameter.accountId);
      var targetTenantId = text(e.parameter.tenantId);
      var payload = parseJSON(e.parameter.payload, {});
      exportSnapshot(ss, targetAccountId, targetTenantId, payload);
      return json({ ok: true, exportedAt: new Date().toISOString() });
    }

    if (action === "saveQr") {
      var qrTenant = text(e.parameter.tenantId);
      var qrStudentId = text(e.parameter.studentId);
      var qrData = text(e.parameter.dataUrl);
      if (!qrTenant || !qrStudentId || !qrData) {
        return json({ ok: false, error: "Missing tenantId, studentId or dataUrl." });
      }
      var file = saveQrToDrive(qrTenant, qrStudentId, qrData);
      return json({ ok: true, fileId: file.getId(), fileName: file.getName() });
    }

    return json({ ok: false, error: "Unknown action." });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function handleSyncChange(ss, change) {
  if (!change.changeId || !change.accountId || !change.table || !change.recordId) {
    return { ok: false, error: "Invalid sync payload." };
  }
  change.tenantId = change.tenantId || text(change.payload && change.payload.tenantId) || change.accountId;

  var syncSheet = ensureSheet(ss, "SyncLog", SYNC_HEADERS);
  var syncRows = syncSheet.getDataRange().getValues();
  for (var i = 1; i < syncRows.length; i++) {
    if (String(syncRows[i][0]) === String(change.changeId)) {
      return { ok: true, deduped: true };
    }
  }

  upsertRecord(ss, change.table, change.tenantId, change.accountId, change.recordId, change.payload, change.op);
  syncSheet.appendRow([
    change.changeId,
    change.tenantId,
    change.accountId,
    change.table,
    change.recordId,
    new Date().toISOString(),
    "ok"
  ]);
  return { ok: true };
}

function upsertRecord(ss, table, tenantId, accountId, recordId, payloadObj, op) {
  var sheetName = TABLE_SHEETS[table];
  if (!sheetName) {
    throw new Error("Unsupported table: " + table);
  }
  var sheet = ensureSheet(ss, sheetName, ROW_HEADERS);
  var rows = sheet.getDataRange().getValues();
  var rowValues = [
    recordId,
    tenantId || accountId,
    accountId,
    text(payloadObj.createdAt),
    text(payloadObj.updatedAt) || new Date().toISOString(),
    op === "delete" ? "true" : boolToString(payloadObj.deleted),
    JSON.stringify(payloadObj)
  ];

  var foundRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (
      String(rows[i][0]) === String(recordId) &&
      String(rows[i][1]) === String(tenantId || accountId) &&
      String(rows[i][2]) === String(accountId)
    ) {
      foundRow = i + 1;
      break;
    }
  }
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, ROW_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function buildSnapshot(ss, accountId, tenantId) {
  var output = {};
  var tableNames = Object.keys(TABLE_SHEETS);
  for (var i = 0; i < tableNames.length; i++) {
    var table = tableNames[i];
    var sheet = ensureSheet(ss, TABLE_SHEETS[table], ROW_HEADERS);
    var rows = sheet.getDataRange().getValues();
    var parsed = [];
    for (var r = 1; r < rows.length; r++) {
      var rowTenant = text(rows[r][1]);
      var rowAccount = text(rows[r][2]);
      if (accountId && rowAccount !== accountId) continue;
      if (tenantId && rowTenant !== tenantId) continue;
      var deletedFlag = String(rows[r][5]).toLowerCase() === "true";
      if (deletedFlag) continue;
      var payloadObj = parseJSON(rows[r][6], {});
      parsed.push(payloadObj);
    }
    output[table] = parsed;
  }
  return output;
}

function exportSnapshot(ss, accountId, tenantId, snapshot) {
  var tableNames = Object.keys(TABLE_SHEETS);
  for (var i = 0; i < tableNames.length; i++) {
    var table = tableNames[i];
    var sheet = ensureSheet(ss, TABLE_SHEETS[table], ROW_HEADERS);
    clearTenantAccountRows(sheet, accountId, tenantId);

    var rows = snapshot[table];
    if (!rows || !rows.length) continue;
    for (var r = 0; r < rows.length; r++) {
      var record = rows[r];
      sheet.appendRow([
        text(record.id),
        text(record.tenantId || tenantId || accountId),
        accountId,
        text(record.createdAt),
        text(record.updatedAt) || new Date().toISOString(),
        boolToString(record.deleted),
        JSON.stringify(record)
      ]);
    }
  }
}

function clearTenantAccountRows(sheet, accountId, tenantId) {
  if (!accountId) return;
  var rows = sheet.getDataRange().getValues();
  var keep = [ROW_HEADERS];
  for (var i = 1; i < rows.length; i++) {
    var rowTenant = String(rows[i][1]);
    var rowAccount = String(rows[i][2]);
    if (rowAccount !== String(accountId) || (tenantId && rowTenant !== String(tenantId))) {
      keep.push(rows[i]);
    }
  }
  sheet.clearContents();
  sheet.getRange(1, 1, keep.length, ROW_HEADERS.length).setValues(keep);
}

function ensureSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var headerRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (String(headerRow[0]) !== String(headers[0])) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function ensureFolder(parent, name) {
  var found = parent.getFoldersByName(name);
  if (found.hasNext()) return found.next();
  return parent.createFolder(name);
}

function saveQrToDrive(tenantId, studentId, dataUrl) {
  var parts = String(dataUrl).split(",");
  if (parts.length < 2) {
    throw new Error("Invalid QR data URL.");
  }
  var mimeMatch = parts[0].match(/data:(.*?);base64/);
  var mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  var bytes = Utilities.base64Decode(parts[1]);
  var blob = Utilities.newBlob(bytes, mimeType, tenantId + "-" + studentId + "-qr.png");
  var root = ensureFolder(DriveApp.getRootFolder(), "DataInsightsByRay");
  var tenantsFolder = ensureFolder(root, "Tenants");
  var tenantFolder = ensureFolder(tenantsFolder, tenantId);
  var qrFolder = ensureFolder(tenantFolder, "QRcodes");
  return qrFolder.createFile(blob);
}

function parseJSON(raw, fallback) {
  try {
    return JSON.parse(raw || "");
  } catch (err) {
    return fallback;
  }
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function boolToString(value) {
  return value === true || String(value).toLowerCase() === "true" ? "true" : "false";
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

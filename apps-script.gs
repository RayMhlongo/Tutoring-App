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
var TENANT_HEADERS = ["tenantId", "tenantName", "adminEmail", "plan", "status", "driveFolderId", "sheetId", "createdAt", "updatedAt"];

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

    if (action === "onboardTenant") {
      var tenantName = text(e.parameter.tenantName);
      var adminEmail = text(e.parameter.adminEmail);
      var plan = text(e.parameter.plan) || "starter";
      var onboarded = onboardTenant(ss, tenantName, adminEmail, plan);
      return json({ ok: true, tenant: onboarded, endpoint: ScriptApp.getService().getUrl() });
    }

    if (action === "listTenants") {
      return json({ ok: true, tenants: listTenants(ss) });
    }

    if (action === "updateTenantStatus") {
      var tenantId = text(e.parameter.tenantId);
      var status = text(e.parameter.status) || "active";
      if (!tenantId) return json({ ok: false, error: "tenantId is required." });
      return json(updateTenantStatus(ss, tenantId, status));
    }

    if (action === "createStripeCheckout") {
      var stripeTenant = text(e.parameter.tenantId);
      var stripePlan = text(e.parameter.plan) || "starter";
      var stripeEmail = text(e.parameter.email);
      var stripePriceId = text(e.parameter.priceId);
      var checkout = createStripeCheckout(stripeTenant, stripePlan, stripeEmail, stripePriceId);
      return json({ ok: true, url: checkout.url, sessionId: checkout.id });
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

function slugify(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function generateTenantId(tenantName) {
  var slug = slugify(tenantName) || "tenant";
  var suffix = Utilities.getUuid().slice(0, 6);
  return slug + "-" + suffix;
}

function ensureTenantRegistrySheet(ss) {
  return ensureSheet(ss, "Tenants", TENANT_HEADERS);
}

function listTenants(ss) {
  var sheet = ensureTenantRegistrySheet(ss);
  var rows = sheet.getDataRange().getValues();
  var output = [];
  for (var i = 1; i < rows.length; i++) {
    output.push({
      tenantId: text(rows[i][0]),
      tenantName: text(rows[i][1]),
      adminEmail: text(rows[i][2]),
      plan: text(rows[i][3]),
      status: text(rows[i][4]) || "active",
      driveFolderId: text(rows[i][5]),
      sheetId: text(rows[i][6]),
      createdAt: text(rows[i][7]),
      updatedAt: text(rows[i][8])
    });
  }
  return output;
}

function updateTenantStatus(ss, tenantId, status) {
  var sheet = ensureTenantRegistrySheet(ss);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(tenantId)) {
      sheet.getRange(i + 1, 5).setValue(status);
      sheet.getRange(i + 1, 9).setValue(new Date().toISOString());
      return { ok: true, tenantId: tenantId, status: status };
    }
  }
  return { ok: false, error: "Tenant not found." };
}

function initializeTenantSpreadsheet(tenantName) {
  var file = SpreadsheetApp.create(tenantName + " - EduPulseDB");
  var tenantSheet = file.getSheets()[0];
  tenantSheet.setName("Students");
  tenantSheet.getRange(1, 1, 1, ROW_HEADERS.length).setValues([ROW_HEADERS]);
  var names = ["Tutors", "Attendance", "Payments"];
  for (var i = 0; i < names.length; i++) {
    var sh = file.insertSheet(names[i]);
    sh.getRange(1, 1, 1, ROW_HEADERS.length).setValues([ROW_HEADERS]);
  }
  return file.getId();
}

function onboardTenant(ss, tenantName, adminEmail, plan) {
  if (!tenantName) throw new Error("tenantName is required.");
  if (!adminEmail) throw new Error("adminEmail is required.");

  var tenantId = generateTenantId(tenantName);
  var root = ensureFolder(DriveApp.getRootFolder(), "DataInsightsByRay");
  var tenantsFolder = ensureFolder(root, "Tenants");
  var tenantFolder = ensureFolder(tenantsFolder, tenantId);
  ensureFolder(tenantFolder, "Students");
  ensureFolder(tenantFolder, "Assignments");
  ensureFolder(tenantFolder, "QRcodes");
  ensureFolder(tenantFolder, "Reports");

  var sheetId = initializeTenantSpreadsheet(tenantName);
  var now = new Date().toISOString();
  var registry = ensureTenantRegistrySheet(ss);
  registry.appendRow([tenantId, tenantName, adminEmail, plan || "starter", "active", tenantFolder.getId(), sheetId, now, now]);

  return {
    tenantId: tenantId,
    tenantName: tenantName,
    adminEmail: adminEmail,
    plan: plan || "starter",
    status: "active",
    driveFolderId: tenantFolder.getId(),
    sheetId: sheetId
  };
}

function createStripeCheckout(tenantId, plan, email, priceId) {
  var props = PropertiesService.getScriptProperties();
  var secretKey = text(props.getProperty("STRIPE_SECRET_KEY"));
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY script property is missing.");
  }
  var resolvedPriceId = priceId || text(props.getProperty("STRIPE_PRICE_" + String(plan || "starter").toUpperCase()));
  if (!resolvedPriceId) {
    throw new Error("Stripe price ID is missing for selected plan.");
  }

  var successUrl = text(props.getProperty("STRIPE_SUCCESS_URL")) || "https://example.com/success";
  var cancelUrl = text(props.getProperty("STRIPE_CANCEL_URL")) || "https://example.com/cancel";

  var payload = {
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: email,
    "line_items[0][price]": resolvedPriceId,
    "line_items[0][quantity]": "1",
    "metadata[tenantId]": tenantId,
    "metadata[plan]": plan || "starter"
  };

  var form = [];
  var keys = Object.keys(payload);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    form.push(encodeURIComponent(key) + "=" + encodeURIComponent(text(payload[key])));
  }

  var response = UrlFetchApp.fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "post",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + secretKey,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    payload: form.join("&")
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error("Stripe checkout creation failed: " + response.getContentText());
  }

  return parseJSON(response.getContentText(), {});
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

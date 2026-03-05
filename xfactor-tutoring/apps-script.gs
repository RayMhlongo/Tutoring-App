// ═══════════════════════════════════════════════════
// X-FACTOR TUTORING — Google Apps Script Backend
// ═══════════════════════════════════════════════════
// DEPLOY: Extensions → Apps Script → New Deployment
// Type: Web App | Execute as: Me | Access: Anyone
// ═══════════════════════════════════════════════════

function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  var result = {};

  try {
    if (action === 'getAll') {
      result = {
        students  : sheetJSON(ss.getSheetByName('Students')),
        lessons   : sheetJSON(ss.getSheetByName('Lessons')),
        marks     : sheetJSON(ss.getSheetByName('Marks')),
        payments  : sheetJSON(ss.getSheetByName('Payments')),
        expenses  : sheetJSON(ss.getSheetByName('Expenses')),
        comms     : sheetJSON(ss.getSheetByName('Comms'))
      };
    }
    if (action === 'addStudent' || action === 'updateStudent') {
      var d = JSON.parse(e.parameter.data);
      var sheet = ss.getSheetByName('Students');
      if (action === 'updateStudent') {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === String(d.id)) {
            sheet.getRange(i+1,1,1,13).setValues([[d.id,d.name,d.grade,d.school,d.service,d.subjects,d.days,d.status,d.parent,d.phone,d.email,d.start,d.notes]]);
            result = {success:true}; break;
          }
        }
      } else {
        sheet.appendRow([d.id,d.name,d.grade,d.school,d.service,d.subjects,d.days,d.status,d.parent,d.phone,d.email,d.start,d.notes]);
        result = {success:true};
      }
    }
    if (action === 'addLesson') {
      var d = JSON.parse(e.parameter.data);
      ss.getSheetByName('Lessons').appendRow([d.id,d.date,d.studentId,d.studentName,d.grade,d.attendance,d.subject,d.hours,d.topics,d.hwSet,d.hwDone,d.notes]);
      result = {success:true};
    }
    if (action === 'addMark') {
      var d = JSON.parse(e.parameter.data);
      ss.getSheetByName('Marks').appendRow([d.id,d.date,d.studentId,d.studentName,d.grade,d.subject,d.term,d.type,d.mark,d.symbol,d.flag,d.notes]);
      result = {success:true};
    }
    if (action === 'addPayment' || action === 'updatePayment') {
      var d = JSON.parse(e.parameter.data);
      var sheet = ss.getSheetByName('Payments');
      if (action === 'updatePayment') {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]) === String(d.id)) {
            sheet.getRange(i+1,1,1,10).setValues([[d.id,d.invoiceNo,d.studentId,d.studentName,d.amount,d.paid,d.date,d.method,d.status,d.month]]);
            result = {success:true}; break;
          }
        }
      } else {
        sheet.appendRow([d.id,d.invoiceNo,d.studentId,d.studentName,d.amount,d.paid,d.date,d.method,d.status,d.month,d.notes]);
        result = {success:true};
      }
    }
    if (action === 'addExpense') {
      var d = JSON.parse(e.parameter.data);
      ss.getSheetByName('Expenses').appendRow([d.id,d.date,d.month,d.amount,d.category,d.desc,d.receipt,d.notes]);
      result = {success:true};
    }
    if (action === 'addComm') {
      var d = JSON.parse(e.parameter.data);
      ss.getSheetByName('Comms').appendRow([d.id,d.date,d.studentId,d.studentName,d.parent,d.method,d.topic,d.summary,d.followupRequired,d.followupDate,d.done]);
      result = {success:true};
    }
  } catch(err) {
    result = {success:false, error:err.toString()};
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function sheetJSON(sheet) {
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var hdrs = rows[0].map(function(h){return String(h).trim();});
  return rows.slice(1).filter(function(r){return r.some(function(c){return c!=='';});}).map(function(r){
    var o={};
    hdrs.forEach(function(h,i){o[h]=r[i];});
    return o;
  });
}

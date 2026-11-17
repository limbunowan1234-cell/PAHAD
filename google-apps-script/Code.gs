/**
 * PAHAD website → Google Sheets / Drive bridge.
 *
 * Install this in the organisation account (pahad.org@gmail.com) so the Sheet and
 * every receipt file are owned by PAHAD, not by any one person. See README.md.
 *
 * The website only ever APPENDS rows. Existing rows are never changed or deleted.
 */

var SHEET_NAME = 'PAHAD Finance Records';
var TABS = {
  'Ledger': ['Entry ID', 'Date', 'Type', 'Amount (Rs)', 'Description', 'Submitted by', 'Status', 'Receipt', 'Recorded by', 'Recorded at'],
  'Approvals': ['Entry ID', 'Decision', 'By', 'Role', 'When', 'Note'],
  'Access changes': ['When', 'Changed by', 'Their role', 'For', 'Their level', 'From', 'To'],
  'Exports': ['When', 'Exported by', 'Role', 'What', 'Approved by'],
};

/** Run this once from the editor (Run ▶ setup). It creates the Sheet and prints the secret. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create(SHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(TABS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, TABS[name].length).setFontWeight('bold');
    }
  });
  var first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid().slice(0, 8));
  Logger.log('Sheet: ' + ss.getUrl());
  Logger.log('GOOGLE_SCRIPT_SECRET = ' + props.getProperty('SECRET'));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Bad request' });
  }
  var props = PropertiesService.getScriptProperties();
  if (!body || body.secret !== props.getProperty('SECRET')) return json({ ok: false, error: 'Not authorised' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'append') {
      if (!TABS.hasOwnProperty(body.sheet)) return json({ ok: false, error: 'Unknown tab' });
      var ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
      ss.getSheetByName(body.sheet).appendRow(body.row);
      return json({ ok: true });
    }
    if (body.action === 'upload') {
      var folder = DriveApp.getRootFolder();
      (body.path || []).forEach(function (name) {
        var it = folder.getFoldersByName(String(name));
        folder = it.hasNext() ? it.next() : folder.createFolder(String(name));
      });
      var blob = Utilities.newBlob(Utilities.base64Decode(body.base64), body.mimeType, body.name);
      var file = folder.createFile(blob); // private: only people the organisation shares the folder with can open it
      return json({ ok: true, id: file.getId(), url: file.getUrl() });
    }
    if (body.action === 'email') {
      // Password reset links and similar messages, sent from this Google account.
      var to = String(body.to || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ ok: false, error: 'Bad address' });
      MailApp.sendEmail({ to: to, subject: String(body.subject || '').slice(0, 200), body: String(body.body || '').slice(0, 5000), name: 'PAHAD' });
      return json({ ok: true });
    }
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

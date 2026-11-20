/**
 * PAHAD website → Google Sheets / Drive bridge.
 *
 * Install this in the organisation account (pahad.org@gmail.com) so every Sheet
 * and file is owned by PAHAD, not by any one person. See README.md.
 *
 * Two spreadsheets are created by setup():
 *  - "PAHAD Finance Records"  (private: ledger, approvals, access changes, exports)
 *  - "PAHAD Website Records"  (membership applications and website messages)
 * The website only ever APPENDS rows. Existing rows are never changed or deleted.
 */

var SHEETS = {
  finance: {
    name: 'PAHAD Finance Records',
    tabs: {
      'Ledger': ['Entry ID', 'Date', 'Type', 'Amount (Rs)', 'Description', 'Submitted by', 'Status', 'Receipt', 'Recorded by', 'Recorded at'],
      'Approvals': ['Entry ID', 'Decision', 'By', 'Role', 'When', 'Note'],
      'Access changes': ['When', 'Changed by', 'Their role', 'For', 'Their level', 'From', 'To'],
      'Exports': ['When', 'Exported by', 'Role', 'What', 'Approved by'],
    },
  },
  records: {
    name: 'PAHAD Website Records',
    tabs: {
      'Membership applications': ['Received', 'Name', 'Email', 'Phone', 'Town / area', 'Address', 'Occupation', 'Category', 'Interests', 'Why join', 'GP / Ward', 'Former DSSCOLONY'],
      'Messages': ['Received', 'Type', 'Name', 'Email', 'Phone', 'Organisation', 'Message'],
    },
  },
};

/** Run this once from the editor (Run ▶ setup). It creates the Sheets and prints the secret. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(SHEETS).forEach(function (key) {
    var def = SHEETS[key];
    var prop = key === 'finance' ? 'SHEET_ID' : 'RECORDS_SHEET_ID';
    var id = props.getProperty(prop);
    var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create(def.name);
    props.setProperty(prop, ss.getId());
    Object.keys(def.tabs).forEach(function (name) {
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);
      if (sh.getLastRow() === 0) {
        sh.appendRow(def.tabs[name]);
        sh.setFrozenRows(1);
        sh.getRange(1, 1, 1, def.tabs[name].length).setFontWeight('bold');
      } else {
        // Columns added later (always at the end): fill in their headings. Only empty header cells are written.
        var headers = def.tabs[name];
        var row = sh.getRange(1, 1, 1, headers.length).getValues()[0];
        headers.forEach(function (h, i) {
          if (!row[i]) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold');
        });
      }
    });
    var first = ss.getSheetByName('Sheet1');
    if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
    Logger.log(def.name + ': ' + ss.getUrl());
  });
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid().slice(0, 8));
  Logger.log('GOOGLE_SCRIPT_SECRET = ' + props.getProperty('SECRET'));
}

function sheetFor(tab) {
  var props = PropertiesService.getScriptProperties();
  if (SHEETS.finance.tabs.hasOwnProperty(tab)) return SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName(tab);
  if (SHEETS.records.tabs.hasOwnProperty(tab)) return SpreadsheetApp.openById(props.getProperty('RECORDS_SHEET_ID')).getSheetByName(tab);
  return null;
}

function folderFor(path) {
  var folder = DriveApp.getRootFolder();
  (path || []).forEach(function (name) {
    var it = folder.getFoldersByName(String(name));
    folder = it.hasNext() ? it.next() : folder.createFolder(String(name));
  });
  return folder;
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
      var sh = sheetFor(body.sheet);
      if (!sh) return json({ ok: false, error: 'Unknown tab' });
      sh.appendRow(body.row);
      return json({ ok: true });
    }
    if (body.action === 'upload') {
      var blob = Utilities.newBlob(Utilities.base64Decode(body.base64), body.mimeType, body.name);
      var file = folderFor(body.path).createFile(blob);
      // Public website files (photos, published PDFs) can be viewed by anyone with the link.
      // Finance receipts are uploaded with public:false and stay private to the organisation.
      if (body.public === true) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return json({ ok: true, id: file.getId(), url: file.getUrl() });
    }
    if (body.action === 'email') {
      // Password reset links and similar messages, sent from this Google account.
      var to = String(body.to || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ ok: false, error: 'Bad address' });
      MailApp.sendEmail({ to: to, subject: String(body.subject || '').slice(0, 200), body: String(body.body || '').slice(0, 5000), name: 'PAHAD' });
      return json({ ok: true });
    }
    if (body.action === 'translate') {
      // First drafts for the website's Nepali version; PAHAD reviews them in the dashboard.
      var texts = (body.texts || []).slice(0, 60);
      var out = texts.map(function (t) {
        try {
          return LanguageApp.translate(String(t).slice(0, 2000), 'en', String(body.to || 'ne'));
        } catch (err) {
          return '';
        }
      });
      return json({ ok: true, texts: out });
    }
    if (body.action === 'ping') return json({ ok: true });
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

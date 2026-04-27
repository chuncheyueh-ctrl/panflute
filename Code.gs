const SPREADSHEET_ID = '請貼上你的 Google 試算表 ID';

function doGet(e) {
  const action = e.parameter.action || 'loadAll';
  if (action === 'loadAll') return jsonOutput({ ok: true, payload: loadAll() });
  return jsonOutput({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'saveAll') {
      saveAll(body.payload || {});
      return jsonOutput({ ok: true });
    }
    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName('Data');
  if (!sh) sh = ss.insertSheet('Data');
  return sh;
}

function saveAll(data) {
  const sh = sheet();
  sh.clearContents();
  sh.getRange(1,1).setValue('battle_panflute_json');
  sh.getRange(2,1).setValue(JSON.stringify(data || {}));
  sh.getRange(3,1).setValue('updatedAt');
  sh.getRange(3,2).setValue(new Date());
}

function loadAll() {
  const v = sheet().getRange(2,1).getValue();
  if (!v) return {};
  return JSON.parse(v);
}

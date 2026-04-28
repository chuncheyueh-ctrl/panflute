const SPREADSHEET_ID = '請貼上你的 Google 試算表 ID';
const IMAGE_FOLDER_ID = '請貼上你的 Google Drive 圖片資料夾 ID';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'loadAll';

  if (action === 'loadAll') return jsonOutput({ ok: true, payload: loadAll() });
  if (action === 'listBackups') return jsonOutput({ ok: true, backups: listBackups() });
  if (action === 'testDrive') return jsonOutput(testDriveAuth());

  return jsonOutput({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'saveAll') {
      saveAll(body.payload || {}, body.mode || 'safe');
      return jsonOutput({ ok: true });
    }

    if (body.action === 'uploadImage') {
      const url = uploadImage(body.base64, body.filename || ('photo_' + Date.now() + '.jpg'));
      return jsonOutput({ ok: true, url: url });
    }

    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('請貼上') >= 0) throw new Error('尚未設定 SPREADSHEET_ID');
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet() {
  const ss = spreadsheet();
  let sh = ss.getSheetByName('Data');
  if (!sh) sh = ss.insertSheet('Data');
  return sh;
}

function backupSheet() {
  const ss = spreadsheet();
  let sh = ss.getSheetByName('Backups');
  if (!sh) sh = ss.insertSheet('Backups');
  return sh;
}

function saveAll(data, mode) {
  const sh = sheet();
  const old = sh.getRange(2, 1).getValue();

  if (old) backupSheet().appendRow([new Date(), mode || 'safe', old]);

  sh.clearContents();
  sh.getRange(1, 1).setValue('battle_panflute_json');
  sh.getRange(2, 1).setValue(JSON.stringify(data || {}));
  sh.getRange(3, 1).setValue('updatedAt');
  sh.getRange(3, 2).setValue(new Date());
  sh.getRange(4, 1).setValue('mode');
  sh.getRange(4, 2).setValue(mode || 'safe');
}

function loadAll() {
  const v = sheet().getRange(2, 1).getValue();
  if (!v) return {};
  return JSON.parse(v);
}

function listBackups() {
  const sh = backupSheet();
  const last = sh.getLastRow();
  if (last < 1) return [];
  const start = Math.max(1, last - 20 + 1);
  const values = sh.getRange(start, 1, last - start + 1, 2).getValues();
  return values.map(function(r){ return { time: r[0], mode: r[1] }; });
}

function testDriveAuth() {
  if (!IMAGE_FOLDER_ID || IMAGE_FOLDER_ID.indexOf('請貼上') >= 0) throw new Error('尚未設定 IMAGE_FOLDER_ID');
  const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  return { ok: true, folderName: folder.getName(), folderId: IMAGE_FOLDER_ID };
}

function uploadImage(base64, filename) {
  if (!IMAGE_FOLDER_ID || IMAGE_FOLDER_ID.indexOf('請貼上') >= 0) throw new Error('尚未設定 IMAGE_FOLDER_ID');
  if (!base64) throw new Error('沒有收到圖片資料 base64');

  const match = String(base64).match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('圖片格式錯誤');

  const contentType = match[1];
  const bytes = Utilities.base64Decode(match[2]);
  const safeName = String(filename || ('photo_' + Date.now() + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
  const blob = Utilities.newBlob(bytes, contentType, safeName);

  const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
  const file = folder.createFile(blob);

  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
}

/**
 * Battle 教學管理系統 v4.1.2
 * GAS 相容修正版：支援 FormData/no-cors 上傳 + JSONP 讀取
 *
 * 部署設定：
 * - 類型：網頁應用程式
 * - 執行身分：我
 * - 存取權：任何人
 */

const FULL_BACKUP_SHEET = 'CloudBackup';
const MASTER_DATA_SHEET = 'MasterData';

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  let result;

  try {
    if (action === 'load') {
      result = loadLatest_(FULL_BACKUP_SHEET);
    } else if (action === 'loadMaster') {
      result = loadLatest_(MASTER_DATA_SHEET);
    } else {
      result = {
        ok: true,
        message: 'Battle 教學管理系統 Cloud API is running.'
      };
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }

  return output_(result, e);
}

function doPost(e) {
  let result;

  try {
    const raw =
      (e && e.parameter && e.parameter.payload) ||
      (e && e.postData && e.postData.contents) ||
      '{}';

    const body = JSON.parse(raw);

    if (body.action === 'save') {
      result = saveBackup_(FULL_BACKUP_SHEET, body.data, body.savedAt, body.version);
    } else if (body.action === 'saveMaster') {
      result = saveBackup_(MASTER_DATA_SHEET, body.data, body.savedAt, body.version);
    } else {
      result = { ok: false, error: 'Unknown action: ' + body.action };
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }

  return output_(result, e);
}

function saveBackup_(sheetName, data, savedAt, version) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_(sheetName);
    const now = savedAt || new Date().toISOString();
    const json = JSON.stringify(data || {});
    sheet.appendRow([now, version || '', json]);
    return {
      ok: true,
      sheet: sheetName,
      savedAt: now,
      bytes: json.length
    };
  } finally {
    lock.releaseLock();
  }
}

function loadLatest_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return { ok: true, data: null, message: 'No backup yet.' };
  }

  const values = sheet.getRange(lastRow, 1, 1, 3).getValues()[0];
  const savedAt = values[0];
  const version = values[1];
  const json = values[2];

  return {
    ok: true,
    sheet: sheetName,
    savedAt: savedAt,
    version: version,
    data: JSON.parse(json)
  };
}

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['savedAt', 'version', 'json']);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function output_(obj, e) {
  const callback = e && e.parameter && e.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

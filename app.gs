/**
 * Battle 教學管理系統 v4.1
 * Google Sheet 手動雲端備份 + 輕量基礎資料同步
 *
 * 使用方式：
 * 1. 建立 Google 試算表
 * 2. 擴充功能 → Apps Script
 * 3. 貼上本檔內容
 * 4. 部署 → 新部署作業 → 網頁應用程式
 * 5. 執行身分：我
 * 6. 存取權：知道連結的任何人
 * 7. 複製 Web App URL，貼回系統「備份」頁
 */

const FULL_BACKUP_SHEET = 'CloudBackup';
const MASTER_DATA_SHEET = 'MasterData';

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'load') {
    return jsonResponse(loadLatest_(FULL_BACKUP_SHEET));
  }
  if (action === 'loadMaster') {
    return jsonResponse(loadLatest_(MASTER_DATA_SHEET));
  }
  return jsonResponse({
    ok: true,
    message: 'Battle 教學管理系統 Cloud API is running.'
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'save') {
      return jsonResponse(saveBackup_(FULL_BACKUP_SHEET, body.data, body.savedAt, body.version));
    }

    if (body.action === 'saveMaster') {
      return jsonResponse(saveBackup_(MASTER_DATA_SHEET, body.data, body.savedAt, body.version));
    }

    return jsonResponse({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function saveBackup_(sheetName, data, savedAt, version) {
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

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Battle 教學管理系統 v4.3.4
 * iPad 穩定版：支援 JSONP 讀取、FormData/no-cors 上傳、分表雲端、連線測試
 *
 * 部署設定：
 * - 類型：網頁應用程式
 * - 執行身分：我
 * - 存取權：任何人
 */

const FULL_BACKUP_SHEET = 'CloudBackup';
const MASTER_DATA_SHEET = 'MasterData';

const PARTITION_SHEETS = {
  master: 'V42_Master',
  points: 'V42_Points',
  attendance: 'V42_Attendance',
  pointLogs: 'V42_PointLogs',
  courseNotes: 'V42_CourseNotes',
  examLogs: 'V42_ExamLogs',
  redeemLogs: 'V42_RedeemLogs',
  activityLogs: 'V42_ActivityLogs',
  classDateLists: 'V42_ClassDateLists',
  hiddenDateLists: 'V42_HiddenDateLists',
  examChecklists: 'V43_ExamChecklists'
};

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  let result;
  try {
    if (action === 'ping') {
      result = ping_();
    } else if (action === 'load') {
      result = loadLatest_(FULL_BACKUP_SHEET);
    } else if (action === 'loadMaster') {
      result = loadLatest_(MASTER_DATA_SHEET);
    } else if (action === 'loadPartitioned') {
      result = loadPartitioned_();
    } else {
      result = ping_();
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }
  return output_(result, e);
}

function doPost(e) {
  let result;
  try {
    const raw = (e && e.parameter && e.parameter.payload) || (e && e.postData && e.postData.contents) || '{}';
    const body = JSON.parse(raw);

    if (body.action === 'save') {
      result = saveBackup_(FULL_BACKUP_SHEET, body.data, body.savedAt, body.version);
    } else if (body.action === 'saveMaster') {
      result = saveBackup_(MASTER_DATA_SHEET, body.data, body.savedAt, body.version);
    } else if (body.action === 'savePartitioned') {
      result = savePartitioned_(body.data, body.savedAt, body.version);
    } else {
      result = { ok: false, error: 'Unknown action: ' + body.action };
    }
  } catch (err) {
    result = { ok: false, error: String(err) };
  }
  return output_(result, e);
}

function ping_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    message: 'Battle 教學管理系統 Cloud API v4.3.4 is running.',
    spreadsheetName: ss ? ss.getName() : '',
    serverTime: Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')
  };
}

function savePartitioned_(payload, savedAt, version) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const now = savedAt || taipeiNow_();
    const data = payload || {};
    const runtime = data.runtime || {};
    saveReplaceJson_(PARTITION_SHEETS.master, data.master || {}, now, version);
    saveReplaceJson_(PARTITION_SHEETS.points, runtime.points || {}, now, version);
    saveReplaceJson_(PARTITION_SHEETS.attendance, runtime.attendance || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.pointLogs, runtime.pointLogs || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.courseNotes, runtime.courseNotes || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.examLogs, runtime.examLogs || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.redeemLogs, runtime.redeemLogs || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.activityLogs, runtime.activityLogs || [], now, version);
    saveReplaceJson_(PARTITION_SHEETS.classDateLists, runtime.classDateLists || {}, now, version);
    saveReplaceJson_(PARTITION_SHEETS.hiddenDateLists, runtime.hiddenDateLists || {}, now, version);
    saveReplaceJson_(PARTITION_SHEETS.examChecklists, runtime.examChecklists || {}, now, version);
    return { ok: true, savedAt: now, version: version || '', mode: 'partitioned' };
  } finally {
    lock.releaseLock();
  }
}

function loadPartitioned_() {
  const master = loadReplaceJson_(PARTITION_SHEETS.master);
  if (!master) return { ok: true, data: null, message: 'No partitioned backup yet.' };
  return {
    ok: true,
    mode: 'partitioned',
    data: {
      master: master,
      runtime: {
        points: loadReplaceJson_(PARTITION_SHEETS.points) || {},
        attendance: loadReplaceJson_(PARTITION_SHEETS.attendance) || [],
        pointLogs: loadReplaceJson_(PARTITION_SHEETS.pointLogs) || [],
        courseNotes: loadReplaceJson_(PARTITION_SHEETS.courseNotes) || [],
        examLogs: loadReplaceJson_(PARTITION_SHEETS.examLogs) || [],
        redeemLogs: loadReplaceJson_(PARTITION_SHEETS.redeemLogs) || [],
        activityLogs: loadReplaceJson_(PARTITION_SHEETS.activityLogs) || [],
        classDateLists: loadReplaceJson_(PARTITION_SHEETS.classDateLists) || {},
        hiddenDateLists: loadReplaceJson_(PARTITION_SHEETS.hiddenDateLists) || {},
        examChecklists: loadReplaceJson_(PARTITION_SHEETS.examChecklists) || {}
      }
    }
  };
}

function saveReplaceJson_(sheetName, data, savedAt, version) {
  const sheet = getSheet_(sheetName);
  sheet.clearContents();
  sheet.appendRow(['savedAt', 'version', 'json']);
  sheet.appendRow([savedAt || taipeiNow_(), version || '', JSON.stringify(data || {})]);
  sheet.setFrozenRows(1);
}

function loadReplaceJson_(sheetName) {
  const sheet = getSheet_(sheetName);
  if (sheet.getLastRow() < 2) return null;
  const json = sheet.getRange(2, 3).getValue();
  if (!json) return null;
  return JSON.parse(json);
}

function saveBackup_(sheetName, data, savedAt, version) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(sheetName);
    const now = savedAt || taipeiNow_();
    const json = JSON.stringify(data || {});
    sheet.appendRow([now, version || '', json]);
    return { ok: true, sheet: sheetName, savedAt: now, bytes: json.length };
  } finally {
    lock.releaseLock();
  }
}

function loadLatest_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, data: null, message: 'No backup yet.' };
  const values = sheet.getRange(lastRow, 1, 1, 3).getValues()[0];
  return { ok: true, sheet: sheetName, savedAt: values[0], version: values[1], data: JSON.parse(values[2]) };
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

function taipeiNow_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
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

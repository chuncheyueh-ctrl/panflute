const SPREADSHEET_ID = '請貼上你的 Google 試算表 ID';

function doGet(e){const action=e.parameter.action||'loadAll';if(action==='loadAll')return jsonOutput({ok:true,payload:loadAll()});if(action==='listBackups')return jsonOutput({ok:true,backups:listBackups()});return jsonOutput({ok:false,error:'Unknown action'});}
function doPost(e){try{const body=JSON.parse(e.postData.contents||'{}');if(body.action==='saveAll'){saveAll(body.payload||{},body.mode||'safe');return jsonOutput({ok:true});}return jsonOutput({ok:false,error:'Unknown action'});}catch(err){return jsonOutput({ok:false,error:String(err)});}}
function jsonOutput(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function spreadsheet(){return SpreadsheetApp.openById(SPREADSHEET_ID);}
function sheet(){const ss=spreadsheet();let sh=ss.getSheetByName('Data');if(!sh)sh=ss.insertSheet('Data');return sh;}
function backupSheet(){const ss=spreadsheet();let sh=ss.getSheetByName('Backups');if(!sh)sh=ss.insertSheet('Backups');return sh;}
function saveAll(data,mode){const sh=sheet();const old=sh.getRange(2,1).getValue();if(old){backupSheet().appendRow([new Date(),mode||'safe',old]);}sh.clearContents();sh.getRange(1,1).setValue('battle_panflute_json');sh.getRange(2,1).setValue(JSON.stringify(data||{}));sh.getRange(3,1).setValue('updatedAt');sh.getRange(3,2).setValue(new Date());sh.getRange(4,1).setValue('mode');sh.getRange(4,2).setValue(mode||'safe');}
function loadAll(){const v=sheet().getRange(2,1).getValue();if(!v)return {};return JSON.parse(v);}
function listBackups(){const sh=backupSheet();const last=sh.getLastRow();if(last<1)return [];const start=Math.max(1,last-20+1);const values=sh.getRange(start,1,last-start+1,2).getValues();return values.map(function(r){return {time:r[0],mode:r[1]};});}

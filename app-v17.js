const VERSION="V34.1｜選單與同步設定補正版";
const KEY="battle_panflute_v34_core_data";
const firebaseConfig={apiKey:"AIzaSyDeO46FzGgtMkcwVsyaK2VKdXi40qYJBOw",authDomain:"battle-panflute.firebaseapp.com",projectId:"battle-panflute",storageBucket:"battle-panflute.firebasestorage.app",messagingSenderId:"426328054897",appId:"1:426328054897:web:1cea584925711a769f4fd0",measurementId:"G-6K6XHBY43C"};
let db=null; try{firebase.initializeApp(firebaseConfig);db=firebase.firestore();console.log("🔥 Firebase 已連線");}catch(e){console.warn(e)}
const abilityKeys=[["pitch","音準"],["rhythm","節奏"],["sight","視譜"],["breath","氣息"],["tone","音色"],["expression","表現力"]];
const defaultLevels=Array.from({length:50},(_,i)=>({level:i+1,stage:i<5?"啟動期":i<10?"基礎音符":i<20?"基礎旋律":i<35?"控制力":"讀譜表達",reward:i===0?"第一口氣貼紙":`Lv.${i+1} 獎勵`,goals:i===0?["吹出聲音（任一管）","能控制氣流不爆音","知道排笛有高低音"]:[`完成 Lv.${i+1} 技巧目標`,`穩定演奏指定練習`,`完成簡短樂句`]}));
const uid=()=> "id_"+Math.random().toString(36).slice(2,10)+"_"+Date.now().toString(36);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
let data=load();
function baseData(){return{version:VERSION,schools:[{id:"s1",name:"銅蘭國小"},{id:"s2",name:"康樂國小"},{id:"s3",name:"豐裡國小"},{id:"s4",name:"富源國小"}],grades:[{id:"g3",name:"三年級"},{id:"g4",name:"四年級"},{id:"g6",name:"六年級"},{id:"club",name:"社團"},{id:"g5",name:"五年級"},{id:"pan",name:"排笛隊"}],students:[],levels:structuredClone(defaultLevels),attendanceDates:[],attendance:{},selectedSchoolId:"s3",selectedGradeId:"g3",selectedStudentId:null,selectedLevel:1,syncUrl:"",teacherName:"",globalNotes:""};}
function normalize(d){d={...baseData(),...(d||{})};d.schools=d.schools?.length?d.schools:baseData().schools;d.grades=d.grades?.length?d.grades:baseData().grades;d.levels=d.levels?.length?d.levels:structuredClone(defaultLevels);d.students=(d.students||[]).map(s=>({id:s.id||uid(),name:s.name||"",schoolId:s.schoolId||d.selectedSchoolId||"s3",gradeId:s.gradeId||s.grade||s.classId||d.selectedGradeId||"g3",seatNo:String(s.seatNo??s.seat??s.number??s.studentNo??"").replace(/[^\d]/g,""),level:Math.max(1,parseInt(s.level||1,10)||1),points:parseInt(s.points??s.score??0,10)||0,photo:s.photo||"",abilities:{pitch:3,rhythm:3,sight:3,breath:3,tone:3,expression:3,...(s.abilities||{})},note:s.note||""}));return d;}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||"null"))}catch{return baseData()}}
function persist(){data.version=VERSION;localStorage.setItem(KEY,JSON.stringify(data))}
function schoolName(id){return data.schools.find(x=>x.id===id)?.name||""} function gradeName(id){return data.grades.find(x=>x.id===id)?.name||"未填年級"}
function gradeOrder(id){const n=gradeName(id);if(n.includes("三"))return 3;if(n.includes("四"))return 4;if(n.includes("五"))return 5;if(n.includes("六"))return 6;if(n.includes("社"))return 7;if(n.includes("排"))return 8;return 999}
function seatNum(s){const n=parseInt(String(s.seatNo||"").replace(/[^\d]/g,""),10);return Number.isFinite(n)?n:9999}
function seatText(s){return seatNum(s)===9999?"未填座號":String(seatNum(s)).padStart(2,"0")+"號"}
function initials(n){return (n||"?").trim().slice(0,2)}
function avatar(s){return `<div class="avatar">${s.photo?`<img src="${s.photo}">`:esc(initials(s.name))}</div>`}
function selectedStudent(){let s=data.students.find(x=>x.id===data.selectedStudentId);if(!s&&filteredStudents()[0]){s=filteredStudents()[0];data.selectedStudentId=s.id}return s}
function filteredStudents(){return data.students.filter(s=>s.schoolId===data.selectedSchoolId&&s.gradeId===data.selectedGradeId).sort((a,b)=>gradeOrder(a.gradeId)-gradeOrder(b.gradeId)||seatNum(a)-seatNum(b)||a.name.localeCompare(b.name,"zh-Hant"))}
function allSchoolStudents(){return data.students.filter(s=>s.schoolId===data.selectedSchoolId).sort((a,b)=>gradeOrder(a.gradeId)-gradeOrder(b.gradeId)||seatNum(a)-seatNum(b)||a.name.localeCompare(b.name,"zh-Hant"))}
function setView(v){["sync","teacher","dashboard","student","levels","manage","display","notes"].forEach(x=>document.getElementById(x+"View")?.classList.toggle("hidden",x!==v));}
function fillSelect(id,items,val){const el=document.getElementById(id);if(!el)return;el.innerHTML=items.map(x=>`<option value="${x.id}" ${x.id===val?"selected":""}>${esc(x.name)}</option>`).join("")}
function bindFilters(){fillSelect("schoolFilter",data.schools,data.selectedSchoolId);fillSelect("gradeFilter",data.grades,data.selectedGradeId);fillSelect("studentSchoolFilter",data.schools,data.selectedSchoolId);fillSelect("studentGradeFilter",data.grades,data.selectedGradeId);
["schoolFilter","studentSchoolFilter"].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{data.selectedSchoolId=e.value;data.selectedStudentId=null;persist();renderAll()}});
["gradeFilter","studentGradeFilter"].forEach(id=>{const e=document.getElementById(id);if(e)e.onchange=()=>{data.selectedGradeId=e.value;data.selectedStudentId=null;persist();renderAll()}});
const vs=document.getElementById("viewSelect");vs.onchange=()=>{setView(vs.value);renderAll()};setView(vs.value);}
function renderStats(){const fs=filteredStudents();document.getElementById("statStudents").textContent=fs.length;document.getElementById("statAvg").textContent=fs.length?(fs.reduce((a,s)=>a+s.level,0)/fs.length).toFixed(1):"0";document.getElementById("statMax").textContent=fs.length?Math.max(...fs.map(s=>s.level)):0;document.getElementById("statPoints").textContent=fs.reduce((a,s)=>a+s.points,0)}
function renderLists(){document.getElementById("addHint").textContent=`加入位置：${schoolName(data.selectedSchoolId)}｜${gradeName(data.selectedGradeId)}；請填姓名與座號後新增。`;
const fs=filteredStudents();document.getElementById("studentList").innerHTML=fs.length?fs.map(s=>`<div class="student-item ${s.id===data.selectedStudentId?"active":""}" onclick="selectStudent('${s.id}')">${avatar(s)}<div><div class="name">${esc(s.name)}</div><div class="meta">${esc(schoolName(s.schoolId))}｜${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}｜點數 ${s.points}</div></div><span class="badge">Lv.${s.level}</span></div>`).join(""):`<div class="meta">目前沒有學生。</div>`;
const rank=[...fs].sort((a,b)=>b.points-a.points||b.level-a.level||seatNum(a)-seatNum(b));document.getElementById("rankList").innerHTML=rank.map((s,i)=>`<div class="rank-item">${avatar(s)}<div><div class="name">${i+1}. ${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}｜${esc(s.name)}</div><div class="meta">Lv.${s.level}｜點數 ${s.points}</div></div></div>`).join("")}
window.selectStudent=id=>{data.selectedStudentId=id;persist();renderAll()}
function renderEdit(){const s=selectedStudent();const ids=["editName","editLevel","editSeat","editPoints"];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});if(!s){document.getElementById("editHint").textContent="請先選擇學生";return}
document.getElementById("editHint").textContent=`目前編輯：${s.name}｜${gradeName(s.gradeId)}｜${seatText(s)}｜點數 ${s.points}`;
document.getElementById("editName").value=s.name;document.getElementById("editLevel").value=s.level;document.getElementById("editSeat").value=s.seatNo;document.getElementById("editPoints").value=s.points;
document.getElementById("membershipGrid").innerHTML=data.schools.map(sc=>`<h4>${esc(sc.name)}</h4><div class="check-grid">${data.grades.map(g=>`<label><input type="radio" name="member" ${s.schoolId===sc.id&&s.gradeId===g.id?"checked":""} onchange="setMember('${sc.id}','${g.id}')">${esc(g.name)}</label>`).join("")}</div>`).join("");
document.getElementById("studentProfileMini").innerHTML=`<div class="card" style="text-align:center;box-shadow:none">${avatar(s)}<h2>${esc(s.name)}</h2><div class="meta">${esc(schoolName(s.schoolId))}｜${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}</div><h1>Lv.${s.level}</h1><div class="progress"><div style="width:${Math.min(100,s.level/50*100)}%"></div></div><h3>六角形能力指標</h3><div class="ability-grid">${abilityKeys.map(([k,l])=>`<div class="ability-row"><b>${l}</b><input type="range" min="1" max="5" value="${s.abilities[k]||3}" oninput="setAbility('${k}',this.value)"><span>${s.abilities[k]||3}</span></div>`).join("")}</div></div>`}
function saveEdit(){const s=selectedStudent();if(!s)return; s.name=document.getElementById("editName").value.trim();s.level=Math.max(1,parseInt(document.getElementById("editLevel").value,10)||1);s.seatNo=String(document.getElementById("editSeat").value||"").replace(/[^\d]/g,"");s.points=parseInt(document.getElementById("editPoints").value,10)||0;persist();renderAll()}
function setMember(schoolId,gradeId){const s=selectedStudent();if(!s)return;s.schoolId=schoolId;s.gradeId=gradeId;data.selectedSchoolId=schoolId;data.selectedGradeId=gradeId;persist();renderAll()}
function setAbility(k,v){const s=selectedStudent();if(!s)return;s.abilities[k]=parseInt(v,10);persist();renderEdit()}
function setPhoto(ev){const s=selectedStudent();const f=ev.target.files?.[0];if(!s||!f)return;const r=new FileReader();r.onload=()=>{s.photo=r.result;persist();renderAll()};r.readAsDataURL(f)}
function addStudent(){const name=document.getElementById("newName").value.trim();if(!name)return alert("請填姓名");const s={id:uid(),name,schoolId:data.selectedSchoolId,gradeId:data.selectedGradeId,seatNo:String(document.getElementById("newSeat").value||"").replace(/[^\d]/g,""),level:Math.max(1,parseInt(document.getElementById("newLevel").value,10)||1),points:parseInt(document.getElementById("newPoints").value,10)||0,photo:"",abilities:{pitch:3,rhythm:3,sight:3,breath:3,tone:3,expression:3},note:""};data.students.push(s);data.selectedStudentId=s.id;["newName","newSeat"].forEach(id=>document.getElementById(id).value="");persist();renderAll()}
function deleteStudent(){const s=selectedStudent();if(!s||!confirm(`刪除 ${s.name}？`))return;data.students=data.students.filter(x=>x.id!==s.id);delete data.attendance[s.id];data.selectedStudentId=null;persist();renderAll()}
function changeLevel(n){const s=selectedStudent();if(!s)return;s.level=Math.max(1,s.level+n);persist();renderAll()} function changePoints(n){const s=selectedStudent();if(!s)return;s.points+=n;persist();renderAll()}
function generateWeeks(){const start=document.getElementById("attStart").value;if(!start)return alert("請選日期");const weeks=parseInt(document.getElementById("attWeeks").value,10)||10;const d=new Date(start+"T00:00:00");data.attendanceDates=[];for(let i=0;i<weeks;i++){const x=new Date(d);x.setDate(d.getDate()+i*7);data.attendanceDates.push(x.toISOString().slice(0,10))}persist();renderAttendance()}
function renderAttendance(){document.getElementById("dateChips").innerHTML=data.attendanceDates.map(d=>`<span class="pill">${d}<button class="bad" style="padding:2px 6px;margin-left:5px" onclick="removeDate('${d}')">×</button></span>`).join("");const students=filteredStudents();let html=`<thead><tr><th>姓名／出席率</th>${data.attendanceDates.map(d=>`<th>${d.slice(5)}</th>`).join("")}</tr></thead><tbody>`;students.forEach((s,i)=>{html+=`<tr><td><span class="serial">${i+1}</span><b>${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}｜${esc(s.name)}</b><br><span class="meta">出席率 ${attendanceRate(s)}%</span></td>`;data.attendanceDates.forEach(d=>{const st=data.attendance?.[s.id]?.[d]||"";html+=`<td onclick="cycleAttendance('${s.id}','${d}')"><span class="pill ${st}">${st==="present"?"✓":st==="absent"?"缺":st==="leave"?"假":st==="late"?"遲":"－"}</span></td>`});html+="</tr>"});html+="</tbody>";document.getElementById("attTable").innerHTML=html}
function cycleAttendance(id,d){const order=["","present","late","absent","leave"];data.attendance[id]??={};const cur=data.attendance[id][d]||"";const next=order[(order.indexOf(cur)+1)%order.length];if(next)data.attendance[id][d]=next;else delete data.attendance[id][d];persist();renderAttendance()}
function attendanceRate(s){const ds=data.attendanceDates;if(!ds.length)return 0;let ok=0;ds.forEach(d=>{const st=data.attendance?.[s.id]?.[d];if(st==="present"||st==="late")ok++});return Math.round(ok/ds.length*100)}
function removeDate(d){data.attendanceDates=data.attendanceDates.filter(x=>x!==d);persist();renderAttendance()}
function renderStudentPage(){fillSelect("studentSelect",filteredStudents().map(s=>({id:s.id,name:`${s.name}｜Lv.${s.level}`})),data.selectedStudentId);document.getElementById("studentSelect").onchange=e=>{data.selectedStudentId=e.target.value;persist();renderAll()};const s=selectedStudent();document.getElementById("studentPage").innerHTML=s?`<div style="text-align:center">${avatar(s)}<h2>${esc(s.name)}</h2><div class="meta">${esc(schoolName(s.schoolId))}｜${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}</div><h1>Lv.${s.level}</h1><div class="progress"><div style="width:${Math.min(100,s.level/50*100)}%"></div></div><h3>六角形能力指標</h3><div class="ability-grid">${abilityKeys.map(([k,l])=>`<div class="ability-row"><b>${l}</b><input type="range" min="1" max="5" value="${s.abilities[k]||3}" oninput="setAbility('${k}',this.value)"><span>${s.abilities[k]||3}/5</span></div>`).join("")}</div></div>`:"請選擇學生"}
function renderLevels(){document.getElementById("levelList").innerHTML=data.levels.map(l=>`<div class="level-item ${l.level===data.selectedLevel?"active":""}" onclick="data.selectedLevel=${l.level};persist();renderLevels()"><span class="badge">Lv.${l.level}</span><div><div class="name">${esc(l.stage)}</div><div class="meta">${esc(l.reward)}｜${l.goals.length}目標</div></div></div>`).join("");const l=data.levels.find(x=>x.level===data.selectedLevel)||data.levels[0];document.getElementById("levelEditor").innerHTML=l?`<label>等級</label><input value="Lv.${l.level}" disabled><label>階段名稱</label><input id="levStage" value="${esc(l.stage)}"><label>獎勵／稱號</label><input id="levReward" value="${esc(l.reward)}"><label>升級目標（每行一個）</label><textarea id="levGoals" rows="6">${esc(l.goals.join("\n"))}</textarea><div class="actions"><button class="primary" onclick="saveLevel()">儲存等級</button></div>`:""}
function saveLevel(){const l=data.levels.find(x=>x.level===data.selectedLevel);if(!l)return;l.stage=document.getElementById("levStage").value;l.reward=document.getElementById("levReward").value;l.goals=document.getElementById("levGoals").value.split("\n").map(x=>x.trim()).filter(Boolean);persist();renderLevels()}
function addLevel(){data.levels.push({level:data.levels.length+1,stage:"新階段",reward:"",goals:["新目標"]});persist();renderLevels()}function deleteLastLevel(){data.levels.pop();persist();renderLevels()}function resetLevels(){if(confirm("恢復預設50級？")){data.levels=structuredClone(defaultLevels);persist();renderLevels()}}
function renderManage(){document.getElementById("schoolManage").innerHTML=data.schools.map(s=>`<p><b>${esc(s.name)}</b> <button class="bad" onclick="removeSchool('${s.id}')">刪除</button></p>`).join("");document.getElementById("gradeManage").innerHTML=data.grades.map(g=>`<p><b>${esc(g.name)}</b> <button class="bad" onclick="removeGrade('${g.id}')">刪除</button></p>`).join("")}
function addSchool(){const n=document.getElementById("newSchoolName").value.trim();if(!n)return;data.schools.push({id:uid(),name:n});persist();renderAll()}function addGrade(){const n=document.getElementById("newGradeName").value.trim();if(!n)return;data.grades.push({id:uid(),name:n});persist();renderAll()}function removeSchool(id){data.schools=data.schools.filter(x=>x.id!==id);persist();renderAll()}function removeGrade(id){data.grades=data.grades.filter(x=>x.id!==id);persist();renderAll()}
function promoteGrades(){const map={g3:"g4",g4:"g5",g5:"g6"};data.students.forEach(s=>{if(map[s.gradeId])s.gradeId=map[s.gradeId]});persist();renderAll()}
function sortByCurrent(){const fs=filteredStudents().sort((a,b)=>b.points-a.points||b.level-a.level);if(fs[0]){data.selectedStudentId=fs[0].id;persist();renderAll()}}
async function saveCloud(){persist();if(!db)return alert("Firebase 未連線，本機已儲存");await db.collection("teachers").doc("teacher_chunche").set({data,updatedAt:new Date().toISOString(),version:VERSION});alert("Firebase 已儲存")}
async function loadCloud(){if(!db)return alert("Firebase 未連線");const snap=await db.collection("teachers").doc("teacher_chunche").get();if(snap.exists&&snap.data().data){data=normalize(snap.data().data);persist();renderAll();alert("Firebase 已讀取")}}
function exportBackup(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="battle-panflute-v34-backup.json";a.click()}
function importBackup(ev){const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{data=normalize(JSON.parse(r.result));persist();renderAll()};r.readAsText(f)}

function renderSync(){
  const el=document.getElementById("syncUrlInput");
  if(el) el.value=data.syncUrl||"";
  const st=document.getElementById("syncUrlStatus");
  if(st) st.textContent=data.syncUrl?`目前同步網址：${data.syncUrl}`:"尚未設定同步網址";
}
function saveSyncUrl(){
  const el=document.getElementById("syncUrlInput");
  data.syncUrl=(el?.value||"").trim();
  persist();
  renderSync();
  alert("同步網址已儲存");
}
function copySyncUrl(){
  if(!data.syncUrl) return alert("尚未設定同步網址");
  navigator.clipboard?.writeText(data.syncUrl);
  alert("已複製同步網址");
}
async function testSyncUrl(){
  const url=(document.getElementById("syncUrlInput")?.value||data.syncUrl||"").trim();
  if(!url) return alert("請先貼上同步網址");
  try{
    await fetch(url,{method:"GET",mode:"no-cors"});
    alert("已送出測試請求；若 Apps Script 有設定回應，代表網址可連。");
  }catch(e){
    alert("測試失敗："+e.message);
  }
}
function saveTeacherName(){
  data.teacherName=(document.getElementById("teacherNameInput")?.value||"").trim();
  persist();
  alert("老師名稱已儲存");
}
function renderTeacher(){
  const el=document.getElementById("teacherNameInput");
  if(el) el.value=data.teacherName||"";
}
function saveGlobalNotes(){
  data.globalNotes=document.getElementById("globalNotes")?.value||"";
  persist();
  alert("備註已儲存");
}
function renderNotes(){
  const el=document.getElementById("globalNotes");
  if(el) el.value=data.globalNotes||"";
}
function renderDisplay(){
  const box=document.getElementById("displayContent");
  if(!box) return;
  const fs=filteredStudents().sort((a,b)=>b.points-a.points||b.level-a.level);
  box.innerHTML=fs.map((s,i)=>`<div class="rank-item">${avatar(s)}<div><div class="name">${i+1}. ${esc(s.name)}</div><div class="meta">${esc(gradeName(s.gradeId))}｜${esc(seatText(s))}｜Lv.${s.level}｜點數 ${s.points}</div></div></div>`).join("") || "<p class='meta'>目前沒有學生。</p>";
}

function renderAll(){bindFilters();renderStats();renderLists();renderEdit();renderAttendance();renderStudentPage();renderLevels();renderManage();renderSync();renderTeacher();renderNotes();renderDisplay();}
document.getElementById("attStart").value ||= new Date().toISOString().slice(0,10);
renderAll();

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


const KEY="battle_panflute_v5_stable_core";
const LEGACY_KEYS=["battle_panflute_v4_levelup","battle_panflute_google_sheets_v3","battle_panflute_google_sheets_v1"];
const API_KEY="battle_panflute_google_apps_script_url_v1";


const ABILITY_KEYS = [
  {key:"pitch", label:"音準"},
  {key:"rhythm", label:"節奏"},
  {key:"sight", label:"視譜"},
  {key:"breath", label:"氣息"},
  {key:"tone", label:"音色"},
  {key:"expression", label:"表現力"}
];

const defaultLevels=[null];
const seedLevels=[
["啟動期","第一口氣貼紙",["吹出聲音（任一管）","能控制氣流不爆音","知道排笛有高低音"]],
["啟動期","穩定氣息章",["吹穩一個音2秒","能重複成功","分辨高音/低音"]],
["啟動期","三秒長音章",["吹穩3秒","嘗試兩個不同音","能說出哪個比較高"]],
["啟動期","高低音小偵探",["吹兩個不同音高","高低切換不混亂","認識音是往上/往下移動"]],
["啟動期","五線譜入門章",["穩定吹出兩個音","能模仿老師音高","認識五線譜上下位置"]],
["基礎音符","Do 解鎖",["吹出指定音 Do","Do 維持3秒","認識 Do / C 在五線譜的位置"]],
["基礎音符","Re 解鎖",["吹出指定音 Re","Do-Re 換音不中斷","認識 Re / D"]],
["基礎音符","Mi 解鎖",["吹出指定音 Mi","吹 Do-Re-Mi","認識 Mi / E"]],
["基礎音符","CDE 小達人",["吹 Do-Re-Mi","能辨認 C/D/E","完成三音短旋律"]],
["基礎旋律","四分音符章",["認識四分音符","跟拍吹奏","完成節奏短句"]]
];
seedLevels.forEach(x=>defaultLevels.push({stage:x[0],reward:x[1],goals:x[2]}));
for(let i=11;i<=50;i++){
  defaultLevels[i]={stage:i<=20?"基礎旋律":i<=30?"控制力":i<=40?"讀譜表達":"表演期",reward:`Lv.${i} 獎勵`,goals:[`完成 Lv.${i} 指定吹奏任務`,`完成 Lv.${i} 樂理任務`,`能穩定重複成功`]};
}

const defaultData={
  schools:[{id:"s1",name:"學校一"},{id:"s2",name:"學校二"},{id:"s3",name:"學校三"},{id:"s4",name:"學校四"}],
  grades:[{id:"g3",name:"三年級"},{id:"g4",name:"四年級"}],
  levels:JSON.parse(JSON.stringify(defaultLevels)),
  students:[], memberships:[], attendance:[], attendanceDates:[], points:[], events:[], lessonLogs:[], coursePlans:[], classNotes:[], noteQuizHistory:[], rewards:[], redemptions:[],
  selectedId:null, selectedLevel:1,
  filter:{schoolId:"s1",gradeId:"g3"},
  calendar:{schoolId:"s1",scope:"school",month:"",selectedDate:""},
  logFilter:{schoolId:"s1",gradeId:"g3",scope:"class"},
  courseFilter:{schoolId:"s1",gradeId:"g3"}
};

let data=loadData();

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function monthStr(date=new Date()){return date.toISOString().slice(0,7)}
function todayStr(){return new Date().toISOString().slice(0,10)}
function loadData(){
  let raw=localStorage.getItem(KEY);
  if(!raw){ for(const k of LEGACY_KEYS){ raw=localStorage.getItem(k); if(raw)break; } }
  if(raw){ try{return normalize(JSON.parse(raw));}catch(e){console.warn(e)}}
  return normalize(JSON.parse(JSON.stringify(defaultData)));
}
function normalize(d){
  d={...JSON.parse(JSON.stringify(defaultData)),...(d||{})};
  d.schools=Array.isArray(d.schools)&&d.schools.length?d.schools:JSON.parse(JSON.stringify(defaultData.schools));
  d.grades=Array.isArray(d.grades)&&d.grades.length?d.grades:JSON.parse(JSON.stringify(defaultData.grades));
  d.levels=Array.isArray(d.levels)&&d.levels.length>1?d.levels:JSON.parse(JSON.stringify(defaultLevels));
  ["students","memberships","attendance","attendanceDates","points","events","lessonLogs","coursePlans","classNotes","noteQuizHistory","rewards","redemptions"].forEach(k=>d[k]=Array.isArray(d[k])?d[k]:[]);
  d.filter=d.filter||{schoolId:d.schools[0].id,gradeId:d.grades[0].id};
  if(!d.filter.schoolId)d.filter.schoolId=d.schools[0].id;
  if(!d.filter.gradeId)d.filter.gradeId=d.grades[0].id;
  d.calendar=d.calendar||{schoolId:d.filter.schoolId,scope:"school",month:monthStr(),selectedDate:todayStr()};
  if(!d.calendar.month)d.calendar.month=monthStr();
  if(!d.calendar.schoolId)d.calendar.schoolId=d.filter.schoolId;
  if(!d.calendar.scope)d.calendar.scope="school";
  if(!d.calendar.selectedDate)d.calendar.selectedDate=todayStr();
  d.logFilter=d.logFilter||{schoolId:d.filter.schoolId,gradeId:d.filter.gradeId,scope:"class"};
  d.courseFilter=d.courseFilter||{schoolId:d.filter.schoolId,gradeId:d.filter.gradeId};
  d.students.forEach(s=>{s.id=s.id||uid();s.name=s.name||"未命名";s.level=clampRaw(s.level,d.levels);s.points=parseInt(s.points)||0;s.schoolId=s.schoolId||d.filter.schoolId;s.gradeId=s.gradeId||d.filter.gradeId;s.notes=s.notes||"";s.photo=s.photo||"";normalizeAbility(s)});
  d.memberships=Array.isArray(d.memberships)?d.memberships:[];
/* V20: 不再根據學生的 schoolId/gradeId 自動補 membership，避免三年級被補回來。 */
  d.attendance.forEach(a=>{a.id=a.id||uid();a.reason=a.reason||"";a.date=a.date||todayStr()});
  d.coursePlans.forEach(c=>{c.schoolId=c.schoolId||d.courseFilter.schoolId;c.gradeId=c.gradeId||d.courseFilter.gradeId});
  return d;
}
function persist(){data.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(data))}
function saveAndRender(msg){persist();renderAll();if(msg)toast(msg)}
function fullRender(){renderAll();toast("畫面已重新整理")}
function toast(msg){const t=document.getElementById("toast");if(!t)return;t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1500)}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v}
function escapeAttr(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function initials(name){return (name||"?").trim().slice(0,2)}
function clampRaw(n,arr){return Math.max(1,Math.min(Math.max(1,(arr||defaultLevels).length-1),parseInt(n)||1))}
function maxLevel(){return Math.max(1,(data.levels||defaultLevels).length-1)}
function clamp(n){return clampRaw(n,data.levels)}
function levelInfo(n){return data.levels[clamp(n)]||data.levels[1]}
function pct(level){return maxLevel()<=1?100:Math.round((clamp(level)-1)/(maxLevel()-1)*100)}
function schoolName(id){return data.schools.find(x=>x.id===id)?.name||"未指定學校"}
function gradeName(id){return data.grades.find(x=>x.id===id)?.name||"未指定年級"}
function optionHTML(list,selectedId){return list.map(x=>`<option value="${x.id}" ${x.id===selectedId?'selected':''}>${escapeAttr(x.name)}</option>`).join("")}
function avatarHTML(s,cls="avatar"){return `<div class="${cls}">${s?.photo?`<img src="${s.photo}">`:initials(s?.name)}</div>`}

function setView(v){
  ["sync","teacher","classroom","display","student","noteQuiz","rewardShop","calendar","lessonLog","coursePlan","levels","manage"].forEach(name=>{
    const el=document.getElementById(name+"View"); if(el)el.classList.toggle("hidden",name!==v);
  });
  const menu=document.getElementById("mainMenu"); if(menu)menu.value=v;
  renderAll();
}

function isStudentInClass(studentId,schoolId=data.filter.schoolId,gradeId=data.filter.gradeId){
  return data.memberships.some(m=>m.studentId===studentId&&m.schoolId===schoolId&&m.gradeId===gradeId);
}
function filteredStudents(){
  return data.students.filter(s=>isStudentInClass(s.id)).sort((a,b)=>a.name.localeCompare(b.name,"zh-Hant"));
}
function addMembership(studentId,schoolId=data.filter.schoolId,gradeId=data.filter.gradeId){
  if(!data.memberships.some(m=>m.studentId===studentId&&m.schoolId===schoolId&&m.gradeId===gradeId)){
    data.memberships.push({id:uid(),studentId,schoolId,gradeId});
  }
}
function removeMembership(studentId,schoolId=data.filter.schoolId,gradeId=data.filter.gradeId){
  data.memberships=data.memberships.filter(m=>!(m.studentId===studentId&&m.schoolId===schoolId&&m.gradeId===gradeId));
}
function toggleMembership(studentId,schoolId,gradeId,checked){
  if(checked)addMembership(studentId,schoolId,gradeId);
  else removeMembership(studentId,schoolId,gradeId);
  const s=data.students.find(x=>x.id===studentId);
  if(s){
    const first=data.memberships.find(m=>m.studentId===studentId);
    s.schoolId=first?first.schoolId:data.filter.schoolId;
    s.gradeId=first?first.gradeId:data.filter.gradeId;
  }
  saveAndRender("班級成員已更新");
}
function rankedStudents(){
  return [...filteredStudents()].sort((a,b)=>(b.level-a.level)||(b.points-a.points)||a.name.localeCompare(b.name,"zh-Hant"));
}
function selected(){
  let s=data.students.find(x=>x.id===data.selectedId);
  if(s)return s;
  s=filteredStudents()[0]||data.students[0]||null;
  if(s)data.selectedId=s.id;
  return s;
}
function setFilter(k,v){
  data.filter[k]=v;
  const fs=filteredStudents();
  data.selectedId=fs[0]?.id||null;
  saveAndRender();
}
function selectStudent(id){
  data.selectedId=id;
  if(!isStudentInClass(id,data.filter.schoolId,data.filter.gradeId)){
    const m=data.memberships.find(x=>x.studentId===id);
    if(m){data.filter.schoolId=m.schoolId;data.filter.gradeId=m.gradeId;}
  }
  saveAndRender();
}
function selectTopStudent(){const s=rankedStudents()[0];if(s)selectStudent(s.id);else toast("目前沒有學生")}

function addStudent(){
  const name=document.getElementById("newName")?.value.trim();
  if(!name){toast("請輸入學生姓名");return}
  const s={id:uid(),name,level:clamp(document.getElementById("newLevel")?.value||1),points:0,photo:"",notes:"",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId};
  data.students.push(s);
  addMembership(s.id,data.filter.schoolId,data.filter.gradeId);
  data.selectedId=s.id;setVal("newName","");
  saveAndRender("已新增學生");
}
function updateSelected(k,v){
  const s=selected();if(!s)return;
  s[k]=v;
  if(k==="level")s.level=clamp(v);
  if(k==="schoolId"||k==="gradeId"){data.filter.schoolId=s.schoolId;data.filter.gradeId=s.gradeId}
  saveAndRender();
}
function setLevelManual(v){updateSelected("level",v)}
function changeLevel(delta){
  const s=selected();if(!s)return;
  const old=s.level;
  s.level=clamp((parseInt(s.level)||1)+delta);
  saveAndRender(`${s.name} 現在 Lv.${s.level}`);
  if(s.level>old)showLevelUpOverlay(s);
}
function deleteSelected(){
  const s=selected();if(!s)return;
  if(!confirm(`確定刪除 ${s.name}？`))return;
  data.students=data.students.filter(x=>x.id!==s.id);
  data.memberships=data.memberships.filter(m=>m.studentId!==s.id);
  data.attendance=data.attendance.filter(a=>a.studentId!==s.id);
  data.points=data.points.filter(p=>p.studentId!==s.id);
  data.selectedId=filteredStudents()[0]?.id||null;
  saveAndRender("已刪除學生");
}
function loadPhoto(e){
  const file=e.target.files[0],s=selected();if(!file||!s)return;
  const r=new FileReader();
  r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const max=420;let w=img.width,h=img.height;if(w>h&&w>max){h*=max/w;w=max}else if(h>max){w*=max/h;h=max}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);s.photo=c.toDataURL("image/jpeg",0.78);saveAndRender("照片已更新")};img.src=r.result};
  r.readAsDataURL(file);
}
function resetPhoto(){const s=selected();if(s){s.photo="";saveAndRender("已移除照片")}}


function currentAttendanceScope(){
  return {
    schoolId:data.filter.schoolId,
    gradeId:data.filter.gradeId,
    scope:"class"
  };
}
function sameAttendanceScope(a,date,studentId){
  const sc=currentAttendanceScope();
  return a &&
    a.date===date &&
    a.studentId===studentId &&
    a.schoolId===sc.schoolId &&
    a.gradeId===sc.gradeId &&
    (a.scope||"class")===(sc.scope||"class");
}
function attendanceKey(studentId,date=todayStr()){
  return data.attendance.find(a=>sameAttendanceScope(a,date,studentId));
}
function todayAttendance(){
  const sc=currentAttendanceScope();
  return data.attendance.filter(a=>a.date===todayStr()&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class"));
}
function attendanceStatus(studentId){return attendanceKey(studentId)?.status||""}
function attendanceReason(studentId){return attendanceKey(studentId)?.reason||""}
function setAttendance(studentId,status,reason=""){
  ensureTodayInAttendanceDates();
  const s=data.students.find(x=>x.id===studentId);if(!s)return;
  const sc=currentAttendanceScope();
  let a=attendanceKey(studentId);
  if(a){a.status=status;a.reason=reason||"";a.schoolId=sc.schoolId;a.gradeId=sc.gradeId;a.scope=sc.scope;}
  else data.attendance.push({id:uid(),date:todayStr(),studentId,status,reason:reason||"",schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope});
  saveAndRender();
}
function setLeave(studentId){
  const reason=prompt("請輸入請假原因：",attendanceReason(studentId)||"");
  if(reason===null)return;
  setAttendance(studentId,"leave",reason);
}
function markAllPresent(){
  ensureTodayInAttendanceDates();
  const sc=currentAttendanceScope();
  filteredStudents().forEach(s=>{
    let a=attendanceKey(s.id);
    if(a){a.status="present";a.reason="";a.schoolId=sc.schoolId;a.gradeId=sc.gradeId;a.scope=sc.scope;}
    else data.attendance.push({id:uid(),date:todayStr(),studentId:s.id,status:"present",reason:"",schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope});
  });
  saveAndRender("已標記全班出席");
}
function clearTodayAttendance(){
  const sc=currentAttendanceScope();
  data.attendance=data.attendance.filter(a=>!(a.date===todayStr()&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class")));
  saveAndRender("已清除今日點名");
}

function classAttendanceDates(){
  data.attendanceDates=data.attendanceDates||[];
  const sc=currentAttendanceScope();
  return data.attendanceDates.filter(d=>d.schoolId===sc.schoolId&&d.gradeId===sc.gradeId&&(d.scope||"class")===(sc.scope||"class")).sort((a,b)=>a.date.localeCompare(b.date));
}
function ensureTodayInAttendanceDates(){
  data.attendanceDates=data.attendanceDates||[];
  const sc=currentAttendanceScope();
  const exists=data.attendanceDates.some(d=>d.date===todayStr()&&d.schoolId===sc.schoolId&&d.gradeId===sc.gradeId&&(d.scope||"class")===(sc.scope||"class"));
  if(!exists)data.attendanceDates.push({id:uid(),date:todayStr(),schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope,note:"今日上課"});
}
function addAttendanceDate(){
  const date=prompt("請輸入上課日期（格式：YYYY-MM-DD）：",todayStr());
  if(!date)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast("日期格式請用 YYYY-MM-DD");return}
  data.attendanceDates=data.attendanceDates||[];
  const sc=currentAttendanceScope();
  const exists=data.attendanceDates.some(d=>d.date===date&&d.schoolId===sc.schoolId&&d.gradeId===sc.gradeId&&(d.scope||"class")===(sc.scope||"class"));
  if(exists){toast("這個日期已存在");return}
  data.attendanceDates.push({id:uid(),date,schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope,note:""});
  saveAndRender("已新增上課日");
}
function deleteAttendanceDate(date){
  if(!confirm(`確定刪除 ${date} 這個上課日？點名紀錄也會一併從總覽移除。`))return;
  const sc=currentAttendanceScope();
  data.attendanceDates=data.attendanceDates.filter(d=>!(d.date===date&&d.schoolId===sc.schoolId&&d.gradeId===sc.gradeId&&(d.scope||"class")===(sc.scope||"class")));
  data.attendance=data.attendance.filter(a=>!(a.date===date&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class")));
  saveAndRender("已刪除上課日");
}
function generateWeeklyAttendanceDates(){
  const start=document.getElementById("attStartDate")?.value||todayStr();
  const weeks=parseInt(document.getElementById("attWeeks")?.value)||20;
  const startDate=new Date(start+"T00:00:00");
  if(isNaN(startDate)){toast("請輸入正確起始日期");return}
  data.attendanceDates=data.attendanceDates||[];
  const sc=currentAttendanceScope();
  let added=0;
  for(let i=0;i<weeks;i++){
    const d=new Date(startDate);
    d.setDate(startDate.getDate()+i*7);
    const date=d.toISOString().slice(0,10);
    const exists=data.attendanceDates.some(x=>x.date===date&&x.schoolId===sc.schoolId&&x.gradeId===sc.gradeId&&(x.scope||"class")===(sc.scope||"class"));
    if(!exists){data.attendanceDates.push({id:uid(),date,schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope,note:`第${i+1}週`});added++;}
  }
  saveAndRender(`已新增 ${added} 個上課日`);
}
function setAttendanceForDate(studentId,date,status,reason=""){
  const s=data.students.find(x=>x.id===studentId);if(!s)return;
  const sc=currentAttendanceScope();
  let a=data.attendance.find(x=>sameAttendanceScope(x,date,studentId));
  if(a){a.status=status;a.reason=reason||"";a.schoolId=sc.schoolId;a.gradeId=sc.gradeId;a.scope=sc.scope;}
  else data.attendance.push({id:uid(),date,studentId,status,reason:reason||"",schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope});
}
function cycleAttendanceCell(studentId,date){
  const order=["","present","late","absent","leave"];
  const current=(data.attendance.find(a=>sameAttendanceScope(a,date,studentId))||{}).status||"";
  const next=order[(order.indexOf(current)+1)%order.length];
  if(next===""){
    data.attendance=data.attendance.filter(a=>!sameAttendanceScope(a,date,studentId));
  }else{
    const reason=next==="leave" ? (prompt("請輸入請假原因：","")||"") : "";
    setAttendanceForDate(studentId,date,next,reason);
  }
  saveAndRender();
}
function statusShort(st){return st==="present"?"✓":st==="late"?"遲":st==="absent"?"缺":st==="leave"?"假":""}
function renderAttendanceOverview(){
  const chips=document.getElementById("attendanceDateChips");
  const table=document.getElementById("attendanceOverviewTable");
  if(!chips||!table)return;
  const dates=classAttendanceDates();
  chips.innerHTML=dates.map(d=>`<span class="date-chip">${d.date}<button onclick="deleteAttendanceDate('${d.date}')">×</button></span>`).join("")||`<p class="small">尚未建立上課日期。可按「產生每週日期」或「新增上課日」。</p>`;
  const students=filteredStudents();
  let html=`<thead><tr><th>姓名 / 出席率</th>${dates.map(d=>`<th>${d.date.slice(5)}</th>`).join("")}</tr></thead><tbody>`;
  students.forEach(s=>{
    const records=dates.map(d=>data.attendance.find(a=>sameAttendanceScope(a,d.date,s.id)));
    const presentLike=records.filter(a=>a&&(a.status==="present"||a.status==="late"||a.status==="leave")).length;
    const rate=dates.length?Math.round(presentLike/dates.length*100):0;
    html+=`<tr><td>${escapeAttr(s.name)}<br><span class="small">出席率 ${dates.length?rate:"-"}%</span></td>`;
    dates.forEach(d=>{
      const a=data.attendance.find(x=>sameAttendanceScope(x,d.date,s.id));
      const st=a?.status||"";
      const reason=a?.reason?` title="${escapeAttr(a.reason)}"`:"";
      html+=`<td onclick="cycleAttendanceCell('${s.id}','${d.date}')"><span class="att-cell ${st||'none'}"${reason}>${statusShort(st)||"—"}</span></td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody>`;
  table.innerHTML=html;
}

function attLabel(st,reason=""){return st==="present"?"出席":st==="absent"?"缺席":st==="late"?"遲到":st==="leave"?`請假${reason?"："+reason:""}`:"未點名"}
function attClass(st){return st==="present"?"att-present":st==="absent"?"att-absent":st==="late"?"att-late":st==="leave"?"att-leave":""}

function addPoints(studentId,delta,reason="手動加減分"){
  const s=data.students.find(x=>x.id===studentId);if(!s)return;
  s.points=(parseInt(s.points)||0)+delta;
  data.points.push({id:uid(),date:todayStr(),studentId,delta,reason,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});
  saveAndRender(delta>0?`+${delta} 點`:`${delta} 點`);
}
function addPointsToClass(delta){
  filteredStudents().forEach(s=>{
    s.points=(parseInt(s.points)||0)+delta;
    data.points.push({id:uid(),date:todayStr(),studentId:s.id,delta,reason:"全班加分",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});
  });
  saveAndRender(`全班 ${delta>0?"+":""}${delta} 點`);
}
function drawRandomStudent(){
  const arr=filteredStudents();if(!arr.length){toast("目前班級沒有學生");return}
  const s=arr[Math.floor(Math.random()*arr.length)];
  setText("drawResult",`🎲 ${s.name}`);setText("displayDraw",`🎲 ${s.name}`);
  data.selectedId=s.id;persist();renderAll();
}

function renderSelects(){
  ["filterSchool","studentSchool","classSchool"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=optionHTML(data.schools,data.filter.schoolId)});
  ["filterGrade","studentGrade","classGrade"].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=optionHTML(data.grades,data.filter.gradeId)});
  const s=selected();
  const es=document.getElementById("editSchool");if(es)es.innerHTML=optionHTML(data.schools,s?.schoolId||data.filter.schoolId);
  const eg=document.getElementById("editGrade");if(eg)eg.innerHTML=optionHTML(data.grades,s?.gradeId||data.filter.gradeId);
  const ss=document.getElementById("studentSelect");if(ss)ss.innerHTML=filteredStudents().map(st=>`<option value="${st.id}" ${st.id===data.selectedId?'selected':''}>${escapeAttr(st.name)}｜Lv.${st.level}</option>`).join("");
}

function renderMembershipEditor(student){
  const box=document.getElementById("membershipEditor");
  if(!box||!student)return;
  let html="";
  data.schools.forEach(sc=>{
    html+=`<div style="grid-column:1/-1;font-weight:1000;color:#7d6b60;margin-top:6px">${escapeAttr(sc.name)}</div>`;
    data.grades.forEach(gr=>{
      const checked=isStudentInClass(student.id,sc.id,gr.id);
      html+=`<label class="member-item"><input type="checkbox" data-v18-membership="1"  ${checked?"checked":""} onchange="toggleMembership('${student.id}','${sc.id}','${gr.id}',this.checked)"> ${escapeAttr(gr.name)}</label>`;
    });
  });
  box.innerHTML=html;
}
function addExistingStudentToCurrentClass(studentId){
  addMembership(studentId,data.filter.schoolId,data.filter.gradeId);
  data.selectedId=studentId;
  saveAndRender("已加入目前班級");
}
function removeStudentFromCurrentClass(studentId){
  if(!confirm("確定將此學生從目前班級/團隊移除？學生資料不會刪除。"))return;
  removeMembership(studentId,data.filter.schoolId,data.filter.gradeId);
  if(data.selectedId===studentId)data.selectedId=filteredStudents()[0]?.id||null;
  saveAndRender("已從目前班級移除");
}
function renderStudentPoolForClass(){
  const box=document.getElementById("studentPoolForClass");
  if(!box)return;
  const outside=data.students.filter(s=>!isStudentInClass(s.id,data.filter.schoolId,data.filter.gradeId)).sort((a,b)=>a.name.localeCompare(b.name,"zh-Hant"));
  box.innerHTML=outside.map(s=>`<div class="student-pool-item">${avatarHTML(s)}<div style="flex:1"><div class="name">${escapeAttr(s.name)}</div><div class="meta">Lv.${s.level}｜可加入 ${schoolName(data.filter.schoolId)} / ${gradeName(data.filter.gradeId)}</div></div><button class="primary" onclick="addExistingStudentToCurrentClass('${s.id}')">加入</button></div>`).join("")||`<p class="small">所有學生都已在目前班級 / 團隊中。</p>`;
}

function renderTeacher(){
  const fs=filteredStudents();
  setText("statCount",fs.length);
  setText("statAvg",fs.length?(fs.reduce((a,s)=>a+s.level,0)/fs.length).toFixed(1):"0");
  setText("statMax",fs.length?Math.max(...fs.map(s=>s.level)):0);
  setText("statPoints",fs.reduce((a,s)=>a+(parseInt(s.points)||0),0));
  const list=document.getElementById("studentList");
  if(list)list.innerHTML=fs.map(s=>`<div class="student-item ${s.id===data.selectedId?'selected':''}" onclick="selectStudent('${s.id}')">${avatarHTML(s)}<div><div class="name">${escapeAttr(s.name)}</div><div class="meta">${schoolName(s.schoolId)}｜${gradeName(s.gradeId)}｜點數 ${s.points||0}</div></div><div class="level-pill">Lv.${s.level}</div></div>`).join("")||`<p class="small">目前沒有學生。</p>`;
  const rank=document.getElementById("rankList");
  if(rank)rank.innerHTML=rankedStudents().slice(0,10).map((s,i)=>`<div class="student-item" onclick="selectStudent('${s.id}')"><div class="level-pill">${i+1}</div>${avatarHTML(s)}<div><div class="name">${escapeAttr(s.name)}</div><div class="meta">Lv.${s.level}｜點數 ${s.points||0}</div></div></div>`).join("")||`<p class="small">排行榜尚無資料。</p>`;
  renderEditor();
}
function renderEditor(){
  const s=selected(),empty=document.getElementById("emptyEditor"),ed=document.getElementById("editor");
  if(!s){if(empty)empty.classList.remove("hidden");if(ed)ed.classList.add("hidden");return}
  if(empty)empty.classList.add("hidden");if(ed)ed.classList.remove("hidden");
  setVal("editName",s.name);const lev=document.getElementById("editLevel");if(lev){lev.max=maxLevel();lev.value=s.level}
  setVal("editSchool",s.schoolId);setVal("editGrade",s.gradeId);setVal("notes",s.notes||"");
  renderMembershipEditor(s);
  const av=document.getElementById("editAvatar");if(av)av.outerHTML=avatarHTML(s,"avatar");
  const info=levelInfo(s.level);
  setText("stageName",info.stage);setText("bigLevel","Lv."+s.level);
  const bar=document.getElementById("levelBar");if(bar)bar.style.width=pct(s.level)+"%";
  setText("levelPercent",`進度 ${pct(s.level)}%｜距離最高級 Lv.${maxLevel()} 還有 ${maxLevel()-s.level} 級`);
  const obj=document.getElementById("objectives");if(obj)obj.innerHTML=info.goals.map(g=>`<div class="obj">✔ ${escapeAttr(g)}</div>`).join("");
  setText("reward","本級獎勵：🎁 "+info.reward);
  renderStudent();
}
function renderClassroom(){
  const fs=filteredStudents(),att=todayAttendance();
  setText("attPresent",att.filter(a=>a.status==="present").length);
  setText("attAbsent",att.filter(a=>a.status==="absent").length);
  setText("classPoints",fs.reduce((a,s)=>a+(parseInt(s.points)||0),0));
  setText("classAvgLevel",fs.length?(fs.reduce((a,s)=>a+s.level,0)/fs.length).toFixed(1):"0");
  const roster=document.getElementById("classRoster");
  if(roster)roster.innerHTML=fs.map(s=>{
    const st=attendanceStatus(s.id),reason=attendanceReason(s.id);
    return `<div class="class-card"><div class="top">${avatarHTML(s)}<div style="flex:1"><div class="name">${escapeAttr(s.name)}｜Lv.${s.level}｜${s.points||0}點</div><div class="meta">今日點名：<span class="att-badge ${attClass(st)}">${escapeAttr(attLabel(st,reason))}</span></div></div></div>
    <div class="controls class-actions" style="margin-top:8px">
      <button class="good" onclick="setAttendance('${s.id}','present')">出席</button>
      <button class="warn" onclick="setAttendance('${s.id}','absent')">缺席</button>
      <button onclick="setAttendance('${s.id}','late')">遲到</button>
      <button class="blue" onclick="setLeave('${s.id}')">請假</button>
      <button class="blue" onclick="addPoints('${s.id}',1)">+1</button>
      <button onclick="addPoints('${s.id}',5)">+5</button>
      <button class="warn" onclick="addPoints('${s.id}',-1)">-1</button>
      <button class="good" onclick="selectStudent('${s.id}');changeLevel(1)">升級</button><button onclick="removeStudentFromCurrentClass('${s.id}')">移出本班</button>
    </div></div>`;
  }).join("")||`<p class="small">目前沒有學生。</p>`;
}
function renderStudent(){
  const s=selected();if(!s)return;
  const av=document.getElementById("studentAvatar");if(av)av.outerHTML=avatarHTML(s,"avatar big");
  setText("studentName",s.name);
  setText("studentStage",`${schoolName(s.schoolId)}｜${gradeName(s.gradeId)}｜${levelInfo(s.level).stage}`);
  setText("studentLevel","Lv."+s.level);
  const bar=document.getElementById("studentBar");if(bar)bar.style.width=pct(s.level)+"%";
  setText("studentReward","🎁 "+levelInfo(s.level).reward);
  const objs=document.getElementById("studentObjectives");if(objs)objs.innerHTML=levelInfo(s.level).goals.map(g=>`<div class="obj">⭐ ${escapeAttr(g)}</div>`).join("");
  setText("studentNotes",s.notes?`老師備註：${s.notes}`:"");
}
function renderDisplay(){
  const title=document.getElementById("displayClassTitle");if(!title)return;
  const fs=filteredStudents();
  title.textContent=`${schoolName(data.filter.schoolId)}｜${gradeName(data.filter.gradeId)}`;
  setText("displayClassSub",`學生 ${fs.length} 人｜平均 Lv.${fs.length?(fs.reduce((a,s)=>a+s.level,0)/fs.length).toFixed(1):"0"}｜班級點數 ${fs.reduce((a,s)=>a+(s.points||0),0)}`);
  const rank=document.getElementById("displayRank");
  if(rank)rank.innerHTML=rankedStudents().slice(0,5).map((s,i)=>`<div class="display-rank"><div class="rank-no">${i+1}</div>${avatarHTML(s)}<div><div class="name">${escapeAttr(s.name)}</div><div class="meta">Lv.${s.level}｜${s.points||0}點</div></div></div>`).join("")||`<p class="small">尚無排行榜。</p>`;
  const by={};fs.forEach(s=>{by[s.level]=by[s.level]||[];by[s.level].push(s)});
  const board=document.getElementById("displayBoard");
  if(board)board.innerHTML=Array.from({length:maxLevel()},(_,i)=>{const lv=i+1,g=by[lv]||[];return `<div class="tile ${g.length?'active':''}"><div class="lv">Lv.${lv}</div><div class="count">${g.length}</div><div>${g.slice(0,8).map(()=>`<span class="token"></span>`).join("")}</div></div>`}).join("");
}

/* Calendar */
function eventClass(t){return t==="exam"?"event-exam":t==="concert"?"event-concert":t==="school"?"event-school":"event-other"}
function eventTypeName(t){return t==="exam"?"考試":t==="concert"?"演出/活動":t==="school"?"學校行事":"其他"}
function setCalendarSchool(v){data.calendar.schoolId=v;saveAndRender()}
function setCalendarScope(v){data.calendar.scope=v;saveAndRender()}
function setCalendarMonth(v){data.calendar.month=v;saveAndRender()}
function setCalendarSelectedDate(date){
  data.calendar.selectedDate=date;
  if(date)data.calendar.month=date.slice(0,7);
  saveAndRender();
}
function changeMonth(delta){
  const [y,m]=data.calendar.month.split("-").map(Number);
  data.calendar.month=monthStr(new Date(y,m-1+delta,1));
  saveAndRender()
}
function goToday(){data.calendar.month=monthStr();data.calendar.selectedDate=todayStr();saveAndRender()}
function visibleEventsForDate(date){
  return data.events.filter(e=>e.date===date&&(data.calendar.scope==="all"||e.schoolId===data.calendar.schoolId));
}
function renderCalendar(){
  const cs=document.getElementById("calendarSchool");if(!cs)return;
  cs.innerHTML=optionHTML(data.schools,data.calendar.schoolId);
  const es=document.getElementById("eventSchool");if(es)es.innerHTML=optionHTML(data.schools,data.calendar.schoolId);
  setVal("calendarMonth",data.calendar.month);setVal("calendarScope",data.calendar.scope);
  const [y,m]=data.calendar.month.split("-").map(Number),first=new Date(y,m-1,1),start=first.getDay(),days=new Date(y,m,0).getDate();
  setText("calendarTitle",`${y}年${m}月 行事曆`);
  let out=["日","一","二","三","四","五","六"].map(n=>`<div class="day-name">${n}</div>`).join("");
  for(let i=0;i<start;i++)out+="<div></div>";
  for(let d=1;d<=days;d++){
    const date=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const evs=visibleEventsForDate(date);
    const selected=date===data.calendar.selectedDate;
    out+=`<div class="day-cell ${evs.length?'has-events':''} ${selected?'selected-day':''}" onclick="setCalendarSelectedDate('${date}')">
      <div class="day-name">${d}</div>
      ${evs.slice(0,4).map(e=>`<div class="event-chip ${eventClass(e.type)}" onclick="event.stopPropagation();editEvent('${e.id}')">${escapeAttr(e.title)}</div>`).join("")}
      ${evs.length>4?`<div class="small">+${evs.length-4} 筆</div>`:""}
    </div>`
  }
  document.getElementById("calendarGrid").innerHTML=out;
  renderSelectedDateEvents();
}
function quickEventDate(date){setCalendarSelectedDate(date);setVal("eventDate",date)}
function newEventForSelectedDate(){
  clearEventForm();
  setVal("eventDate",data.calendar.selectedDate||todayStr());
  setVal("eventSchool",data.calendar.schoolId);
}
function clearEventForm(){
  ["eventId","eventTitle","eventNotes"].forEach(id=>setVal(id,""));
  setVal("eventDate",data.calendar.selectedDate||todayStr());
  setVal("eventSchool",data.calendar.schoolId);
  setVal("eventType","exam");
}
function eventFormPayload(forceNew=true){
  const id=forceNew ? uid() : (document.getElementById("eventId").value||uid());
  return {
    id,
    date:document.getElementById("eventDate").value||todayStr(),
    schoolId:document.getElementById("eventSchool").value,
    type:document.getElementById("eventType").value,
    title:document.getElementById("eventTitle").value.trim()||"未命名事件",
    notes:document.getElementById("eventNotes").value
  };
}
function saveEvent(){
  const item=eventFormPayload(true);
  data.events.push(item);
  data.calendar.schoolId=item.schoolId;
  data.calendar.selectedDate=item.date;
  data.calendar.month=item.date.slice(0,7);
  clearEventForm();
  saveAndRender("已新增事件");
}
function updateEventFromForm(){
  const id=document.getElementById("eventId").value;
  if(!id){toast("請先點選要修改的事件");return}
  const item=eventFormPayload(false);
  const idx=data.events.findIndex(e=>e.id===id);
  if(idx>=0)data.events[idx]=item;else data.events.push(item);
  data.calendar.schoolId=item.schoolId;
  data.calendar.selectedDate=item.date;
  data.calendar.month=item.date.slice(0,7);
  saveAndRender("事件已更新");
}
function editEvent(id){
  const e=data.events.find(x=>x.id===id);if(!e)return;
  data.calendar.selectedDate=e.date;
  setVal("eventId",e.id);setVal("eventDate",e.date);setVal("eventSchool",e.schoolId);setVal("eventType",e.type);setVal("eventTitle",e.title);setVal("eventNotes",e.notes||"");
  renderSelectedDateEvents();
}
function deleteEvent(){
  const id=document.getElementById("eventId")?.value;
  if(!id){toast("請先點選要刪除的事件");return}
  if(!confirm("確定刪除這個事件？"))return;
  data.events=data.events.filter(e=>e.id!==id);
  clearEventForm();
  saveAndRender("事件已刪除");
}
function renderSelectedDateEvents(){
  const title=document.getElementById("selectedDateTitle");
  const box=document.getElementById("selectedDateEvents");
  if(!title||!box)return;
  const date=data.calendar.selectedDate||todayStr();
  title.textContent=`${date} 當日事件`;
  const evs=visibleEventsForDate(date).sort((a,b)=>eventTypeName(a.type).localeCompare(eventTypeName(b.type),"zh-Hant")||a.title.localeCompare(b.title,"zh-Hant"));
  box.innerHTML=evs.map(e=>`<div class="event-list-item" onclick="editEvent('${e.id}')">
    <div class="top"><div class="name"><span class="event-dot ${e.type}"></span>${escapeAttr(e.title)}</div><div class="att-badge">${eventTypeName(e.type)}</div></div>
    <div class="meta">${schoolName(e.schoolId)}｜${e.date}</div>
    ${e.notes?`<div class="small" style="white-space:pre-wrap;margin-top:6px">${escapeAttr(e.notes)}</div>`:""}
  </div>`).join("")||`<p class="small">這一天目前沒有事件。按「新增當日事件」即可新增。</p>`;
}

/* Lesson logs */
function setLogFilter(k,v){data.logFilter[k]=v;saveAndRender()}function setLogScope(v){data.logFilter.scope=v;saveAndRender()}
function filteredLogs(){return data.lessonLogs.filter(l=>data.logFilter.scope==="all"||(data.logFilter.scope==="school"?l.schoolId===data.logFilter.schoolId:l.schoolId===data.logFilter.schoolId&&l.gradeId===data.logFilter.gradeId)).sort((a,b)=>(b.date||"").localeCompare(a.date||""))}
function newLessonLog(){clearLessonLogForm();setVal("logDate",todayStr());setVal("logSchool",data.logFilter.schoolId);setVal("logGrade",data.logFilter.gradeId)}
function clearLessonLogForm(){["logId","logTitle","logContent","logNext"].forEach(id=>setVal(id,""));setVal("logDate",todayStr())}
function saveLessonLog(){const id=document.getElementById("logId").value||uid(),item={id,date:document.getElementById("logDate").value||todayStr(),title:document.getElementById("logTitle").value.trim()||"未命名課程",schoolId:document.getElementById("logSchool").value,gradeId:document.getElementById("logGrade").value,content:document.getElementById("logContent").value,next:document.getElementById("logNext").value};const idx=data.lessonLogs.findIndex(l=>l.id===id);if(idx>=0)data.lessonLogs[idx]=item;else data.lessonLogs.push(item);data.logFilter.schoolId=item.schoolId;data.logFilter.gradeId=item.gradeId;saveAndRender("上課紀錄已儲存");setVal("logId",id)}
function editLessonLog(id){const l=data.lessonLogs.find(x=>x.id===id);if(!l)return;setVal("logId",l.id);setVal("logDate",l.date);setVal("logTitle",l.title);setVal("logSchool",l.schoolId);setVal("logGrade",l.gradeId);setVal("logContent",l.content);setVal("logNext",l.next)}
function deleteLessonLog(){const id=document.getElementById("logId")?.value;if(!id)return;data.lessonLogs=data.lessonLogs.filter(l=>l.id!==id);clearLessonLogForm();saveAndRender("紀錄已刪除")}
function renderLessonLogs(){
  const el=document.getElementById("logFilterSchool");if(!el)return;
  el.innerHTML=optionHTML(data.schools,data.logFilter.schoolId);document.getElementById("logSchool").innerHTML=optionHTML(data.schools,data.logFilter.schoolId);
  document.getElementById("logFilterGrade").innerHTML=optionHTML(data.grades,data.logFilter.gradeId);document.getElementById("logGrade").innerHTML=optionHTML(data.grades,data.logFilter.gradeId);
  setVal("logScope",data.logFilter.scope);
  document.getElementById("lessonLogList").innerHTML=filteredLogs().map(l=>`<div class="log-card" onclick="editLessonLog('${l.id}')"><div class="name">${escapeAttr(l.title)}</div><div class="meta">${l.date}｜${schoolName(l.schoolId)}｜${gradeName(l.gradeId)}</div><div style="white-space:pre-wrap;margin-top:8px">${escapeAttr(l.content)}</div>${l.next?`<div class="reward">下次提醒：${escapeAttr(l.next)}</div>`:""}</div>`).join("")||`<p class="small">目前沒有紀錄。</p>`;
}

/* Course plans */
function setCourseFilter(k,v){data.courseFilter[k]=v;clearCoursePlanForm();saveAndRender()}
function filteredCoursePlans(){return data.coursePlans.filter(c=>c.schoolId===data.courseFilter.schoolId&&c.gradeId===data.courseFilter.gradeId).sort((a,b)=>(a.week||"").localeCompare(b.week||"","zh-Hant",{numeric:true}))}
function newCoursePlan(){clearCoursePlanForm()}function clearCoursePlanForm(){["courseId","courseWeek","courseLevelRange","courseTitle","courseGoals","courseActivities"].forEach(id=>setVal(id,""));setVal("courseSchool",data.courseFilter.schoolId);setVal("courseGrade",data.courseFilter.gradeId)}
function saveCoursePlan(){const id=document.getElementById("courseId").value||uid(),item={id,schoolId:document.getElementById("courseSchool").value,gradeId:document.getElementById("courseGrade").value,week:document.getElementById("courseWeek").value.trim()||"未設定週次",levelRange:document.getElementById("courseLevelRange").value.trim(),title:document.getElementById("courseTitle").value.trim()||"未命名主題",goals:document.getElementById("courseGoals").value,activities:document.getElementById("courseActivities").value};const idx=data.coursePlans.findIndex(c=>c.id===id);if(idx>=0)data.coursePlans[idx]=item;else data.coursePlans.push(item);data.courseFilter={schoolId:item.schoolId,gradeId:item.gradeId};saveAndRender("課程已儲存");setVal("courseId",id)}
function editCoursePlan(id){const c=data.coursePlans.find(x=>x.id===id);if(!c)return;setVal("courseId",c.id);setVal("courseSchool",c.schoolId);setVal("courseGrade",c.gradeId);setVal("courseWeek",c.week);setVal("courseLevelRange",c.levelRange);setVal("courseTitle",c.title);setVal("courseGoals",c.goals);setVal("courseActivities",c.activities)}
function deleteCoursePlan(){const id=document.getElementById("courseId")?.value;if(!id)return;data.coursePlans=data.coursePlans.filter(c=>c.id!==id);clearCoursePlanForm();saveAndRender("課程已刪除")}
function defaultCourseSamples(){return [["第1週","Lv.1–2","吹出聲音與高低音感知","吹出聲音\\n認識排笛高低音","聲音探索、氣息遊戲、短獎勵任務"],["第2週","Lv.3–4","穩定長音與兩音切換","長音3秒\\n分辨高低音","長音挑戰、老師模仿、兩音接龍"],["第3週","Lv.5–6","五線譜上下與Do/C","認識五線譜上下\\n吹出Do","Do定位、音符卡、吹奏任務"],["第4週","Lv.7–8","Re/D與Do-Re換音","認識Re\\nDo-Re不中斷","雙音連擊、音符辨識小測驗"],["第5週","Lv.9–10","Mi/E與CDE","認識Mi\\n吹Do-Re-Mi","三音旋律、CDE紙筆小任務"]]}
function generateDefaultCoursePlan(){const f=data.courseFilter;if(filteredCoursePlans().length&&!confirm("目前班級已有課程，確定加入範本？"))return;defaultCourseSamples().forEach(s=>data.coursePlans.push({id:uid(),schoolId:f.schoolId,gradeId:f.gradeId,week:s[0],levelRange:s[1],title:s[2],goals:s[3],activities:s[4]}));saveAndRender("已加入課程範本")}
function renderCoursePlans(){
  const el=document.getElementById("courseFilterSchool");if(!el)return;
  el.innerHTML=optionHTML(data.schools,data.courseFilter.schoolId);document.getElementById("courseSchool").innerHTML=optionHTML(data.schools,data.courseFilter.schoolId);
  document.getElementById("courseFilterGrade").innerHTML=optionHTML(data.grades,data.courseFilter.gradeId);document.getElementById("courseGrade").innerHTML=optionHTML(data.grades,data.courseFilter.gradeId);
  const plans=filteredCoursePlans();setText("courseCount",plans.length);setText("courseListTitle",`全年課程列表｜${schoolName(data.courseFilter.schoolId)}／${gradeName(data.courseFilter.gradeId)}`);
  document.getElementById("coursePlanList").innerHTML=plans.map(c=>`<div class="course-card" onclick="editCoursePlan('${c.id}')"><div class="name">${escapeAttr(c.week)}｜${escapeAttr(c.title)}</div><div class="meta">${schoolName(c.schoolId)}｜${gradeName(c.gradeId)}｜${escapeAttr(c.levelRange)}</div><div style="white-space:pre-wrap;margin-top:8px"><b>目標：</b>\\n${escapeAttr(c.goals)}</div><div style="white-space:pre-wrap;margin-top:8px"><b>活動：</b>\\n${escapeAttr(c.activities)}</div></div>`).join("")||`<p class="small">目前這個班級沒有課程總覽。</p>`;
}

/* Level management */
function renderLevelsManage(){
  const list=document.getElementById("levelManageList");if(!list)return;
  list.innerHTML=data.levels.slice(1).map((lv,i)=>`<div class="student-item ${data.selectedLevel===i+1?'selected':''}" onclick="selectLevelToEdit(${i+1})"><div class="level-pill">Lv.${i+1}</div><div><div class="name">${escapeAttr(lv.stage)}</div><div class="meta">${escapeAttr(lv.reward)}｜${lv.goals.length}目標</div></div></div>`).join("");
  renderLevelEditor();
}
function selectLevelToEdit(n){data.selectedLevel=clamp(n);saveAndRender()}
function renderLevelEditor(){
  const empty=document.getElementById("levelEditorEmpty");if(!empty)return;
  const n=clamp(data.selectedLevel),lv=levelInfo(n);
  empty.classList.add("hidden");document.getElementById("levelEditor").classList.remove("hidden");
  setVal("levelEditNumber","Lv."+n);setVal("levelEditStage",lv.stage);setVal("levelEditReward",lv.reward);setVal("levelEditGoals",lv.goals.join("\n"));
  setText("levelPreviewStage",lv.stage);setText("levelPreviewNumber","Lv."+n);
  document.getElementById("levelPreviewGoals").innerHTML=lv.goals.map(g=>`<div class="obj">✔ ${escapeAttr(g)}</div>`).join("");
  setText("levelPreviewReward","本級獎勵：🎁 "+lv.reward);
}
function updateLevelField(k,v){data.levels[clamp(data.selectedLevel)][k]=v;saveAndRender()}
function updateLevelGoals(t){data.levels[clamp(data.selectedLevel)].goals=t.split("\n").map(x=>x.trim()).filter(Boolean);saveAndRender()}
function addGoalToLevel(){data.levels[clamp(data.selectedLevel)].goals.push("新增目標");saveAndRender()}
function removeLastGoalFromLevel(){data.levels[clamp(data.selectedLevel)].goals.pop();saveAndRender()}
function addLevel(){data.levels.push({stage:"自訂階段",reward:`Lv.${maxLevel()+1} 獎勵`,goals:["請輸入目標"]});data.selectedLevel=maxLevel();saveAndRender()}
function deleteLastLevel(){if(maxLevel()<=1)return;data.levels.pop();data.students.forEach(s=>s.level=clamp(s.level));saveAndRender()}
function resetLevelsConfirm(){if(confirm("恢復預設50級？")){data.levels=JSON.parse(JSON.stringify(defaultLevels));saveAndRender()}}

/* Manage */
function addSchool(){const name=document.getElementById("newSchoolName")?.value.trim();if(!name)return;const x={id:uid(),name};data.schools.push(x);data.filter.schoolId=x.id;setVal("newSchoolName","");saveAndRender("已新增學校")}
function addGrade(){const name=document.getElementById("newGradeName")?.value.trim();if(!name)return;const x={id:uid(),name};data.grades.push(x);data.filter.gradeId=x.id;setVal("newGradeName","");saveAndRender("已新增年級/班級")}
function renameItem(type,id,value){const it=data[type].find(x=>x.id===id);if(it){it.name=value.trim()||it.name;saveAndRender()}}
function deleteItem(type,id){if(data[type].length<=1){toast("至少保留一個");return}const first=data[type].find(x=>x.id!==id);if(type==="schools"){data.students.forEach(s=>{if(s.schoolId===id)s.schoolId=first.id});data.memberships.forEach(m=>{if(m.schoolId===id)m.schoolId=first.id});data.schools=data.schools.filter(x=>x.id!==id);data.filter.schoolId=first.id}else{data.students.forEach(s=>{if(s.gradeId===id)s.gradeId=first.id});data.memberships.forEach(m=>{if(m.gradeId===id)m.gradeId=first.id});data.grades=data.grades.filter(x=>x.id!==id);data.filter.gradeId=first.id}saveAndRender("已刪除")}
function renderManage(){
  const s=document.getElementById("schoolManage");if(!s)return;
  s.innerHTML=data.schools.map(x=>`<div class="row" style="margin-bottom:8px"><input value="${escapeAttr(x.name)}" onchange="renameItem('schools','${x.id}',this.value)"><button class="warn" onclick="deleteItem('schools','${x.id}')">刪除</button></div>`).join("");
  document.getElementById("gradeManage").innerHTML=data.grades.map(x=>`<div class="row" style="margin-bottom:8px"><input value="${escapeAttr(x.name)}" onchange="renameItem('grades','${x.id}',this.value)"><button class="warn" onclick="deleteItem('grades','${x.id}')">刪除</button></div>`).join("");
}

/* Level up animation */
function showLevelUpOverlay(student){
  const overlay=document.getElementById("levelupOverlay");if(!overlay||!student)return;
  setText("levelupName",student.name||"學生");setText("levelupLevel","Lv."+student.level);setText("levelupReward","🎁 "+(levelInfo(student.level).reward||"升級成功"));
  overlay.classList.add("show");launchConfetti();setTimeout(()=>hideLevelUp(),3200);
}
function hideLevelUp(){const o=document.getElementById("levelupOverlay");if(o)o.classList.remove("show")}
function launchConfetti(){const colors=["#f1b15f","#c47a3c","#6aa66a","#5c8dc7","#d26b6b","#fff0c7"];for(let i=0;i<48;i++){const p=document.createElement("div");p.className="confetti";p.style.left=Math.random()*100+"vw";p.style.background=colors[Math.floor(Math.random()*colors.length)];p.style.animationDelay=(Math.random()*0.35)+"s";p.style.animationDuration=(1.3+Math.random()*1.1)+"s";document.body.appendChild(p);setTimeout(()=>p.remove(),2600)}}

/* Google sync */
function saveApiUrl(){const url=document.getElementById("apiUrl")?.value.trim();localStorage.setItem(API_KEY,url);toast("已記住雲端網址，以後不用重貼")}
function clearApiUrl(){localStorage.removeItem(API_KEY);setVal("apiUrl","");toast("已清除網址")}



function dataCountSummary(d){d=d||{};const keys=["students","memberships","attendance","attendanceDates","points","events","lessonLogs","coursePlans","classNotes","noteQuizHistory","rewards","redemptions"];const counts={};keys.forEach(k=>counts[k]=Array.isArray(d[k])?d[k].length:0);counts.total=keys.reduce((sum,k)=>sum+counts[k],0);return counts}
function mergeById(cloudArr=[],localArr=[]){const map=new Map();(cloudArr||[]).forEach(x=>{if(x&&x.id)map.set(x.id,x)});(localArr||[]).forEach(x=>{if(!x||!x.id)return;const old=map.get(x.id);map.set(x.id,old?{...old,...x}:x)});return Array.from(map.values())}
function mergeCloudData(cloud,local){cloud=normalize(cloud||{});local=normalize(local||{});const merged={...cloud,...local};["schools","grades","levels","students","memberships","attendance","attendanceDates","points","events","lessonLogs","coursePlans","classNotes","noteQuizHistory","rewards","redemptions"].forEach(k=>{merged[k]=mergeById(cloud[k]||[],local[k]||[])});merged.filter=local.filter||cloud.filter;merged.calendar=local.calendar||cloud.calendar;merged.logFilter=local.logFilter||cloud.logFilter;merged.courseFilter=local.courseFilter||cloud.courseFilter;merged.selectedId=local.selectedId||cloud.selectedId;merged.selectedLevel=local.selectedLevel||cloud.selectedLevel||1;merged.updatedAt=Date.now();return normalize(merged)}
async function fetchCloudData(){const url=localStorage.getItem(API_KEY);if(!url)throw new Error("NO_URL");const res=await fetch(url+"?action=loadAll&ts="+Date.now());const j=await res.json();if(!j.ok)throw new Error(j.error||"讀取失敗");return normalize(j.payload||{})}
async function postCloudData(payload,mode="safe"){const url=localStorage.getItem(API_KEY);if(!url)throw new Error("NO_URL");const res=await fetch(url,{method:"POST",body:JSON.stringify({action:"saveAll",payload,mode})});const j=await res.json();if(!j.ok)throw new Error(j.error||"儲存失敗");return j}
async function saveToCloud(){return safeSaveToCloud()}
async function safeSaveToCloud(){const url=localStorage.getItem(API_KEY);if(!url){toast("請先貼上 Apps Script 網址");setView("sync");return}try{persist();const local=normalize(data);let cloud=normalize({});try{cloud=await fetchCloudData()}catch(e){cloud=normalize({})}const lc=dataCountSummary(local),cc=dataCountSummary(cloud);if(lc.total===0&&cc.total>0){alert("偵測到本機是空資料，但雲端有資料。已取消儲存，避免把雲端清空。請先按「讀取雲端」。");return}if(lc.total<Math.max(3,Math.floor(cc.total*0.5))){const ok=confirm(`安全提醒：本機資料量(${lc.total})明顯少於雲端(${cc.total})。\\n建議先按「讀取雲端」。\\n\\n仍要進行安全合併儲存嗎？`);if(!ok)return}const merged=mergeCloudData(cloud,local);await postCloudData(merged,"safeMerge");data=normalize(merged);persist();renderAll();toast("已安全合併並儲存雲端")}catch(e){console.error(e);if(e.message==="NO_URL"){toast("請先貼上 Apps Script 網址");setView("sync")}else toast("安全儲存失敗，請檢查 Apps Script 權限")}}
async function forceSaveToCloud(){const url=localStorage.getItem(API_KEY);if(!url){toast("請先貼上 Apps Script 網址");setView("sync");return}const summary=dataCountSummary(data);const ok=confirm(`危險操作：強制覆蓋會用本機資料取代雲端。\\n目前本機資料總數：${summary.total}\\n\\n確定要強制覆蓋嗎？`);if(!ok)return;try{persist();await postCloudData(normalize(data),"forceOverwrite");toast("已強制覆蓋雲端")}catch(e){console.error(e);toast("強制覆蓋失敗")}}
async function loadFromCloud(){const url=localStorage.getItem(API_KEY);if(!url){toast("請先貼上 Apps Script 網址");setView("sync");return}try{const cloud=await fetchCloudData();const cc=dataCountSummary(cloud),lc=dataCountSummary(data);if(cc.total===0&&lc.total>0){const ok=confirm("雲端目前看起來是空的。是否仍要讀取並覆蓋本機？\\n建議取消，避免本機資料被空資料覆蓋。");if(!ok)return}data=normalize(cloud);persist();renderAll();toast("已從 Google 試算表讀取")}catch(e){console.error(e);if(e.message==="NO_URL"){toast("請先貼上 Apps Script 網址");setView("sync")}else toast("讀取失敗，請檢查 Apps Script 權限")}}

function exportData(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="battle-panflute-v5-backup.json";a.click()}
function importData(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{data=normalize(JSON.parse(r.result));saveAndRender("匯入完成")};r.readAsText(file);e.target.value=""}

const NOTE_BANK = [
  {id:"G3",label:"低音G ㄙㄛ",step:-5},{id:"A3",label:"低音A ㄌㄚ",step:-4},{id:"B3",label:"低音B ㄒㄧ",step:-3},{id:"C4",label:"中央C ㄉㄛ",step:-2},{id:"D4",label:"D ㄖㄨㄟ",step:-1},{id:"E4",label:"E ㄇㄧ",step:0},{id:"F4",label:"F ㄈㄚ",step:1},{id:"G4",label:"G ㄙㄛ",step:2},{id:"A4",label:"A ㄌㄚ",step:3},{id:"B4",label:"B ㄒㄧ",step:4},{id:"C5",label:"高音C ㄉㄛ",step:5},{id:"D5",label:"高音D ㄖㄨㄟ",step:6},{id:"E5",label:"高音E ㄇㄧ",step:7},{id:"F5",label:"高音F ㄈㄚ",step:8},{id:"G5",label:"高音G ㄙㄛ",step:9}
];
let quizState={active:false,total:0,index:0,correct:0,streak:0,points:0,current:null,answered:false,studentId:null,selectedIds:[]};
function renderNoteRangeChecks(){const box=document.getElementById("noteRangeChecks");if(!box)return;box.innerHTML=NOTE_BANK.map(n=>`<label class="note-check"><input type="checkbox" class="noteRangeInput" value="${n.id}" checked> ${n.label}</label>`).join("");}
function selectNoteRange(type){const sets={low:["G3","A3","B3","C4"],basic:["C4","D4","E4","F4","G4"],full:NOTE_BANK.map(n=>n.id)};document.querySelectorAll(".noteRangeInput").forEach(i=>i.checked=sets[type].includes(i.value));}
function clearNoteRange(){document.querySelectorAll(".noteRangeInput").forEach(i=>i.checked=false)}
function selectedNotePool(){const ids=[...document.querySelectorAll(".noteRangeInput:checked")].map(i=>i.value);return NOTE_BANK.filter(n=>ids.includes(n.id));}
function startNoteQuiz(){const pool=selectedNotePool();if(!pool.length){toast("請至少勾選一個音");return}const totalSel=document.getElementById("quizTotal")?.value||"10";const total=totalSel==="custom"?(parseInt(document.getElementById("quizCustomTotal")?.value)||10):parseInt(totalSel);const s=selected();quizState={active:true,total,index:0,correct:0,streak:0,points:0,current:null,answered:false,studentId:s?.id||null,selectedIds:pool.map(n=>n.id)};nextNoteQuestion();toast("測驗開始");}
function nextNoteQuestion(){if(!quizState.active){startNoteQuiz();return}if(quizState.index>=quizState.total){finishNoteQuiz();return}const pool=NOTE_BANK.filter(n=>quizState.selectedIds.includes(n.id));quizState.current=pool[Math.floor(Math.random()*pool.length)];quizState.answered=false;quizState.index++;setText("quizFeedback","請選出正確音名");renderStaffNote(quizState.current);renderQuizOptions();renderQuizStats();}
function answerNote(id){if(!quizState.active||quizState.answered||!quizState.current)return;quizState.answered=true;if(id===quizState.current.id){quizState.correct++;quizState.streak++;let gain=1;if(quizState.streak===3)gain+=2;if(quizState.streak===5)gain+=5;quizState.points+=gain;setText("quizFeedback",`✅ 正確！${gain>1?"連擊加成 ":""}+${gain}`);}else{quizState.streak=0;setText("quizFeedback",`❌ 錯了，正確答案：${quizState.current.label}`);}renderQuizStats();setTimeout(()=>{if(quizState.active)nextNoteQuestion();},750);}
function finishNoteQuiz(){if(!quizState.active){toast("目前沒有進行中的測驗");return}quizState.active=false;const s=data.students.find(x=>x.id===quizState.studentId)||selected();if(s){s.points=(parseInt(s.points)||0)+quizState.points;data.points.push({id:uid(),date:todayStr(),studentId:s.id,delta:quizState.points,reason:"音符閃卡測驗",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});data.noteQuizHistory=data.noteQuizHistory||[];data.noteQuizHistory.push({id:uid(),date:todayStr(),studentId:s.id,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId,total:quizState.total,correct:quizState.correct,points:quizState.points,range:quizState.selectedIds.join(",")});}saveAndRender(`測驗完成：答對 ${quizState.correct}/${quizState.total}，加 ${quizState.points} 點`);setText("quizFeedback",`🎉 測驗完成！答對 ${quizState.correct}/${quizState.total}，獲得 +${quizState.points}`);}
function renderQuizOptions(){const box=document.getElementById("quizOptions");if(!box)return;const pool=NOTE_BANK.filter(n=>quizState.selectedIds.includes(n.id));let opts=[quizState.current,...pool.filter(n=>n.id!==quizState.current.id).sort(()=>Math.random()-0.5).slice(0,5)].sort(()=>Math.random()-0.5);box.innerHTML=opts.map(n=>`<button onclick="answerNote('${n.id}')">${n.label}</button>`).join("");}
function renderQuizStats(){setText("quizNow",`${Math.min(quizState.index,quizState.total)}/${quizState.total}`);setText("quizCorrect",quizState.correct);setText("quizStreak",quizState.streak);setText("quizPoints",quizState.points);}
function renderStaffNote(note){const svg=document.getElementById("noteStaffSvg");if(!svg)return;if(!note){svg.innerHTML='<text x="340" y="130" text-anchor="middle" font-size="24" fill="#7d6b60">請開始測驗</text>';return}const x=355,baseY=130,gap=12,y=baseY-note.step*(gap/2);let lines="";for(let i=0;i<5;i++){let ly=baseY-i*gap;lines+=`<line x1="120" y1="${ly}" x2="560" y2="${ly}" stroke="#2d241f" stroke-width="2"/>`;}let ledgerYs=[];if(note.step<=-2){for(let st=-2;st>=note.step;st-=2)ledgerYs.push(baseY-st*(gap/2));}if(note.step>=6){for(let st=6;st<=note.step;st+=2)ledgerYs.push(baseY-st*(gap/2));}const ledgers=ledgerYs.map(ly=>`<line x1="${x-32}" y1="${ly}" x2="${x+32}" y2="${ly}" stroke="#2d241f" stroke-width="2"/>`).join("");svg.innerHTML=`<rect x="0" y="0" width="680" height="260" rx="18" fill="#fffaf5"/><text x="135" y="132" font-size="82" font-family="serif" fill="#2d241f">𝄞</text>${lines}${ledgers}<ellipse cx="${x}" cy="${y}" rx="18" ry="13" transform="rotate(-18 ${x} ${y})" fill="#2d241f"/><text x="340" y="225" text-anchor="middle" font-size="18" fill="#7d6b60">高音譜號｜請選出音名＋注音</text>`;}
function renderNoteQuiz(){const sel=document.getElementById("quizStudentSelect");if(!sel)return;sel.innerHTML=filteredStudents().map(s=>`<option value="${s.id}" ${s.id===data.selectedId?'selected':''}>${escapeAttr(s.name)}｜Lv.${s.level}</option>`).join("");if(!document.getElementById("noteRangeChecks")?.innerHTML)renderNoteRangeChecks();if(!quizState.current)renderStaffNote(null);renderQuizStats();renderQuizHistory();}
function renderQuizHistory(){const box=document.getElementById("quizHistoryList");if(!box)return;const rows=(data.noteQuizHistory||[]).filter(h=>h.schoolId===data.filter.schoolId&&h.gradeId===data.filter.gradeId).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);box.innerHTML=rows.map(h=>{const s=data.students.find(x=>x.id===h.studentId);const rate=h.total?Math.round(h.correct/h.total*100):0;return `<div class="log-card"><div class="name">${escapeAttr(s?.name||"學生")}｜${h.correct}/${h.total}｜${rate}%｜+${h.points}</div><div class="meta">${h.date}｜範圍：${escapeAttr(h.range||"")}</div></div>`;}).join("")||'<p class="small">尚無測驗紀錄。</p>';}
function defaultAbility(){
  return {pitch:3,rhythm:3,sight:3,breath:3,tone:3,expression:3};
}
function normalizeAbility(s){
  s.ability=s.ability||defaultAbility();
  ABILITY_KEYS.forEach(a=>{
    let v=parseInt(s.ability[a.key]);
    if(!v||v<1||v>5)v=3;
    s.ability[a.key]=v;
  });
}
function updateAbility(key,val){
  const s=selected();if(!s)return;
  normalizeAbility(s);
  s.ability[key]=Math.max(1,Math.min(5,parseInt(val)||3));
  persist();renderAbilityEditor(s);renderAbilityCharts();
}
function abilityPoints(s){
  normalizeAbility(s);
  return ABILITY_KEYS.map((a,i)=>{
    const angle=-Math.PI/2 + i*(Math.PI*2/ABILITY_KEYS.length);
    const r=(s.ability[a.key]/5)*118;
    return {x:210+Math.cos(angle)*r,y:170+Math.sin(angle)*r,label:a.label,value:s.ability[a.key],angle};
  });
}
function hexAxisPoints(radius=118){
  return ABILITY_KEYS.map((a,i)=>{
    const angle=-Math.PI/2 + i*(Math.PI*2/ABILITY_KEYS.length);
    return {x:210+Math.cos(angle)*radius,y:170+Math.sin(angle)*radius,label:a.label,angle};
  });
}
function renderHex(svgId,s){
  const svg=document.getElementById(svgId);
  if(!svg)return;
  if(!s){svg.innerHTML=`<text x="210" y="180" text-anchor="middle" font-size="20" fill="#7d6b60">請先選擇學生</text>`;return}
  normalizeAbility(s);
  const rings=[1,2,3,4,5].map(k=>{
    const pts=hexAxisPoints(118*k/5).map(p=>`${p.x},${p.y}`).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="#ead9c8" stroke-width="1"/>`;
  }).join("");
  const axes=hexAxisPoints().map(p=>`<line x1="210" y1="170" x2="${p.x}" y2="${p.y}" stroke="#ead9c8" stroke-width="1.5"/>`).join("");
  const dataPts=abilityPoints(s).map(p=>`${p.x},${p.y}`).join(" ");
  const labels=hexAxisPoints(148).map((p,i)=>{
    const a=ABILITY_KEYS[i], v=s.ability[a.key];
    return `<text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="16" font-weight="900" fill="#5b463a">${a.label}</text>
            <text x="${p.x}" y="${p.y+24}" text-anchor="middle" font-size="14" fill="#c47a3c">${v}/5</text>`;
  }).join("");
  const dots=abilityPoints(s).map(p=>`<circle cx="${p.x}" cy="${p.y}" r="5" fill="#c47a3c"/>`).join("");
  svg.innerHTML=`
    <rect x="0" y="0" width="420" height="360" rx="22" fill="#fffaf5"/>
    ${rings}${axes}
    <polygon points="${dataPts}" fill="rgba(196,122,60,.28)" stroke="#c47a3c" stroke-width="3"/>
    ${dots}
    <circle cx="210" cy="170" r="3" fill="#7d6b60"/>
    ${labels}
  `;
}
function renderAbilityEditor(s){
  const box=document.getElementById("abilityEditor");
  if(!box||!s)return;
  normalizeAbility(s);
  box.innerHTML=ABILITY_KEYS.map(a=>`
    <div class="ability-control">
      <label><span>${a.label}</span><span class="ability-num">${s.ability[a.key]}</span></label>
      <input type="range" min="1" max="5" step="1" value="${s.ability[a.key]}" oninput="updateAbility('${a.key}',this.value)">
    </div>
  `).join("");
  renderAbilitySummary("abilitySummary",s);
}
function renderAbilitySummary(id,s){
  const box=document.getElementById(id);if(!box||!s)return;
  normalizeAbility(s);
  const vals=ABILITY_KEYS.map(a=>({label:a.label,value:s.ability[a.key]}));
  const strong=vals.slice().sort((a,b)=>b.value-a.value)[0];
  const weak=vals.slice().sort((a,b)=>a.value-b.value)[0];
  const avg=(vals.reduce((sum,x)=>sum+x.value,0)/vals.length).toFixed(1);
  box.innerHTML=`
    <div class="ability-pill">平均 ${avg}/5</div>
    <div class="ability-pill">優勢：${strong.label}</div>
    <div class="ability-pill">加強：${weak.label}</div>
  `;
}
function renderAbilityCharts(){
  const s=selected();
  if(s)normalizeAbility(s);
  renderHex("abilityHexSvg",s);
  renderHex("studentAbilityHexSvg",s);
  renderAbilitySummary("studentAbilitySummary",s);
}


let pendingRewardPhoto="";
function rewardStudent(){const id=document.getElementById("rewardStudentSelect")?.value||data.selectedId;return data.students.find(s=>s.id===id)||selected();}
function loadRewardPhoto(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const max=520;let w=img.width,h=img.height;if(w>h&&w>max){h*=max/w;w=max}else if(h>max){w*=max/h;h=max}c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);pendingRewardPhoto=c.toDataURL("image/jpeg",0.78);renderRewardPhotoPreview(pendingRewardPhoto)};img.src=r.result};r.readAsDataURL(file)}
function renderRewardPhotoPreview(src){const box=document.getElementById("rewardPhotoPreview");if(box)box.innerHTML=src?`<img src="${src}">`:"🎁";}
function clearRewardForm(){["rewardId","rewardName","rewardNotes"].forEach(id=>setVal(id,""));setVal("rewardCost",5);setVal("rewardStock",10);pendingRewardPhoto="";renderRewardPhotoPreview("")}
function saveReward(){const id=document.getElementById("rewardId").value||uid();const name=document.getElementById("rewardName").value.trim();if(!name){toast("請輸入獎品名稱");return}const item={id,name,cost:Math.max(0,parseInt(document.getElementById("rewardCost").value)||0),stock:parseInt(document.getElementById("rewardStock").value),photo:pendingRewardPhoto,notes:document.getElementById("rewardNotes").value||"",active:true};if(isNaN(item.stock))item.stock=-1;const old=data.rewards.find(r=>r.id===id);if(old&&!item.photo)item.photo=old.photo||"";const idx=data.rewards.findIndex(r=>r.id===id);if(idx>=0)data.rewards[idx]=item;else data.rewards.push(item);clearRewardForm();saveAndRender("獎品已儲存")}
function editReward(id){const r=data.rewards.find(x=>x.id===id);if(!r)return;setVal("rewardId",r.id);setVal("rewardName",r.name);setVal("rewardCost",r.cost);setVal("rewardStock",r.stock);setVal("rewardNotes",r.notes||"");pendingRewardPhoto=r.photo||"";renderRewardPhotoPreview(pendingRewardPhoto)}
function deleteReward(){const id=document.getElementById("rewardId").value;if(!id){toast("請先選擇獎品");return}if(!confirm("確定刪除這個獎品？既有兌換紀錄會保留。"))return;data.rewards=data.rewards.filter(r=>r.id!==id);clearRewardForm();saveAndRender("獎品已刪除")}
function redeemReward(id){const r=data.rewards.find(x=>x.id===id);const s=rewardStudent();if(!r||!s)return;if(r.stock===0){toast("庫存不足");return}if((parseInt(s.points)||0)<r.cost){toast(`${s.name} 點數不足`);return}if(!confirm(`${s.name} 要兌換「${r.name}」並扣 ${r.cost} 點嗎？`))return;s.points=(parseInt(s.points)||0)-r.cost;if(r.stock>0)r.stock-=1;data.points.push({id:uid(),date:todayStr(),studentId:s.id,delta:-r.cost,reason:`兌換：${r.name}`,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});data.redemptions=data.redemptions||[];data.redemptions.push({id:uid(),date:todayStr(),studentId:s.id,rewardId:r.id,rewardName:r.name,points:r.cost,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});saveAndRender(`已兌換：${r.name}`)}
function undoRedemption(id){const rec=data.redemptions.find(x=>x.id===id);if(!rec)return;if(!confirm("確定取消這筆兌換？會把點數加回去，庫存也加回。"))return;const s=data.students.find(x=>x.id===rec.studentId);const r=data.rewards.find(x=>x.id===rec.rewardId);if(s)s.points=(parseInt(s.points)||0)+rec.points;if(r&&r.stock>=0)r.stock+=1;data.points.push({id:uid(),date:todayStr(),studentId:rec.studentId,delta:rec.points,reason:`取消兌換：${rec.rewardName}`,schoolId:rec.schoolId,gradeId:rec.gradeId});data.redemptions=data.redemptions.filter(x=>x.id!==id);saveAndRender("已取消兌換")}
function renderRewardShop(){const sel=document.getElementById("rewardStudentSelect");if(!sel)return;const students=filteredStudents();sel.innerHTML=students.map(s=>`<option value="${s.id}" ${s.id===data.selectedId?'selected':''}>${escapeAttr(s.name)}｜${s.points||0}點</option>`).join("");const s=rewardStudent();setText("rewardClassInfo",`${schoolName(data.filter.schoolId)}｜${gradeName(data.filter.gradeId)}`);setText("rewardStudentPoints",s?(s.points||0):0);const list=document.getElementById("rewardShopList");if(list){const rewards=(data.rewards||[]).filter(r=>r.active!==false);list.innerHTML=rewards.map(r=>{const enough=s&&(parseInt(s.points)||0)>=r.cost;const stockOk=r.stock!==0;return `<div class="reward-card"><div class="reward-img">${r.photo?`<img src="${r.photo}">`:"🎁"}</div><div class="reward-body"><div class="name">${escapeAttr(r.name)}</div><div class="reward-price">${r.cost} 點</div><div class="reward-stock">庫存：${r.stock<0?"∞":r.stock}</div>${r.notes?`<div class="small">${escapeAttr(r.notes)}</div>`:""}<div class="reward-actions"><button class="primary" ${(!enough||!stockOk)?"disabled":""} onclick="redeemReward('${r.id}')">兌換</button><button onclick="editReward('${r.id}')">編輯</button></div></div></div>`}).join("")||`<p class="small">目前沒有獎品。請先新增獎品。</p>`}renderRedemptionList()}
function renderRedemptionList(){const box=document.getElementById("redemptionList");if(!box)return;const rows=(data.redemptions||[]).filter(x=>x.schoolId===data.filter.schoolId&&x.gradeId===data.filter.gradeId).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);box.innerHTML=rows.map(rec=>{const s=data.students.find(x=>x.id===rec.studentId);const r=data.rewards.find(x=>x.id===rec.rewardId);const photo=r?.photo||"";return `<div class="redemption-item"><div class="reward-thumb">${photo?`<img src="${photo}">`:"🎁"}</div><div style="flex:1"><div class="name">${escapeAttr(s?.name||"學生")}｜${escapeAttr(rec.rewardName)}｜-${rec.points}點</div><div class="meta">${rec.date}</div></div><button class="warn" onclick="undoRedemption('${rec.id}')">取消</button></div>`}).join("")||`<p class="small">目前沒有兌換紀錄。</p>`}

function renderAll(){
  setVal("apiUrl",localStorage.getItem(API_KEY)||"");
  renderSelects();renderTeacher();renderClassroom();renderAttendanceOverview();renderNoteQuiz();renderRewardShop();renderRewardShop();renderDisplay();renderCalendar();renderLessonLogs();renderCoursePlans();renderLevelsManage();renderManage();renderStudentPoolForClass();
}

function hideSplashSoon(){
  const s=document.getElementById("appSplash");
  if(!s)return;
  setTimeout(()=>s.classList.add("hide"),650);
}
function toggleDisplayBoost(){
  document.body.classList.toggle("displayModeBoost");
  toast(document.body.classList.contains("displayModeBoost")?"展示模式已放大":"展示模式已恢復");
}
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}


/* V17 DRIVE IMAGE OVERRIDES */
function v17Toast(msg){ try { toast(msg); } catch(e) { console.log(msg); } }

async function v17ImageFileToBase64Jpg(file, maxSize = 1000, quality = 0.84){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
        else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("圖片讀取失敗，請改用 JPG/PNG 或截圖後再上傳"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}

async function v17UploadImageToDrive(base64, filename){
  const apiUrl = localStorage.getItem(API_KEY);
  if(!apiUrl){
    setView("sync");
    throw new Error("請先到 Google 同步頁貼上 Apps Script Web App URL，並按儲存網址");
  }
  const res = await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify({ action:"uploadImage", filename: filename || ("photo_"+Date.now()+".jpg"), base64 })
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch(e) { throw new Error("Apps Script 回傳不是 JSON，請確認貼的是 /exec 網址"); }
  if(!json.ok) throw new Error(json.error || "圖片上傳失敗");
  if(!json.url) throw new Error("Apps Script 沒有回傳圖片網址");
  return json.url;
}

async function loadPhoto(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const s = selected();
  if(!s) return;
  try{
    v17Toast("照片上傳中...");
    const base64 = await v17ImageFileToBase64Jpg(file, 900, 0.82);
    const url = await v17UploadImageToDrive(base64, "student_" + (s.name || "photo") + "_" + Date.now() + ".jpg");
    s.photo = url;
    persist();
    renderAll();
    v17Toast("照片已上傳到 Google Drive");
  }catch(err){
    console.error(err);
    alert("照片上傳失敗：\n" + (err.message || err));
    v17Toast("照片上傳失敗");
  }
}

async function loadRewardPhoto(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  try{
    v17Toast("獎品照片上傳中...");
    const base64 = await v17ImageFileToBase64Jpg(file, 1000, 0.84);
    pendingRewardPhoto = await v17UploadImageToDrive(base64, "reward_" + Date.now() + ".jpg");
    renderRewardPhotoPreview(pendingRewardPhoto);
    v17Toast("獎品照片已上傳到 Google Drive");
  }catch(err){
    console.error(err);
    alert("獎品照片上傳失敗：\n" + (err.message || err));
    v17Toast("獎品照片上傳失敗");
  }
}
/* END V17 DRIVE IMAGE OVERRIDES */


/* V17.1 DEDUPE + SAFE MERGE PATCH */
function dedupeByNameOrId(arr){
  if(!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  arr.forEach(item => {
    if(!item) return;
    const name = String(item.name || "").trim();
    const key = name ? "name:" + name : "id:" + String(item.id || JSON.stringify(item)).trim();
    if(seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
}

function dedupeMemberships(arr){
  if(!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  arr.forEach(m => {
    if(!m) return;
    const key = [m.studentId, m.schoolId, m.gradeId].join("|");
    if(seen.has(key)) return;
    seen.add(key);
    out.push(m);
  });
  return out;
}

function dedupeEvents(arr){
  if(!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  arr.forEach(e => {
    if(!e) return;
    const key = [e.date, e.schoolId, e.type, e.title, e.note].join("|");
    if(seen.has(key)) return;
    seen.add(key);
    out.push(e);
  });
  return out;
}

function dedupeRewards(arr){
  if(!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  arr.forEach(r => {
    if(!r) return;
    const key = r.id ? "id:" + r.id : "name:" + [r.name, r.cost, r.photo].join("|");
    if(seen.has(key)) return;
    seen.add(key);
    out.push(r);
  });
  return out;
}

function cleanDuplicatedCoreData(d){
  d = d || {};
  d.schools = dedupeByNameOrId(Array.isArray(d.schools) && d.schools.length ? d.schools : JSON.parse(JSON.stringify(defaultData.schools)));
  d.grades = dedupeByNameOrId(Array.isArray(d.grades) && d.grades.length ? d.grades : JSON.parse(JSON.stringify(defaultData.grades)));
  d.memberships = dedupeMemberships(d.memberships);
  d.events = dedupeEvents(d.events);
  d.rewards = dedupeRewards(d.rewards);
  return d;
}

const __v171_original_normalize = normalize;
normalize = function(obj){
  const d = __v171_original_normalize(obj);
  return cleanDuplicatedCoreData(d);
};

const __v171_original_persist = persist;
persist = function(){
  data = cleanDuplicatedCoreData(data);
  return __v171_original_persist();
};

function mergeArrayByIdOrName(cloudArr, localArr){
  const map = new Map();
  [...(cloudArr || []), ...(localArr || [])].forEach(item => {
    if(!item) return;
    const name = String(item.name || "").trim();
    const key = item.id ? "id:" + item.id : "name:" + name;
    map.set(key, {...(map.get(key) || {}), ...item});
  });
  return Array.from(map.values());
}

const __v171_original_mergeCloudData = typeof mergeCloudData === "function" ? mergeCloudData : null;
mergeCloudData = function(cloud, local){
  let merged = __v171_original_mergeCloudData ? __v171_original_mergeCloudData(cloud, local) : {...normalize(cloud), ...normalize(local)};
  merged = normalize(merged);
  merged.schools = mergeArrayByIdOrName((cloud||{}).schools, (local||{}).schools);
  merged.grades = mergeArrayByIdOrName((cloud||{}).grades, (local||{}).grades);
  return cleanDuplicatedCoreData(merged);
};

async function safeSaveToCloud(){
  const url = localStorage.getItem(API_KEY);
  if(!url){ toast("請先貼上 Apps Script 網址"); setView("sync"); return; }
  try{
    data = cleanDuplicatedCoreData(normalize(data));
    persist();
    const local = typeof stripOversizedImages === "function" ? normalize(stripOversizedImages(data)) : normalize(data);
    let cloud = normalize({});
    try{ cloud = await fetchCloudData(); }catch(e){ cloud = normalize({}); }
    cloud = cleanDuplicatedCoreData(cloud);
    const lc = dataCountSummary(local), cc = dataCountSummary(cloud);
    if(lc.total === 0 && cc.total > 0){
      alert("偵測到本機是空資料，但雲端有資料。已取消儲存，避免把雲端清空。請先按「讀取雲端」。");
      return;
    }
    let merged = mergeCloudData(cloud, local);
    merged = cleanDuplicatedCoreData(typeof stripOversizedImages === "function" ? stripOversizedImages(merged) : merged);
    await postCloudData(merged, "safeMerge-dedupe");
    data = normalize(merged);
    persist();
    renderAll();
    toast("已安全合併並去除重複資料");
  }catch(e){
    console.error(e);
    toast("安全儲存失敗");
    alert("安全儲存失敗：\n" + (e.message || e));
  }
}

async function saveToCloud(){ return safeSaveToCloud(); }
/* END V17.1 DEDUPE + SAFE MERGE PATCH */


/* V18 MEMBERSHIP OVERWRITE PATCH */
function membershipKey(m){
  return [m.studentId || "", m.schoolId || "", m.gradeId || ""].join("|");
}

function cleanStudentMemberships(studentId){
  if(!data || !Array.isArray(data.memberships)) data.memberships = [];
  const seen = new Set();
  data.memberships = data.memberships.filter(m => {
    if(!m || !m.studentId || !m.schoolId || !m.gradeId) return false;
    const key = membershipKey(m);
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStudentMemberships(studentId){
  cleanStudentMemberships(studentId);
  return (data.memberships || []).filter(m => m.studentId === studentId);
}

function setStudentMemberships(studentId, memberships){
  if(!data || !Array.isArray(data.memberships)) data.memberships = [];
  // 關鍵：先移除該學生全部舊班級/團隊，再寫入目前勾選結果
  data.memberships = data.memberships.filter(m => m.studentId !== studentId);

  const seen = new Set();
  (memberships || []).forEach(m => {
    if(!m || !m.schoolId || !m.gradeId) return;
    const item = {
      studentId: studentId,
      schoolId: m.schoolId,
      gradeId: m.gradeId
    };
    const key = membershipKey(item);
    if(seen.has(key)) return;
    seen.add(key);
    data.memberships.push(item);
  });

  persist();
  renderAll();
}

/*
  覆蓋原本的 membership checkbox 行為。
  頁面裡的 checkbox 若呼叫 toggleMembership / updateMembership，
  會改成「依照現在所有勾選結果重建該學生 memberships」。
*/
function rebuildSelectedStudentMembershipsFromUI(){
  const s = selected();
  if(!s) return;
  const memberships = [];
  document.querySelectorAll('input[type="checkbox"][data-school-id][data-grade-id]').forEach(cb => {
    if(cb.checked){
      memberships.push({
        schoolId: cb.getAttribute("data-school-id"),
        gradeId: cb.getAttribute("data-grade-id")
      });
    }
  });

  // 若舊版 checkbox 沒有 data attribute，使用 id/name/value 做兼容推測
  if(memberships.length === 0){
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if(!cb.checked) return;
      const raw = cb.value || cb.id || cb.name || "";
      const parts = String(raw).split("|");
      if(parts.length >= 2){
        memberships.push({schoolId: parts[0], gradeId: parts[1]});
      }
    });
  }

  setStudentMemberships(s.id, memberships);
}

function toggleMembership(studentId, schoolId, gradeId, checked){
  const targetId = studentId || (selected() && selected().id);
  if(!targetId) return;
  let current = getStudentMemberships(targetId);
  current = current.filter(m => !(m.schoolId === schoolId && m.gradeId === gradeId));
  if(checked) current.push({studentId:targetId, schoolId, gradeId});
  setStudentMemberships(targetId, current);
}

function updateMembership(studentId, schoolId, gradeId, checked){
  return toggleMembership(studentId, schoolId, gradeId, checked);
}

function setMembership(studentId, schoolId, gradeId, checked){
  return toggleMembership(studentId, schoolId, gradeId, checked);
}

const __v18_original_persist = persist;
persist = function(){
  if(data && Array.isArray(data.memberships)){
    const seen = new Set();
    data.memberships = data.memberships.filter(m => {
      if(!m || !m.studentId || !m.schoolId || !m.gradeId) return false;
      const key = membershipKey(m);
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return __v18_original_persist();
};
/* END V18 MEMBERSHIP OVERWRITE PATCH */

document.addEventListener("change", function(e){
  const cb = e.target;
  if(!cb || cb.type !== "checkbox") return;
  const sid = cb.getAttribute("data-student-id") || (selected() && selected().id);
  const schoolId = cb.getAttribute("data-school-id");
  const gradeId = cb.getAttribute("data-grade-id");
  if(sid && schoolId && gradeId){
    toggleMembership(sid, schoolId, gradeId, cb.checked);
  }
}, true);


/* V18.1 IMAGE MODAL PATCH */
function openImgModal(src){
  if(!src) return;
  const modal = document.getElementById("imgModal");
  const img = document.getElementById("imgModalContent");
  if(!modal || !img) return;
  img.src = src;
  modal.classList.add("show");
}

function closeImgModal(e){
  if(e && e.target && e.target.id === "imgModalContent") return;
  const modal = document.getElementById("imgModal");
  if(modal) modal.classList.remove("show");
}

function enhanceRewardImages(){
  try{
    (data.rewards || []).forEach(r => {
      if(!r || !r.photo) return;
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute("src") || "";
        if(src === r.photo || src.indexOf(String(r.photo)) >= 0 || String(r.photo).indexOf(src) >= 0){
          img.classList.add("reward-photo-clickable");
          img.title = "點一下放大圖片";
          img.onclick = function(ev){
            ev.stopPropagation();
            openImgModal(r.photo);
          };
        }
      });
    });
  }catch(e){ console.warn("enhanceRewardImages failed", e); }
}

const __v181_original_renderAll = renderAll;
renderAll = function(){
  __v181_original_renderAll();
  setTimeout(enhanceRewardImages, 0);
};

document.addEventListener("keydown", function(e){
  if(e.key === "Escape") closeImgModal();
});
/* END V18.1 IMAGE MODAL PATCH */


/* V19 TEACHER STABLE DATA PATCH
   核心原則：
   1. students 永遠只留一份，依 id/name 去重。
   2. memberships 是學生與「學校＋班級/團隊」的關聯，不複製學生。
   3. 同一學生同一 schoolId+gradeId 只留一筆。
   4. 若學生被選取後改勾選，該學生舊關聯會依最新 UI 覆蓋，不累加。
*/
function v19Id(prefix){
  return (prefix || "id") + "_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function v19NameKey(name){
  return String(name || "").replace(/^\d+/, "").trim();
}

function v19EnsureIds(){
  if(!data) data = normalize({});
  (data.schools || []).forEach(s => { if(!s.id) s.id = v19Id("school"); });
  (data.grades || []).forEach(g => { if(!g.id) g.id = v19Id("grade"); });
  (data.students || []).forEach(s => { if(!s.id) s.id = v19Id("stu"); });
}

function v19DedupeStudents(arr){
  if(!Array.isArray(arr)) return [];
  const byId = new Map();
  const byName = new Map();
  const out = [];
  arr.forEach(stu => {
    if(!stu) return;
    if(!stu.id) stu.id = v19Id("stu");
    stu.name = v19NameKey(stu.name || "未命名");
    const idKey = String(stu.id);
    const nameKey = v19NameKey(stu.name);
    let existing = byId.get(idKey) || byName.get(nameKey);
    if(existing){
      Object.assign(existing, {...stu, id: existing.id, name: existing.name || stu.name});
    }else{
      byId.set(idKey, stu);
      if(nameKey) byName.set(nameKey, stu);
      out.push(stu);
    }
  });
  return out;
}

function v19DedupeByNameOrId(arr, fallback){
  const src = Array.isArray(arr) && arr.length ? arr : JSON.parse(JSON.stringify(fallback || []));
  const seen = new Set();
  const out = [];
  src.forEach(item => {
    if(!item) return;
    if(!item.id) item.id = v19Id("item");
    const name = v19NameKey(item.name || "");
    const key = name ? "name:" + name : "id:" + item.id;
    if(seen.has(key)) return;
    seen.add(key);
    item.name = name || item.name;
    out.push(item);
  });
  return out;
}

function v19DedupeMemberships(arr){
  if(!Array.isArray(arr)) return [];
  const validStudents = new Set((data.students || []).map(s => s.id));
  const validSchools = new Set((data.schools || []).map(s => s.id));
  const validGrades = new Set((data.grades || []).map(g => g.id));
  const seen = new Set();
  const out = [];
  arr.forEach(m => {
    if(!m || !m.studentId || !m.schoolId || !m.gradeId) return;
    if(validStudents.size && !validStudents.has(m.studentId)) return;
    if(validSchools.size && !validSchools.has(m.schoolId)) return;
    if(validGrades.size && !validGrades.has(m.gradeId)) return;
    const key = [m.studentId, m.schoolId, m.gradeId].join("|");
    if(seen.has(key)) return;
    seen.add(key);
    out.push({studentId:m.studentId, schoolId:m.schoolId, gradeId:m.gradeId});
  });
  return out;
}

function v19CleanAll(){
  if(!data) data = normalize({});
  data.schools = v19DedupeByNameOrId(data.schools, defaultData.schools);
  data.grades = v19DedupeByNameOrId(data.grades, defaultData.grades);
  data.students = v19DedupeStudents(data.students);
  data.memberships = v19DedupeMemberships(data.memberships);
  if(Array.isArray(data.rewards)){
    const seenR = new Set();
    data.rewards = data.rewards.filter(r => {
      if(!r) return false;
      if(!r.id) r.id = v19Id("reward");
      const key = r.id || [r.name,r.cost,r.photo].join("|");
      if(seenR.has(key)) return false;
      seenR.add(key);
      return true;
    });
  }
  return data;
}

const __v19_original_normalize = normalize;
normalize = function(obj){
  const d = __v19_original_normalize(obj);
  data = d;
  v19CleanAll();
  return data;
};

const __v19_original_persist = persist;
persist = function(){
  v19CleanAll();
  return __v19_original_persist();
};

function v19GetSelectedStudentId(){
  const s = selected && selected();
  return s && s.id;
}

function v19SetStudentMembership(studentId, schoolId, gradeId, checked){
  if(!studentId || !schoolId || !gradeId) return;
  if(!Array.isArray(data.memberships)) data.memberships = [];
  data.memberships = data.memberships.filter(m => !(m.studentId === studentId && m.schoolId === schoolId && m.gradeId === gradeId));
  if(checked){
    data.memberships.push({studentId, schoolId, gradeId});
  }
  v19CleanAll();
  persist();
  renderAll();
}

function toggleMembership(studentId, schoolId, gradeId, checked){
  return v19SetStudentMembership(studentId || v19GetSelectedStudentId(), schoolId, gradeId, checked);
}
function updateMembership(studentId, schoolId, gradeId, checked){
  return v19SetStudentMembership(studentId || v19GetSelectedStudentId(), schoolId, gradeId, checked);
}
function setMembership(studentId, schoolId, gradeId, checked){
  return v19SetStudentMembership(studentId || v19GetSelectedStudentId(), schoolId, gradeId, checked);
}

document.addEventListener("change", function(e){
  const el = e.target;
  if(!el || el.type !== "checkbox") return;
  const sid = el.getAttribute("data-student-id") || v19GetSelectedStudentId();
  const schoolId = el.getAttribute("data-school-id");
  const gradeId = el.getAttribute("data-grade-id");
  if(sid && schoolId && gradeId){
    v19SetStudentMembership(sid, schoolId, gradeId, el.checked);
  }
}, true);

function v19MergeArrayByIdOrName(cloudArr, localArr){
  const map = new Map();
  [...(cloudArr || []), ...(localArr || [])].forEach(item => {
    if(!item) return;
    const name = v19NameKey(item.name || "");
    const key = item.id ? "id:" + item.id : "name:" + name;
    map.set(key, {...(map.get(key) || {}), ...item});
  });
  return Array.from(map.values());
}

const __v19_original_mergeCloudData = typeof mergeCloudData === "function" ? mergeCloudData : null;
mergeCloudData = function(cloud, local){
  let merged = __v19_original_mergeCloudData ? __v19_original_mergeCloudData(cloud, local) : {...normalize(cloud), ...normalize(local)};
  merged.schools = v19MergeArrayByIdOrName((cloud||{}).schools, (local||{}).schools);
  merged.grades = v19MergeArrayByIdOrName((cloud||{}).grades, (local||{}).grades);
  merged.students = v19DedupeStudents([...(cloud||{}).students || [], ...(local||{}).students || []]);
  merged.memberships = [...((cloud||{}).memberships || []), ...((local||{}).memberships || [])];
  data = normalize(merged);
  return data;
};

async function safeSaveToCloud(){
  const url = localStorage.getItem(API_KEY);
  if(!url){ toast("請先貼上 Apps Script 網址"); setView("sync"); return; }
  try{
    v19CleanAll();
    persist();
    const local = typeof stripOversizedImages === "function" ? normalize(stripOversizedImages(data)) : normalize(data);
    let cloud = normalize({});
    try{ cloud = await fetchCloudData(); }catch(e){ cloud = normalize({}); }
    let merged = mergeCloudData(cloud, local);
    merged = typeof stripOversizedImages === "function" ? stripOversizedImages(merged) : merged;
    data = normalize(merged);
    await postCloudData(data, "safeMerge-v19-teacher");
    persist();
    renderAll();
    toast("已安全儲存（V19 已清理重複學生與班級關係）");
  }catch(e){
    console.error(e);
    toast("安全儲存失敗");
    alert("安全儲存失敗：\n" + (e.message || e));
  }
}

async function saveToCloud(){ return safeSaveToCloud(); }

// 啟動時先清一次目前資料
setTimeout(function(){
  try{
    v19CleanAll();
    persist();
    renderAll();
  }catch(e){ console.warn("V19 clean startup failed", e); }
}, 50);
/* END V19 TEACHER STABLE DATA PATCH */


/* V20 CORE MEMBERSHIP FIX */
function v20StudentCleanName(name){
  return String(name || "").replace(/^\d+/, "").trim();
}

function v20CleanStudents(){
  if(!Array.isArray(data.students)) data.students = [];
  const byName = new Map();
  const out = [];
  data.students.forEach(s => {
    if(!s) return;
    if(!s.id) s.id = uid();
    s.name = v20StudentCleanName(s.name || "未命名");
    const key = v20StudentCleanName(s.name);
    if(byName.has(key)){
      const keep = byName.get(key);
      Object.assign(keep, {...s, id:keep.id, name:keep.name});
      // 把舊 id 的 memberships 轉到保留 id
      (data.memberships || []).forEach(m => {
        if(m.studentId === s.id) m.studentId = keep.id;
      });
    }else{
      byName.set(key, s);
      out.push(s);
    }
  });
  data.students = out;
}

function v20CleanMemberships(){
  if(!Array.isArray(data.memberships)) data.memberships = [];
  const validStudents = new Set((data.students || []).map(s => s.id));
  const validSchools = new Set((data.schools || []).map(s => s.id));
  const validGrades = new Set((data.grades || []).map(g => g.id));
  const seen = new Set();
  data.memberships = data.memberships.filter(m => {
    if(!m || !m.studentId || !m.schoolId || !m.gradeId) return false;
    if(validStudents.size && !validStudents.has(m.studentId)) return false;
    if(validSchools.size && !validSchools.has(m.schoolId)) return false;
    if(validGrades.size && !validGrades.has(m.gradeId)) return false;
    const key = [m.studentId,m.schoolId,m.gradeId].join("|");
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function v20SyncStudentPrimaryClass(){
  (data.students || []).forEach(s => {
    const first = (data.memberships || []).find(m => m.studentId === s.id);
    if(first){
      s.schoolId = first.schoolId;
      s.gradeId = first.gradeId;
    }else{
      // 沒有班級時不自動補三年級，只用目前篩選當顯示用
      s.schoolId = s.schoolId || data.filter.schoolId;
      s.gradeId = s.gradeId || data.filter.gradeId;
    }
  });
}

function v20CleanAll(){
  if(!data) return;
  v20CleanStudents();
  v20CleanMemberships();
  v20SyncStudentPrimaryClass();
}

const __v20_original_normalize = normalize;
normalize = function(obj){
  const d = __v20_original_normalize(obj);
  data = d;
  v20CleanAll();
  return data;
};

const __v20_original_persist = persist;
persist = function(){
  v20CleanAll();
  return __v20_original_persist();
};

function v20SetMembership(studentId, schoolId, gradeId, checked){
  if(!Array.isArray(data.memberships)) data.memberships=[];
  data.memberships = data.memberships.filter(m => !(m.studentId===studentId && m.schoolId===schoolId && m.gradeId===gradeId));
  if(checked){
    data.memberships.push({id:uid(), studentId, schoolId, gradeId});
  }
  v20CleanAll();
  persist();
  renderAll();
}

toggleMembership = function(studentId,schoolId,gradeId,checked){
  v20SetMembership(studentId,schoolId,gradeId,checked);
};

updateMembership = function(studentId,schoolId,gradeId,checked){
  v20SetMembership(studentId,schoolId,gradeId,checked);
};

setMembership = function(studentId,schoolId,gradeId,checked){
  v20SetMembership(studentId,schoolId,gradeId,checked);
};

const __v20_original_safeSaveToCloud = safeSaveToCloud;
safeSaveToCloud = async function(){
  try{
    v20CleanAll();
    persist();
  }catch(e){ console.warn(e); }
  return __v20_original_safeSaveToCloud();
};

setTimeout(function(){
  try{
    v20CleanAll();
    persist();
    renderAll();
  }catch(e){ console.warn("V20 cleanup failed", e); }
}, 100);
/* END V20 CORE MEMBERSHIP FIX */


/* V21.1 SIMPLE SYNC + STATUS PATCH */
let v211SyncState = "loading";
let v211Dirty = false;

function setSyncStatus(state, text){
  v211SyncState = state;
  const el = document.getElementById("syncStatus");
  if(!el) return;
  el.className = "sync-status-pill " + state;
  el.textContent = text || ({
    saved:"🟢 已與雲端同步",
    unsaved:"🟡 尚未儲存",
    saving:"🔵 正在儲存...",
    error:"🔴 儲存失敗",
    loading:"⚪ 建議先重新載入雲端"
  }[state] || "⚪ 狀態未知");
}

function markUnsaved(){
  if(v211SyncState === "saving") return;
  v211Dirty = true;
  setSyncStatus("unsaved", "🟡 尚未儲存");
}

const __v211_original_persist = persist;
persist = function(){
  const result = __v211_original_persist();
  markUnsaved();
  return result;
};

async function overwriteCloudFromCurrent(){
  const url = localStorage.getItem(API_KEY);
  if(!url){
    setView("sync");
    alert("請先到 Google 同步頁貼上 Apps Script Web App URL，並按儲存網址");
    return;
  }
  try{
    setSyncStatus("saving", "🔵 正在儲存...");
    if(typeof v20CleanAll === "function") v20CleanAll();
    if(typeof v19CleanAll === "function") v19CleanAll();
    const payload = typeof stripOversizedImages === "function" ? stripOversizedImages(normalize(data)) : normalize(data);
    await postCloudData(payload, "overwrite-v21-1-simple");
    data = normalize(payload);
    __v211_original_persist();
    v211Dirty = false;
    setSyncStatus("saved", "🟢 已與雲端同步");
    renderAll();
    toast("已儲存並覆蓋雲端");
  }catch(e){
    console.error(e);
    setSyncStatus("error", "🔴 儲存失敗");
    alert("儲存失敗：\n" + (e.message || e));
  }
}

async function loadCloudReplaceLocal(){
  const url = localStorage.getItem(API_KEY);
  if(!url){
    setView("sync");
    alert("請先到 Google 同步頁貼上 Apps Script Web App URL，並按儲存網址");
    return;
  }
  if(v211Dirty && !confirm("目前有尚未儲存的修改。讀取雲端會覆蓋本機畫面，確定要繼續嗎？")) return;
  try{
    setSyncStatus("saving", "🔵 正在讀取雲端...");
    const cloud = await fetchCloudData();
    data = normalize(cloud || {});
    if(typeof v20CleanAll === "function") v20CleanAll();
    if(typeof v19CleanAll === "function") v19CleanAll();
    __v211_original_persist();
    v211Dirty = false;
    renderAll();
    setSyncStatus("saved", "🟢 已與雲端同步");
    toast("已重新載入雲端");
  }catch(e){
    console.error(e);
    setSyncStatus("error", "🔴 讀取失敗");
    alert("讀取雲端失敗：\n" + (e.message || e));
  }
}

// 簡化邏輯：全部儲存按鈕都變成覆蓋雲端，不再合併。
async function safeSaveToCloud(){ return overwriteCloudFromCurrent(); }
async function saveToCloud(){ return overwriteCloudFromCurrent(); }
async function forceSaveToCloud(){ return overwriteCloudFromCurrent(); }
async function readFromCloud(){ return loadCloudReplaceLocal(); }
async function loadFromCloud(){ return loadCloudReplaceLocal(); }

function v211RelabelButtons(){
  try{
    document.querySelectorAll("button").forEach(btn=>{
      const t=(btn.textContent||"").trim();
      if(t==="安全儲存" || t==="儲存雲端" || t==="強制覆蓋" || t==="安全儲存（合併）"){
        btn.textContent="儲存（覆蓋雲端）";
      }
      if(t==="讀取雲端"){
        btn.textContent="重新載入雲端";
      }
    });
  }catch(e){}
}

const __v211_original_renderAll = renderAll;
renderAll = function(){
  __v211_original_renderAll();
  setTimeout(v211RelabelButtons, 0);
  const el = document.getElementById("syncStatus");
  if(el && !el.textContent.trim()) setSyncStatus(v211Dirty ? "unsaved" : "loading");
};

window.addEventListener("beforeunload", function(e){
  if(v211Dirty){
    e.preventDefault();
    e.returnValue = "";
  }
});

setTimeout(function(){
  v211RelabelButtons();
  setSyncStatus("loading", "⚪ 建議先重新載入雲端");
}, 100);
/* END V21.1 SIMPLE SYNC + STATUS PATCH */


/* V22 CLASS + SEAT + ATTENDANCE SCOPE PATCH */
function v22CleanClassName(v){return String(v||"").trim();}
function v22SeatNumber(v){const n=parseInt(String(v||"").replace(/[^\d]/g,""),10);return Number.isFinite(n)?n:9999;}
function v22EnsureStudentFields(){
  if(!data||!Array.isArray(data.students))return;
  data.students.forEach(s=>{
    if(!s.className){
      const g=(data.grades||[]).find(x=>x.id===s.gradeId);
      s.className=g?g.name:"";
    }
    if(s.seatNo===undefined||s.seatNo===null)s.seatNo="";
  });
}
function v22StudentSort(a,b){
  const ca=v22CleanClassName(a.className||""),cb=v22CleanClassName(b.className||"");
  if(ca!==cb)return ca.localeCompare(cb,"zh-Hant");
  const sa=v22SeatNumber(a.seatNo),sb=v22SeatNumber(b.seatNo);
  if(sa!==sb)return sa-sb;
  return String(a.name||"").localeCompare(String(b.name||""),"zh-Hant");
}
function v22ClassSeatText(s){
  const cls=v22CleanClassName(s.className);
  const seat=s.seatNo!==undefined&&s.seatNo!==null&&String(s.seatNo).trim()!==""?String(s.seatNo).trim()+"號":"未填座號";
  return (cls||"未填班級")+"｜"+seat;
}
function v22PatchStudentCards(){
  try{
    document.querySelectorAll(".student-card,.student,.list-item,.card").forEach(card=>{
      const text=card.textContent||"";
      const s=(data.students||[]).find(st=>st.name&&text.includes(st.name));
      if(!s)return;
      if(card.querySelector(".v22-student-meta"))return;
      const meta=document.createElement("div");
      meta.className="v22-student-meta";
      meta.innerHTML='<span class="v22-badge">'+escapeHtml(v22ClassSeatText(s))+'</span>';
      const nameEl=card.querySelector(".name")||card.querySelector("b")||card;
      if(nameEl&&nameEl!==card)nameEl.insertAdjacentElement("afterend",meta);
      else card.appendChild(meta);
    });
  }catch(e){console.warn("v22 cards",e)}
}
function v22PatchStudentEditor(){
  try{
    const s=selected&&selected(); if(!s)return;
    const nameInput=[...document.querySelectorAll("input")].find(i=>i.value===s.name);
    if(!nameInput)return;
    const parent=nameInput.closest(".card,.panel,section,div")||nameInput.parentElement;
    if(!parent||parent.querySelector("#v22ClassName"))return;
    const wrap=document.createElement("div");
    wrap.className="v22-class-seat-grid";
    wrap.innerHTML=`<label>原班級<input id="v22ClassName" value="${escapeAttr(s.className||"")}" placeholder="例如：三忠"></label><label>座號<input id="v22SeatNo" type="number" min="1" value="${escapeAttr(s.seatNo||"")}" placeholder="例如：8"></label>`;
    nameInput.closest("label")?nameInput.closest("label").insertAdjacentElement("afterend",wrap):nameInput.insertAdjacentElement("afterend",wrap);
    const ci=wrap.querySelector("#v22ClassName"),si=wrap.querySelector("#v22SeatNo");
    ci.addEventListener("input",()=>{s.className=ci.value.trim();persist();renderAll();});
    si.addEventListener("input",()=>{s.seatNo=si.value.trim();persist();renderAll();});
  }catch(e){console.warn("v22 editor",e)}
}
function v22PatchAddStudentForm(){
  try{
    const nameInput=[...document.querySelectorAll("input")].find(i=>(i.placeholder||"").includes("學生姓名"));
    if(!nameInput)return;
    const parent=nameInput.closest(".card,.panel,section,div")||nameInput.parentElement;
    if(!parent||parent.querySelector("#v22NewClassName"))return;
    const wrap=document.createElement("div");
    wrap.className="v22-class-seat-grid";
    wrap.innerHTML='<label>原班級<input id="v22NewClassName" placeholder="例如：三忠"></label><label>座號<input id="v22NewSeatNo" type="number" min="1" placeholder="例如：8"></label>';
    nameInput.closest("label")?nameInput.closest("label").insertAdjacentElement("afterend",wrap):nameInput.insertAdjacentElement("afterend",wrap);
  }catch(e){console.warn("v22 add form",e)}
}
function v22ApplyNewStudentFields(){
  try{
    const newest=data.students&&data.students[data.students.length-1]; if(!newest)return;
    const cls=document.getElementById("v22NewClassName"),seat=document.getElementById("v22NewSeatNo");
    if(cls&&cls.value&&!newest.className)newest.className=cls.value.trim();
    if(seat&&seat.value&&!newest.seatNo)newest.seatNo=seat.value.trim();
  }catch(e){}
}

/* 點名獨立化：同一天同學生，在不同學校/班級/社團要算不同筆 */
function v22AttendanceScope(){
  return {
    schoolId:(data.filter&&data.filter.schoolId)||"",
    gradeId:(data.filter&&data.filter.gradeId)||"",
    scope:(data.logFilter&&data.logFilter.scope)||"class"
  };
}
function v22AttendanceKey(a){
  return [a.date||"",a.studentId||"",a.schoolId||"",a.gradeId||"",a.scope||"class"].join("|");
}
function v22NormalizeAttendance(){
  if(!Array.isArray(data.attendance))data.attendance=[];
  const current=v22AttendanceScope();
  const seen=new Set();
  data.attendance=data.attendance.filter(a=>{
    if(!a||!a.date||!a.studentId)return false;
    if(!a.schoolId)a.schoolId=current.schoolId;
    if(!a.gradeId)a.gradeId=current.gradeId;
    if(!a.scope)a.scope=current.scope||"class";
    const k=v22AttendanceKey(a);
    if(seen.has(k))return false;
    seen.add(k);
    return true;
  });
}
function v22IsAttended(studentId,date){
  const sc=v22AttendanceScope();
  return (data.attendance||[]).some(a=>a.studentId===studentId&&a.date===date&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class"));
}
function v22ToggleAttendance(studentId,date,status){
  if(!Array.isArray(data.attendance))data.attendance=[];
  const sc=v22AttendanceScope();
  data.attendance=data.attendance.filter(a=>!(a.studentId===studentId&&a.date===date&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class")));
  if(status&&status!=="none"){
    data.attendance.push({id:uid(),studentId,date,status,schoolId:sc.schoolId,gradeId:sc.gradeId,scope:sc.scope||"class"});
  }
  v22NormalizeAttendance();
  persist();
  renderAll();
}
if(typeof toggleAttendance==="function"){
  toggleAttendance=function(studentId,date,status){return v22ToggleAttendance(studentId,date,status||"present");};
}
if(typeof markAttendance==="function"){
  markAttendance=function(studentId,status,date){return v22ToggleAttendance(studentId,date||todayStr(),status||"present");};
}
if(typeof isAttended==="function"){
  isAttended=function(studentId,date){return v22IsAttended(studentId,date||todayStr());};
}
const __v22_original_persist=persist;
persist=function(){
  v22EnsureStudentFields();
  v22NormalizeAttendance();
  if(data&&Array.isArray(data.students))data.students.sort(v22StudentSort);
  return __v22_original_persist();
};
const __v22_original_renderAll=renderAll;
renderAll=function(){
  v22EnsureStudentFields();
  v22NormalizeAttendance();
  if(data&&Array.isArray(data.students))data.students.sort(v22StudentSort);
  __v22_original_renderAll();
  setTimeout(()=>{v22PatchStudentCards();v22PatchStudentEditor();v22PatchAddStudentForm();},0);
};
if(typeof addStudent==="function"){
  const __v22_original_addStudent=addStudent;
  addStudent=function(){
    const before=(data.students||[]).length;
    const result=__v22_original_addStudent.apply(this,arguments);
    if((data.students||[]).length>before){v22ApplyNewStudentFields();persist();renderAll();}
    return result;
  };
}
document.addEventListener("click",function(e){
  const btn=e.target.closest&&e.target.closest("button"); if(!btn)return;
  if((btn.textContent||"").includes("新增學生")){
    setTimeout(()=>{v22ApplyNewStudentFields();persist();renderAll();},50);
  }
},true);
setTimeout(()=>{v22EnsureStudentFields();v22NormalizeAttendance();persist();renderAll();},120);
/* END V22 CLASS + SEAT + ATTENDANCE SCOPE PATCH */


/* V22.2 attendance strict scoping cleanup */
function v222CleanLegacyAttendance(){
  if(!Array.isArray(data.attendance))data.attendance=[];
  if(!Array.isArray(data.attendanceDates))data.attendanceDates=[];
  data.attendance.forEach(a=>{ if(!a.scope)a.scope="class"; });
  data.attendanceDates.forEach(d=>{ if(!d.scope)d.scope="class"; });
}
const __v222_original_persist=persist;
persist=function(){
  v222CleanLegacyAttendance();
  return __v222_original_persist();
};
setTimeout(()=>{v222CleanLegacyAttendance();persist();renderAll();},100);
/* END V22.2 attendance strict scoping cleanup */


/* V22.3 STABLE SAVE PATCH */
function v223ApproxSize(obj){
  try{return JSON.stringify(obj||{}).length;}catch(e){return 999999999;}
}
function v223StripBase64Images(obj){
  const copy = JSON.parse(JSON.stringify(obj || {}));
  function cleanPhotoField(holder, label){
    if(!holder) return;
    const p = holder.photo;
    if(typeof p === "string" && p.startsWith("data:")){
      holder.photo = "";
      holder.photoWarning = (label || "照片") + "因為仍是內嵌圖片，已在儲存前移除。請重新上傳到 Google Drive。";
    }
  }
  (copy.students || []).forEach(s => cleanPhotoField(s, "學生照片"));
  (copy.rewards || []).forEach(r => cleanPhotoField(r, "獎品照片"));
  function deepClean(o){
    if(!o || typeof o !== "object") return;
    Object.keys(o).forEach(k=>{
      const v=o[k];
      if(typeof v === "string" && v.startsWith("data:") && v.length > 2000){
        o[k]="";
      }else if(v && typeof v === "object"){
        deepClean(v);
      }
    });
  }
  deepClean(copy);
  return copy;
}
function v223DownloadBackup(payload, reason){
  try{
    const dataStr = JSON.stringify(payload || data || {}, null, 2);
    const blob = new Blob([dataStr], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    a.href = url;
    a.download = `battle-panflute-backup-${reason||"autosave"}-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }catch(e){ console.warn("自動備份下載失敗", e); }
}
function v223Sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function v223PostWithRetry(payload, mode){
  let lastErr = null;
  for(let i=1;i<=3;i++){
    try{
      await postCloudData(payload, mode || "overwrite-v22-3-stable");
      return true;
    }catch(e){
      lastErr = e;
      console.warn(`V22.3 儲存第 ${i} 次失敗`, e);
      if(i<3) await v223Sleep(800*i);
    }
  }
  throw lastErr || new Error("儲存失敗");
}
function v223PreparePayload(){
  if(typeof v20CleanAll === "function") v20CleanAll();
  if(typeof v19CleanAll === "function") v19CleanAll();
  if(typeof v221NormalizeAttendance === "function") v221NormalizeAttendance();
  if(typeof v222CleanLegacyAttendance === "function") v222CleanLegacyAttendance();
  let payload = normalize(data);
  payload = v223StripBase64Images(payload);
  payload = normalize(payload);
  return payload;
}
async function overwriteCloudFromCurrent(){
  const url = localStorage.getItem(API_KEY);
  if(!url){
    setView("sync");
    alert("請先到 Google 同步頁貼上 Apps Script Web App URL，並按儲存網址");
    return;
  }
  let payload = null;
  try{
    if(typeof setSyncStatus === "function") setSyncStatus("saving","🔵 正在儲存...");
    payload = v223PreparePayload();
    v223DownloadBackup(payload, "before-cloud-save");
    const size = v223ApproxSize(payload);
    if(size > 450000){
      alert(`資料量仍然偏大（約 ${Math.round(size/1024)} KB）。\n系統已先下載本機備份，但為避免雲端失敗，請檢查是否還有過大的圖片資料。`);
    }
    await v223PostWithRetry(payload, "overwrite-v22-3-stable");
    data = normalize(payload);
    try{
      if(typeof __v211_original_persist === "function") __v211_original_persist();
      else localStorage.setItem(KEY, JSON.stringify(data));
    }catch(e){ localStorage.setItem(KEY, JSON.stringify(data)); }
    if(typeof setSyncStatus === "function") setSyncStatus("saved","🟢 已與雲端同步");
    if(typeof v211Dirty !== "undefined") v211Dirty = false;
    renderAll();
    toast("已穩定儲存並覆蓋雲端");
  }catch(e){
    console.error(e);
    if(payload) v223DownloadBackup(payload, "cloud-save-failed");
    if(typeof setSyncStatus === "function") setSyncStatus("error","🔴 儲存失敗，已下載備份");
    alert("儲存失敗，但資料仍保留在本機，並已嘗試下載備份。\n\n錯誤：\n" + (e.message || e));
  }
}
async function safeSaveToCloud(){return overwriteCloudFromCurrent();}
async function saveToCloud(){return overwriteCloudFromCurrent();}
async function forceSaveToCloud(){return overwriteCloudFromCurrent();}
async function loadCloudReplaceLocal(){
  const url = localStorage.getItem(API_KEY);
  if(!url){
    setView("sync");
    alert("請先到 Google 同步頁貼上 Apps Script Web App URL，並按儲存網址");
    return;
  }
  if(typeof v211Dirty !== "undefined" && v211Dirty && !confirm("目前有尚未儲存的修改。讀取雲端會覆蓋本機畫面，確定要繼續嗎？")) return;
  try{
    if(typeof setSyncStatus === "function") setSyncStatus("saving","🔵 正在讀取雲端...");
    const cloud = await fetchCloudData();
    data = normalize(cloud || {});
    localStorage.setItem(KEY, JSON.stringify(data));
    if(typeof v211Dirty !== "undefined") v211Dirty = false;
    renderAll();
    if(typeof setSyncStatus === "function") setSyncStatus("saved","🟢 已與雲端同步");
    toast("已重新載入雲端");
  }catch(e){
    console.error(e);
    if(typeof setSyncStatus === "function") setSyncStatus("error","🔴 讀取失敗");
    alert("讀取雲端失敗：\n" + (e.message || e));
  }
}
async function readFromCloud(){return loadCloudReplaceLocal();}
async function loadFromCloud(){return loadCloudReplaceLocal();}
function v223RelabelButtons(){
  try{
    document.querySelectorAll("button").forEach(btn=>{
      const t=(btn.textContent||"").trim();
      if(t==="安全儲存" || t==="儲存雲端" || t==="強制覆蓋" || t==="儲存（覆蓋雲端）"){
        btn.textContent="穩定儲存（覆蓋雲端）";
      }
      if(t==="讀取雲端"){
        btn.textContent="重新載入雲端";
      }
    });
  }catch(e){}
}
const __v223_original_renderAll = renderAll;
renderAll = function(){
  __v223_original_renderAll();
  setTimeout(v223RelabelButtons,0);
};
setTimeout(v223RelabelButtons,100);
/* END V22.3 STABLE SAVE PATCH */





/* V25 FIREBASE ONLY PATCH - NO APPS SCRIPT */
const V25_TEACHER_ID_KEY="battle_panflute_teacher_id_v25";
function v25TeacherId(){
  let id=localStorage.getItem(V25_TEACHER_ID_KEY);
  if(!id){ id="teacher_chunche"; localStorage.setItem(V25_TEACHER_ID_KEY,id); }
  return id;
}
function v25Root(){
  if(!window.db) throw new Error("Firebase 尚未連線");
  return window.db.collection("teachers").doc(v25TeacherId());
}
function v25SeatNum(s){
  const n=parseInt(String(s?.seatNo??s?.seat??"").replace(/[^\d]/g,""),10);
  return Number.isFinite(n)?n:9999;
}
function v25ClassName(s){ return String(s?.className||s?.class||"").trim(); }
function v25StudentCompare(a,b){
  const ca=v25ClassName(a), cb=v25ClassName(b);
  if(ca!==cb) return ca.localeCompare(cb,"zh-Hant");
  const sa=v25SeatNum(a), sb=v25SeatNum(b);
  if(sa!==sb) return sa-sb;
  return String(a.name||"").localeCompare(String(b.name||""),"zh-Hant");
}
function v25EnsureFields(){
  if(!data) return;
  if(!Array.isArray(data.students)) data.students=[];
  data.students.forEach(s=>{
    if(s.seatNo===undefined||s.seatNo===null) s.seatNo="";
    if(!s.className){
      const g=(data.grades||[]).find(x=>x.id===s.gradeId);
      s.className=g?g.name:"";
    }
    if(!s.ability) s.ability={pitch:3,rhythm:3,sight:3,breath:3,tone:3,expression:3};
  });
  data.students.sort(v25StudentCompare);
}
function v25CurrentScope(){
  return {
    schoolId:(data.filter&&data.filter.schoolId)||"",
    gradeId:(data.filter&&data.filter.gradeId)||"",
    scope:(data.logFilter&&data.logFilter.scope)||"class"
  };
}
function v25SameAttendance(a,date,studentId){
  const sc=v25CurrentScope();
  return a&&a.date===date&&a.studentId===studentId&&a.schoolId===sc.schoolId&&a.gradeId===sc.gradeId&&(a.scope||"class")===(sc.scope||"class");
}
function v25NormalizeAttendance(){
  if(!Array.isArray(data.attendance)) data.attendance=[];
  if(!Array.isArray(data.attendanceDates)) data.attendanceDates=[];
  data.attendance.forEach(a=>{ if(!a.scope)a.scope="class"; if(!a.schoolId)a.schoolId=(data.filter&&data.filter.schoolId)||""; if(!a.gradeId)a.gradeId=(data.filter&&data.filter.gradeId)||""; });
  data.attendanceDates.forEach(d=>{ if(!d.scope)d.scope="class"; if(!d.schoolId)d.schoolId=(data.filter&&data.filter.schoolId)||""; if(!d.gradeId)d.gradeId=(data.filter&&data.filter.gradeId)||""; });
}
function v25SplitData(payload){
  const d=normalize(payload||data||{});
  return {
    core:{schools:d.schools||[],grades:d.grades||[],levels:d.levels||[],students:d.students||[],memberships:d.memberships||[],points:d.points||[],rewards:d.rewards||[],redemptions:d.redemptions||[],noteQuizHistory:d.noteQuizHistory||[],selectedId:d.selectedId||null,selectedLevel:d.selectedLevel||1,filter:d.filter||{},calendar:d.calendar||{},logFilter:d.logFilter||{},courseFilter:d.courseFilter||{}},
    attendance:{attendance:d.attendance||[],attendanceDates:d.attendanceDates||[]},
    logs:{events:d.events||[],lessonLogs:d.lessonLogs||[],coursePlans:d.coursePlans||[],classNotes:d.classNotes||[]}
  };
}
function v25MergeData(parts){
  const base=normalize({});
  const c=parts.core||{}, a=parts.attendance||{}, l=parts.logs||{};
  return normalize({...base,...c,attendance:a.attendance||[],attendanceDates:a.attendanceDates||[],events:l.events||[],lessonLogs:l.lessonLogs||[],coursePlans:l.coursePlans||[],classNotes:l.classNotes||[]});
}
function v25StripBase64(obj){
  const copy=JSON.parse(JSON.stringify(obj||{}));
  function clean(h){ if(h&&typeof h.photo==="string"&&h.photo.startsWith("data:")){ h.photo=""; h.photoWarning="內嵌圖片已移除，請重新上傳。"; } }
  (copy.students||[]).forEach(clean);
  (copy.rewards||[]).forEach(clean);
  return copy;
}
async function v25SaveFirebase(){
  try{
    if(typeof setSyncStatus==="function") setSyncStatus("saving","🔵 Firebase 儲存中...");
    v25EnsureFields();
    v25NormalizeAttendance();
    let payload=normalize(data);
    payload=v25StripBase64(payload);
    const parts=v25SplitData(payload);
    const root=v25Root();
    await Promise.all([
      root.collection("data").doc("core").set(parts.core,{merge:false}),
      root.collection("data").doc("attendance").set(parts.attendance,{merge:false}),
      root.collection("data").doc("logs").set(parts.logs,{merge:false}),
      root.set({updatedAt:firebase.firestore.FieldValue.serverTimestamp(),version:"v25",teacherId:v25TeacherId()},{merge:true})
    ]);
    data=normalize(payload);
    localStorage.setItem(KEY,JSON.stringify(data));
    if(typeof v211Dirty!=="undefined") v211Dirty=false;
    if(typeof setSyncStatus==="function") setSyncStatus("saved","🟢 Firebase 已同步");
    renderAll();
    toast("Firebase 已儲存");
  }catch(e){
    console.error(e);
    if(typeof setSyncStatus==="function") setSyncStatus("error","🔴 Firebase 儲存失敗");
    alert("Firebase 儲存失敗：\n"+(e.message||e));
  }
}
async function v25LoadFirebase(){
  try{
    if(typeof setSyncStatus==="function") setSyncStatus("saving","🔵 Firebase 讀取中...");
    const root=v25Root();
    const [cs,as,ls]=await Promise.all([
      root.collection("data").doc("core").get(),
      root.collection("data").doc("attendance").get(),
      root.collection("data").doc("logs").get()
    ]);
    if(!(cs.exists||as.exists||ls.exists)){
      if(!confirm("Firebase 目前沒有資料。要把本機資料初始化到 Firebase 嗎？")) return;
      await v25SaveFirebase();
      return;
    }
    data=v25MergeData({core:cs.exists?cs.data():{},attendance:as.exists?as.data():{},logs:ls.exists?ls.data():{}});
    v25EnsureFields();
    v25NormalizeAttendance();
    localStorage.setItem(KEY,JSON.stringify(data));
    if(typeof v211Dirty!=="undefined") v211Dirty=false;
    renderAll();
    if(typeof setSyncStatus==="function") setSyncStatus("saved","🟢 Firebase 已同步");
    toast("Firebase 已讀取");
  }catch(e){
    console.error(e);
    if(typeof setSyncStatus==="function") setSyncStatus("error","🔴 Firebase 讀取失敗");
    alert("Firebase 讀取失敗：\n"+(e.message||e));
  }
}

/* HARD OVERRIDE: disable all Apps Script/old cloud calls */
async function overwriteCloudFromCurrent(){return v25SaveFirebase();}
async function safeSaveToCloud(){return v25SaveFirebase();}
async function saveToCloud(){return v25SaveFirebase();}
async function forceSaveToCloud(){return v25SaveFirebase();}
async function loadCloudReplaceLocal(){return v25LoadFirebase();}
async function readFromCloud(){return v25LoadFirebase();}
async function loadFromCloud(){return v25LoadFirebase();}
async function postCloudData(){throw new Error("V25 已停用 Apps Script，請使用 Firebase 儲存");}
async function fetchCloudData(){return v25LoadFirebase();}
function saveApiUrl(){toast("V25 已改用 Firebase，不需要 Apps Script URL");}

/* sorted students */
const __v25_orig_filteredStudents=typeof filteredStudents==="function"?filteredStudents:null;
if(__v25_orig_filteredStudents){
  filteredStudents=function(){
    const arr=__v25_orig_filteredStudents();
    return Array.isArray(arr)?arr.sort(v25StudentCompare):arr;
  };
}

/* patch UI */
function v25PatchAttendanceNames(){
  try{
    const students=(typeof filteredStudents==="function"?filteredStudents():data.students)||[];
    document.querySelectorAll("tr,.student-row,.student-card,.card").forEach(el=>{
      const text=el.textContent||"";
      const s=students.find(st=>st.name&&text.includes(st.name));
      if(!s||el.querySelector(".v25-seat-pill"))return;
      const seat=v25SeatNum(s)===9999?"?":String(v25SeatNum(s));
      const target=[...el.querySelectorAll("b,strong,.name,td,div")].find(n=>(n.textContent||"").includes(s.name));
      if(target) target.insertAdjacentHTML("afterbegin",`<span class="v25-seat-pill">${seat}</span>`);
    });
  }catch(e){console.warn("v25PatchAttendanceNames",e)}
}
function v25PatchScrollable(){
  try{
    const titles=["學生名單","學生資料與等級調整","點名總覽表","獎品商店","新增 / 修改獎品","上課記錄","學年課程總覽","等級清單"];
    document.querySelectorAll(".card").forEach(card=>{
      const txt=(card.querySelector("h2,h3")?.textContent||card.textContent||"").trim();
      if(titles.some(t=>txt.includes(t)))card.classList.add("v25-scroll-card");
    });
  }catch(e){}
}
function v25AbilityKeys(){return [{key:"pitch",label:"音準"},{key:"rhythm",label:"節奏"},{key:"sight",label:"視譜"},{key:"breath",label:"氣息"},{key:"tone",label:"音色"},{key:"expression",label:"表現力"}]}
function v25PatchPersonalPage(){
  try{
    const s=typeof selected==="function"?selected():(data.students||[]).find(x=>x.id===data.selectedId);
    if(!s)return;
    const personal=document.getElementById("studentView")||document.querySelector("#studentView,.student-profile,.profile");
    if(personal){
      const av=personal.querySelector(".avatar,.student-avatar");
      if(av){
        if(s.photo){av.style.backgroundImage=`url("${s.photo}")`;av.style.backgroundSize="cover";av.style.backgroundPosition="center";av.textContent=""}
        else{av.style.backgroundImage="";av.textContent=(typeof initials==="function"?initials(s.name):String(s.name||"?").slice(0,1))}
      }
    }
    const nameInput=[...document.querySelectorAll("input")].find(i=>i.value===s.name);
    const host=nameInput?(nameInput.closest(".card")||nameInput.parentElement):null;
    if(host&&!host.querySelector("#v25AbilityPanel")){
      if(!s.ability)s.ability={pitch:3,rhythm:3,sight:3,breath:3,tone:3,expression:3};
      const panel=document.createElement("div");
      panel.id="v25AbilityPanel";
      panel.className="v25-ability-panel";
      panel.innerHTML=`<h3>六角形能力指標</h3><div class="v25-ability-grid">${v25AbilityKeys().map(a=>{const val=parseInt(s.ability?.[a.key]||3);return `<label class="v25-ability-row"><span>${a.label}</span><input type="range" min="1" max="5" step="1" value="${val}" data-v25-ability="${a.key}"><b>${val}</b></label>`}).join("")}</div>`;
      host.appendChild(panel);
      panel.querySelectorAll("[data-v25-ability]").forEach(inp=>{
        inp.addEventListener("input",()=>{
          if(!s.ability)s.ability={};
          const v=parseInt(inp.value)||3;
          s.ability[inp.dataset.v25Ability]=v;
          inp.parentElement.querySelector("b").textContent=v;
          persist();
          if(typeof renderAbilityCharts==="function")renderAbilityCharts();
        });
      });
    }
  }catch(e){console.warn("v25PatchPersonalPage",e)}
}
function v25RelabelButtons(){
  try{
    document.querySelectorAll("button").forEach(btn=>{
      const t=(btn.textContent||"").trim();
      if(["安全儲存","儲存雲端","強制覆蓋","儲存（覆蓋雲端）","穩定儲存（覆蓋雲端）","分區儲存（覆蓋雲端）","Firebase 儲存"].includes(t))btn.textContent="Firebase 儲存";
      if(["讀取雲端","重新載入雲端","分段載入雲端","Firebase 讀取"].includes(t))btn.textContent="Firebase 讀取";
    });
  }catch(e){}
}

const __v25_original_persist=persist;
persist=function(){v25EnsureFields();v25NormalizeAttendance();return __v25_original_persist();};
const __v25_original_renderAll=renderAll;
renderAll=function(){v25EnsureFields();v25NormalizeAttendance();__v25_original_renderAll();setTimeout(()=>{v25PatchAttendanceNames();v25PatchScrollable();v25PatchPersonalPage();v25RelabelButtons()},0);};
setTimeout(()=>{v25EnsureFields();v25NormalizeAttendance();renderAll()},200);
/* END V25 FIREBASE ONLY PATCH */


/* V26 FINAL FIXES */
function v26GradeText(s){
  const raw = String(s?.gradeName || s?.className || s?.grade || s?.gradeId || "");
  if(raw.includes("三")) return "三年級";
  if(raw.includes("四")) return "四年級";
  if(raw.includes("五")) return "五年級";
  if(raw.includes("六")) return "六年級";
  const n = parseInt(raw.replace(/[^\d]/g,""),10);
  return Number.isFinite(n) && n > 0 ? `${n}年級` : "";
}
function v26GradeOrder(s){
  const g = v26GradeText(s);
  if(g.includes("三")) return 3;
  if(g.includes("四")) return 4;
  if(g.includes("五")) return 5;
  if(g.includes("六")) return 6;
  const n = parseInt(String(s?.grade || s?.gradeId || "").replace(/[^\d]/g,""),10);
  return Number.isFinite(n) ? n : 999;
}
function v26SeatNum(s){
  const n = parseInt(String(s?.seatNo ?? s?.seat ?? s?.number ?? "").replace(/[^\d]/g,""),10);
  return Number.isFinite(n) ? n : 9999;
}
function v26SortStudents(a,b){
  const ga=v26GradeOrder(a), gb=v26GradeOrder(b);
  if(ga!==gb) return ga-gb;
  const sa=v26SeatNum(a), sb=v26SeatNum(b);
  if(sa!==sb) return sa-sb;
  return String(a?.name||"").localeCompare(String(b?.name||""),"zh-Hant");
}
function v26DisplayName(s){
  const grade = v26GradeText(s);
  const seat = v26SeatNum(s)===9999 ? "" : `${v26SeatNum(s)}號`;
  const prefix = [grade, seat].filter(Boolean).join("｜");
  return `${prefix ? prefix+"｜" : ""}${escapeHtml(s?.name || "")}`;
}
if(typeof filteredStudents==="function" && !window.__v26FilteredPatched){
  window.__v26FilteredPatched = true;
  const oldFilteredStudents = filteredStudents;
  filteredStudents = function(){
    const arr = oldFilteredStudents();
    return Array.isArray(arr) ? arr.sort(v26SortStudents) : arr;
  };
}
function v26PatchLabels(){
  try{
    const students = (typeof filteredStudents==="function" ? filteredStudents() : (data.students||[])).sort(v26SortStudents);
    document.querySelectorAll(".student-item,.student-card,.log-card,tr").forEach(el=>{
      if(el.dataset.v26Label==="1") return;
      const txt = el.textContent || "";
      const s = students.find(x => x.name && txt.includes(x.name));
      if(!s) return;
      const nodes = [...el.querySelectorAll("b,strong,.name,td,div")];
      const node = nodes.find(n => (n.textContent||"").includes(s.name));
      if(node){
        node.innerHTML = node.innerHTML.replace(escapeHtml(s.name), v26DisplayName(s));
        el.dataset.v26Label="1";
      }
    });
  }catch(e){console.warn("v26PatchLabels", e);}
}
function v26PatchScroll(){
  document.querySelectorAll(".student-list,.log-list,.course-list").forEach(el=>{
    el.style.maxHeight="72vh";
    el.style.overflowY="auto";
    el.style.webkitOverflowScrolling="touch";
  });
}
if(typeof renderAll==="function" && !window.__v26RenderPatched){
  window.__v26RenderPatched = true;
  const oldRenderAll = renderAll;
  renderAll = function(){
    oldRenderAll();
    setTimeout(()=>{v26PatchLabels();v26PatchScroll();},0);
  };
}
setTimeout(()=>{try{renderAll();}catch(e){}},300);
/* END V26 FINAL FIXES */


/* V27 disabled in V29 */


/* V28 disabled in V29 */


/* V29 CLEAN UI FIX disabled in V31 */


/* V31 FULL FIX */
function v31Esc(x){ return typeof escapeHtml==="function" ? escapeHtml(x) : String(x??""); }
function v31Pad(n){ return String(n).padStart(2,"0"); }
function v31ParseLocalDate(s){
  const m=String(s||"").match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  return m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3])) : null;
}
function v31FormatDate(d){ return `${d.getFullYear()}-${v31Pad(d.getMonth()+1)}-${v31Pad(d.getDate())}`; }
function v31AddDays(dateStr, days){
  const d=v31ParseLocalDate(dateStr);
  if(!d) return dateStr;
  d.setDate(d.getDate()+Number(days||0));
  return v31FormatDate(d);
}
function v31SchoolName(id){ return (data.schools||[]).find(x=>x.id===id)?.name || ""; }
function v31GradeName(id){ return (data.grades||[]).find(x=>x.id===id)?.name || ""; }
function v31CurrentSchoolId(){ return data?.filter?.schoolId || ""; }
function v31CurrentGradeId(){ return data?.filter?.gradeId || ""; }
function v31Memberships(studentId){ return (data.memberships||[]).filter(m=>m.studentId===studentId); }
function v31PrimaryMembership(s){
  const ms=v31Memberships(s.id), cs=v31CurrentSchoolId(), cg=v31CurrentGradeId();
  return ms.find(m=>m.schoolId===cs && (!cg || m.gradeId===cg))
    || ms.find(m=>m.schoolId===cs)
    || ms[0]
    || {schoolId:s.schoolId||"", gradeId:s.gradeId||""};
}
function v31GradeOrder(txt){
  txt=String(txt||"");
  if(txt.includes("三")) return 3;
  if(txt.includes("四")) return 4;
  if(txt.includes("五")) return 5;
  if(txt.includes("六")) return 6;
  const n=parseInt(txt.replace(/[^\d]/g,""),10);
  return Number.isFinite(n)?n:999;
}
function v31Seat(s){
  const n=parseInt(String(s.seatNo??s.seat??s.number??"").replace(/[^\d]/g,""),10);
  return Number.isFinite(n)?n:"";
}
function v31Points(s){
  const direct=parseInt(s.points??s.point??s.score??"",10);
  if(Number.isFinite(direct)) return direct;
  return (data.points||[]).filter(p=>p.studentId===s.id).reduce((sum,p)=>sum+(parseInt(p.value??p.points??0,10)||0),0);
}
function v31SummaryText(s){
  const m=v31PrimaryMembership(s);
  const school=v31SchoolName(m.schoolId)||s.schoolName||"";
  const grade=v31GradeName(m.gradeId)||s.gradeName||s.className||"";
  const seat=v31Seat(s);
  return `${school?school+"｜":""}${grade?grade+"｜":""}${seat?seat+"號｜":""}點數 ${v31Points(s)}`;
}
function v31InCurrentFilter(s){
  const cs=v31CurrentSchoolId(), cg=v31CurrentGradeId();
  const ms=v31Memberships(s.id);
  const schoolOK=!cs || ms.some(m=>m.schoolId===cs) || s.schoolId===cs;
  const gradeOK=!cg || ms.some(m=>m.gradeId===cg) || s.gradeId===cg;
  return schoolOK && gradeOK;
}
function v31Sort(a,b){
  const ma=v31PrimaryMembership(a), mb=v31PrimaryMembership(b);
  const ga=v31GradeOrder(v31GradeName(ma.gradeId)||a.gradeName||a.className||a.grade);
  const gb=v31GradeOrder(v31GradeName(mb.gradeId)||b.gradeName||b.className||b.grade);
  if(ga!==gb) return ga-gb;
  const sa=v31Seat(a)||9999, sb=v31Seat(b)||9999;
  if(sa!==sb) return sa-sb;
  return String(a.name||"").localeCompare(String(b.name||""),"zh-Hant");
}
if(typeof filteredStudents==="function" && !window.__v31FilteredPatch){
  window.__v31FilteredPatch=true;
  const old=filteredStudents;
  filteredStudents=function(){
    let arr=old();
    if(!Array.isArray(arr)) arr=[];
    return arr.filter(v31InCurrentFilter).sort(v31Sort);
  };
}

/* Local weekly date fix */
if(typeof generateAttendanceDates==="function" && !window.__v31DatePatch){
  window.__v31DatePatch=true;
  generateAttendanceDates=function(){
    const startEl=document.getElementById("attendanceStartDate");
    const weeksEl=document.getElementById("attendanceWeeks");
    const start=(startEl&&startEl.value)||"";
    const weeks=parseInt((weeksEl&&weeksEl.value)||"0",10)||0;
    if(!start || !weeks) return;
    if(!Array.isArray(data.attendanceDates)) data.attendanceDates=[];
    const schoolId=data.filter?.schoolId||"";
    const gradeId=data.filter?.gradeId||"";
    const scope=data.logFilter?.scope||"class";
    for(let i=0;i<weeks;i++){
      const date=v31AddDays(start,i*7);
      if(!data.attendanceDates.some(x=>x.date===date && x.schoolId===schoolId && x.gradeId===gradeId && (x.scope||"class")===scope)){
        data.attendanceDates.push({id:uid(),date,schoolId,gradeId,scope});
      }
    }
    persist(); renderAll(); toast("已用本地日期產生每週上課日");
  };
}

/* Remove meaningless question marks */
function v31RemoveQuestionBars(){
  document.querySelectorAll(".student-list > div,.rank-list > div,.ranking-list > div,.badge,td,th,span,div").forEach(el=>{
    if((el.textContent||"").trim()==="?") el.remove();
  });
}

/* Keep add-student form visible; rebuild clean helper without hiding inputs */
function v31FixAddStudent(){
  const cards=[...document.querySelectorAll(".card")].filter(c=>(c.textContent||"").includes("新增學生"));
  cards.forEach(card=>{
    // make all inputs/buttons inside visible again
    card.querySelectorAll("input,select,textarea,button,label").forEach(el=>{
      el.style.display="";
      el.hidden=false;
      const box=el.closest(".two,.row,.field,.form-row,div");
      if(box) box.style.display="";
    });
    // remove duplicate old hints
    card.querySelectorAll("#v29AddHelp,#v30AddHelp,#v31AddHelp").forEach(x=>x.remove());
    // hide original class fields only if there are duplicate "原班級" labels, but don't hide name/level/seat
    const labels=[...card.querySelectorAll("label,span,div")];
    labels.forEach(el=>{
      const t=(el.textContent||"").trim();
      if(t==="原班級" || t==="原班級備註"){
        const box=el.closest(".two,.row,.field,.form-row") || el.parentElement;
        if(box && !(box.textContent||"").includes("姓名") && !(box.textContent||"").includes("座號")){
          box.style.display="none";
        }
      }
    });
    const help=document.createElement("div");
    help.id="v31AddHelp";
    help.className="v31-help";
    const school=v31SchoolName(v31CurrentSchoolId())||"目前選取學校";
    const grade=v31GradeName(v31CurrentGradeId())||"目前選取年級/班級";
    help.innerHTML=`加入位置：<b>${v31Esc(school)}｜${v31Esc(grade)}</b><br>請填「姓名」與「座號」後按新增學生。`;
    const btn=[...card.querySelectorAll("button")].find(b=>(b.textContent||"").includes("新增學生"));
    if(btn) btn.insertAdjacentElement("beforebegin", help);
  });
}

/* Patch student list safely with names retained */
function v31PatchStudentList(){
  const list=document.querySelector(".student-list");
  if(!list) return;
  const students=(typeof filteredStudents==="function"?filteredStudents():(data.students||[]).filter(v31InCurrentFilter)).sort(v31Sort);
  const items=[...list.querySelectorAll(".student-item,.student-card")];
  items.forEach((el,idx)=>{
    const s=students[idx];
    if(!s) return;
    const imgHtml=s.photo ? `<img src="${s.photo}" alt="${v31Esc(s.name)}">` : `<div class="avatar">${v31Esc((s.name||"?").slice(0,2))}</div>`;
    el.innerHTML=`
      <div class="v31-student-row">
        <div class="v31-photo">${imgHtml}</div>
        <div class="v31-main">
          <div class="v31-name">${v31Esc(s.name||"")}</div>
          <div class="v31-meta">${v31Esc(v31SummaryText(s))}</div>
        </div>
        <div class="level-pill">Lv.${v31Esc(s.level||1)}</div>
      </div>`;
    el.onclick=()=>{data.selectedId=s.id; persist(); renderAll();};
  });
}

/* Personal page top box */
function v31FixPersonalTop(){
  document.querySelectorAll("#v27StudentInfoBox,#v28ProfileInfo,#v29AddHelp,#v30StudentTopInfo").forEach(x=>x.remove());
  const s=(data.students||[]).find(x=>x.id===data.selectedId);
  if(!s) return;
  const select=[...document.querySelectorAll("select")].find(x=>[...x.options].some(o=>o.value===s.id));
  const card=select ? (select.closest(".card") || select.parentElement) : null;
  if(card && !card.querySelector("#v31StudentTopInfo")){
    const box=document.createElement("div");
    box.id="v31StudentTopInfo";
    box.className="v31-info";
    select.insertAdjacentElement("afterend", box);
  }
  const box=document.getElementById("v31StudentTopInfo");
  if(box) box.innerHTML=`學生：${v31Esc(s.name||"")}<br>目前：${v31Esc(v31SummaryText(s))}`;
}

/* Level list left align */
function v31FixLevelList(){
  document.querySelectorAll(".level-list,.levels-list").forEach(list=>{
    list.style.textAlign="left";
  });
  document.querySelectorAll(".level-list > *, .levels-list > *").forEach(item=>{
    item.style.textAlign="left";
    item.style.justifyContent="flex-start";
  });
}

/* Ability sliders contained */
function v31FixRanges(){
  document.querySelectorAll('input[type="range"]').forEach(r=>{
    const p=r.closest("label,.ability-control,div");
    const txt=p?.textContent||"";
    if(["音準","節奏","視譜","氣息","音色","表現力"].some(k=>txt.includes(k))){
      r.min="1"; r.max="5"; r.step="1";
      r.style.width="100%";
      r.style.maxWidth="140px";
      r.style.boxSizing="border-box";
      r.style.accentColor="#1f6feb";
      if(p) p.classList.add("v31-range-row");
    }
  });
}

/* Ranking alignment */
function v31FixRanking(){
  document.querySelectorAll(".rank-list,.ranking-list").forEach(rank=>{
    rank.style.textAlign="left";
    rank.querySelectorAll(".rank-item,.ranking-item,.student-item").forEach(el=>{
      el.classList.add("v31-rank-row");
      el.style.textAlign="left";
    });
  });
}

if(typeof renderAll==="function" && !window.__v31RenderPatch){
  window.__v31RenderPatch=true;
  const oldRender=renderAll;
  renderAll=function(){
    oldRender();
    setTimeout(()=>{
      v31RemoveQuestionBars();
      v31FixAddStudent();
      v31PatchStudentList();
      v31FixPersonalTop();
      v31FixLevelList();
      v31FixRanges();
      v31FixRanking();
    },0);
  };
}
setInterval(()=>{
  try{
    v31RemoveQuestionBars();
    v31FixAddStudent();
    v31FixRanges();
  }catch(e){}
},1000);
/* END V31 FULL FIX */


/* V32 ATTENDANCE DATE + RANK FIX */
function v32Pad(n){ return String(n).padStart(2,"0"); }
function v32ParseDate(s){
  const m=String(s||"").match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  return m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3])) : null;
}
function v32FormatDate(d){ return `${d.getFullYear()}-${v32Pad(d.getMonth()+1)}-${v32Pad(d.getDate())}`; }
function v32AddDays(start, days){
  const d=v32ParseDate(start);
  if(!d) return start;
  d.setDate(d.getDate()+Number(days||0));
  return v32FormatDate(d);
}
function v32Scope(){
  return (data.logFilter && data.logFilter.scope) || (data.filter && data.filter.scope) || "class";
}
function v32MakeAttendanceDates(){
  const startEl=document.getElementById("attendanceStartDate") || document.querySelector('input[type="date"]');
  const weeksEl=document.getElementById("attendanceWeeks") || [...document.querySelectorAll("input")].find(i => (i.previousElementSibling?.textContent||"").includes("週數") || i.value==="10");
  const startRaw=(startEl && startEl.value) || "";
  const weeks=parseInt((weeksEl && weeksEl.value) || "0",10) || 0;
  if(!startRaw || !weeks){ alert("請先輸入起始日期與週數"); return; }

  const schoolId=(data.filter && data.filter.schoolId) || "";
  const gradeId=(data.filter && data.filter.gradeId) || "";
  const scope=v32Scope();

  if(!Array.isArray(data.attendanceDates)) data.attendanceDates=[];

  // remove same class/grade/scope old generated dates first, to avoid 05-05 leftovers
  data.attendanceDates = data.attendanceDates.filter(x => !(
    (x.schoolId||"")===schoolId &&
    (x.gradeId||"")===gradeId &&
    ((x.scope||"class")===scope)
  ));

  for(let i=0;i<weeks;i++){
    const date=v32AddDays(startRaw, i*7);
    data.attendanceDates.push({id:uid(), date, schoolId, gradeId, scope});
  }

  persist();
  renderAll();
  toast(`已產生 ${weeks} 週日期：${v32FormatDate(v32ParseDate(startRaw))} 起`);
}

/* Replace every generate function and intercept button click */
window.generateAttendanceDates = v32MakeAttendanceDates;
if(typeof generateAttendanceDates !== "undefined") generateAttendanceDates = v32MakeAttendanceDates;

function v32BindAttendanceButton(){
  document.querySelectorAll("button").forEach(btn=>{
    const t=(btn.textContent||"").trim();
    if(t.includes("產生每週日期") || t.includes("產生每週") || t.includes("產生日期")){
      if(btn.dataset.v32DateBtn==="1") return;
      btn.dataset.v32DateBtn="1";
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        v32MakeAttendanceDates();
        return false;
      };
    }
  });
}

/* Re-sort date chips/table after rendering */
function v32FixDateDisplay(){
  const schoolId=(data.filter && data.filter.schoolId) || "";
  const gradeId=(data.filter && data.filter.gradeId) || "";
  const scope=v32Scope();
  if(Array.isArray(data.attendanceDates)){
    data.attendanceDates.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  document.querySelectorAll(".date-chip").forEach(chip=>{
    const t=(chip.textContent||"").trim();
    if(t.match(/^\d{4}-\d{2}-\d{2}/) && t.includes("05-05")){
      // leave display alone only if actual data has it; normally old data removed on generation
    }
  });
}

/* Ranking: fixed same-height rows, left aligned */
function v32FixRankLayout(){
  const containers=[...document.querySelectorAll(".rank-list,.ranking-list,.card")].filter(c=>(c.textContent||"").includes("排行榜"));
  containers.forEach(c=>{
    c.classList.add("v32-rank-container");
    const rows=[...c.querySelectorAll(".rank-item,.ranking-item,.student-item,.log-card")];
    rows.forEach(row=>{
      row.classList.add("v32-rank-row");
      row.style.minHeight="72px";
      row.style.display="grid";
      row.style.gridTemplateColumns="44px 52px 1fr";
      row.style.alignItems="center";
      row.style.gap="12px";
      row.style.textAlign="left";
    });
  });
}

if(typeof renderAll==="function" && !window.__v32RenderPatch){
  window.__v32RenderPatch=true;
  const oldRender=renderAll;
  renderAll=function(){
    oldRender();
    setTimeout(()=>{
      v32BindAttendanceButton();
      v32FixDateDisplay();
      v32FixRankLayout();
    },0);
  };
}
setInterval(()=>{
  try{
    v32BindAttendanceButton();
    v32FixRankLayout();
  }catch(e){}
},800);
/* END V32 ATTENDANCE DATE + RANK FIX */

persist();
renderAll();
hideSplashSoon();


/* V33.2 REAL ATTENDANCE SERIAL + SEAT FIX */
function v332rEsc(x){
  return typeof escapeHtml==="function" ? escapeHtml(x) : String(x??"");
}
function v332rGradeNameFromStudent(s){
  const raw = String(s?.gradeName ?? s?.className ?? s?.grade ?? s?.gradeId ?? "");
  if(raw.includes("三")) return "三年級";
  if(raw.includes("四")) return "四年級";
  if(raw.includes("五")) return "五年級";
  if(raw.includes("六")) return "六年級";
  const m = raw.match(/\d+/);
  if(m) return `${m[0]}年級`;
  return raw || "未填年級";
}
function v332rGradeOrder(s){
  const g = v332rGradeNameFromStudent(s);
  if(g.includes("三")) return 3;
  if(g.includes("四")) return 4;
  if(g.includes("五")) return 5;
  if(g.includes("六")) return 6;
  const n = parseInt(String(g).replace(/[^\d]/g,""),10);
  return Number.isFinite(n) ? n : 999;
}
function v332rSeatNumber(s){
  const candidates = [s?.seat, s?.seatNo, s?.number, s?.seatNumber, s?.studentNo, s?.no];
  for(const c of candidates){
    const raw = String(c ?? "").trim();
    if(!raw) continue;
    const m = raw.match(/\d+/);
    if(m){
      const n = parseInt(m[0],10);
      if(Number.isFinite(n)) return n;
    }
  }
  return null;
}
function v332rSeatOrder(s){
  const n = v332rSeatNumber(s);
  return n === null ? 9999 : n;
}
function v332rSeatText(s){
  const n = v332rSeatNumber(s);
  return n === null ? "未填座號" : `${String(n).padStart(2,"0")}號`;
}
function v332rFormatStudent(s){
  return `${v332rGradeNameFromStudent(s)}｜${v332rSeatText(s)}｜${s?.name || ""}`;
}
function v332rSortStudents(arr){
  return (arr || []).sort((a,b)=>{
    const ga = v332rGradeOrder(a), gb = v332rGradeOrder(b);
    if(ga !== gb) return ga - gb;
    const sa = v332rSeatOrder(a), sb = v332rSeatOrder(b);
    if(sa !== sb) return sa - sb;
    return String(a?.name||"").localeCompare(String(b?.name||""),"zh-Hant");
  });
}
function v332rCurrentStudents(){
  let arr = [];
  try{
    arr = typeof filteredStudents==="function" ? filteredStudents() : (data.students || []);
  }catch(e){
    arr = data.students || [];
  }
  return v332rSortStudents([...arr]);
}
function v332rPatchAttendanceOverview(){
  try{
    const students = v332rCurrentStudents();
    const cards = [...document.querySelectorAll(".card")].filter(c => (c.textContent||"").includes("點名總覽表"));
    cards.forEach(card=>{
      const rows = [...card.querySelectorAll("tbody tr, tr")].filter(tr => {
        const txt = tr.textContent || "";
        return students.some(st => st.name && txt.includes(st.name));
      });
      rows.forEach((tr, idx)=>{
        const txt = tr.textContent || "";
        const s = students.find(st => st.name && txt.includes(st.name));
        if(!s) return;
        const firstCell = tr.querySelector("td");
        if(!firstCell) return;
        const rateText = [...firstCell.querySelectorAll("*")]
          .map(x => x.textContent || "")
          .find(t => t.includes("出席率")) || "";
        firstCell.innerHTML = `
          <div class="v332r-att-row">
            <span class="v332r-serial">${idx + 1}</span>
            <div class="v332r-att-main">
              <div class="v332r-att-name">${v332rEsc(v332rFormatStudent(s))}</div>
              <div class="v332r-att-rate">${v332rEsc(rateText || "出席率 0%")}</div>
            </div>
          </div>
        `;
      });
    });
  }catch(e){
    console.warn("v33.2 real attendance patch", e);
  }
}
if(typeof renderAll==="function" && !window.__v332rRenderPatch){
  window.__v332rRenderPatch = true;
  const oldRenderAll = renderAll;
  renderAll = function(){
    oldRenderAll();
    setTimeout(v332rPatchAttendanceOverview, 0);
  };
}
setInterval(()=>{ try{ v332rPatchAttendanceOverview(); }catch(e){} }, 1000);
setTimeout(()=>{ try{ renderAll(); }catch(e){} }, 300);
/* END V33.2 REAL ATTENDANCE SERIAL + SEAT FIX */

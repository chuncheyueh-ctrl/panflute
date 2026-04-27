
const KEY="battle_panflute_v5_stable_core";
const LEGACY_KEYS=["battle_panflute_v4_levelup","battle_panflute_google_sheets_v3","battle_panflute_google_sheets_v1"];
const API_KEY="battle_panflute_google_apps_script_url_v1";

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
  students:[], memberships:[], attendance:[], attendanceDates:[], points:[], events:[], lessonLogs:[], coursePlans:[], classNotes:[], noteQuizHistory:[],
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
  ["students","memberships","attendance","attendanceDates","points","events","lessonLogs","coursePlans","classNotes","noteQuizHistory"].forEach(k=>d[k]=Array.isArray(d[k])?d[k]:[]);
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
  d.students.forEach(s=>{s.id=s.id||uid();s.name=s.name||"未命名";s.level=clampRaw(s.level,d.levels);s.points=parseInt(s.points)||0;s.schoolId=s.schoolId||d.filter.schoolId;s.gradeId=s.gradeId||d.filter.gradeId;s.notes=s.notes||"";s.photo=s.photo||""});
  d.memberships=d.memberships||[];
  d.students.forEach(s=>{
    const exists=d.memberships.some(m=>m.studentId===s.id&&m.schoolId===s.schoolId&&m.gradeId===s.gradeId);
    if(!exists)d.memberships.push({id:uid(),studentId:s.id,schoolId:s.schoolId,gradeId:s.gradeId});
  });
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
  ["sync","teacher","classroom","display","student","noteQuiz","calendar","lessonLog","coursePlan","levels","manage"].forEach(name=>{
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
  else{
    const count=data.memberships.filter(m=>m.studentId===studentId).length;
    if(count<=1){toast("學生至少要保留在一個班級");renderAll();return}
    removeMembership(studentId,schoolId,gradeId);
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

function attendanceKey(studentId,date=todayStr()){return data.attendance.find(a=>a.date===date&&a.studentId===studentId)}
function todayAttendance(){return data.attendance.filter(a=>a.date===todayStr()&&a.schoolId===data.filter.schoolId&&a.gradeId===data.filter.gradeId)}
function attendanceStatus(studentId){return attendanceKey(studentId)?.status||""}
function attendanceReason(studentId){return attendanceKey(studentId)?.reason||""}
function setAttendance(studentId,status,reason=""){
  ensureTodayInAttendanceDates();
  const s=data.students.find(x=>x.id===studentId);if(!s)return;
  let a=attendanceKey(studentId);
  if(a){a.status=status;a.reason=reason||"";a.schoolId=data.filter.schoolId;a.gradeId=data.filter.gradeId;}
  else data.attendance.push({id:uid(),date:todayStr(),studentId,status,reason:reason||"",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});
  saveAndRender();
}
function setLeave(studentId){
  const reason=prompt("請輸入請假原因：",attendanceReason(studentId)||"");
  if(reason===null)return;
  setAttendance(studentId,"leave",reason);
}
function markAllPresent(){
  ensureTodayInAttendanceDates();
  filteredStudents().forEach(s=>{
    let a=attendanceKey(s.id);
    if(a){a.status="present";a.reason="";a.schoolId=data.filter.schoolId;a.gradeId=data.filter.gradeId;}
    else data.attendance.push({id:uid(),date:todayStr(),studentId:s.id,status:"present",reason:"",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});
  });
  saveAndRender("已標記全班出席");
}
function clearTodayAttendance(){
  data.attendance=data.attendance.filter(a=>!(a.date===todayStr()&&a.schoolId===data.filter.schoolId&&a.gradeId===data.filter.gradeId));
  saveAndRender("已清除今日點名");
}

function classAttendanceDates(){
  data.attendanceDates=data.attendanceDates||[];
  return data.attendanceDates.filter(d=>d.schoolId===data.filter.schoolId&&d.gradeId===data.filter.gradeId).sort((a,b)=>a.date.localeCompare(b.date));
}
function ensureTodayInAttendanceDates(){
  data.attendanceDates=data.attendanceDates||[];
  const exists=data.attendanceDates.some(d=>d.date===todayStr()&&d.schoolId===data.filter.schoolId&&d.gradeId===data.filter.gradeId);
  if(!exists)data.attendanceDates.push({id:uid(),date:todayStr(),schoolId:data.filter.schoolId,gradeId:data.filter.gradeId,note:"今日上課"});
}
function addAttendanceDate(){
  const date=prompt("請輸入上課日期（格式：YYYY-MM-DD）：",todayStr());
  if(!date)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast("日期格式請用 YYYY-MM-DD");return}
  data.attendanceDates=data.attendanceDates||[];
  const exists=data.attendanceDates.some(d=>d.date===date&&d.schoolId===data.filter.schoolId&&d.gradeId===data.filter.gradeId);
  if(exists){toast("這個日期已存在");return}
  data.attendanceDates.push({id:uid(),date,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId,note:""});
  saveAndRender("已新增上課日");
}
function deleteAttendanceDate(date){
  if(!confirm(`確定刪除 ${date} 這個上課日？點名紀錄也會一併從總覽移除。`))return;
  data.attendanceDates=data.attendanceDates.filter(d=>!(d.date===date&&d.schoolId===data.filter.schoolId&&d.gradeId===data.filter.gradeId));
  data.attendance=data.attendance.filter(a=>!(a.date===date&&a.schoolId===data.filter.schoolId&&a.gradeId===data.filter.gradeId));
  saveAndRender("已刪除上課日");
}
function generateWeeklyAttendanceDates(){
  const start=document.getElementById("attStartDate")?.value||todayStr();
  const weeks=parseInt(document.getElementById("attWeeks")?.value)||20;
  const startDate=new Date(start+"T00:00:00");
  if(isNaN(startDate)){toast("請輸入正確起始日期");return}
  data.attendanceDates=data.attendanceDates||[];
  let added=0;
  for(let i=0;i<weeks;i++){
    const d=new Date(startDate);
    d.setDate(startDate.getDate()+i*7);
    const date=d.toISOString().slice(0,10);
    const exists=data.attendanceDates.some(x=>x.date===date&&x.schoolId===data.filter.schoolId&&x.gradeId===data.filter.gradeId);
    if(!exists){data.attendanceDates.push({id:uid(),date,schoolId:data.filter.schoolId,gradeId:data.filter.gradeId,note:`第${i+1}週`});added++;}
  }
  saveAndRender(`已新增 ${added} 個上課日`);
}
function setAttendanceForDate(studentId,date,status,reason=""){
  const s=data.students.find(x=>x.id===studentId);if(!s)return;
  let a=data.attendance.find(x=>x.date===date&&x.studentId===studentId);
  if(a){a.status=status;a.reason=reason||"";a.schoolId=data.filter.schoolId;a.gradeId=data.filter.gradeId;}
  else data.attendance.push({id:uid(),date,studentId,status,reason:reason||"",schoolId:data.filter.schoolId,gradeId:data.filter.gradeId});
}
function cycleAttendanceCell(studentId,date){
  const order=["","present","late","absent","leave"];
  const current=(data.attendance.find(a=>a.date===date&&a.studentId===studentId)||{}).status||"";
  const next=order[(order.indexOf(current)+1)%order.length];
  if(next===""){
    data.attendance=data.attendance.filter(a=>!(a.date===date&&a.studentId===studentId));
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
    const records=dates.map(d=>data.attendance.find(a=>a.date===d.date&&a.studentId===s.id));
    const presentLike=records.filter(a=>a&&(a.status==="present"||a.status==="late"||a.status==="leave")).length;
    const rate=dates.length?Math.round(presentLike/dates.length*100):0;
    html+=`<tr><td>${escapeAttr(s.name)}<br><span class="small">出席率 ${dates.length?rate:"-"}%</span></td>`;
    dates.forEach(d=>{
      const a=data.attendance.find(x=>x.date===d.date&&x.studentId===s.id);
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
      html+=`<label class="member-item"><input type="checkbox" ${checked?"checked":""} onchange="toggleMembership('${student.id}','${sc.id}','${gr.id}',this.checked)"> ${escapeAttr(gr.name)}</label>`;
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
async function saveToCloud(){
  const url=localStorage.getItem(API_KEY);if(!url){toast("請先貼上 Apps Script 網址");setView("sync");return}
  try{persist();const res=await fetch(url,{method:"POST",body:JSON.stringify({action:"saveAll",payload:data})});const j=await res.json();if(!j.ok)throw new Error(j.error||"同步失敗");toast("已儲存到 Google 試算表")}catch(e){console.error(e);toast("同步失敗，請檢查 Apps Script 權限")}
}
async function loadFromCloud(){
  const url=localStorage.getItem(API_KEY);if(!url){toast("請先貼上 Apps Script 網址");setView("sync");return}
  try{const res=await fetch(url+"?action=loadAll");const j=await res.json();if(!j.ok)throw new Error(j.error||"讀取失敗");data=normalize(j.payload);persist();renderAll();toast("已從 Google 試算表讀取")}catch(e){console.error(e);toast("讀取失敗，請檢查 Apps Script 權限")}
}
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

function renderAll(){
  setVal("apiUrl",localStorage.getItem(API_KEY)||"");
  renderSelects();renderTeacher();renderClassroom();renderAttendanceOverview();renderNoteQuiz();renderDisplay();renderCalendar();renderLessonLogs();renderCoursePlans();renderLevelsManage();renderManage();renderStudentPoolForClass();
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

persist();
renderAll();
hideSplashSoon();

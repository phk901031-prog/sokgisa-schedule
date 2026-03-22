// ========================
// ㉓ 일정 등록 모달 / 날짜 선택
// ========================
function loadFreelancerOptions() {
    const schedSel=el('scheduleFreelancer'), adminSel=el('adminFreelancerSelect');
    if(schedSel){ schedSel.innerHTML='<option value="">선택하세요</option>'; freelancerProfiles.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; schedSel.appendChild(o); }); }
    if(adminSel){ const cv=adminSel.value; adminSel.innerHTML='<option value="">전체 보기</option>'; freelancerProfiles.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; adminSel.appendChild(o); }); if(cv) adminSel.value=cv; }
}

// ========================
// 교육지원청 관리
// ========================
let locationList = [];

function loadLocations() {
    const saved = localStorage.getItem('locationList');
    locationList = saved ? JSON.parse(saved) : ['천안교육지원청','아산교육지원청','공주교육지원청','논산계룡교육지원청','서산교육지원청','홍성교육지원청','당진교육지원청','보령교육지원청','서천교육지원청','태안교육지원청','예산교육지원청','청양교육지원청','금산교육지원청','부여교육지원청','세종특별자치시교육청'];
    renderLocationSelect();
}

function renderLocationSelect() {
    const sel = el('scheduleTitleSelect');
    const cur = el('scheduleTitle').value;
    sel.innerHTML = '<option value="">선택하세요</option>';
    locationList.forEach(loc => {
        sel.innerHTML += `<option value="${loc}"${loc===cur?' selected':''}>${loc}</option>`;
    });
}

function onLocationSelect() {
    el('scheduleTitle').value = el('scheduleTitleSelect').value;
}

function showAddLocationInput() {
    const row = el('addLocationRow');
    row.style.display = row.style.display === 'none' ? 'block' : 'none';
}

function deleteLocation() {
    const val = el('scheduleTitleSelect').value;
    if (!val) { alert('삭제할 교육지원청을 먼저 선택해주세요.'); return; }
    if (!confirm(`'${val}'을(를) 목록에서 삭제하시겠습니까?`)) return;
    locationList = locationList.filter(loc => loc !== val);
    localStorage.setItem('locationList', JSON.stringify(locationList));
    renderLocationSelect();
    el('scheduleTitle').value = '';
    showToast(`'${val}' 삭제되었습니다.`);
}

function saveNewLocation() {
    const val = el('newLocationInput').value.trim();
    if (!val) { alert('교육지원청명을 입력하세요.'); return; }
    if (locationList.includes(val)) { alert('이미 등록된 항목입니다.'); return; }
    locationList.push(val);
    localStorage.setItem('locationList', JSON.stringify(locationList));
    renderLocationSelect();
    el('scheduleTitleSelect').value = val;
    el('scheduleTitle').value = val;
    el('newLocationInput').value = '';
    el('addLocationRow').style.display = 'none';
    showToast(`'${val}' 추가되었습니다.`);
}

function openAddScheduleModal() {
    el('addScheduleModal').classList.add('show');
    selectedDates=[]; dateTimePairs={}; bulkDate=new Date();
    loadFreelancerOptions(); loadLocations(); renderBulkDateSelector(); updateSelectedDatesDisplay();
    el('scheduleTitle').value=''; el('scheduleTitleSelect').value=''; el('scheduleMemo').value='';
    el('timeSettingsContainer').style.display='none';
    el('addLocationRow').style.display='none';
}
function closeAddScheduleModal() { el('addScheduleModal').classList.remove('show'); selectedDates=[]; dateTimePairs={}; el('timeSettingsContainer').style.display='none'; }

function updateFreelancerSuggestions() {
    const ml=el('meetingList'); if(!ml) return;
    ml.innerHTML='';
    meetingTitlesHistory.forEach(t=>{ const o=document.createElement('option'); o.value=t; ml.appendChild(o); });
}

function renderBulkDateSelector() {
    const year=bulkDate.getFullYear(), month=bulkDate.getMonth();
    el('bulkMonthDisplay').textContent=`${year}년 ${month+1}월`;
    const gridEl=el('bulkDateSelector'); gridEl.innerHTML='';
    ['일','월','화','수','목','금','토'].forEach(d=>{ const h=document.createElement('div'); h.style.cssText='text-align:center;font-weight:700;color:#666;font-size:12px;padding:5px'; h.textContent=d; gridEl.appendChild(h); });
    const firstDay=new Date(year,month,1).getDay(), lastDate=new Date(year,month+1,0).getDate();
    for(let i=0;i<firstDay;i++) gridEl.appendChild(document.createElement('div'));
    for(let d=1;d<=lastDate;d++){
        const dateStr=`${year}-${pad(month+1)}-${pad(d)}`, isSel=selectedDates.includes(dateStr);
        const btn=document.createElement('div');
        btn.style.cssText=`padding:8px;text-align:center;border:2px solid ${isSel?'#4CAF50':'#ddd'};background:${isSel?'#e8f5e9':'#fff'};border-radius:6px;cursor:pointer;font-size:14px;transition:all .2s;-webkit-tap-highlight-color:transparent`;
        btn.textContent=d;
        btn.onclick=()=>toggleDateSelection(dateStr);
        gridEl.appendChild(btn);
    }
}

function toggleDateSelection(dateStr) {
    const idx=selectedDates.indexOf(dateStr);
    if(idx>-1){ selectedDates.splice(idx,1); delete dateTimePairs[dateStr]; }
    else { selectedDates.push(dateStr); selectedDates.sort(); dateTimePairs[dateStr]=''; }
    renderBulkDateSelector(); updateSelectedDatesDisplay(); renderTimeSettings();
}

function updateSelectedDatesDisplay() {
    const d=el('selectedDatesDisplay');
    if(!selectedDates.length){ d.textContent='없음'; d.style.color='#999'; d.style.fontWeight='normal'; return; }
    d.textContent=selectedDates.map(s=>{ const dt=new Date(s+'T00:00:00'); return `${dt.getMonth()+1}/${dt.getDate()}`; }).join(', ')+` (${selectedDates.length}개)`;
    d.style.color='#4CAF50'; d.style.fontWeight='700';
}

function renderTimeSettings() {
    const container=el('timeSettingsContainer'), listEl=el('timeSettingsList');
    if(!selectedDates.length){ container.style.display='none'; return; }
    container.style.display='block'; listEl.innerHTML='';
    selectedDates.forEach(dateStr=>{
        const dt=new Date(dateStr+'T00:00:00'), label=`${dt.getMonth()+1}월 ${dt.getDate()}일`;
        const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px;background:#fff;border-radius:6px';
        const curTime = dateTimePairs[dateStr]||'';
        const [curH, curM] = curTime ? curTime.split(':') : ['',''];
        row.innerHTML=`<div style="flex:1;font-weight:500;color:#333">${label}</div><div style="display:flex;gap:4px;align-items:center;flex:2"><select onchange="updateDateTimeHM('${dateStr}')" id="timeH-${dateStr}" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px"><option value="">시</option>${genHourOpts(curH)}</select><span style="font-weight:700">:</span><select onchange="updateDateTimeHM('${dateStr}')" id="timeM-${dateStr}" style="padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px"><option value="">분</option>${genMinuteOpts(curM)}</select></div>`;
        listEl.appendChild(row);
    });
}

function genHourOpts(curH) {
    let html='';
    for(let h=8;h<=22;h++) html+=`<option value="${pad(h)}"${pad(h)===curH?' selected':''}>${pad(h)}시</option>`;
    return html;
}
function genMinuteOpts(curM) {
    let html='';
    for(let m=0;m<60;m+=10) html+=`<option value="${pad(m)}"${pad(m)===curM?' selected':''}>${pad(m)}분</option>`;
    return html;
}

function updateDateTimeHM(dateStr) {
    const h = el('timeH-'+dateStr)?.value || '';
    const m = el('timeM-'+dateStr)?.value || '';
    dateTimePairs[dateStr] = (h && m) ? `${h}:${m}` : '';
}
function updateDateTime(dateStr, time) { dateTimePairs[dateStr]=time; }
function changeBulkMonth(delta) { bulkDate.setMonth(bulkDate.getMonth()+delta); renderBulkDateSelector(); }

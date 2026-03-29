// ========================
// ㉓ 일정 등록 모달 / 날짜 선택
// ========================
function loadFreelancerOptions() {
    const schedSel=el('scheduleFreelancer'), adminSel=el('adminFreelancerSelect');
    if(schedSel){ schedSel.innerHTML='<option value="">선택하세요</option>'; freelancerProfiles.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; schedSel.appendChild(o); }); }
    if(adminSel){ const cv=adminSel.value; adminSel.innerHTML='<option value="">전체 보기</option>'; freelancerProfiles.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; adminSel.appendChild(o); }); if(cv) adminSel.value=cv; }
}

// ========================
// 교육지원청 관리 (Supabase DB 기반)
// ========================
let locationList = [];

async function loadLocations() {
    // 1. 먼저 localStorage에 남아있는 목록을 DB에 자동 병합 (1회성)
    const saved = localStorage.getItem('locationList');
    if (saved) {
        try {
            const localList = JSON.parse(saved);
            if (Array.isArray(localList) && localList.length > 0) {
                const { data: dbData } = await sb.from('locations').select('name');
                const dbList = (dbData || []).map(d => d.name);
                const toAdd = localList.filter(loc => loc && !dbList.includes(loc));
                if (toAdd.length > 0) {
                    await sb.from('locations').insert(toAdd.map(name => ({ name })));
                }
                // 병합 완료 후 localStorage 플래그 설정 (다음부터 스킵)
                localStorage.setItem('locationsSynced', 'true');
            }
        } catch(e) { console.log('localStorage 병합 오류:', e); }
    }
    // 2. DB에서 최신 목록 로드
    const { data, error } = await sb.from('locations').select('name').order('name');
    if (data && !error) {
        locationList = data.map(d => d.name);
    } else {
        locationList = saved ? JSON.parse(saved) : ['천안교육지원청','아산교육지원청','공주교육지원청','논산계룡교육지원청','서산교육지원청','홍성교육지원청','당진교육지원청','보령교육지원청','서천교육지원청','태안교육지원청','예산교육지원청','청양교육지원청','금산교육지원청','부여교육지원청','세종특별자치시교육청'];
    }
    // 3. localStorage도 DB 기준으로 갱신
    localStorage.setItem('locationList', JSON.stringify(locationList));
    renderLocationSelect();
}

// 동기화: localStorage 목록을 DB에 병합 (추가만, 삭제 안 함)
async function syncLocations() {
    if (!confirm('교육지원청 목록을 동기화하시겠습니까?\n\n이 기기에 저장된 목록과 서버 목록을 합칩니다.\n(기존 항목은 삭제되지 않습니다)')) return;
    showLoading(true);
    // 1. localStorage 목록 가져오기
    const saved = localStorage.getItem('locationList');
    const localList = saved ? JSON.parse(saved) : [];
    // 2. DB 목록 가져오기
    const { data: dbData } = await sb.from('locations').select('name');
    const dbList = (dbData || []).map(d => d.name);
    // 3. localStorage에만 있는 것 → DB에 추가
    const toAdd = localList.filter(loc => !dbList.includes(loc));
    if (toAdd.length > 0) {
        const rows = toAdd.map(name => ({ name }));
        await sb.from('locations').insert(rows);
    }
    // 4. DB에서 최신 목록 다시 로드
    await loadLocations();
    // 5. localStorage도 DB 기준으로 업데이트
    localStorage.setItem('locationList', JSON.stringify(locationList));
    showLoading(false);
    const msg = toAdd.length > 0 ? `동기화 완료! ${toAdd.length}개 항목 추가됨` : '동기화 완료! 새로 추가할 항목이 없습니다';
    showToast(msg);
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

async function deleteLocation() {
    const val = el('scheduleTitleSelect').value;
    if (!val) { alert('삭제할 교육지원청을 먼저 선택해주세요.'); return; }
    if (!confirm(`'${val}'을(를) 목록에서 삭제하시겠습니까?`)) return;
    showLoading(true);
    await sb.from('locations').delete().eq('name', val);
    locationList = locationList.filter(loc => loc !== val);
    localStorage.setItem('locationList', JSON.stringify(locationList));
    showLoading(false);
    renderLocationSelect();
    el('scheduleTitle').value = '';
    showToast(`'${val}' 삭제되었습니다.`);
}

async function saveNewLocation() {
    const val = el('newLocationInput').value.trim();
    if (!val) { alert('교육지원청명을 입력하세요.'); return; }
    if (locationList.includes(val)) { alert('이미 등록된 항목입니다.'); return; }
    showLoading(true);
    const { error } = await sb.from('locations').insert({ name: val });
    showLoading(false);
    if (error) { alert('추가 오류: ' + error.message); return; }
    locationList.push(val);
    locationList.sort();
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
    ['월','화','수','목','금','토','일'].forEach((d,i)=>{ const h=document.createElement('div'); h.style.cssText=`text-align:center;font-weight:700;font-size:12px;padding:5px;color:${i===5?'#2196F3':i===6?'#f44336':'#666'}`; h.textContent=d; gridEl.appendChild(h); });
    const firstDaySun=new Date(year,month,1).getDay(), firstDay=firstDaySun===0?6:firstDaySun-1, lastDate=new Date(year,month+1,0).getDate();
    for(let i=0;i<firstDay;i++) gridEl.appendChild(document.createElement('div'));
    for(let d=1;d<=lastDate;d++){
        const dateStr=`${year}-${pad(month+1)}-${pad(d)}`, isSel=selectedDates.includes(dateStr);
        const btn=document.createElement('div');
        const dow=new Date(year,month,d).getDay();
        const dayColor=dow===6?'#2196F3':dow===0?'#f44336':'#333';
        btn.style.cssText=`padding:8px;text-align:center;border:2px solid ${isSel?'#4CAF50':'#ddd'};background:${isSel?'#e8f5e9':'#fff'};border-radius:6px;cursor:pointer;font-size:14px;transition:all .2s;-webkit-tap-highlight-color:transparent;color:${dayColor}`;
        btn.textContent=d;
        btn.onclick=()=>toggleDateSelection(dateStr);
        gridEl.appendChild(btn);
    }
}

function toggleDateSelection(dateStr) {
    const idx=selectedDates.indexOf(dateStr);
    if(idx>-1){ selectedDates.splice(idx,1); delete dateTimePairs[dateStr]; }
    else { selectedDates.push(dateStr); selectedDates.sort(); dateTimePairs[dateStr]=[{time:'',memo:''}]; }
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
        const slots = dateTimePairs[dateStr] || [{time:'',memo:''}];
        // 날짜 헤더
        const dateHeader=document.createElement('div');
        dateHeader.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;margin-top:12px';
        dateHeader.innerHTML=`<div style="font-weight:700;color:#333;font-size:15px">📅 ${label}</div><button type="button" onclick="addTimeSlot('${dateStr}')" style="background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:600">+ 시간 추가</button>`;
        listEl.appendChild(dateHeader);
        // 각 시간 슬롯
        slots.forEach((slot, i) => {
            const row=document.createElement('div'); row.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:10px;background:#fff;border-radius:6px;border:1px solid #e0e0e0';
            const [curH, curM] = slot.time ? slot.time.split(':') : ['',''];
            let removeBtn = slots.length > 1 ? `<button type="button" onclick="removeTimeSlot('${dateStr}',${i})" style="background:#ffebee;color:#c62828;border:1px solid #ffcdd2;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">✕</button>` : '';
            row.innerHTML=`<div style="display:flex;gap:4px;align-items:center"><select onchange="updateSlotTime('${dateStr}',${i})" id="timeH-${dateStr}-${i}" style="padding:7px;border:1px solid #ddd;border-radius:6px;font-size:13px"><option value="">시</option>${genHourOpts(curH)}</select><span style="font-weight:700">:</span><select onchange="updateSlotTime('${dateStr}',${i})" id="timeM-${dateStr}-${i}" style="padding:7px;border:1px solid #ddd;border-radius:6px;font-size:13px"><option value="">분</option>${genMinuteOpts(curM)}</select></div><input type="text" placeholder="메모" value="${slot.memo||''}" onchange="updateSlotMemo('${dateStr}',${i},this.value)" style="flex:1;padding:7px;border:1px solid #ddd;border-radius:6px;font-size:13px">${removeBtn}`;
            listEl.appendChild(row);
        });
    });
}

function addTimeSlot(dateStr) {
    if (!dateTimePairs[dateStr]) dateTimePairs[dateStr] = [{time:'',memo:''}];
    dateTimePairs[dateStr].push({time:'',memo:''});
    renderTimeSettings();
}

function removeTimeSlot(dateStr, idx) {
    dateTimePairs[dateStr].splice(idx, 1);
    renderTimeSettings();
}

function updateSlotTime(dateStr, idx) {
    const h = el('timeH-'+dateStr+'-'+idx)?.value || '';
    const m = el('timeM-'+dateStr+'-'+idx)?.value || '';
    dateTimePairs[dateStr][idx].time = (h && m) ? `${h}:${m}` : '';
}

function updateSlotMemo(dateStr, idx, memo) {
    dateTimePairs[dateStr][idx].memo = memo;
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

function updateDateTime(dateStr, time) { dateTimePairs[dateStr]=[{time,memo:''}]; }
function changeBulkMonth(delta) { bulkDate.setMonth(bulkDate.getMonth()+delta); renderBulkDateSelector(); }

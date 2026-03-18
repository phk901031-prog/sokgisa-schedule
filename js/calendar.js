// ========================
// ⑭ 오늘 일정
// ========================
function renderTodaySchedules() {
    const today = new Date(), todayStr = today.toISOString().split('T')[0];
    const mn = today.getMonth()+1, dy = today.getDate(), dn = ['일','월','화','수','목','금','토'][today.getDay()];
    el('todayDate').textContent = `(${mn}월 ${dy}일 ${dn}요일)`;
    let arr = schedules.filter(s => s.date===todayStr);
    if (selectedFreelancer) arr = arr.filter(s => s.freelancer_id===selectedFreelancer);
    if (selectedLocation) arr = arr.filter(s => s.title===selectedLocation);
    arr = applySearchFilter(arr);
    const listEl = el('todayScheduleList');
    listEl.innerHTML = '';
    if (arr.length===0) { listEl.innerHTML='<div style="color:#999;font-size:14px;padding:6px 0">오늘 예정된 일정이 없습니다.</div>'; return; }
    const cfg = { unconfirmed:{color:'#ff5252',icon:'🔴',text:'미확인'}, confirmed:{color:'#ff9800',icon:'🟡',text:'일정확인'}, arrived:{color:'#2196f3',icon:'🔵',text:'현장도착'}, completed:{color:'#9c27b0',icon:'🟣',text:'회의종료'}, transcription_done:{color:'#4caf50',icon:'🟢',text:'번문완료'}, submitted:{color:'#00897b',icon:'✅',text:'제출완료'} };
    arr.forEach(s => {
        const c = cfg[s.status]||{color:'#999',icon:'⚪',text:s.status};
        const d = document.createElement('div');
        d.className = 'today-card';
        d.style.borderLeft = `4px solid ${c.color}`;
        d.innerHTML = `<span>${c.icon}</span><div style="flex:1"><div style="font-weight:700;font-size:14px;color:#333">${s.freelancer_name} - ${s.title}</div><div style="color:#666;font-size:13px">${s.time}</div></div><div style="font-size:11px;color:${c.color};font-weight:600">${c.text}</div>`;
        listEl.appendChild(d);
    });
}

// ========================
// ⑮ 캘린더
// ========================
function renderCalendar() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const isAdmin = currentView === 'admin';
    const monthEl = el(isAdmin ? 'currentMonth' : 'freelancerCurrentMonth');
    const gridEl  = el(isAdmin ? 'calendarGrid'  : 'freelancerCalendarGrid');
    if (!monthEl || !gridEl) return;
    monthEl.textContent = `${year}년 ${month+1}월`;
    gridEl.innerHTML = '';
    ['일','월','화','수','목','금','토'].forEach(d => {
        const h = document.createElement('div'); h.className='calendar-day-header'; h.textContent=d; gridEl.appendChild(h);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month+1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i=0; i<firstDay; i++) gridEl.appendChild(document.createElement('div'));
    for (let date=1; date<=lastDate; date++) {
        const dateStr = `${year}-${pad(month+1)}-${pad(date)}`;
        let daySchedules = schedules.filter(s => s.date===dateStr);
        if (isAdmin && selectedFreelancer) daySchedules = daySchedules.filter(s => s.freelancer_id===selectedFreelancer);
        if (isAdmin && selectedLocation) daySchedules = daySchedules.filter(s => s.title===selectedLocation);
        if (!isAdmin && currentUser.role==='freelancer') daySchedules = daySchedules.filter(s => s.freelancer_id===currentUser.id);
        daySchedules = applySearchFilter(daySchedules);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day' + (daySchedules.length ? ' has-event' : '') + (dateStr===todayStr ? ' today' : '');
        dayEl.innerHTML = `<div class="day-number${dateStr===todayStr?' today-num':''}">${date}</div>`;
        if (daySchedules.length) {
            const prev = document.createElement('div'); prev.className='event-preview';
            prev.innerHTML = daySchedules.slice(0,3).map(s=>`<span class="event-dot"></span>${s.freelancer_name.slice(0,2)}-${s.title.replace('교육지원청','')}`).join('<br>');
            if (daySchedules.length>3) { const m=document.createElement('div'); m.style.cssText='color:#2196F3;font-weight:700;font-size:9px'; m.textContent=`+${daySchedules.length-3}건`; prev.appendChild(m); }
            dayEl.appendChild(prev);
        }
        if (daySchedules.length || isAdmin) {
            dayEl.style.cursor='pointer';
            dayEl.onclick = () => showDateDetail(dateStr, daySchedules);
        }
        gridEl.appendChild(dayEl);
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth()+delta);
    if (selectedFreelancer) updateFreelancerSummary();
    renderCalendar();
}

// ========================
// ⑯ 날짜 상세
// ========================
function showDateDetail(dateStr, daySchedules) {
    const d = new Date(dateStr+'T00:00:00'), mn=d.getMonth()+1, dy=d.getDate(), dn=['일','월','화','수','목','금','토'][d.getDay()];
    el('dateDetailTitle').textContent = `${mn}월 ${dy}일 (${dn}) - 총 ${daySchedules.length}건`;
    const contentEl = el('dateDetailContent'); contentEl.innerHTML='';
    if (!daySchedules.length) { contentEl.innerHTML='<div style="padding:40px;text-align:center;color:#999">이 날짜에 등록된 일정이 없습니다.</div>'; }
    else {
        daySchedules.sort((a,b)=>a.time.localeCompare(b.time));
        const stCfg = { unconfirmed:{color:'#ff5252',icon:'🔴',text:'미확인'}, confirmed:{color:'#ff9800',icon:'🟡',text:'일정확인'}, arrived:{color:'#2196f3',icon:'🔵',text:'현장도착'}, completed:{color:'#9c27b0',icon:'🟣',text:'회의종료'}, transcription_done:{color:'#4caf50',icon:'🟢',text:'번문완료'}, submitted:{color:'#00897b',icon:'✅',text:'제출완료'} };
        daySchedules.forEach(s => {
            const st = stCfg[s.status]||{color:'#999',icon:'⚪',text:s.status};
            const card = document.createElement('div');
            card.style.cssText='background:#f9f9f9;border-left:4px solid #2196F3;padding:14px;margin-bottom:10px;border-radius:6px';
            let timeLogHTML='';
            if (s.time_log?.endTime) {
                const wm=s.time_log.totalWorkMinutes||0;
                timeLogHTML=`<div style="background:#e8f5e9;border-radius:6px;padding:10px;margin-top:10px"><div style="font-weight:700;color:#2e7d32;margin-bottom:4px">⏱️ 실제 근무시간</div><div style="font-size:12px;color:#555">${s.time_log.startTime} ~ ${s.time_log.endTime}<br><strong style="color:#1976d2">총 ${Math.floor(wm/60)}시간 ${wm%60}분</strong></div></div>`;
            }
            card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px"><div style="flex:1"><div style="font-weight:700;color:#333;font-size:16px;margin-bottom:4px">${s.title}</div><div style="color:#666;font-size:14px;display:flex;gap:12px"><span>⏰ ${s.time}</span><span>👤 ${s.freelancer_name}</span></div></div><span style="background:${st.color}20;color:${st.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">${st.icon} ${st.text}</span></div>${s.memo?`<div style="color:#666;font-size:13px;padding-top:8px;border-top:1px solid #e0e0e0">📝 ${s.memo}</div>`:''}${timeLogHTML}${currentView==='admin'?`<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0">${s.status==='transcription_done'?`<button class="btn" onclick="markSubmitted(${s.id})" style="flex:1;font-size:12px;padding:6px;background:#e0f2f1;color:#00695c;border:1px solid #80cbc4">✅ 제출완료</button>`:''}<button class="btn btn-outline" onclick="closeDateDetailModal();openEditScheduleModal(${s.id})" style="flex:1;font-size:12px;padding:6px">✏️ 수정</button><button class="btn" onclick="deleteSchedule(${s.id})" style="flex:1;font-size:12px;padding:6px;background:#ffebee;color:#c62828;border:1px solid #ffcdd2">🗑️ 삭제</button></div>`:''}`;
            contentEl.appendChild(card);
        });
    }
    el('dateDetailModal').classList.add('show');
}
function closeDateDetailModal() { el('dateDetailModal').classList.remove('show'); }

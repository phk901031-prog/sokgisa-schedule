// ========================
// ⑭ 오늘 일정
// ========================
function renderTodaySchedules() {
    const today = new Date(), todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
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
    ['월','화','수','목','금','토','일'].forEach((d,i) => {
        const h = document.createElement('div'); h.className='calendar-day-header'; h.textContent=d;
        if (i===5) h.style.color='#2196F3'; // 토요일 파란색
        if (i===6) h.style.color='#f44336'; // 일요일 빨간색
        gridEl.appendChild(h);
    });
    const firstDaySun = new Date(year, month, 1).getDay();
    const firstDay = firstDaySun === 0 ? 6 : firstDaySun - 1; // 월요일 시작으로 변환
    const lastDate = new Date(year, month+1, 0).getDate();
    const t = new Date(); const todayStr = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    for (let i=0; i<firstDay; i++) gridEl.appendChild(document.createElement('div'));
    for (let date=1; date<=lastDate; date++) {
        const dateStr = `${year}-${pad(month+1)}-${pad(date)}`;
        let daySchedules = schedules.filter(s => s.date===dateStr);
        if (isAdmin && selectedFreelancer) daySchedules = daySchedules.filter(s => s.freelancer_id===selectedFreelancer);
        if (isAdmin && selectedLocation) daySchedules = daySchedules.filter(s => s.title===selectedLocation);
        if (!isAdmin && currentUser.role==='freelancer') daySchedules = daySchedules.filter(s => s.freelancer_id===currentUser.id);
        daySchedules = applySearchFilter(daySchedules);
        const dayEl = document.createElement('div');
        const dayOfWeek = new Date(year, month, date).getDay(); // 0=일, 6=토
        dayEl.className = 'calendar-day' + (daySchedules.length ? ' has-event' : '') + (dateStr===todayStr ? ' today' : '');
        const dayNumColor = dateStr===todayStr ? '' : dayOfWeek===6 ? 'color:#2196F3;' : dayOfWeek===0 ? 'color:#f44336;' : '';
        dayEl.innerHTML = `<div class="day-number${dateStr===todayStr?' today-num':''}" style="${dayNumColor}">${date}</div>`;
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
        // PC 호버 툴팁 (일정이 있을 때만)
        if (daySchedules.length) {
            const ds = [...daySchedules].sort((a,b)=>a.time.localeCompare(b.time));
            dayEl.addEventListener('mouseenter', function(e) {
                removeCalendarTooltip();
                const stIcons = {unconfirmed:'🔴',confirmed:'🟡',arrived:'🔵',completed:'🟣',transcription_done:'🟢',submitted:'✅'};
                const tip = document.createElement('div');
                tip.className = 'calendar-tooltip';
                tip.id = 'calendarTooltip';
                const dn = ['일','월','화','수','목','금','토'][new Date(dateStr+'T00:00:00').getDay()];
                const mn = parseInt(dateStr.split('-')[1]), dy = parseInt(dateStr.split('-')[2]);
                tip.innerHTML = `<div class="tooltip-title">${mn}월 ${dy}일 (${dn}) - ${ds.length}건</div>` +
                    ds.map(s => `<div class="tooltip-item"><span class="tooltip-time">${s.time}</span><span class="tooltip-name">${s.freelancer_name}</span><span class="tooltip-loc">${s.title}</span><span class="tooltip-status">${stIcons[s.status]||'⚪'}</span></div>`).join('');
                document.body.appendChild(tip);
                const rect = dayEl.getBoundingClientRect();
                let left = rect.right + 8;
                let top = rect.top;
                // 화면 오른쪽 넘어가면 왼쪽에 표시
                if (left + tip.offsetWidth > window.innerWidth - 10) left = rect.left - tip.offsetWidth - 8;
                // 화면 아래쪽 넘어가면 위로 조정
                if (top + tip.offsetHeight > window.innerHeight - 10) top = window.innerHeight - tip.offsetHeight - 10;
                if (top < 10) top = 10;
                tip.style.left = left + 'px';
                tip.style.top = top + 'px';
            });
            dayEl.addEventListener('mouseleave', removeCalendarTooltip);
        }
        gridEl.appendChild(dayEl);
    }
}

function removeCalendarTooltip() {
    const t = document.getElementById('calendarTooltip');
    if (t) t.remove();
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
    // 관리자: 캘린더에서 바로 일정 등록 버튼
    if (currentView==='admin') {
        const addBtn = document.createElement('div');
        addBtn.style.cssText='margin-bottom:12px';
        addBtn.innerHTML=`<button class="btn btn-primary" onclick="closeDateDetailModal();openAddScheduleModalWithDate('${dateStr}')" style="width:100%;padding:10px;font-size:14px">+ 이 날짜에 일정 등록</button>`;
        contentEl.appendChild(addBtn);
    }
    if (!daySchedules.length) { contentEl.innerHTML+='<div style="padding:40px;text-align:center;color:#999">이 날짜에 등록된 일정이 없습니다.</div>'; }
    else {
        daySchedules.sort((a,b)=>a.time.localeCompare(b.time));
        const stCfg = { unconfirmed:{color:'#ff5252',icon:'🔴',text:'미확인'}, confirmed:{color:'#ff9800',icon:'🟡',text:'일정확인'}, arrived:{color:'#2196f3',icon:'🔵',text:'현장도착'}, completed:{color:'#9c27b0',icon:'🟣',text:'회의종료'}, transcription_done:{color:'#4caf50',icon:'🟢',text:'번문완료'}, submitted:{color:'#00897b',icon:'✅',text:'제출완료'} };
        // 관리자 강제 상태 변경: 다음 단계 매핑
        const nextStatus = { unconfirmed:{next:'confirmed',text:'일정확인',bg:'#fff3e0',color:'#e65100',border:'#ffcc80'}, confirmed:{next:'arrived',text:'현장도착',bg:'#e3f2fd',color:'#1565c0',border:'#90caf9'}, arrived:{next:'completed',text:'회의종료',bg:'#f3e5f5',color:'#7b1fa2',border:'#ce93d8'}, completed:{next:'transcription_done',text:'번문완료',bg:'#e8f5e9',color:'#2e7d32',border:'#a5d6a7'}, transcription_done:{next:'submitted',text:'제출완료',bg:'#e0f2f1',color:'#00695c',border:'#80cbc4'} };
        daySchedules.forEach(s => {
            const st = stCfg[s.status]||{color:'#999',icon:'⚪',text:s.status};
            const card = document.createElement('div');
            card.style.cssText='background:#f9f9f9;border-left:4px solid #2196F3;padding:14px;margin-bottom:10px;border-radius:6px';
            let timeLogHTML='';
            if (s.time_log?.endTime) {
                const wm=s.time_log.totalWorkMinutes||0;
                timeLogHTML=`<div style="background:#e8f5e9;border-radius:6px;padding:10px;margin-top:10px"><div style="font-weight:700;color:#2e7d32;margin-bottom:4px">⏱️ 실제 근무시간</div><div style="font-size:12px;color:#555">${s.time_log.startTime} ~ ${s.time_log.endTime}<br><strong style="color:#1976d2">총 ${Math.floor(wm/60)}시간 ${wm%60}분</strong></div></div>`;
            }
            // 관리자 버튼: 강제 상태 변경(앞/뒤) + 복사 + 수정 + 삭제
            let adminBtns = '';
            if (currentView==='admin') {
                const ns = nextStatus[s.status];
                const prevStatus = { confirmed:{prev:'unconfirmed',text:'미확인'}, arrived:{prev:'confirmed',text:'일정확인'}, completed:{prev:'arrived',text:'현장도착'}, transcription_done:{prev:'completed',text:'회의종료'}, submitted:{prev:'transcription_done',text:'번문완료'} };
                const ps = prevStatus[s.status];
                const prevBtn = ps ? `<button class="btn" onclick="adminForceStatus(${s.id},'${ps.prev}')" style="flex:1;font-size:12px;padding:6px;background:#f5f5f5;color:#666;border:1px solid #ddd">◀ ${ps.text}</button>` : '';
                const nextBtn = ns ? `<button class="btn" onclick="adminForceStatus(${s.id},'${ns.next}')" style="flex:1;font-size:12px;padding:6px;background:${ns.bg};color:${ns.color};border:1px solid ${ns.border}">▶ ${ns.text}</button>` : '';
                adminBtns = `<div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0">${prevBtn}${nextBtn}<button class="btn" onclick="closeDateDetailModal();openCopyScheduleModal(${s.id})" style="flex:1;font-size:12px;padding:6px;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9">📋 복사</button><button class="btn btn-outline" onclick="closeDateDetailModal();openEditScheduleModal(${s.id})" style="flex:1;font-size:12px;padding:6px">✏️ 수정</button><button class="btn" onclick="deleteSchedule(${s.id})" style="flex:1;font-size:12px;padding:6px;background:#ffebee;color:#c62828;border:1px solid #ffcdd2">🗑️ 삭제</button></div>`;
            }
            card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px"><div style="flex:1"><div style="font-weight:700;color:#333;font-size:16px;margin-bottom:4px">${s.title}</div><div style="color:#666;font-size:14px;display:flex;gap:12px"><span>⏰ ${s.time}</span><span>👤 ${s.freelancer_name}</span></div></div><span style="background:${st.color}20;color:${st.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap">${st.icon} ${st.text}</span></div>${s.memo?`<div style="color:#666;font-size:13px;padding-top:8px;border-top:1px solid #e0e0e0">📝 ${s.memo}</div>`:''}${timeLogHTML}${adminBtns}`;
            contentEl.appendChild(card);
        });
    }
    el('dateDetailModal').classList.add('show');
}
function closeDateDetailModal() { el('dateDetailModal').classList.remove('show'); }

// 캘린더에서 날짜 클릭 → 해당 날짜 미리 선택된 상태로 일정 등록 모달 열기
function openAddScheduleModalWithDate(dateStr) {
    openAddScheduleModal();
    // 해당 날짜를 미리 선택
    if (!selectedDates.includes(dateStr)) {
        selectedDates.push(dateStr);
        selectedDates.sort();
        dateTimePairs[dateStr] = [{time:'',memo:''}];
    }
    renderBulkDateSelector();
    updateSelectedDatesDisplay();
    renderTimeSettings();
}

// 관리자 강제 상태 변경 (알림 없이)
async function adminForceStatus(id, newStatus) {
    const statusNames = { confirmed:'일정확인', arrived:'현장도착', completed:'회의종료', transcription_done:'번문완료', submitted:'제출완료' };
    if (!confirm(`이 일정을 "${statusNames[newStatus]}" 상태로 변경하시겠습니까?`)) return;
    showLoading(true);
    const updates = { status: newStatus };
    // 회의종료 시 time_log 기본값 설정
    if (newStatus === 'completed') {
        const s = schedules.find(x=>x.id===id);
        updates.time_log = { startTime: s?.time || '09:00', endTime: new Date().toLocaleTimeString('ko-KR',{hour12:false,hour:'2-digit',minute:'2-digit'}), totalMinutes: 0, totalWorkMinutes: 0 };
    }
    const { data, error } = await sb.from('schedules').update(updates).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    showToast(`${statusNames[newStatus]} 처리되었습니다`);
    if (newStatus === 'submitted') {
        // 제출완료 시 팝업 닫기
        closeDateDetailModal();
    } else {
        // 다른 상태 변경 시 모달 내용 갱신
        const dateStr = data.date;
        const daySchedules = schedules.filter(s => s.date===dateStr);
        showDateDetail(dateStr, daySchedules);
    }
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

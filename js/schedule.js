// ========================
// ⑰ 일정 목록 렌더링
// ========================
function renderScheduleList() {
    const listEl = el('adminScheduleList');
    // 현재 열려있는 아코디언 상태 기억
    const openAccordions = new Set();
    listEl.querySelectorAll('[id^="acc-"]').forEach(acc => {
        if (acc.style.display === 'block') openAccordions.add(acc.id);
    });
    listEl.innerHTML='';
    const filtered = getFilteredSchedules();
    filtered.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    const byDate={};
    filtered.forEach(s=>{ if(!byDate[s.date]) byDate[s.date]=[]; byDate[s.date].push(s); });
    const dates = Object.keys(byDate).sort();
    if (!dates.length) { listEl.innerHTML='<div style="padding:40px;text-align:center;color:#999">일정이 없습니다.</div>'; updateStats(); return; }
    dates.forEach((dateStr, idx) => {
        const d=new Date(dateStr+'T00:00:00'), mn=d.getMonth()+1, dy=d.getDate(), dn=['일','월','화','수','목','금','토'][d.getDay()];
        const daySchedules=byDate[dateStr];
        const accordionId=`acc-${dateStr}`;
        // 이전에 열려있었으면 유지, 아니면 첫 번째만 열기
        const isExp = openAccordions.size > 0 ? openAccordions.has(accordionId) : idx===0;
        const wrap = document.createElement('div'); wrap.style.marginBottom='10px';
        const hdr = document.createElement('div');
        hdr.style.cssText='background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:13px 16px;border-radius:8px;font-weight:700;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none';
        hdr.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><span id="arr-${accordionId}">${isExp?'▼':'▶'}</span><span>${mn}월 ${dy}일 (${dn})</span></div><span style="background:rgba(255,255,255,.3);padding:3px 10px;border-radius:12px;font-size:13px">${daySchedules.length}건</span>`;
        const body = document.createElement('div');
        body.id=accordionId; body.style.display=isExp?'block':'none';
        if(isExp) body.style.animation='slideDown .3s ease-out';
        const tbl = document.createElement('div');
        tbl.style.cssText='background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-top:8px';
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            const thdr=document.createElement('div');
            thdr.style.cssText='display:grid;grid-template-columns:70px 2fr 1fr 100px 140px;gap:8px;padding:11px 16px;background:#f5f5f5;font-weight:700;font-size:13px;color:#666;border-bottom:2px solid #e0e0e0';
            thdr.innerHTML='<div>시간</div><div>회의명</div><div>속기사</div><div>상태</div><div style="text-align:center">작업</div>';
            tbl.appendChild(thdr);
        }
        const stCfg={unconfirmed:{color:'#ff5252',icon:'🔴',text:'미확인'},confirmed:{color:'#ff9800',icon:'🟡',text:'일정확인'},arrived:{color:'#2196f3',icon:'🔵',text:'현장도착'},completed:{color:'#9c27b0',icon:'🟣',text:'회의종료'},transcription_done:{color:'#4caf50',icon:'🟢',text:'번문완료'},submitted:{color:'#00897b',icon:'✅',text:'제출완료'}};
        daySchedules.sort((a,b)=>a.time.localeCompare(b.time));
        daySchedules.forEach((s,i) => {
            const st=stCfg[s.status]||{color:'#999',icon:'⚪',text:s.status};
            const row=document.createElement('div');
            // 제출완료 버튼: 번문완료 상태일 때만 표시
            let actionBtns = `<button class="btn btn-outline" onclick="event.stopPropagation();openEditScheduleModal(${s.id})" style="font-size:11px;padding:5px 9px">수정</button><button class="btn" onclick="event.stopPropagation();deleteSchedule(${s.id})" style="font-size:11px;padding:5px 9px;background:#ffebee;color:#c62828;border:1px solid #ffcdd2">삭제</button>`;
            if (s.status==='transcription_done') actionBtns = `<button class="btn" onclick="event.stopPropagation();markSubmitted(${s.id})" style="font-size:11px;padding:5px 9px;background:#e0f2f1;color:#00695c;border:1px solid #80cbc4">제출완료</button>` + actionBtns;
            if (isMobile) {
                row.style.cssText=`padding:12px 14px;border-bottom:${i===daySchedules.length-1?'none':'1px solid #f0f0f0'}`;
                row.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:700;color:#333;font-size:15px">${s.time}</span><span style="background:${st.color}15;color:${st.color};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap">${st.icon} ${st.text}</span></div><div style="font-weight:500;color:#333;margin-bottom:3px">${s.title}</div><div style="color:#666;font-size:13px;margin-bottom:6px">👤 ${s.freelancer_name}</div>${s.memo?`<div style="font-size:12px;color:#999;margin-bottom:6px">📝 ${s.memo}</div>`:''}<div style="display:flex;gap:6px">${actionBtns}</div>`;
            } else {
                row.style.cssText=`display:grid;grid-template-columns:70px 2fr 1fr 100px 140px;gap:8px;padding:13px 16px;align-items:center;border-bottom:${i===daySchedules.length-1?'none':'1px solid #f0f0f0'};cursor:pointer;transition:background .2s`;
                row.onmouseover=function(){this.style.background='#f9f9f9'};
                row.onmouseout=function(){this.style.background='#fff'};
                row.innerHTML=`<div style="font-weight:600;color:#333">${s.time}</div><div><div style="font-weight:500;color:#333;margin-bottom:3px">${s.title}</div>${s.memo?`<div style="font-size:12px;color:#999">📝 ${s.memo}</div>`:''}</div><div style="color:#666">${s.freelancer_name}</div><div><span style="background:${st.color}15;color:${st.color};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap">${st.icon} ${st.text}</span></div><div style="display:flex;gap:5px;justify-content:center">${actionBtns}</div>`;
            }
            tbl.appendChild(row);
        });
        body.appendChild(tbl);
        hdr.onclick=()=>{ const open=body.style.display==='block'; body.style.display=open?'none':'block'; el(`arr-${accordionId}`).textContent=open?'▶':'▼'; if(!open) body.style.animation='slideDown .3s ease-out'; };
        wrap.appendChild(hdr); wrap.appendChild(body); listEl.appendChild(wrap);
    });
    updateStats();
}

// ========================
// ⑱ 일정 CRUD (Supabase)
// ========================
async function addSchedule(event) {
    event.preventDefault();
    const freelancerId = el('scheduleFreelancer').value;
    const sel = el('scheduleFreelancer');
    const freelancerName = sel.options[sel.selectedIndex]?.text || '';
    const title = el('scheduleTitle').value.trim();
    const memo  = el('scheduleMemo').value.trim();
    if (!title) { alert('교육지원청을 선택해주세요.'); return; }
    if (!selectedDates.length) { alert('날짜를 선택해주세요.'); return; }
    // 각 날짜의 모든 시간 슬롯 검증
    for (const d of selectedDates) {
        const slots = dateTimePairs[d];
        if (!slots || !slots.length) { alert(`${d} 날짜의 시간을 설정해주세요.`); return; }
        for (let i=0; i<slots.length; i++) {
            if (!slots[i].time) { alert(`${d} 날짜의 ${i+1}번째 시간을 설정해주세요.`); return; }
        }
    }
    // 중복 체크
    const allRows = [];
    selectedDates.forEach(d => {
        dateTimePairs[d].forEach(slot => {
            allRows.push({ date:d, time:slot.time, memo:slot.memo||'' });
        });
    });
    const dups = allRows.filter(r => schedules.some(s => s.date===r.date && s.freelancer_id===freelancerId && s.time===r.time));
    if (dups.length && !confirm(`동일 시간 일정이 ${dups.length}건 있습니다.\n계속 등록하시겠습니까?`)) return;

    showLoading(true);
    const rows = allRows.map(r => ({ title, date:r.date, time:r.time, freelancer_id:freelancerId, freelancer_name:freelancerName, status:'unconfirmed', memo:r.memo||memo, created_by:currentUser.id }));
    const { data, error } = await sb.from('schedules').insert(rows).select();
    showLoading(false);
    if (error) { alert('일정 등록 오류: '+error.message); return; }
    if (data) {
        schedules.push(...data);
        const datesSummary = allRows.map(r => `${r.date} ${r.time}`).join('\n');
        await sendPushNotification(freelancerId, `📅 새 일정 ${allRows.length}건 등록\n${title}\n${datesSummary}`, '속기사 일정 관리');
    }
    showToast(`${allRows.length}건 등록 완료!`);
    closeAddScheduleModal(); event.target.reset();
    if (selectedFreelancer) updateFreelancerSummary();
    loadLocationOptions();
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

async function saveScheduleEdit(event) {
    event.preventDefault();
    const id = parseInt(el('editScheduleId').value);
    const freelancerId = el('editScheduleFreelancer').value;
    const sel = el('editScheduleFreelancer');
    const freelancerName = sel.options[sel.selectedIndex]?.text || '';
    const editH = el('editScheduleHour').value, editM = el('editScheduleMinute').value;
    if (!editH || !editM) { alert('시간을 선택해주세요.'); return; }
    const editTime = `${editH}:${editM}`;
    const updates = { title:el('editScheduleTitle').value.trim(), date:el('editScheduleDate').value, time:editTime, freelancer_id:freelancerId, freelancer_name:freelancerName, memo:el('editScheduleMemo').value.trim() };
    showLoading(true);
    const { data, error } = await sb.from('schedules').update(updates).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('수정 오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    await sendPushNotification(freelancerId, `✏️ 일정이 수정되었습니다\n${updates.title} (${updates.date} ${updates.time})`);
    showToast('일정이 수정되었습니다');
    closeEditScheduleModal();
    if (selectedFreelancer) updateFreelancerSummary();
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

async function deleteSchedule(id) {
    const s = schedules.find(x=>x.id===id);
    if (!s) return;
    if (!confirm(`삭제하시겠습니까?\n\n${s.title}\n${s.date} ${s.time}\n${s.freelancer_name}\n\n되돌릴 수 없습니다.`)) return;
    showLoading(true);
    const { error } = await sb.from('schedules').delete().eq('id', id);
    showLoading(false);
    if (error) { alert('삭제 오류: '+error.message); return; }
    schedules = schedules.filter(x=>x.id!==id);
    await sendPushNotification(s.freelancer_id, `🗑️ 일정이 취소되었습니다\n${s.title} (${s.date})`);
    showToast('일정이 삭제되었습니다');
    closeDateDetailModal();
    if (selectedFreelancer) updateFreelancerSummary();
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

// ========================
// ⑲ 수정 모달
// ========================
function openEditScheduleModal(id) {
    const s = schedules.find(x=>x.id===id);
    if (!s) return;
    el('editScheduleId').value    = id;
    el('editScheduleTitle').value = s.title;
    el('editScheduleDate').value  = s.date;
    el('editScheduleMemo').value  = s.memo||'';
    const fsel = el('editScheduleFreelancer');
    fsel.innerHTML = '<option value="">선택하세요</option>';
    freelancerProfiles.forEach(p => {
        const o=document.createElement('option'); o.value=p.id; o.textContent=p.name;
        if(p.id===s.freelancer_id) o.selected=true;
        fsel.appendChild(o);
    });
    const [curH, curM] = s.time ? s.time.split(':') : ['',''];
    const hsel = el('editScheduleHour');
    hsel.innerHTML = '<option value="">시</option>';
    for (let h=8;h<=22;h++) { const o=document.createElement('option'); o.value=pad(h); o.textContent=`${pad(h)}시`; if(pad(h)===curH) o.selected=true; hsel.appendChild(o); }
    const msel = el('editScheduleMinute');
    msel.innerHTML = '<option value="">분</option>';
    for (let m=0;m<60;m+=10) { const o=document.createElement('option'); o.value=pad(m); o.textContent=`${pad(m)}분`; if(pad(m)===curM) o.selected=true; msel.appendChild(o); }
    el('editScheduleModal').classList.add('show');
}
function closeEditScheduleModal() { el('editScheduleModal').classList.remove('show'); }

// ========================
// 관리자 제출완료 (관리자 확인용, 프리랜서에게 알림 없음)
// ========================
async function markSubmitted(id) {
    if (!confirm('이 일정을 제출완료 처리하시겠습니까?')) return;
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ status:'submitted' }).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    showToast('제출완료 처리되었습니다');
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

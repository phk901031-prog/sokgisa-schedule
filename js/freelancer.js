// ========================
// ⑳ 프리랜서 뷰
// ========================
function loadFreelancerSchedules() {
    const listEl = el('freelancerScheduleList'); listEl.innerHTML='';
    const t = new Date(); const todayStr = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    // 오늘 ~ +7일 범위, 번문완료/제출완료 숨김 (캘린더에는 그대로 표시)
    const endDate = new Date(t);
    endDate.setDate(endDate.getDate() + 7);
    const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-${pad(endDate.getDate())}`;
    const mySchedules = schedules.filter(s =>
        s.freelancer_id === currentUser.id &&
        s.date >= todayStr && s.date <= endStr &&
        s.status !== 'transcription_done' && s.status !== 'submitted'
    );
    mySchedules.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
    mySchedules.forEach(s => {
        const isToday = s.date===todayStr;
        const ongoing = ongoingMeetings[s.id];
        const item = document.createElement('div'); item.className='schedule-item';
        let actionHTML='', timeLogHTML='';
        if (s.time_log?.endTime) {
            timeLogHTML=`<div style="background:#e8f5e9;border:1px solid #4caf50;border-radius:6px;padding:10px;margin-top:10px"><div style="font-size:13px;color:#333">⏱️ 회의 종료: ${s.time_log.endTime}</div></div>`;
        }
        if (s.status==='submitted') {
            actionHTML=`<span style="color:#00897b">✅ 제출 완료</span>`;
        } else if (s.status==='transcription_done') {
            actionHTML=`<span style="color:#4caf50">✔️ 번문 완료</span>`;
        } else if (s.status==='completed') {
            actionHTML=`<span style="color:#9c27b0;margin-right:8px">⏹️ 회의 종료 완료</span><button class="btn btn-primary" onclick="completeTranscription(${s.id})">📝 번문 완료</button>`;
        } else if (ongoing) {
            if (ongoing.isPaused) {
                timeLogHTML=`<div style="background:#fff9c4;border:1px solid #fbc02d;border-radius:6px;padding:10px;margin-top:10px"><div style="font-weight:700;color:#f57c00">🟡 정회 중</div></div>`;
                actionHTML=`<button class="btn btn-primary" onclick="resumeMeeting(${s.id})">▶️ 회의 재개</button><button class="btn btn-outline" onclick="endMeeting(${s.id})">⏹️ 회의 종료</button>`;
            } else {
                const elapsed = Math.floor((Date.now()-new Date(ongoing.startTime))/60000);
                timeLogHTML=`<div style="background:#e3f2fd;border:1px solid #2196f3;border-radius:6px;padding:10px;margin-top:10px"><div style="font-weight:700;color:#1976d2">🟢 진행 중 (${elapsed}분 경과)</div></div>`;
                actionHTML=`<button class="btn btn-secondary" onclick="pauseMeeting(${s.id})">⏸️ 정회</button><button class="btn btn-primary" onclick="endMeeting(${s.id})">⏹️ 회의 종료</button>`;
            }
        } else {
            if (s.status==='unconfirmed') actionHTML=`<button class="btn btn-secondary" onclick="confirmSchedule(${s.id})">✅ 일정 확인</button>`;
            else if (s.status==='confirmed') actionHTML=`<span style="color:#ff9800;margin-right:8px">✅ 일정 확인 완료</span><button class="btn btn-primary" onclick="arriveVenue(${s.id})">📍 현장 도착</button>`;
            else if (s.status==='arrived') actionHTML=`<span style="color:#2196f3;margin-right:8px">📍 현장 도착 완료</span><button class="btn btn-primary" onclick="endMeeting(${s.id})">⏹️ 회의 종료</button>`;
            else if (s.status==='completed') actionHTML=`<span style="color:#9c27b0;margin-right:8px">⏹️ 회의 종료 완료</span><button class="btn btn-success" onclick="completeTranscription(${s.id})">📝 번문 완료</button>`;
            else if (s.status==='transcription_done') actionHTML=`<span style="color:#4caf50">✔️ 번문 완료</span>`;
        }
        item.innerHTML=`<div class="schedule-header"><div class="schedule-title">${s.title}</div></div><div class="schedule-date">📅 ${s.date} ${s.time}</div>${s.memo?`<div style="margin-top:8px;color:#666;font-size:14px">📝 ${s.memo}</div>`:''}${timeLogHTML}<div class="action-buttons">${actionHTML}</div>`;
        listEl.appendChild(item);
    });
    renderCalendar();
}

async function confirmSchedule(id) {
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ status:'confirmed' }).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    await sendPushToAllAdmins(`✅ ${currentUser.name}님이 일정을 확인했습니다\n${data.title} (${data.date} ${data.time})`, '일정 확인');
    showToast('일정을 확인했습니다!');
    loadFreelancerSchedules();
}

async function arriveVenue(id) {
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ status:'arrived' }).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    await sendPushToAllAdmins(`📍 ${currentUser.name}님이 현장에 도착했습니다\n${data.title} (${data.date} ${data.time})`, '현장 도착');
    showToast('현장 도착이 확인되었습니다!');
    loadFreelancerSchedules();
}

async function completeTranscription(id) {
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ status:'transcription_done' }).eq('id', id).select().single();
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(s=>s.id===id); if(idx>=0) schedules[idx]=data; }
    await sendPushToAllAdmins(`📝 ${currentUser.name}님이 번문을 완료했습니다\n${data.title} (${data.date} ${data.time})`, '번문 완료');
    showToast('번문 완료 처리되었습니다!');
    loadFreelancerSchedules();
}


async function pauseMeeting(id) {
    if (!confirm('정회를 시작하시겠습니까?')) return;
    const timeStr = new Date().toLocaleTimeString('ko-KR',{hour12:false,hour:'2-digit',minute:'2-digit'});
    ongoingMeetings[id].breaks.push({ start:timeStr, end:null });
    ongoingMeetings[id].isPaused = true;
    showToast(`정회 시작: ${timeStr}`);
    loadFreelancerSchedules();
}

async function resumeMeeting(id) {
    if (!confirm('회의를 재개하시겠습니까?')) return;
    const timeStr = new Date().toLocaleTimeString('ko-KR',{hour12:false,hour:'2-digit',minute:'2-digit'});
    const ongoing = ongoingMeetings[id];
    ongoing.breaks[ongoing.breaks.length-1].end = timeStr;
    ongoing.isPaused = false;
    showToast(`회의 재개: ${timeStr}`);
    loadFreelancerSchedules();
}

async function endMeeting(id) {
    const s = schedules.find(x=>x.id===id);
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    // startTime: 일정의 예정 시간을 기본값으로 사용
    const startTime = s?.time || timeStr;
    const startMs = new Date(`${s?.date} ${startTime}`);
    const endMs = new Date(`${s?.date} ${timeStr}`);
    const totalMinutes = Math.max(0, Math.floor((endMs - startMs) / 60000));
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ status:'completed', time_log:{ startTime, endTime:timeStr, totalMinutes, totalWorkMinutes:totalMinutes } }).eq('id',id).select().single();
    showLoading(false);
    if (error) { alert('저장 오류: '+error.message); return; }
    if (data) { const idx=schedules.findIndex(x=>x.id===id); if(idx>=0) schedules[idx]=data; }
    await sendPushToAllAdmins(`⏹️ ${currentUser.name}님이 회의를 종료했습니다\n${data.title} (${data.date} ${timeStr})`, '회의 종료');
    showToast('회의가 종료되었습니다!');
    loadFreelancerSchedules();
}

function editTimeLog(id) {
    const s = schedules.find(x=>x.id===id);
    if (!s?.time_log) return;
    el('editTimeLogScheduleId').value = id;
    const [sh,sm] = s.time_log.startTime.split(':');
    const [eh,em] = s.time_log.endTime.split(':');
    el('editStartHour').value=parseInt(sh); el('editStartMinute').value=parseInt(sm);
    el('editEndHour').value=parseInt(eh); el('editEndMinute').value=parseInt(em);
    const bm = (s.time_log.totalMinutes||0)-(s.time_log.totalWorkMinutes||0);
    el('editBreakMinutes').value=bm>0?bm:0;
    el('editTimeLogModal').classList.add('show');
}
function closeEditTimeLogModal() { el('editTimeLogModal').classList.remove('show'); }

async function saveTimeLogEdit(event) {
    event.preventDefault();
    const id = parseInt(el('editTimeLogScheduleId').value);
    const s  = schedules.find(x=>x.id===id);
    if (!s) return;
    const sh=pad(el('editStartHour').value), sm=pad(el('editStartMinute').value);
    const eh=pad(el('editEndHour').value), em=pad(el('editEndMinute').value);
    const bm = parseInt(el('editBreakMinutes').value)||0;
    const newStart=`${sh}:${sm}`, newEnd=`${eh}:${em}`;
    const startMs=new Date(`${s.date} ${newStart}`), endMs=new Date(`${s.date} ${newEnd}`);
    if(endMs<=startMs){alert('종료 시간이 시작 시간보다 빠를 수 없습니다.');return;}
    const total=Math.floor((endMs-startMs)/60000);
    if(bm>=total){alert('정회 시간이 전체 회의 시간보다 길 수 없습니다.');return;}
    const timeLog = { startTime:newStart, endTime:newEnd, breaks:bm>0?[{start:'정회',end:`${bm}분`}]:[], totalMinutes:total, totalWorkMinutes:total-bm };
    showLoading(true);
    const { data, error } = await sb.from('schedules').update({ time_log:timeLog }).eq('id',id).select().single();
    showLoading(false);
    if(error){alert('저장 오류: '+error.message);return;}
    if(data){const idx=schedules.findIndex(x=>x.id===id);if(idx>=0)schedules[idx]=data;}
    showToast('시간 기록이 수정되었습니다');
    closeEditTimeLogModal(); loadFreelancerSchedules();
}

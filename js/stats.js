// ========================
// 📊 통계 화면
// ========================
let statsPeriod = 'month'; // week, month, custom, all
let statsDetailView = null; // null=전체, {type:'freelancer',id,name} 또는 {type:'location',name}

function setStatsPeriod(type, ev) {
    statsPeriod = type;
    if (ev) {
        document.querySelectorAll('#statsView .btn').forEach(b => b.classList.remove('active'));
        ev.target.classList.add('active');
    }
    statsDetailView = null;
    renderStats();
}

function getStatsPeriodRange() {
    const t = new Date();
    const today = `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
    if (statsPeriod === 'week') {
        const dow = t.getDay(), diff = dow===0 ? -6 : 1-dow;
        const mon = new Date(t); mon.setDate(t.getDate()+diff);
        const sun = new Date(mon); sun.setDate(mon.getDate()+6);
        return { start: `${mon.getFullYear()}-${pad(mon.getMonth()+1)}-${pad(mon.getDate())}`, end: `${sun.getFullYear()}-${pad(sun.getMonth()+1)}-${pad(sun.getDate())}`, label: '이번 주' };
    } else if (statsPeriod === 'month') {
        const first = `${t.getFullYear()}-${pad(t.getMonth()+1)}-01`;
        const last = new Date(t.getFullYear(), t.getMonth()+1, 0);
        return { start: first, end: `${last.getFullYear()}-${pad(last.getMonth()+1)}-${pad(last.getDate())}`, label: `${t.getMonth()+1}월` };
    } else if (statsPeriod === 'custom') {
        const sel = el('statsMonthSelect').value;
        if (!sel) return getStatsPeriodRange(); // fallback
        const [y, m] = sel.split('-');
        const last = new Date(parseInt(y), parseInt(m), 0);
        return { start: `${y}-${m}-01`, end: `${y}-${m}-${pad(last.getDate())}`, label: `${parseInt(y)}년 ${parseInt(m)}월` };
    }
    return { start: null, end: null, label: '전체' };
}

function getStatsSchedules() {
    const range = getStatsPeriodRange();
    if (!range.start) return { data: [...schedules], label: range.label };
    return { data: schedules.filter(s => s.date >= range.start && s.date <= range.end), label: range.label };
}

function renderStats() {
    // 월 선택 드롭다운 채우기
    const monthSel = el('statsMonthSelect');
    if (monthSel && !monthSel.options.length) {
        const months = [...new Set(schedules.map(s => s.date.substring(0,7)))].sort();
        monthSel.innerHTML = '<option value="">월 선택</option>';
        months.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = `${parseInt(m.split('-')[0])}년 ${parseInt(m.split('-')[1])}월`; monthSel.appendChild(o); });
    }
    if (statsDetailView) {
        renderStatsDetail();
    } else {
        renderStatsOverview();
    }
}

function renderStatsOverview() {
    const { data, label } = getStatsSchedules();
    const content = el('statsContent');
    const maxBar = 100; // 막대 최대 너비 %

    // 속기사별 건수
    const byFreelancer = {};
    data.forEach(s => { byFreelancer[s.freelancer_name] = (byFreelancer[s.freelancer_name]||0)+1; });
    const flEntries = Object.entries(byFreelancer).sort((a,b) => b[1]-a[1]);
    const flMax = flEntries.length ? flEntries[0][1] : 1;
    // freelancer_id 매핑
    const flIdMap = {};
    data.forEach(s => { flIdMap[s.freelancer_name] = s.freelancer_id; });

    // 교육지원청별 건수
    const byLocation = {};
    data.forEach(s => { byLocation[s.title] = (byLocation[s.title]||0)+1; });
    const locEntries = Object.entries(byLocation).sort((a,b) => b[1]-a[1]);
    const locMax = locEntries.length ? locEntries[0][1] : 1;

    // 월별 추이
    const byMonth = {};
    schedules.forEach(s => { const m = s.date.substring(0,7); byMonth[m] = (byMonth[m]||0)+1; });
    const monthEntries = Object.entries(byMonth).sort((a,b) => a[0].localeCompare(b[0]));
    const monthMax = monthEntries.length ? Math.max(...monthEntries.map(e=>e[1])) : 1;

    content.innerHTML = `
        <div style="font-size:14px;color:#666;margin-bottom:16px">📅 ${label} | 총 <strong style="color:#2196F3;font-size:18px">${data.length}</strong>건</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
            <div style="background:#f9f9f9;border-radius:10px;padding:16px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">👤 속기사별 출장 건수</div>
                ${flEntries.length ? flEntries.map(([name,cnt]) => `
                    <div style="margin-bottom:8px;cursor:pointer" onclick="showStatsDetail('freelancer','${flIdMap[name]||''}','${name}')">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${name}</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#2196F3;height:100%;width:${Math.round(cnt/flMax*maxBar)}%;border-radius:4px;transition:width .3s"></div></div>
                    </div>
                `).join('') : '<div style="color:#999;font-size:13px">데이터 없음</div>'}
            </div>
            <div style="background:#f9f9f9;border-radius:10px;padding:16px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">🏛️ 교육지원청별 건수</div>
                ${locEntries.length ? locEntries.map(([name,cnt]) => `
                    <div style="margin-bottom:8px;cursor:pointer" onclick="showStatsDetail('location','','${name}')">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${name}</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#4CAF50;height:100%;width:${Math.round(cnt/locMax*maxBar)}%;border-radius:4px;transition:width .3s"></div></div>
                    </div>
                `).join('') : '<div style="color:#999;font-size:13px">데이터 없음</div>'}
            </div>
        </div>
        <div style="background:#f9f9f9;border-radius:10px;padding:16px">
            <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">📈 월별 출장 건수 추이</div>
            ${monthEntries.map(([m,cnt]) => `
                <div style="margin-bottom:8px">
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${parseInt(m.split('-')[0])}년 ${parseInt(m.split('-')[1])}월</span><strong>${cnt}건</strong></div>
                    <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#ff9800;height:100%;width:${Math.round(cnt/monthMax*maxBar)}%;border-radius:4px;transition:width .3s"></div></div>
                </div>
            `).join('')}
        </div>
    `;
}

function showStatsDetail(type, id, name) {
    statsDetailView = { type, id, name };
    renderStatsDetail();
}

function renderStatsDetail() {
    const { type, id, name } = statsDetailView;
    const content = el('statsContent');
    const maxBar = 100;

    if (type === 'freelancer') {
        // 해당 속기사의 월별 업무량
        const mySchedules = schedules.filter(s => s.freelancer_name === name);
        const byMonth = {};
        mySchedules.forEach(s => { const m = s.date.substring(0,7); byMonth[m] = (byMonth[m]||0)+1; });
        const monthEntries = Object.entries(byMonth).sort((a,b) => a[0].localeCompare(b[0]));
        const monthMax = monthEntries.length ? Math.max(...monthEntries.map(e=>e[1])) : 1;

        // 해당 속기사의 교육지원청별 건수
        const { data: periodData, label } = getStatsSchedules();
        const myPeriod = periodData.filter(s => s.freelancer_name === name);
        const byLoc = {};
        myPeriod.forEach(s => { byLoc[s.title] = (byLoc[s.title]||0)+1; });
        const locEntries = Object.entries(byLoc).sort((a,b) => b[1]-a[1]);
        const locMax = locEntries.length ? locEntries[0][1] : 1;

        content.innerHTML = `
            <button class="btn btn-outline" onclick="statsDetailView=null;renderStats()" style="margin-bottom:16px">◀ 전체로 돌아가기</button>
            <h2 style="font-size:18px;color:#333;margin-bottom:16px">👤 ${name} 속기사</h2>
            <div style="background:#f9f9f9;border-radius:10px;padding:16px;margin-bottom:20px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">📈 월별 업무량</div>
                ${monthEntries.map(([m,cnt]) => `
                    <div style="margin-bottom:8px">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${parseInt(m.split('-')[0])}년 ${parseInt(m.split('-')[1])}월</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#2196F3;height:100%;width:${Math.round(cnt/monthMax*maxBar)}%;border-radius:4px"></div></div>
                    </div>
                `).join('')}
            </div>
            <div style="background:#f9f9f9;border-radius:10px;padding:16px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">🏛️ 교육지원청별 건수 (${label})</div>
                ${locEntries.length ? locEntries.map(([loc,cnt]) => `
                    <div style="margin-bottom:8px">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${loc}</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#4CAF50;height:100%;width:${Math.round(cnt/locMax*maxBar)}%;border-radius:4px"></div></div>
                    </div>
                `).join('') : '<div style="color:#999;font-size:13px">해당 기간 데이터 없음</div>'}
            </div>
        `;
    } else if (type === 'location') {
        // 해당 교육지원청의 월별 회의 건수
        const locSchedules = schedules.filter(s => s.title === name);
        const byMonth = {};
        locSchedules.forEach(s => { const m = s.date.substring(0,7); byMonth[m] = (byMonth[m]||0)+1; });
        const monthEntries = Object.entries(byMonth).sort((a,b) => a[0].localeCompare(b[0]));
        const monthMax = monthEntries.length ? Math.max(...monthEntries.map(e=>e[1])) : 1;

        // 해당 교육지원청의 속기사별 건수
        const { data: periodData, label } = getStatsSchedules();
        const locPeriod = periodData.filter(s => s.title === name);
        const byFL = {};
        locPeriod.forEach(s => { byFL[s.freelancer_name] = (byFL[s.freelancer_name]||0)+1; });
        const flEntries = Object.entries(byFL).sort((a,b) => b[1]-a[1]);
        const flMax = flEntries.length ? flEntries[0][1] : 1;

        content.innerHTML = `
            <button class="btn btn-outline" onclick="statsDetailView=null;renderStats()" style="margin-bottom:16px">◀ 전체로 돌아가기</button>
            <h2 style="font-size:18px;color:#333;margin-bottom:16px">🏛️ ${name}</h2>
            <div style="background:#f9f9f9;border-radius:10px;padding:16px;margin-bottom:20px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">📈 월별 회의 건수</div>
                ${monthEntries.map(([m,cnt]) => `
                    <div style="margin-bottom:8px">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${parseInt(m.split('-')[0])}년 ${parseInt(m.split('-')[1])}월</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#ff9800;height:100%;width:${Math.round(cnt/monthMax*maxBar)}%;border-radius:4px"></div></div>
                    </div>
                `).join('')}
            </div>
            <div style="background:#f9f9f9;border-radius:10px;padding:16px">
                <div style="font-weight:700;color:#333;margin-bottom:12px;font-size:15px">👤 속기사별 건수 (${label})</div>
                ${flEntries.length ? flEntries.map(([fl,cnt]) => `
                    <div style="margin-bottom:8px">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${fl}</span><strong>${cnt}건</strong></div>
                        <div style="background:#e0e0e0;border-radius:4px;height:18px;overflow:hidden"><div style="background:#2196F3;height:100%;width:${Math.round(cnt/flMax*maxBar)}%;border-radius:4px"></div></div>
                    </div>
                `).join('') : '<div style="color:#999;font-size:13px">해당 기간 데이터 없음</div>'}
            </div>
        `;
    }
}

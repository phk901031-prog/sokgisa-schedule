// ========================
// ⑨ 화면 전환
// ========================
function showLoginScreen() {
    hide('mainScreen'); hide('signupScreen'); hide('signupSuccessScreen');
    show('loginScreen');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    clearFieldError('loginError');
}
function showSignupScreen() {
    hide('loginScreen'); show('signupScreen');
    clearFieldError('signupError');
}

function showMainScreen() {
    hide('loginScreen');
    show('mainScreen');
    const isSA = currentUser.role === 'superadmin';
    const isAdmin = currentUser.role === 'admin' || isSA;
    const badge = isSA ? '<span class="superadmin-badge">슈퍼관리자</span>'
                : isAdmin ? '<span class="admin-badge">관리자</span>' : '';
    document.getElementById('welcomeMessage').innerHTML = `${currentUser.name}님 환영합니다${badge}`;
    document.getElementById('viewToggle').style.display = isAdmin ? 'flex' : 'none';
    if (isSA) show('adminMgmtTab');
    if (isAdmin) {
        switchViewInternal('admin');
    } else {
        switchViewInternal('freelancer');
    }
}

function switchView(view) {
    switchViewInternal(view);
    document.querySelectorAll('.user-toggle .btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function switchViewInternal(view) {
    currentView = view;
    hide('adminView'); hide('freelancerView'); hide('usersView'); hide('adminsView');
    const titles = { admin:'관리자 대시보드', freelancer:'내 일정', users:'회원 관리', admins:'관리자 관리' };
    document.getElementById('pageTitle').textContent = titles[view] || '';
    if (view === 'admin') {
        show('adminView');
        loadFreelancerOptions();
        renderTodaySchedules(); renderCalendar(); renderScheduleList(); updateStats();
    } else if (view === 'freelancer') {
        show('freelancerView');
        loadFreelancerSchedules();
    } else if (view === 'users') {
        show('usersView');
        renderPendingUsers(); renderApprovedUsers();
    } else if (view === 'admins') {
        show('adminsView');
        renderAdminUsers();
    }
}

// ========================
// ⑩ 검색
// ========================
function handleSearch(q) {
    searchQuery = q.trim().toLowerCase();
    renderScheduleList();
    renderCalendar();
}
function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    renderScheduleList(); renderCalendar();
}
function applySearchFilter(arr) {
    if (!searchQuery) return arr;
    return arr.filter(s =>
        s.title.toLowerCase().includes(searchQuery) ||
        s.freelancer_name.toLowerCase().includes(searchQuery)
    );
}

// ========================
// ⑪ 필터
// ========================
function filterSchedules(filter, ev) {
    currentFilter = filter;
    document.querySelectorAll('.filter-section .btn').forEach(b => b.classList.remove('active'));
    if (ev && ev.target) ev.target.classList.add('active');
    renderScheduleList();
}

function filterByFreelancer() {
    selectedFreelancer = document.getElementById('adminFreelancerSelect').value;
    updateFreelancerSummary();
    renderTodaySchedules(); renderCalendar(); renderScheduleList();
}

function setDateRange(type) {
    const today = new Date(); today.setHours(0,0,0,0);
    document.querySelectorAll('[id^="dateRange-"]').forEach(b => b.classList.remove('active'));
    if (type === 'all') {
        dateRangeFilter = { type:'all', startDate:null, endDate:null };
        el('dateRange-all').classList.add('active');
        el('dateRangeDisplay').textContent = '';
    } else if (type === 'today') {
        const d = today.toISOString().split('T')[0];
        dateRangeFilter = { type:'today', startDate:d, endDate:d };
        el('dateRange-today').classList.add('active');
        el('dateRangeDisplay').textContent = `오늘 (${today.getMonth()+1}월 ${today.getDate()}일)`;
    } else if (type === 'week') {
        const dow = today.getDay(), diff = dow===0 ? -6 : 1-dow;
        const mon = new Date(today); mon.setDate(today.getDate()+diff);
        const sun = new Date(mon); sun.setDate(mon.getDate()+6);
        dateRangeFilter = { type:'week', startDate:mon.toISOString().split('T')[0], endDate:sun.toISOString().split('T')[0] };
        el('dateRange-week').classList.add('active');
        el('dateRangeDisplay').textContent = `이번 주 (${mon.getMonth()+1}/${mon.getDate()} ~ ${sun.getMonth()+1}/${sun.getDate()})`;
    } else if (type === 'month') {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last  = new Date(today.getFullYear(), today.getMonth()+1, 0);
        dateRangeFilter = { type:'month', startDate:first.toISOString().split('T')[0], endDate:last.toISOString().split('T')[0] };
        el('dateRange-month').classList.add('active');
        el('dateRangeDisplay').textContent = `이번 달 (${today.getMonth()+1}월 1일 ~ ${last.getDate()}일)`;
    } else if (type === 'custom') {
        const s = el('customStartDate').value, e = el('customEndDate').value;
        if (!s || !e) { alert('시작일과 종료일을 선택하세요.'); return; }
        if (s > e)    { alert('종료일이 시작일보다 빠릅니다.'); return; }
        dateRangeFilter = { type:'custom', startDate:s, endDate:e };
        const sd = new Date(s), ed = new Date(e);
        el('dateRangeDisplay').textContent = `사용자 지정 (${sd.getMonth()+1}/${sd.getDate()} ~ ${ed.getMonth()+1}/${ed.getDate()})`;
    }
    renderScheduleList();
}

function getFilteredSchedules() {
    let arr = [...schedules];
    if (dateRangeFilter.type !== 'all') {
        arr = arr.filter(s => s.date >= dateRangeFilter.startDate && s.date <= dateRangeFilter.endDate);
    }
    if (selectedFreelancer) arr = arr.filter(s => s.freelancer_id === selectedFreelancer);
    if (currentFilter !== 'all') arr = arr.filter(s => s.status === currentFilter);
    return applySearchFilter(arr);
}

// ========================
// ⑫ 통계
// ========================
function updateStats() {
    const arr = getFilteredSchedules();
    el('totalSchedules').textContent   = arr.length;
    el('unconfirmedCount').textContent = arr.filter(s => s.status==='unconfirmed').length;
    el('confirmedCount').textContent   = arr.filter(s => s.status==='confirmed').length;
    el('completedCount').textContent   = arr.filter(s => s.status==='transcription_done').length;
}

// ========================
// ⑬ 속기사 요약
// ========================
function updateFreelancerSummary() {
    const div = el('freelancerSummary');
    if (!selectedFreelancer) { div.style.display='none'; return; }
    div.style.display = 'block';
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const first = `${year}-${pad(month+1)}-01`;
    const last  = `${year}-${pad(month+1)}-${pad(new Date(year,month+1,0).getDate())}`;
    const fl = schedules.filter(s => s.freelancer_id===selectedFreelancer && s.date>=first && s.date<=last);
    const profile = freelancerProfiles.find(p => p.id===selectedFreelancer);
    el('summaryTitle').textContent = `${profile?.name||''} 속기사`;
    el('summaryTotal').textContent = fl.length;
    const meetings = [...new Set(fl.map(s=>s.title))];
    el('summaryMeetings').textContent = meetings.map(m=>`${m}(${fl.filter(s=>s.title===m).length}건)`).join(', ') || '일정 없음';
}

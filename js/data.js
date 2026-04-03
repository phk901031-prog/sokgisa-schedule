// ========================
// ⑥ 데이터 로드 (Supabase → 로컬 캐시)
// ========================
async function loadAllData() {
    await Promise.all([loadSchedules(), loadProfiles(), loadUnavailableDates()]);
}

async function loadUnavailableDates() {
    const { data } = await sb.from('unavailable_dates').select('freelancer_id,date');
    if (data) unavailableDates = data;
}

async function loadSchedules() {
    let query = sb.from('schedules').select('*').order('date').order('time');
    if (currentUser.role === 'freelancer') {
        query = query.eq('freelancer_id', currentUser.id);
    }
    const { data } = await query;
    if (data) schedules = data;
}

async function loadProfiles() {
    if (currentUser.role === 'freelancer') return;
    const { data } = await sb.from('profiles').select('*').order('name');
    if (!data) return;
    allProfiles      = data;
    freelancerProfiles = data.filter(p => p.approved && (p.role === 'freelancer' || p.role === 'admin' || p.role === 'superadmin'));
    pendingProfiles    = data.filter(p => p.role === 'freelancer' && !p.approved);
    meetingTitlesHistory = [...new Set(schedules.map(s => s.title))].sort();
}

// ========================
// ⑦ Supabase Realtime (실시간 동기화 + 브라우저 알림)
// ========================
function setupRealtime() {
    const filter = currentUser.role === 'freelancer'
        ? { filter: `freelancer_id=eq.${currentUser.id}` } : {};

    sb.channel('schedules-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules', ...filter }, payload => {
            const s = payload.new;
            if (!schedules.find(x => x.id === s.id)) schedules.push(s);
            refreshAdminViews();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'schedules', ...filter }, payload => {
            const idx = schedules.findIndex(x => x.id === payload.new.id);
            if (idx >= 0) schedules[idx] = payload.new;
            refreshAdminViews();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'schedules', ...filter }, payload => {
            schedules = schedules.filter(x => x.id !== payload.old.id);
            refreshAdminViews();
        })
        .subscribe();
}

function refreshAdminViews() {
    if (currentView === 'admin') {
        loadLocationOptions();
        renderTodaySchedules(); renderCalendar(); renderScheduleList(); updateStats();
    } else if (currentView === 'freelancer') {
        loadFreelancerSchedules();
    }
}

function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'https://via.placeholder.com/64/2196F3/ffffff?text=%EC%9D%BC' });
    }
}

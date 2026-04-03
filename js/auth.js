// ========================
// ④ 초기화
// ========================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    showLoading(true);
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            await loadSessionUser(session.user.id);
        } else {
            showLoginScreen();
        }
    } catch (e) {
        console.error('initApp error:', e);
        showLoginScreen();
    } finally {
        showLoading(false);
    }
    if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => Notification.requestPermission(), 3000);
    }
}

async function loadSessionUser(userId) {
    // 프로필 조회 (실패 시 최대 2회 재시도)
    let profile = null;
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await sb
            .from('profiles').select('*').eq('id', userId).single();
        if (data && !error) {
            profile = data;
            break;
        }
        lastError = error;
        // 마지막 시도가 아니면 1초 대기 후 재시도
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }

    if (!profile) {
        console.error('프로필 조회 실패:', lastError);
        // 세션은 유지하되 로그인 화면 표시 (signOut 하지 않음)
        showLoginScreen();
        showFieldError('loginError', '서버 연결에 실패했습니다. 다시 시도해주세요.');
        return;
    }

    if (profile.role === 'freelancer' && !profile.approved) {
        await sb.auth.signOut();
        showLoginScreen();
        showFieldError('loginError', '관리자 승인 대기 중입니다. 승인 후 로그인해주세요.');
        return;
    }
    currentUser = profile;
    await loadAllData();
    setupRealtime();
    initOneSignal();
    showMainScreen();
    // 읽지 않은 알림 체크
    checkUnreadNotifications();
}

// ========================
// ⑤ 인증 함수
// ========================
async function handleLogin(event) {
    event.preventDefault();
    const input = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!input) return;
    const email = input === 'admin'
        ? `admin@${APP_EMAIL_DOMAIN}`
        : `${input.replace(/[-\s]/g, '')}@${APP_EMAIL_DOMAIN}`;
    showLoading(true);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    showLoading(false);
    if (error) {
        showFieldError('loginError', '전화번호 또는 비밀번호가 올바르지 않습니다.');
        return;
    }
    await loadSessionUser(data.user.id);
}

async function handleSignup(event) {
    event.preventDefault();
    const name     = document.getElementById('signupName').value.trim();
    const phone    = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm  = document.getElementById('signupPasswordConfirm').value;
    if (password !== confirm) { showFieldError('signupError', '비밀번호가 일치하지 않습니다.'); return; }
    if (password.length < 6)  { showFieldError('signupError', '비밀번호는 6자 이상이어야 합니다.'); return; }

    const phoneNormalized = phone.replace(/[-\s]/g, '');
    if (!/^010\d{8}$/.test(phoneNormalized)) {
        showFieldError('signupError', '올바른 전화번호를 입력하세요. (예: 010-1234-5678)'); return;
    }
    showLoading(true);
    const email = `${phoneNormalized}@${APP_EMAIL_DOMAIN}`;
    const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { name, phone, role: 'freelancer', approved: false } }
    });
    showLoading(false);

    if (error) {
        const msg = error.message.includes('already') ? '이미 가입된 전화번호입니다.' : '가입 중 오류가 발생했습니다.';
        showFieldError('signupError', msg); return;
    }
    if (data?.user) {
        await sb.from('profiles').update({ phone }).eq('id', data.user.id);
    }
    document.getElementById('signupScreen').style.display = 'none';
    document.getElementById('signupSuccessScreen').style.display = 'block';
}

async function handleLogout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    await sb.auth.signOut();
    schedules = []; freelancerProfiles = []; allProfiles = []; pendingProfiles = [];
    currentUser = null; searchQuery = '';
    showLoginScreen();
}

// ========================
// 데이터 새로고침 (페이지 새로고침 없이)
// ========================
async function refreshData() {
    showLoading(true);
    try {
        await loadAllData();
        if (currentView === 'admin') {
            loadFreelancerOptions();
            renderTodaySchedules(); renderCalendar(); renderScheduleList(); updateStats();
            if (selectedFreelancer) updateFreelancerSummary();
        } else if (currentView === 'freelancer') {
            loadFreelancerSchedules();
        } else if (currentView === 'users') {
            renderPendingUsers(); renderApprovedUsers();
        } else if (currentView === 'admins') {
            renderAdminUsers();
        }
        showToast('데이터를 새로고침했습니다');
    } catch (e) {
        console.error('refreshData error:', e);
        showToast('새로고침 실패. 다시 시도해주세요.');
    } finally {
        showLoading(false);
    }
}

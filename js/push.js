// ========================
// ⑧ OneSignal 푸시 초기화
// ========================
function initOneSignal() {
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/' },
        });

        const saveSubId = async () => {
            const subId = OneSignal.User.PushSubscription.id;
            if (subId && currentUser) {
                // 기존 컬럼도 갱신 (Edge Function 미배포 대비 fallback)
                await sb.from('profiles').update({ onesignal_player_id: subId }).eq('id', currentUser.id);

                // 새 컬럼: 기존 배열에 현재 기기 추가 (중복 방지)
                const { data: profile } = await sb.from('profiles')
                    .select('onesignal_player_ids')
                    .eq('id', currentUser.id)
                    .single();
                let ids = Array.isArray(profile?.onesignal_player_ids) ? profile.onesignal_player_ids : [];
                if (!ids.includes(subId)) {
                    ids.push(subId);
                    // 최대 5개 기기까지 유지 (오래된 것부터 제거)
                    if (ids.length > 5) ids = ids.slice(-5);
                    await sb.from('profiles').update({ onesignal_player_ids: ids }).eq('id', currentUser.id);
                }
                console.log('[OneSignal] 구독 ID 저장됨:', subId, '전체:', ids);
                return true;
            }
            return false;
        };

        if (!await saveSubId()) {
            setTimeout(saveSubId, 2000);
            setTimeout(saveSubId, 5000);
            setTimeout(saveSubId, 10000);
        }

        OneSignal.User.PushSubscription.addEventListener('change', async function(event) {
            const oldId = event.previous?.id;
            const subId = event.current?.id;
            if (subId && currentUser) {
                // 기존 컬럼 갱신
                await sb.from('profiles').update({ onesignal_player_id: subId }).eq('id', currentUser.id);

                // 새 컬럼: 이전 ID 제거 + 새 ID 추가
                const { data: profile } = await sb.from('profiles')
                    .select('onesignal_player_ids')
                    .eq('id', currentUser.id)
                    .single();
                let ids = Array.isArray(profile?.onesignal_player_ids) ? profile.onesignal_player_ids : [];
                if (oldId) ids = ids.filter(id => id !== oldId);
                if (!ids.includes(subId)) ids.push(subId);
                if (ids.length > 5) ids = ids.slice(-5);
                await sb.from('profiles').update({ onesignal_player_ids: ids }).eq('id', currentUser.id);
                console.log('[OneSignal] 구독 변경 저장됨:', subId, '전체:', ids);
            }
        });
    });
}

async function sendPushNotification(freelancerId, message, title = '속기사 일정 관리') {
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') return;
    try {
        const { data: { session } } = await sb.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ freelancer_id: freelancerId, message, title })
        });
    } catch (e) {
        console.log('Push failed:', e);
    }
}

// 모든 관리자(admin + superadmin)에게 푸시 발송
// Edge Function에서 관리자 목록 조회 + 발송을 처리 (RLS 우회)
async function sendPushToAllAdmins(message, title = '속기사 일정 관리') {
    await sendPushNotification('all_admins', message, title);
}

// ========================
// 관리자 커스텀 알림 보내기
// ========================
function openSendPushModal() {
    const container = el('pushFreelancerCheckboxes');
    container.innerHTML = '';
    freelancerProfiles.forEach(p => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-bottom:1px solid #f0f0f0';
        label.innerHTML = `<input type="checkbox" value="${p.id}" style="width:18px;height:18px"> <span style="font-size:14px">${p.name}</span>`;
        container.appendChild(label);
    });
    el('pushMessage').value = '';
    document.querySelector('input[name="pushTarget"][value="all"]').checked = true;
    el('pushIndividualSelect').style.display = 'none';
    el('sendPushModal').classList.add('show');
}
function closeSendPushModal() { el('sendPushModal').classList.remove('show'); }

function togglePushTarget() {
    const isIndividual = document.querySelector('input[name="pushTarget"]:checked').value === 'individual';
    el('pushIndividualSelect').style.display = isIndividual ? 'block' : 'none';
}

async function sendCustomPush() {
    const message = el('pushMessage').value.trim();
    if (!message) { alert('메시지를 입력하세요.'); return; }
    const target = document.querySelector('input[name="pushTarget"]:checked').value;
    if (target === 'individual') {
        const checked = [...el('pushFreelancerCheckboxes').querySelectorAll('input[type="checkbox"]:checked')];
        if (!checked.length) { alert('속기사를 선택하세요.'); return; }
        const names = checked.map(cb => freelancerProfiles.find(p => p.id === cb.value)?.name).filter(Boolean);
        if (!confirm(`${names.join(', ')}님에게 알림을 보내시겠습니까?`)) return;
        showLoading(true);
        for (const cb of checked) {
            await sendPushNotification(cb.value, message, '📢 관리자 알림');
        }
        showLoading(false);
        showToast(`${checked.length}명에게 알림을 보냈습니다`);
    } else {
        if (!confirm('전체 속기사에게 알림을 보내시겠습니까?')) return;
        showLoading(true);
        for (const p of freelancerProfiles) {
            await sendPushNotification(p.id, message, '📢 관리자 알림');
        }
        showLoading(false);
        showToast(`전체 속기사 ${freelancerProfiles.length}명에게 알림을 보냈습니다`);
    }
    closeSendPushModal();
}

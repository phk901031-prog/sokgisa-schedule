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
            await saveNotification(cb.value, message);
        }
        showLoading(false);
        showToast(`${checked.length}명에게 알림을 보냈습니다`);
    } else {
        if (!confirm('전체에게 알림을 보내시겠습니까?')) return;
        showLoading(true);
        // 전체: 속기사 + 관리자 모두에게
        const allUsers = [...freelancerProfiles];
        // 현재 사용자(보낸 사람) 제외하고 관리자 중 freelancerProfiles에 없는 관리자 추가
        if (allProfiles.length) {
            allProfiles.filter(p => (p.role==='admin'||p.role==='superadmin') && p.id !== currentUser.id && !allUsers.find(u=>u.id===p.id)).forEach(p => allUsers.push(p));
        }
        for (const p of allUsers) {
            await sendPushNotification(p.id, message, '📢 관리자 알림');
            await saveNotification(p.id, message);
        }
        showLoading(false);
        showToast(`전체 ${allUsers.length}명에게 알림을 보냈습니다`);
    }
    closeSendPushModal();
}

// DB에 알림 저장
async function saveNotification(recipientId, message, title) {
    await sb.from('notifications').insert({ recipient_id: recipientId, message, title: title || '📢 관리자 알림' });
}

// ========================
// 알림함 (읽지 않은 알림 표시)
// ========================
async function loadUnreadNotifications() {
    const { data } = await sb.from('notifications').select('*').eq('is_read', false).order('created_at', { ascending: false });
    return data || [];
}

async function checkUnreadNotifications() {
    const unread = await loadUnreadNotifications();
    const badge = el('notifBadge');
    if (badge) {
        if (unread.length > 0) {
            badge.style.display = 'block';
            badge.textContent = unread.length > 9 ? '9+' : unread.length;
        } else {
            badge.style.display = 'none';
        }
    }
    return unread;
}

async function openNotificationModal() {
    const unread = await loadUnreadNotifications();
    el('unreadCount').textContent = unread.length > 0 ? `(${unread.length}건)` : '';
    const listEl = el('notificationList');
    if (!unread.length) {
        listEl.innerHTML = '<div style="padding:30px;text-align:center;color:#999">읽지 않은 알림이 없습니다.</div>';
    } else {
        listEl.innerHTML = unread.map(n => {
            const d = new Date(n.created_at);
            const kst = new Date(d.getTime() + 9*60*60*1000);
            const timeStr = `${kst.getFullYear()}-${pad(kst.getMonth()+1)}-${pad(kst.getDate())} ${pad(kst.getHours())}:${pad(kst.getMinutes())}`;
            return `<div style="padding:12px;border-bottom:1px solid #f0f0f0"><div style="font-size:12px;color:#999;margin-bottom:4px">${timeStr}</div><div style="font-size:14px;color:#333;white-space:pre-wrap">${n.message}</div></div>`;
        }).join('');
    }
    el('notificationModal').classList.add('show');
}

function closeNotificationModal() { el('notificationModal').classList.remove('show'); }

async function markAllRead() {
    showLoading(true);
    await sb.from('notifications').update({ is_read: true }).eq('recipient_id', currentUser.id).eq('is_read', false);
    showLoading(false);
    el('notifBadge').style.display = 'none';
    closeNotificationModal();
    showToast('모든 알림을 확인했습니다');
}

// ========================
// ㉑ 회원 관리
// ========================
function renderPendingUsers() {
    const listEl=el('pendingUsersList'), countEl=el('pendingCount');
    countEl.textContent = pendingProfiles.length;
    listEl.innerHTML='';
    if (!pendingProfiles.length) { listEl.innerHTML='<div style="color:#999;padding:20px;text-align:center;background:#f9f9f9;border-radius:8px">대기 중인 가입 신청이 없습니다.</div>'; return; }
    pendingProfiles.forEach(p => {
        const c=document.createElement('div'); c.className='user-card';
        c.innerHTML=`<div class="user-card-info"><div class="user-card-name">${p.name}</div><div class="user-card-meta">📞 ${p.phone||'-'}<br>📅 신청일: ${new Date(p.created_at).toLocaleDateString('ko-KR')}</div></div><div class="user-card-actions"><button class="btn btn-primary" onclick="approveUser('${p.id}','${p.name}')">승인</button><button class="btn" onclick="rejectUser('${p.id}','${p.name}')" style="background:#ffebee;color:#c62828;border:1px solid #ffcdd2">거부</button></div>`;
        listEl.appendChild(c);
    });
}

function renderApprovedUsers() {
    const listEl=el('approvedUsersList'), countEl=el('approvedCount');
    countEl.textContent = freelancerProfiles.length;
    listEl.innerHTML='';
    if (!freelancerProfiles.length) { listEl.innerHTML='<div style="color:#999;padding:20px;text-align:center;background:#f9f9f9;border-radius:8px">승인된 속기사가 없습니다.</div>'; return; }
    freelancerProfiles.forEach(p => {
        const c=document.createElement('div'); c.className='user-card';
        c.innerHTML=`<div class="user-card-info"><div class="user-card-name">${p.name} <span class="role-badge role-freelancer">속기사</span></div><div class="user-card-meta">📞 ${p.phone||'-'}</div></div><div class="user-card-actions"><button class="btn btn-outline" onclick="revokeUser('${p.id}','${p.name}')">승인 취소</button></div>`;
        listEl.appendChild(c);
    });
}

async function approveUser(userId, name) {
    if (!confirm(`${name}님의 가입을 승인하시겠습니까?`)) return;
    showLoading(true);
    const { error } = await sb.from('profiles').update({ approved:true }).eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles();
    await sendPushNotification(userId, '✅ 가입이 승인되었습니다! 이제 로그인하실 수 있습니다.');
    showToast(`${name}님 승인 완료`);
    loadFreelancerOptions();
    renderPendingUsers(); renderApprovedUsers();
}

async function rejectUser(userId, name) {
    if (!confirm(`${name}님의 가입을 거부하시겠습니까?`)) return;
    showLoading(true);
    await sendPushNotification(userId, `❌ 가입이 거부되었습니다. 관리자에게 문의해 주세요.`, '가입 거부');
    const { error } = await sb.from('profiles').delete().eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles();
    showToast(`${name}님 거부 처리`);
    renderPendingUsers();
}

async function revokeUser(userId, name) {
    if (!confirm(`${name}님의 접근을 비활성화하시겠습니까?`)) return;
    showLoading(true);
    const { error } = await sb.from('profiles').update({ approved:false }).eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles();
    showToast(`${name}님 비활성화`);
    loadFreelancerOptions(); renderApprovedUsers();
}

// ========================
// ㉒ 슈퍼관리자 - 관리자 관리
// ========================
function renderAdminUsers() {
    const listEl=el('adminUsersList'), countEl=el('adminCount');
    const admins = allProfiles.filter(p=>p.role==='admin'||p.role==='superadmin');
    countEl.textContent = admins.length;
    listEl.innerHTML='';
    admins.forEach(p => {
        const isSelf = p.id===currentUser.id;
        const badge = p.role==='superadmin' ? `<span class="role-badge role-superadmin">슈퍼관리자</span>` : `<span class="role-badge role-admin">관리자</span>`;
        const c=document.createElement('div'); c.className='user-card';
        c.innerHTML=`<div class="user-card-info"><div class="user-card-name">${p.name} ${badge}${isSelf?' <span style="font-size:11px;color:#999">(나)</span>':''}</div><div class="user-card-meta">📞 ${p.phone||'-'}</div></div><div class="user-card-actions">${!isSelf&&p.role==='admin'?`<button class="btn btn-outline" onclick="demoteAdmin('${p.id}','${p.name}')">속기사로 변경</button><button class="btn btn-danger" onclick="removeAdmin('${p.id}','${p.name}')" style="font-size:13px">삭제</button>`:''}${!isSelf&&p.role==='superadmin'?`<button class="btn btn-outline" onclick="demoteAdmin('${p.id}','${p.name}')">관리자로 변경</button>`:''}`;
        listEl.appendChild(c);
    });
}

async function promoteToAdmin() {
    const userId = el('promoteFreelancerSelect').value;
    if (!userId) { alert('속기사를 선택하세요.'); return; }
    const p = allProfiles.find(x=>x.id===userId);
    if (!confirm(`${p?.name}님을 관리자로 승격하시겠습니까?`)) return;
    showLoading(true);
    const { error } = await sb.from('profiles').update({ role:'admin', approved:true }).eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles(); showToast(`${p?.name}님이 관리자로 승격되었습니다`);
    closeAddAdminModal(); renderAdminUsers();
}

async function demoteAdmin(userId, name) {
    if (!confirm(`${name}님을 속기사로 변경하시겠습니까?`)) return;
    showLoading(true);
    const { error } = await sb.from('profiles').update({ role:'freelancer', approved:true }).eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles(); showToast(`${name}님이 속기사로 변경되었습니다`);
    renderAdminUsers();
}

async function removeAdmin(userId, name) {
    if (!confirm(`${name}님의 계정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    showLoading(true);
    const { error } = await sb.from('profiles').delete().eq('id', userId);
    showLoading(false);
    if (error) { alert('오류: '+error.message); return; }
    await loadProfiles(); showToast(`${name}님 계정 삭제`);
    renderAdminUsers();
}

function openAddAdminModal() {
    const sel = el('promoteFreelancerSelect');
    sel.innerHTML='<option value="">선택하세요</option>';
    freelancerProfiles.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
    el('addAdminModal').classList.add('show');
}
function closeAddAdminModal() { el('addAdminModal').classList.remove('show'); }

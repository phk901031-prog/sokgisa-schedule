// ========================
// ㉕ 유틸리티
// ========================
function el(id) { return document.getElementById(id); }
function show(id) { const e=el(id); if(e) e.style.display='block'; }
function hide(id) { const e=el(id); if(e) e.style.display='none'; }
function pad(n) { return String(n).padStart(2,'0'); }

function showLoading(v) { el('loadingOverlay').classList.toggle('show', v); }

function showToast(msg) {
    const t=el('toast'); t.textContent=msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 2800);
}

function showFieldError(fieldId, msg) {
    const e=el(fieldId); if(!e) return;
    e.textContent=msg; e.classList.add('show');
}
function clearFieldError(fieldId) { const e=el(fieldId); if(e) e.classList.remove('show'); }

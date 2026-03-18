// ========================
// ㉔ 엑셀 다운로드 (캘린더 형식)
// ========================
function downloadExcel() {
    const year=currentDate.getFullYear(), month=currentDate.getMonth();
    let arr=schedules.filter(s=>{ const d=new Date(s.date+'T00:00:00'); return d.getFullYear()===year&&d.getMonth()===month; });
    if(selectedFreelancer) arr=arr.filter(s=>s.freelancer_id===selectedFreelancer);
    if(!arr.length && !confirm(`${year}년 ${month+1}월 일정이 없습니다. 빈 캘린더를 다운로드하시겠습니까?`)) return;
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildCalendarSheet(year,month,arr), `${month+1}월_캘린더`);
    XLSX.utils.book_append_sheet(wb, buildFreelancerSheet(year,month,arr), '속기사별_정리');
    const today=new Date(), ts=`${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
    let fn=`속기사_출장일정_${year}${pad(month+1)}`;
    if(selectedFreelancer){ const p=freelancerProfiles.find(x=>x.id===selectedFreelancer); fn+=`_${p?.name||''}`; }
    XLSX.writeFile(wb, `${fn}_${ts}.xlsx`);
    showToast(`${year}년 ${month+1}월 캘린더 다운로드 완료`);
}

function buildCalendarSheet(year, month, arr) {
    const byDate={};
    arr.forEach(s=>{ if(!byDate[s.date]) byDate[s.date]=[]; byDate[s.date].push(s); });
    Object.values(byDate).forEach(a=>a.sort((x,y)=>x.time.localeCompare(y.time)));
    const stMark={unconfirmed:'▲',confirmed:'◎',arrived:'●',completed:'◆',transcription_done:'★',submitted:'☑'};
    const aoa=[], merges=[];
    aoa.push([`${year}년 ${month+1}월 속기사 출장 일정`,'','','','','','']);
    merges.push({s:{r:0,c:0},e:{r:0,c:6}});
    aoa.push(['▲미확인  ◎확인완료  ★참석완료','','','','','','']);
    merges.push({s:{r:1,c:0},e:{r:1,c:6}});
    aoa.push(['','','','','','','']);
    aoa.push(['일','월','화','수','목','금','토']);
    const first=new Date(year,month,1).getDay(), last=new Date(year,month+1,0).getDate();
    let date=1, isFirst=true;
    while(date<=last){
        const week=[];
        for(let c=0;c<7;c++){
            if(isFirst&&c<first) week.push(null);
            else if(date>last) week.push(null);
            else { const ds=`${year}-${pad(month+1)}-${pad(date)}`; week.push({date,ds,schedules:byDate[ds]||[]}); date++; }
        }
        isFirst=false;
        aoa.push(week.map(d=>d?`${d.date}일`:''));
        const mx=Math.max(...week.map(d=>d?d.schedules.length:0),0);
        for(let i=0;i<mx;i++) aoa.push(week.map(d=>{ if(!d||i>=d.schedules.length) return ''; const s=d.schedules[i]; return `${stMark[s.status]||''}[${s.time}] ${s.freelancer_name}-${s.title}`; }));
        aoa.push(['','','','','','','']);
    }
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=Array(7).fill({wch:28}); ws['!merges']=merges; return ws;
}

function buildFreelancerSheet(year, month, arr) {
    const dayNames=['일','월','화','수','목','금','토'];
    let fls = selectedFreelancer ? freelancerProfiles.filter(p=>p.id===selectedFreelancer) : [...freelancerProfiles].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    const aoa=[['날짜','요일',...fls.map(f=>f.name)]];
    const last=new Date(year,month+1,0).getDate();
    for(let d=1;d<=last;d++){
        const ds=`${year}-${pad(month+1)}-${pad(d)}`, dow=new Date(ds+'T00:00:00').getDay();
        const row=[ds,dayNames[dow]];
        fls.forEach(f=>{ const fl=arr.filter(s=>s.date===ds&&s.freelancer_id===f.id); row.push(fl.length?fl.map(s=>`${s.title}(${s.time})`).join(' / '):''); });
        aoa.push(row);
    }
    const ws=XLSX.utils.aoa_to_sheet(aoa); ws['!cols']=[{wch:12},{wch:5},...fls.map(()=>({wch:22}))]; return ws;
}

/* Owner-only special hours. Loaded AFTER online-owner.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stylists = ['Bank', 'Sindy', 'Assist'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hh = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
  const minute = t => Number(t.slice(0,2))*60+Number(t.slice(3,5));
  let state = {date:'', rules:[], shop_closed:false};
  let version = 0, dialogDate = '', dialogStylist = '', preview = null, busy = false, returnFocus = null;
  let bookingRule = null, bookingLoadVersion = 0;
  const panel = document.createElement('section');
  panel.className = 'panel special-hours';
  panel.innerHTML = `<div class="sh-heading"><div><h2>คิวพิเศษรายช่าง</h2><p id="shDate" class="muted"></p></div><button id="shRefresh" type="button" class="ghost">รีเฟรช</button></div><p id="shStatus" role="status" class="muted">กำลังโหลดสถานะ</p><div id="shRows" class="sh-rows"></div>`;
  bookingForm.closest('.panel').before(panel);
  document.body.insertAdjacentHTML('beforeend', `
    <div id="shOverlay" class="overlay hidden special-hours" role="dialog" aria-modal="true" aria-labelledby="shTitle">
      <div class="modal"><div class="modalBody">
        <h2 id="shTitle"></h2><p id="shContext" class="muted"></p>
        <form id="shRuleForm" class="sh-form">
          <label class="field-label" for="shKind">การตั้งค่า</label>
          <select id="shKind"><option value="partial">ปิดรับคิวบางช่วง</option><option value="day">ปิดรับคิวทั้งวัน</option><option value="extra">เปิดรับคิวนอกเวลาปกติ</option></select>
          <div id="shRange" class="sh-range"><div><label class="field-label" for="shFrom">ตั้งแต่</label><select id="shFrom"></select></div><div><label class="field-label" for="shUntil">ถึงก่อนเวลา</label><select id="shUntil"></select></div></div>
          <p class="muted">กำหนดเวลาเริ่มรับคิว ไม่ใช่ระยะเวลาบริการ เช่น ปิด 20:00–24:00 คือไม่รับคิวตั้งแต่ 20:00 เป็นต้นไป</p>
          <label class="field-label" for="shNote">หมายเหตุ (ไม่บังคับ)</label><input id="shNote" maxlength="200" placeholder="เช่น ติดธุระ / เข้างานเร็ว">
          <button id="shPreviewBtn" class="primary" type="submit">ตรวจสอบก่อนบันทึก</button>
        </form>
        <div id="shPreview" class="sh-preview hidden"><p id="shPreviewText"></p><ul id="shAffected"></ul><button id="shSave" class="primary" type="button">ยืนยันบันทึก</button></div>
        <p id="shError" role="alert"></p>
        <button id="shClose" type="button" class="ghost">ปิดหน้าต่าง</button>
      </div></div>
    </div>
    <div id="shBookingOverlay" class="overlay hidden special-hours" role="dialog" aria-modal="true" aria-labelledby="shBookingTitle">
      <div class="modal"><div class="modalBody">
        <h2 id="shBookingTitle">จองช่วงพิเศษ</h2><p id="shBookingContext" class="muted"></p>
        <form id="shBookingForm" class="sh-form">
          <label class="field-label" for="shBookingTime">เวลา</label><select id="shBookingTime" required></select>
          <label class="field-label" for="shName">ชื่อลูกค้า</label><input id="shName" maxlength="100" required>
          <label class="field-label" for="shPhone">เบอร์โทร</label><input id="shPhone" type="tel" maxlength="20">
          <label class="field-label" for="shGender">เพศ</label><select id="shGender" required><option value="">เลือกเพศ</option><option value="male">ชาย</option><option value="female">หญิง</option></select>
          <label class="field-label" for="shService">ทำอะไร</label><select id="shService" required><option value="">เลือกบริการ</option><option>ตัดผมชาย</option><option>ตัดผมหญิง</option><option value="other">อื่น ๆ (พิมพ์เอง)</option></select>
          <input id="shCustom" aria-label="รายละเอียดบริการ" class="hidden" maxlength="200" placeholder="ระบุบริการ">
          <label class="field-label" for="shBookingNote">หมายเหตุ</label><textarea id="shBookingNote" maxlength="2000"></textarea>
          <button id="shBook" class="primary" type="submit">จองคิวพิเศษ</button>
        </form><p id="shBookingError" role="alert"></p><button id="shBookingClose" class="ghost" type="button">ปิดหน้าต่าง</button>
      </div></div>
    </div>`);
  for(let n=0;n<=1440;n+=30) {
    if(n<1440) $('shFrom').add(new Option(hh(n),String(n)));
    if(n>0) $('shUntil').add(new Option(n===1440?'24:00 (สิ้นวัน)':hh(n),String(n)));
  }
  async function api(url, options={}) {
    const res = await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'โหลดสถานะไม่สำเร็จ กรุณาลองใหม่');
    return data;
  }
  const post = (url, data) => api(url,{method:'POST',body:JSON.stringify(data)});
  function label(r) {
    if(r.kind==='closed' && r.start_min===0 && r.end_min===1440) return 'ปิดรับคิวทั้งวัน';
    return `${r.kind==='extra'?'เปิดเพิ่ม':'ปิดรับคิว'} ${hh(r.start_min)}–${hh(r.end_min)} (ถึงก่อนเวลาสิ้นสุด)`;
  }
  function invalidate() { preview=null; $('shPreview').classList.add('hidden'); $('shError').textContent=''; }
  function setBusy(value) {
    busy=value;
    for(const id of ['shPreviewBtn','shSave','shClose','shBook','shBookingClose']) $(id).disabled=value;
    for(const el of $('shRuleForm').elements) el.disabled=value;
  }
  function open(id, first) {
    returnFocus=document.activeElement;
    $(id).classList.remove('hidden');
    requestAnimationFrame(()=>$(first).focus());
  }
  function close(id) { if(busy)return; $(id).classList.add('hidden'); if(returnFocus?.isConnected)returnFocus.focus(); }
  for(const id of ['shOverlay','shBookingOverlay']) {
    $(id).addEventListener('keydown', e=>{
      if(e.key==='Escape'){e.preventDefault();close(id);}
      if(e.key==='Tab') {
        const items=[...$(id).querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&!x.closest('.hidden')&&!x.hidden);
        const first=items[0],last=items.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    });
  }
  function render() {
    $('shDate').textContent=formatDisplayDate(state.date);
    $('shStatus').textContent=state.shop_closed?'ร้านปิดทั้งวัน ต้องเปิดร้านก่อนจึงจะจองได้':'เวลาปกติ 13:00–22:00 · การตั้งค่ามีผลเฉพาะวันที่เลือก';
    $('shRows').innerHTML=stylists.map(s=>{
      const rows=state.rules.filter(r=>r.stylist===s);
      return `<article class="sh-stylist"><div class="sh-heading"><span class="badge ${s}">${s}</span><button type="button" class="ghost" data-manage="${s}">จัดการ</button></div>${rows.length?rows.map(r=>`<div class="sh-rule"><p>${esc(label(r))}</p>${r.note?`<p class="muted">${esc(r.note)}</p>`:''}<div class="sh-actions">${r.kind==='extra'?`<button type="button" class="ghost" data-book="${r.id}" ${state.shop_closed?'disabled':''}>จองช่วงพิเศษ</button>`:''}<button type="button" class="ghost" data-remove="${r.id}">ยกเลิกการตั้งค่านี้</button></div></div>`).join(''):'<p class="muted">เวลาปกติ</p>'}</article>`;
    }).join('');
  }
  async function refresh() {
    if(!loginOverlay.classList.contains('hidden'))return;
    const date=selectedDate, v=++version;
    if(state.date!==date){$('shRows').replaceChildren();$('shDate').textContent=formatDisplayDate(date);$('shStatus').textContent='กำลังโหลดสถานะ';}
    try {
      const data=await api(`/owner/special-hours?date=${encodeURIComponent(date)}`);
      if(v!==version||date!==selectedDate)return;
      state={date,...data};render();
    }catch(e){if(v===version){$('shRows').replaceChildren();$('shStatus').textContent=e.message;}}
  }
  const previousLoad = loadBookings;
  loadBookings = async function(){await previousLoad();await refresh();};
  const previousClosure = saveClosureState;
  saveClosureState = async function(...args){await previousClosure(...args);await refresh();};
  $('shRefresh').onclick=refresh;
  $('shRows').onclick=async e=>{
    const btn=e.target.closest('button');if(!btn)return;
    if(btn.dataset.manage){
      dialogDate=state.date;dialogStylist=btn.dataset.manage;
      $('shTitle').textContent=`จัดการคิว · ${dialogStylist}`;
      $('shContext').textContent=formatDisplayDate(dialogDate);
      $('shKind').value='partial';$('shFrom').value='1200';$('shUntil').value='1440';$('shNote').value='';$('shRange').classList.remove('hidden');invalidate();
      open('shOverlay','shKind');
    }else if(btn.dataset.remove){
      const r=state.rules.find(x=>x.id===btn.dataset.remove);if(!r)return;
      openConfirm({title:'ยกเลิกการตั้งค่ารายช่าง',message:`${r.stylist} · ${formatDisplayDate(r.date)} · ${label(r)} — คิวที่จองไว้จะยังอยู่ครบ`,onConfirm:async()=>{
        try{await post('/owner/special-hours/delete',{id:r.id});await refresh();showToast('ยกเลิกการตั้งค่าแล้ว');}catch(err){showToast(err.message);}
      }});
    }else if(btn.dataset.book){
      const r=state.rules.find(x=>x.id===btn.dataset.book);if(r)await openBooking(r);
    }
  };
  $('shRuleForm').addEventListener('input',invalidate);
  $('shKind').onchange=()=>{
    invalidate();const kind=$('shKind').value;
    $('shRange').classList.toggle('hidden',kind==='day');
    $('shFrom').value=kind==='extra'?'660':'1200';$('shUntil').value=kind==='extra'?'780':'1440';
  };
  $('shRuleForm').onsubmit=async e=>{
    e.preventDefault();if(busy)return;invalidate();
    const day=$('shKind').value==='day';
    const payload={date:dialogDate,stylist:dialogStylist,kind:$('shKind').value==='extra'?'extra':'closed',start_min:day?0:Number($('shFrom').value),end_min:day?1440:Number($('shUntil').value),note:$('shNote').value.trim()};
    setBusy(true);
    try{
      const data=await post('/owner/special-hours/preview',payload);
      preview={...payload,confirm_token:data.confirm_token};
      $('shPreviewText').textContent=`${dialogStylist} · ${formatDisplayDate(dialogDate)} · ${label(payload)}${data.affected.length?` มีคิวเดิม ${data.affected.length} คิว คิวเหล่านี้จะไม่ถูกลบหรือยกเลิก`:payload.kind==='extra'?' · เพิ่มช่วงรับคิวสำหรับช่างคนนี้':' · ไม่มีคิวเดิมที่เริ่มในช่วงปิดนี้'}`;
      $('shAffected').innerHTML=data.affected.map(b=>`<li>${esc(b.time.slice(0,5))} · ${esc(b.name)}</li>`).join('');
      $('shPreview').classList.remove('hidden');
    }catch(err){$('shError').textContent=err.message;}finally{setBusy(false);}
  };
  $('shSave').onclick=async()=>{
    if(!preview||busy)return;setBusy(true);
    try{await post('/owner/special-hours/add',preview);setBusy(false);close('shOverlay');await refresh();showToast('บันทึกคิวพิเศษแล้ว');}
    catch(err){preview=null;$('shPreview').classList.add('hidden');$('shError').textContent=err.message;}
    finally{setBusy(false);}
  };
  $('shClose').onclick=()=>close('shOverlay');
  $('shBookingClose').onclick=()=>close('shBookingOverlay');
  $('shService').onchange=()=>{
    const other=$('shService').value==='other';$('shCustom').classList.toggle('hidden',!other);$('shCustom').required=other;
  };
  async function openBooking(rule) {
    const requestVersion = ++bookingLoadVersion;
    bookingRule={...rule};$('shBookingForm').reset();$('shCustom').classList.add('hidden');$('shCustom').required=false;
    $('shBookingError').textContent='กำลังตรวจสอบคิวว่าง';$('shBookingTime').replaceChildren();$('shBook').disabled=true;
    $('shBookingContext').textContent=`${rule.stylist} · ${formatDisplayDate(rule.date)} · ${label(rule)}`;
    open('shBookingOverlay','shBookingClose');
    try{
      const [rows,pending,latest]=await Promise.all([api(`/bookings?date=${rule.date}`),api('/owner/requests'),api(`/owner/special-hours?date=${rule.date}`)]);
      if(requestVersion !== bookingLoadVersion)return;
      if(latest.shop_closed||!latest.rules.some(r=>r.id===rule.id))throw new Error('ช่วงพิเศษนี้ปิดแล้ว กรุณาโหลดสถานะใหม่');
      const absolute=(d,t)=>Date.parse(`${d}T${t.slice(0,5)}:00+07:00`);
      for(let m=rule.start_min;m<rule.end_min;m+=30){
        const t=hh(m),start=absolute(rule.date,t),end=start+60*60000;
        const occupied=[...rows,...pending].some(b=>b.stylist===rule.stylist&&start<absolute(b.date,b.time)+Number(b.duration_minutes||60)*60000&&end>absolute(b.date,b.time));
        const opt=new Option(t,t+':00');opt.disabled=occupied;$('shBookingTime').add(opt);
      }
      const first=[...$('shBookingTime').options].find(o=>!o.disabled);
      $('shBookingTime').value=first?.value||'';$('shBook').disabled=!first;
      $('shBookingError').textContent=first?'':'ช่วงพิเศษนี้ไม่มีเวลาว่าง';
    }catch(err){$('shBookingError').textContent=err.message;}
  }
  $('shBookingForm').onsubmit=async e=>{
    e.preventDefault();if(busy||!bookingRule||!$('shBookingTime').value)return;
    const service=$('shService').value==='other'?$('shCustom').value.trim():$('shService').value;
    if(!service||!$('shName').value.trim()){$('shBookingError').textContent='กรุณากรอกชื่อและบริการ';return;}
    setBusy(true);$('shBookingError').textContent='';
    try{
      await post('/owner/special-bookings',{date:bookingRule.date,stylist:bookingRule.stylist,time:$('shBookingTime').value,name:$('shName').value.trim(),phone:$('shPhone').value.trim(),gender:$('shGender').value,service,note:$('shBookingNote').value.trim(),duration_minutes:60});
      setBusy(false);close('shBookingOverlay');showToast('จองคิวพิเศษสำเร็จ');await Promise.all([loadBookings(),loadCalendar()]);
    }catch(err){$('shBookingError').textContent=err.message;}
    finally{setBusy(false);}
  };
})();

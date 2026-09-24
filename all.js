
let current='';
const fields=['BH','CH','SL','ST','Tb','Te'];
const STORE_KEY='tinhMiLonDataV3';
const OLD_KEY='tinhMiLonDataV2';

function loadStore(){
  let raw=localStorage.getItem(STORE_KEY);
  if(raw){try{return JSON.parse(raw)}catch(e){}}
  // migrate from old flat format if present
  const migrated={};
  const old=localStorage.getItem(OLD_KEY);
  if(old){
    try{
      const oldData=JSON.parse(old);
      Object.keys(oldData).forEach(name=>{
        const inputs={};
        fields.forEach(f=>{if(oldData[name][f]!==undefined)inputs[f]=oldData[name][f]});
        migrated[name]={inputs,thresholds:{},history:[]};
      });
    }catch(e){}
  }
  return migrated;
}
const canData=loadStore();
function persist(){localStorage.setItem(STORE_KEY,JSON.stringify(canData))}
function ensureCan(name){
  if(!canData[name])canData[name]={inputs:{},thresholds:{},history:[]};
  const c=canData[name];
  c.inputs=c.inputs||{};
  c.thresholds=c.thresholds||{};
  c.note=c.note||'';
  c.limits=c.limits||{};
  c.history=c.history||[];
  return c;
}

function toggle(id){const el=document.getElementById(id);el.style.display=el.style.display==='block'?'none':'block'}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t=setTimeout(()=>t.classList.remove('show'),1800);
}

function setResults(data={}){
  document.getElementById('overlap').textContent=data.overlap??'-- mm';
  document.getElementById('overlapPct').textContent=data.overlapPct??'--%';
  document.getElementById('bodyHookPct').textContent=data.bodyHookPct??'--%';
  document.getElementById('gap').textContent=data.gap??'-- mm';
  renderGapStandard(data.gapNum);
  renderOverlapStandard(data.overlapNum);
  document.getElementById('message').textContent=data.message??'Kết quả được tính riêng và lưu trên thiết bị cho từng loại lon.';

  const inputValues={BH:data.BH,CH:data.CH,SL:data.SL,ST:data.ST,Tb:data.Tb,Te:data.Te};
  fields.forEach(id=>inputLimitText(id,inputValues[id]));
  const quality=evaluateQuality(data);
  renderQuality(quality);

  renderRangeBadge('overlapValueBadge', data.overlapNum, thresholdFor('overlapMin'), thresholdFor('overlapMax'));
  renderMinBadge('overlapBadge', data.overlapPctNum, thresholdFor('overlapPct'));
  renderMinBadge('bodyHookBadge', data.bodyHookPctNum, thresholdFor('bodyHookPct'));
  renderMaxBadge('gapBadge', data.gapNum, thresholdFor('gapMax'));
  updatePercentGauge('overlapGauge','overlapGaugeCenter','overlapGaugeNote',data.overlapPctNum,'var(--green)');
  updatePercentGauge('bodyHookGauge','bodyHookGaugeCenter','bodyHookGaugeNote',data.bodyHookPctNum,'var(--blue)');
}

function updatePercentGauge(gaugeId,centerId,noteId,value,color){
  const gauge=document.getElementById(gaugeId),center=document.getElementById(centerId),note=document.getElementById(noteId);
  if(!gauge||!center||!note)return;
  if(!Number.isFinite(Number(value))){
    gauge.style.setProperty('--gauge',0);
    gauge.style.setProperty('--gauge-color',color);
    center.textContent='--';
    note.textContent='Chưa có dữ liệu';
    return;
  }
  const n=Number(value),visual=Math.max(0,Math.min(100,n));
  gauge.style.setProperty('--gauge',visual);
  gauge.style.setProperty('--gauge-color',color);
  center.textContent=Math.round(n)+'%';
  note.textContent=n<0?'Dưới 0%':(n>100?'Trên 100%':'Mức tỷ lệ hiện tại');
}


function limitFor(key, side){
  const c=canData[current];
  if(!c||!c.limits)return null;
  const v=c.limits[key+side];
  return (v===undefined||v===null||v==='')?null:parseFloat(v);
}
function evaluateInputLimits(values){
  const checks=[];
  fields.forEach(id=>{
    const value=Number(values[id]);
    const min=limitFor(id,'Min'), max=limitFor(id,'Max');
    const configured=hasThreshold(min)||hasThreshold(max);
    if(!configured || !Number.isFinite(value)) return;
    const ok=(!hasThreshold(min)||value>=min)&&(!hasThreshold(max)||value<=max);
    checks.push({name:id,value,min,max,ok});
  });
  return checks;
}
function inputLimitText(id, value){
  const min=limitFor(id,'Min'), max=limitFor(id,'Max');
  const el=document.getElementById(id);
  if(!el)return;
  const field=el.closest('.field');
  let badge=field&&field.querySelector('.input-range-status');
  if(field && !badge){
    badge=document.createElement('span');
    badge.className='input-range-status';
    el.insertAdjacentElement('afterend',badge);
  }
  if(!badge)return;
  field.classList.remove('range-pass','range-fail');
  el.removeAttribute('min'); el.removeAttribute('max');
  if(hasThreshold(min))el.setAttribute('min',min);
  if(hasThreshold(max))el.setAttribute('max',max);
  if(!hasThreshold(min)&&!hasThreshold(max)){
    badge.className='input-range-status none';
    badge.textContent='Chưa thiết lập Min–Max';
    return;
  }
  if(!Number.isFinite(value)){
    badge.className='input-range-status none';
    badge.textContent='Nhập giá trị để kiểm tra';
    return;
  }
  const ok=(!hasThreshold(min)||value>=min)&&(!hasThreshold(max)||value<=max);
  badge.className='input-range-status '+(ok?'pass':'fail');
  badge.textContent=ok?'✓ Trong giới hạn':('✕ Ngoài giới hạn'+
    (hasThreshold(min)&&hasThreshold(max)?' · '+min+'–'+max:
     hasThreshold(min)?' · ≥ '+min:' · ≤ '+max));
  field.classList.add(ok?'range-pass':'range-fail');
}
function refreshInputLimitUI(){
  fields.forEach(id=>inputLimitText(id,num(id)));
}
function thresholdFor(key){
  const c=canData[current];
  if(!c||!c.thresholds)return null;
  const v=c.thresholds[key];
  return (v===undefined||v===null||v==='')?null:parseFloat(v);
}
function hasThreshold(v){return v!==null&&Number.isFinite(v)}
function renderMinBadge(elId,valueNum,min){
  const el=document.getElementById(elId); if(!el)return;
  if(!hasThreshold(min)||!Number.isFinite(valueNum)){el.innerHTML='';return}
  const ok=valueNum>=min;
  el.innerHTML='<span class="badge '+(ok?'ok':'bad')+'">'+(ok?'Đạt':'Không đạt')+'</span>';
}
function renderMaxBadge(elId,valueNum,max){
  const el=document.getElementById(elId); if(!el)return;
  if(!hasThreshold(max)||!Number.isFinite(valueNum)){el.innerHTML='';return}
  const ok=valueNum<=max;
  el.innerHTML='<span class="badge '+(ok?'ok':'bad')+'">'+(ok?'Đạt':'Không đạt')+'</span>';
}
function renderRangeBadge(elId,valueNum,min,max){
  const el=document.getElementById(elId); if(!el)return;
  if((!hasThreshold(min)&&!hasThreshold(max))||!Number.isFinite(valueNum)){el.innerHTML='';return}
  const ok=(!hasThreshold(min)||valueNum>=min)&&(!hasThreshold(max)||valueNum<=max);
  el.innerHTML='<span class="badge '+(ok?'ok':'bad')+'">'+(ok?'Đạt':'Không đạt')+'</span>';
}
function renderOverlapStandard(valueNum){
  const standard=document.getElementById('overlapStandard');
  const detail=document.getElementById('overlapDetail');
  const status=document.getElementById('overlapStatus');
  if(!standard||!detail||!status)return;
  const min=thresholdFor('overlapMin'), max=thresholdFor('overlapMax');
  status.innerHTML='';
  if(!hasThreshold(min)&&!hasThreshold(max)){
    standard.textContent='Chưa thiết lập';
    detail.textContent='Thiết lập ngưỡng Độ chồng mí trong Cài đặt.';
    return;
  }
  if(hasThreshold(min)&&hasThreshold(max)) standard.textContent=fmt(min,'mm',3).trim()+' – '+fmt(max,'mm',3).trim();
  else if(hasThreshold(min)) standard.textContent='≥ '+fmt(min,'mm',3).trim();
  else standard.textContent='≤ '+fmt(max,'mm',3).trim();
  if(!Number.isFinite(valueNum)){
    detail.textContent='Chưa có kết quả để đánh giá.';
    return;
  }
  const ok=(!hasThreshold(min)||valueNum>=min)&&(!hasThreshold(max)||valueNum<=max);
  detail.textContent=ok?'Giá trị hiện tại nằm trong giới hạn.':'Giá trị hiện tại nằm ngoài giới hạn.';
  status.innerHTML='<span class="badge '+(ok?'ok':'bad')+'">'+(ok?'✓ ĐẠT':'✕ KHÔNG ĐẠT')+'</span>';
}

function renderGapStandard(valueNum){
  const standard=document.getElementById('gapStandard');
  const detail=document.getElementById('gapDetail');
  const status=document.getElementById('gapStatus');
  const badge=document.getElementById('gapBadge');
  if(!standard||!detail||!status)return;
  const max=thresholdFor('gapMax');
  status.innerHTML='';
  if(!hasThreshold(max)){
    standard.textContent='Chưa thiết lập';
    detail.textContent='Thiết lập ngưỡng Khoảng trống trong Cài đặt.';
    return;
  }
  standard.textContent='≤ '+fmt(max,'mm',3).trim();
  if(!Number.isFinite(valueNum)){
    detail.textContent='Chưa có kết quả để đánh giá.';
    return;
  }
  const ok=valueNum<=max;
  detail.textContent=ok?'Giá trị hiện tại nằm trong giới hạn.':'Giá trị hiện tại vượt giới hạn '+fmt(max,'mm',3).trim()+'.';
  status.innerHTML='<span class="badge '+(ok?'ok':'bad')+'">'+(ok?'✓ ĐẠT':'✕ KHÔNG ĐẠT')+'</span>';
  if(badge && !badge.innerHTML)badge.innerHTML=status.innerHTML;
}
function evaluateQuality(data){
  const checks=[];
  const inputValues={BH:data.BH,CH:data.CH,SL:data.SL,ST:data.ST,Tb:data.Tb,Te:data.Te};
  const inputChecks=evaluateInputLimits(inputValues);
  inputChecks.forEach(c=>checks.push({
    name:c.name+' · Min–Max',
    ok:c.ok,
    type:'input',
    value:c.value,min:c.min,max:c.max
  }));

  const overlapMin=thresholdFor('overlapMin'), overlapMax=thresholdFor('overlapMax');
  const overlapPctMin=thresholdFor('overlapPct'), bodyHookMin=thresholdFor('bodyHookPct'), gapMax=thresholdFor('gapMax');

  if(hasThreshold(overlapMin)||hasThreshold(overlapMax)){
    const ok=Number.isFinite(data.overlapNum)&&(!hasThreshold(overlapMin)||data.overlapNum>=overlapMin)&&(!hasThreshold(overlapMax)||data.overlapNum<=overlapMax);
    checks.push({name:'Độ chồng mí',ok,type:'result'});
  }
  if(hasThreshold(overlapPctMin)){
    checks.push({name:'% Độ chồng mí',ok:Number.isFinite(data.overlapPctNum)&&data.overlapPctNum>=overlapPctMin,type:'result'});
  }
  if(hasThreshold(bodyHookMin)){
    checks.push({name:'% Độ móc thân',ok:Number.isFinite(data.bodyHookPctNum)&&data.bodyHookPctNum>=bodyHookMin,type:'result'});
  }
  if(hasThreshold(gapMax)){
    checks.push({name:'Khoảng trống',ok:Number.isFinite(data.gapNum)&&data.gapNum<=gapMax,type:'result'});
  }

  const inputFailed=inputChecks.filter(c=>!c.ok);
  if(!checks.length)return {
    state:'unset',status:'CHƯA THIẾT LẬP',icon:'⚙️',
    detail:'Thiết lập Min–Max hoặc ngưỡng kết quả trong Cài đặt để đánh giá.',
    checks,inputChecks
  };
  const failed=checks.filter(c=>!c.ok);
  if(!failed.length)return {
    state:'pass',status:'ĐẠT',icon:'✓',
    detail:'Tất cả '+checks.length+' tiêu chí đã thiết lập đều đạt.',
    checks,inputChecks
  };
  return {
    state:'fail',status:'KHÔNG ĐẠT',icon:'!',
    detail:'Chưa đạt: '+failed.map(c=>c.name).join(' · ')+'.',
    checks,inputChecks
  };
}
function renderQuality(q){
  const card=document.getElementById('qualityCard');
  const icon=document.getElementById('qualityIcon');
  const status=document.getElementById('qualityStatus');
  const detail=document.getElementById('qualityDetail');
  if(!card)return;
  card.className='quality-card '+q.state;
  icon.textContent=q.icon;
  status.textContent=q.status;
  detail.textContent=q.detail;
  status.style.color=q.state==='pass'?'var(--green)':q.state==='fail'?'var(--red)':'var(--orange)';
}

function openCalculator(name){ return openCalc(name); }

function openCalc(name){
  current=name;
  const c=ensureCan(name);
  fields.forEach(id=>document.getElementById(id).value=c.inputs[id]??'');
  refreshInputLimitUI();
  const type=(typeof listCanTypes==='function'?listCanTypes():[]).find(x=>x.key===name);
  document.getElementById('title').textContent=(type&&type.name) || c.displayName || name;
  document.getElementById('menu').style.display='none';
  document.getElementById('calculator').style.display='block';
  // restore last computed display if present
  if(c.lastResult){setResults(c.lastResult)}else{setResults({})}
  updateHistoryCount();
  window.scrollTo({top:0,behavior:'smooth'});
}

function saveInputsOnly(){
  if(!current)return;
  const c=ensureCan(current);
  fields.forEach(id=>c.inputs[id]=document.getElementById(id).value);
  persist();
}

function resetCurrent(){
  if(!current)return;
  delete canData[current];
  persist();
  fields.forEach(id=>document.getElementById(id).value='');
  setResults({message:'Đã reset toàn bộ số liệu của '+current+'.'});
  updateHistoryCount();
}
function clearInputs(){
  fields.forEach(id=>document.getElementById(id).value='');
  setResults({message:'Đã xóa dữ liệu đang nhập. Nhấn Tính kết quả sau khi nhập lại.'});
}
function back(){saveInputsOnly();document.getElementById('calculator').style.display='none';document.getElementById('menu').style.display='block';window.scrollTo({top:0,behavior:'smooth'})}

function num(id){return parseFloat(document.getElementById(id).value)}
function fmt(v,unit,digits=3){return Number.isFinite(v)?v.toFixed(digits).replace(/\.?(0+)$/,'')+' '+unit:'-- '+unit}


function clearInputWarnings(){
  document.querySelectorAll('.field.is-warning,.field.is-danger').forEach(el=>{
    el.classList.remove('is-warning','is-danger');
  });
}
function getInputById(id){
  return document.getElementById(id) || document.querySelector(`[name="${id}"]`);
}
function markField(id, level){
  const el=getInputById(id);
  if(el && el.closest('.field')){
    el.closest('.field').classList.add(level==='danger'?'is-danger':'is-warning');
  }
}
function renderDataWarning(result, values){
  const box=document.getElementById('dataWarning');
  const icon=document.getElementById('warningIcon');
  const title=document.getElementById('warningTitle');
  const text=document.getElementById('warningText');
  const list=document.getElementById('warningList');
  if(!box||!icon||!title||!text||!list)return;
  clearInputWarnings();
  const issues=[];
  const cautions=[];
  const addIssue=(msg, ids=[])=>{issues.push(msg); ids.forEach(id=>markField(id,'danger'));};
  const addCaution=(msg, ids=[])=>{cautions.push(msg); ids.forEach(id=>markField(id,'warning'));};

  const {BH,CH,SL,ST,Tb,Te}=values;
  const vals=[['BH',BH],['CH',CH],['SL',SL],['ST',ST],['Tb',Tb],['Te',Te]];
  vals.forEach(([k,v])=>{
    if(!Number.isFinite(v)) addIssue(`${k}: chưa nhập hoặc không phải là số.`,[k]);
    else if(v<=0) addIssue(`${k}: phải lớn hơn 0.`,[k]);
  });
  if(issues.length===0){
    // Kiểm tra quan hệ hình học và mẫu số công thức.
    const overlap = BH+CH+Te-SL;
    const denomOverlap = SL-(2*Te+Tb);
    const denomBody = SL-1.1*(2*Te+Tb);
    const freeSpace = ST-(2*Tb+3*Te);

    if(denomOverlap<=0) addIssue('SL phải lớn hơn (2Te + Tb), nếu không không thể tính % Độ chồng mí hợp lệ.',['SL','Te','Tb']);
    if(denomBody<=0) addIssue('SL phải lớn hơn 1.1 × (2Te + Tb), nếu không không thể tính % Móc thân hợp lệ.',['SL','Te','Tb']);
    if(ST < (2*Tb+3*Te)) addCaution('Khoảng trống mí đang âm: ST nhỏ hơn tổng chiều dày vật liệu theo công thức (2Tb + 3Te).',['ST','Tb','Te']);
    if(overlap<0) addCaution('Độ chồng mí đang âm. Hãy kiểm tra lại BH, CH, Te và SL.',['BH','CH','Te','SL']);
    if(BH>SL) addCaution('BH lớn hơn chiều dài mí SL, giá trị này cần được kiểm tra lại.',['BH','SL']);
    if(CH>SL) addCaution('CH lớn hơn chiều dài mí SL, giá trị này cần được kiểm tra lại.',['CH','SL']);

    // Ngưỡng cảnh báo mềm, không coi là lỗi kỹ thuật tuyệt đối.
    if(Tb>1 || Te>1) addCaution('Độ dày vật liệu lớn hơn 1 mm. Hãy kiểm tra đơn vị và số liệu nhập.',['Tb','Te']);
    if(SL>10 || ST>10 || BH>10 || CH>10) addCaution('Có kích thước lớn hơn 10 mm. Hãy kiểm tra đơn vị hoặc dữ liệu nhập.',['BH','CH','SL','ST']);
    if(result && Number.isFinite(result.overlapPercent) && (result.overlapPercent<0 || result.overlapPercent>200))
      addCaution('% Độ chồng mí nằm ngoài khoảng 0–200%. Hãy kiểm tra số liệu đầu vào.');
    if(result && Number.isFinite(result.bodyHookPercent) && (result.bodyHookPercent<0 || result.bodyHookPercent>200))
      addCaution('% Móc thân nằm ngoài khoảng 0–200%. Hãy kiểm tra số liệu đầu vào.');
  }

  box.classList.remove('show','safe','caution','danger');
  list.innerHTML='';
  if(issues.length){
    box.classList.add('show','danger');
    icon.textContent='⛔';
    title.textContent='Dữ liệu không hợp lệ';
    text.textContent='Hãy sửa các thông số được đánh dấu đỏ trước khi sử dụng kết quả.';
    issues.forEach(x=>{const li=document.createElement('li');li.textContent=x;list.appendChild(li);});
  }else if(cautions.length){
    box.classList.add('show','caution');
    icon.textContent='⚠️';
    title.textContent='Cần kiểm tra lại số liệu';
    text.textContent='Ứng dụng vẫn tính được kết quả, nhưng có một số giá trị hoặc quan hệ cần được xác minh.';
    cautions.forEach(x=>{const li=document.createElement('li');li.textContent=x;list.appendChild(li);});
  }else{
    box.classList.add('show','safe');
    icon.textContent='✓';
    title.textContent='Dữ liệu hợp lệ';
    text.textContent='Không phát hiện bất thường rõ ràng theo các quy tắc kiểm tra của ứng dụng.';
  }
}

function calculateOriginal(){
  const BH=num('BH'),CH=num('CH'),SL=num('SL'),ST=num('ST'),Tb=num('Tb'),Te=num('Te');
  const values=[BH,CH,SL,ST,Tb,Te];
  if(values.some(v=>!Number.isFinite(v)||v<0)){setResults({message:'Vui lòng nhập đầy đủ 6 thông số hợp lệ (không âm).'});return}
  const overlap=BH+CH+Te-SL;
  const overlapDen=SL-(2*Te+Tb);
  const bodyDen=SL-1.1*(2*Te+Tb);
  const gap=ST-(2*Tb+3*Te);
  if(Math.abs(overlapDen)<1e-12||Math.abs(bodyDen)<1e-12){setResults({message:'Không thể tính phần trăm vì mẫu số bằng 0. Hãy kiểm tra SL, Te và Tb.'});return}
  const overlapPct=(overlap/overlapDen)*100;
  const bodyHookPct=((BH-1.1*Tb)/bodyDen)*100;

  const result={
    overlap:fmt(overlap,'mm',3),
    overlapPct:fmt(overlapPct,'%',2),
    bodyHookPct:fmt(bodyHookPct,'%',2),
    gap:fmt(gap,'mm',3),
    overlapNum:overlap,
    gapNum:gap,
    overlapPctNum:overlapPct,
    bodyHookPctNum:bodyHookPct,
    message:'Đã tính kết quả cho '+current+'.'
  };

  const c=ensureCan(current);
  fields.forEach(id=>c.inputs[id]=document.getElementById(id).value);
  c.lastResult=result;
  const quality=evaluateQuality(result);
  result.qualityStatus=quality.status;
  result.qualityState=quality.state;
  result.qualityDetail=quality.detail;
  setResults(result);
  c.history=c.history||[];
  c.history.unshift({
    ts:Date.now(),
    BH,CH,SL,ST,Tb,Te,
    overlap:overlap,overlapPct:overlapPct,bodyHookPct:bodyHookPct,gap:gap,
    qualityStatus:quality.status,qualityState:quality.state,
    inputQualityChecks:quality.inputChecks||[]
  });
  if(c.history.length>50)c.history.length=50;
  persist();
  updateHistoryCount();
}


/* ---------- History sheet nâng cao ---------- */
let historyDetailIndex=null;

function openHistory(){
  const d=document.getElementById('historyDateFilter');
  const s=document.getElementById('historyStatusFilter');
  if(d)d.value='';
  if(s)s.value='all';
  renderHistory();
  document.getElementById('historyOverlay').classList.add('open');
}
function closeHistory(){document.getElementById('historyOverlay').classList.remove('open')}
function closeHistoryDetail(){document.getElementById('historyDetailOverlay').classList.remove('open')}
function fmtTime(ts){
  const d=new Date(ts),p=n=>String(n).padStart(2,'0');
  return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' · '+p(d.getHours())+':'+p(d.getMinutes());
}
function dateKey(ts){
  const d=new Date(ts),p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function historyState(h){
  const state=(h.qualityState||'').toLowerCase();
  if(['pass','watch','fail','unset'].includes(state))return state;
  const status=(h.qualityStatus||'').toUpperCase();
  if(status==='ĐẠT')return 'pass';
  if(status.includes('THEO DÕI'))return 'watch';
  if(status.includes('KHÔNG'))return 'fail';
  return 'unset';
}
function historyLabel(state){
  return {pass:'ĐẠT',watch:'CẦN THEO DÕI',fail:'KHÔNG ĐẠT',unset:'CHƯA THIẾT LẬP'}[state]||'CHƯA THIẾT LẬP';
}
function filteredHistory(){
  const c=canData[current]||{};
  const date=(document.getElementById('historyDateFilter')||{}).value||'';
  const status=(document.getElementById('historyStatusFilter')||{}).value||'all';
  return (c.history||[]).map((h,index)=>({h,index})).filter(x=>{
    if(date && dateKey(x.h.ts)!==date)return false;
    if(status!=='all' && historyState(x.h)!==status)return false;
    return true;
  });
}
function updateHistoryCount(){
  const el=document.getElementById('historyCount');
  if(!el)return;
  const c=canData[current];
  const n=(c&&c.history&&c.history.length)||0;
  el.textContent=n>99?'99+':String(n);
  el.style.display=n?'flex':'none';
}
function renderHistoryChart(){
  const svg=document.getElementById('historyChart'),stats=document.getElementById('historyChartStats'),note=document.getElementById('historyChartNote'); if(!svg)return;
  const metric=(document.getElementById('historyChartMetric')||{}).value||'overlapPct';
  const items=filteredHistory().sort((a,b)=>a.h.ts-b.h.ts).slice(-12);
  const labels={overlapPct:'% Độ chồng mí',bodyHookPct:'% Móc thân',overlap:'Độ chồng mí',gap:'Khoảng trống'};
  const unit={overlapPct:'%',bodyHookPct:'%',overlap:' mm',gap:' mm'};
  const vals=items.map(x=>Number(x.h[metric]));
  if(vals.length<2 || vals.some(v=>!Number.isFinite(v))){
    svg.innerHTML='<text x="300" y="96" text-anchor="middle" fill="currentColor" font-size="12">Cần ít nhất 2 lần đo để hiển thị biểu đồ</text>'; svg.style.color='var(--muted)';
    if(stats)stats.innerHTML=''; if(note)note.textContent=items.length?'Hãy tính thêm lần đo để xem xu hướng.':'Chưa có dữ liệu lịch sử.'; return;
  }
  const W=600,H=190,pad={l:42,r:12,t:14,b:28},min=Math.min(...vals),max=Math.max(...vals),range=max-min||Math.max(Math.abs(max)*0.1,1),lo=min-range*.15,hi=max+range*.15;
  const x=i=>pad.l+i*(W-pad.l-pad.r)/(vals.length-1), y=v=>pad.t+(hi-v)*(H-pad.t-pad.b)/(hi-lo), fmt=v=>Math.abs(v)>=10?v.toFixed(1):v.toFixed(2);
  let g=''; for(let i=0;i<4;i++){const gy=pad.t+i*(H-pad.t-pad.b)/3,gv=hi-i*(hi-lo)/3;g+='<line x1="'+pad.l+'" y1="'+gy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+gy.toFixed(1)+'" stroke="currentColor" opacity=".10"/><text x="'+(pad.l-6)+'" y="'+(gy+3).toFixed(1)+'" text-anchor="end" font-size="9" fill="currentColor" opacity=".55">'+fmt(gv)+'</text>';}
  g+='<polyline points="'+vals.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  vals.forEach((v,i)=>g+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="4" fill="var(--card)" stroke="var(--blue)" stroke-width="2"><title>'+fmt(v)+unit[metric]+' · '+fmtTime(items[i].h.ts)+'</title></circle>');
  g+='<text x="'+pad.l+'" y="'+(H-7)+'" font-size="9" fill="currentColor" opacity=".55">'+fmtTime(items[0].h.ts).slice(0,5)+'</text><text x="'+(W-pad.r)+'" y="'+(H-7)+'" text-anchor="end" font-size="9" fill="currentColor" opacity=".55">'+fmtTime(items[items.length-1].h.ts).slice(0,5)+'</text>';
  svg.innerHTML=g; svg.style.color='var(--text)'; const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
  if(stats)stats.innerHTML='<div class="history-chart-stat"><b>'+fmt(Math.min(...vals))+unit[metric]+'</b><span>Thấp nhất</span></div><div class="history-chart-stat"><b>'+fmt(avg)+unit[metric]+'</b><span>Trung bình</span></div><div class="history-chart-stat"><b>'+fmt(Math.max(...vals))+unit[metric]+'</b><span>Cao nhất</span></div>';
  if(note)note.textContent='Hiển thị '+vals.length+' lần đo gần nhất · '+labels[metric];
}

function renderHistory(){
  updateHistoryCount();
  const subtitle=document.getElementById('historySubtitle');
  const total=((canData[current]||{}).history||[]).length;
  if(subtitle)subtitle.textContent='Lưu riêng cho '+(current||'loại lon đang chọn')+' · '+total+' lần đo';

  const all=(canData[current]||{}).history||[];
  const pass=all.filter(h=>historyState(h)==='pass').length;
  const watch=all.filter(h=>historyState(h)==='watch').length;
  const fail=all.filter(h=>historyState(h)==='fail').length;
  const qdPass=document.getElementById('qdPass'), qdWatch=document.getElementById('qdWatch'), qdFail=document.getElementById('qdFail');
  if(qdPass)qdPass.textContent=pass;
  if(qdWatch)qdWatch.textContent=watch;
  if(qdFail)qdFail.textContent=fail;
  const qdKnown=pass+watch+fail;
  const qdRate=qdKnown?Math.round(pass/qdKnown*100):0;
  const qdRateEl=document.getElementById('qdRate'), qdBar=document.getElementById('qdBar');
  if(qdRateEl)qdRateEl.textContent=qdRate+'%';
  if(qdBar)qdBar.style.width=qdRate+'%';
  const filteredForDashboard=filteredHistory();
  let inputPass=0,inputFail=0;
  filteredForDashboard.forEach(x=>{(x.h.inputQualityChecks||[]).forEach(ch=>{if(ch.ok)inputPass++;else inputFail++;});});
  const inputKnown=inputPass+inputFail;
  const qip=document.getElementById('qdInputPass'),qif=document.getElementById('qdInputFail'),qir=document.getElementById('qdInputRate');
  if(qip)qip.textContent=inputPass;
  if(qif)qif.textContent=inputFail;
  if(qir)qir.textContent=inputKnown?Math.round(inputPass/inputKnown*100)+'%':'--';
  const qdPeriod=document.getElementById('qdPeriod');
  const dateFilter=(document.getElementById('historyDateFilter')||{}).value||'';
  const statusFilter=(document.getElementById('historyStatusFilter')||{}).value||'all';
  if(qdPeriod)qdPeriod.textContent=dateFilter?('Ngày '+dateFilter): (statusFilter==='all'?'Tất cả lịch sử':'Theo bộ lọc');
  const summary=document.getElementById('historySummary');
  if(summary)summary.innerHTML=
    '<div class="history-chip pass"><b>'+pass+'</b><span>Đạt</span></div>'+
    '<div class="history-chip watch"><b>'+watch+'</b><span>Theo dõi</span></div>'+
    '<div class="history-chip fail"><b>'+fail+'</b><span>Không đạt</span></div>';

  renderHistoryChart();
  const list=document.getElementById('historyList');
  const hist=filteredHistory();
  if(hist.length===0){
    list.innerHTML=all.length
      ?'<div class="history-empty-filter">Không có lần đo phù hợp với bộ lọc.</div>'
      :'<div class="empty-state">Chưa có lịch sử đo cho '+current+'.<br>Nhấn “Tính kết quả” để tự động lưu một mục.</div>';
    return;
  }
  list.innerHTML=hist.map(({h,index})=>{
    const vals='BH '+h.BH+' · CH '+h.CH+' · SL '+h.SL+' · ST '+h.ST+' · Tb '+h.Tb+' · Te '+h.Te;
    const state=historyState(h), label=historyLabel(state);
    return '<div class="hist-item" onclick="openHistoryDetail('+index+')">'+
      '<div class="hi-left"><div class="hi-time">'+fmtTime(h.ts)+'</div><div class="hi-vals">'+vals+'</div><div class="hist-status '+state+'">'+label+'</div></div>'+
      '<div class="hi-right"><div class="hi-pct '+(state==='fail'?'red':'green')+'">'+Number(h.overlapPct).toFixed(1)+'%</div>'+
      '<button class="hist-del" onclick="event.stopPropagation();deleteHistoryEntry('+index+')" aria-label="Xóa">✕</button></div>'+
      '</div>';
  }).join('');
}
function openHistoryDetail(i){
  const h=(canData[current]||{}).history?.[i];
  if(!h)return;
  historyDetailIndex=i;
  const state=historyState(h),label=historyLabel(state);
  const body=document.getElementById('historyDetailBody');
  document.getElementById('historyDetailTitle').textContent=current+' · '+fmtTime(h.ts);
  body.innerHTML=
    '<div class="history-detail-time">Lần đo được lưu tự động sau khi tính kết quả.</div>'+
    '<div class="hist-status '+state+'" style="font-size:11px;padding:5px 10px">'+label+'</div>'+
    '<div class="hist-detail-results">'+
      '<div class="hist-metric"><span>Độ chồng mí</span><b>'+Number(h.overlap).toFixed(3)+' mm</b></div>'+
      '<div class="hist-metric"><span>% Độ chồng mí</span><b>'+Number(h.overlapPct).toFixed(2)+'%</b></div>'+
      '<div class="hist-metric"><span>% Móc thân</span><b>'+Number(h.bodyHookPct).toFixed(2)+'%</b></div>'+
      '<div class="hist-metric"><span>Khoảng trống</span><b>'+Number(h.gap).toFixed(3)+' mm</b></div>'+
    '</div>'+
    '<div class="hist-inputs"><b>6 thông số đầu vào</b><br>'+
      'BH: '+h.BH+' mm · CH: '+h.CH+' mm · SL: '+h.SL+' mm<br>'+
      'ST: '+h.ST+' mm · Tb: '+h.Tb+' mm · Te: '+h.Te+' mm</div>'+
    '<div class="hist-input-checks"><b>Kiểm tra Min–Max</b>'+((h.inputQualityChecks&&h.inputQualityChecks.length)?h.inputQualityChecks.map(ch=>'<div><span>'+ch.name+'</span><strong class="'+(ch.ok?'ok':'bad')+'">'+(ch.ok?'✓ Đạt':'✕ Ngoài giới hạn')+(ch.min!==null&&ch.min!==undefined?' · ≥ '+ch.min:'')+(ch.max!==null&&ch.max!==undefined?' · ≤ '+ch.max:'')+'</strong></div>').join(''):'<div class="muted">Chưa thiết lập Min–Max cho lần đo này.</div>')+'</div>'+
    '<div class="history-detail-actions">'+
      '<button class="btn calc" onclick="loadHistoryEntry('+i+',true)">NẠP LẠI SỐ LIỆU</button>'+
      '<button class="btn reset" onclick="deleteHistoryEntry('+i+',true)">XÓA LẦN ĐO</button></div>';
  document.getElementById('historyDetailOverlay').classList.add('open');
}
function loadHistoryEntry(i,fromDetail=false){
  const c=canData[current],h=c.history[i];
  if(!h)return;
  fields.forEach(id=>document.getElementById(id).value=h[id]);
  // Nạp lại kết quả đã lưu, không tự tạo thêm một bản ghi lịch sử mới.
  const result={
    overlap:fmt(h.overlap,'mm',3), overlapPct:fmt(h.overlapPct,'%',2),
    bodyHookPct:fmt(h.bodyHookPct,'%',2), gap:fmt(h.gap,'mm',3),
    overlapNum:h.overlap, overlapPctNum:h.overlapPct, bodyHookPctNum:h.bodyHookPct, gapNum:h.gap,
    qualityStatus:h.qualityStatus||historyLabel(historyState(h)),
    qualityState:historyState(h), qualityDetail:'Kết quả được nạp lại từ lịch sử.'
  };
  setResults(result);
  c.lastResult=result;
  persist();
  closeHistoryDetail();closeHistory();
  showToast('Đã nạp lại số liệu từ lịch sử');
}
function deleteHistoryEntry(i,fromDetail=false){
  if(!confirm('Bạn có muốn xóa lần đo này khỏi lịch sử không?'))return;
  const c=canData[current];
  c.history.splice(i,1);
  persist();
  updateHistoryCount();
  closeHistoryDetail();
  renderHistory();
  showToast('Đã xóa lần đo');
}
function clearHistory(){
  const c=ensureCan(current);
  if(!c.history.length){showToast('Chưa có lịch sử để xóa');return}
  if(!confirm('Xóa toàn bộ lịch sử của '+current+'?'))return;
  c.history=[];
  persist();
  renderHistory();
  updateHistoryCount();
  showToast('Đã xóa toàn bộ lịch sử của '+current);
}
function exportFilteredHistoryCsv(){
  const items=filteredHistory();
  if(!items.length){showToast('Không có dữ liệu phù hợp để xuất');return}
  const rows=[['Loại lon','Thời gian','BH','CH','SL','ST','Tb','Te','Overlap(mm)','%Overlap','%BodyHook','Gap(mm)','Đánh giá','Min-Max']];
  items.forEach(({h})=>rows.push([
    current,new Date(h.ts).toLocaleString('vi-VN'),h.BH,h.CH,h.SL,h.ST,h.Tb,h.Te,
    Number(h.overlap).toFixed(3),Number(h.overlapPct).toFixed(2),Number(h.bodyHookPct).toFixed(2),Number(h.gap).toFixed(3),
    historyLabel(historyState(h)),
    (h.inputQualityChecks&&h.inputQualityChecks.length)?(h.inputQualityChecks.every(ch=>ch.ok)?'ĐẠT':'KHÔNG ĐẠT'):'CHƯA THIẾT LẬP'
  ]));
  const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='tinh-mi-lon-'+String(current).replace(/\s+/g,'-')+'-lich-su.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('Đã xuất dữ liệu lịch sử');
}
// Giữ tương thích với nút cũ nếu còn tồn tại trong cache/source.
function exportHistoryCsv(){exportFilteredHistoryCsv();}

/* ---------- Appearance settings ---------- */
function getAppearance(){
  return {theme:localStorage.getItem('tinhMiLonTheme')||'default',language:localStorage.getItem('tinhMiLonLanguage')||'vi'};
}
function applyTheme(theme){
  const allowed=['default','factory','carbon','pink','orange','neon'];
  theme=allowed.includes(theme)?theme:'default';
  document.body.classList.remove('theme-soft','theme-factory','theme-carbon','theme-pink','theme-orange','theme-neon');
  if(theme!=='default')document.body.classList.add('theme-'+theme);
  localStorage.setItem('tinhMiLonTheme',theme);
  document.querySelectorAll('[data-theme-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.themeChoice===theme));
}
function applyThemeImage(){
  document.documentElement.style.setProperty('--app-bg-image','none');
  document.documentElement.style.setProperty('--app-bg-opacity','0');
}

const LANG_TEXT={
  en:{
    'Bạn đang ngoại tuyến. Dữ liệu vẫn hoạt động trên thiết bị.':'You are offline. Data still works on this device.',
    'Có phiên bản mới':'New version available','Bản cập nhật đã sẵn sàng để sử dụng.':'An update is ready to use.','CẬP NHẬT':'UPDATE',
    'CHỌN LOẠI LON':'SELECT CAN TYPE','⚙️ Quản lý':'⚙️ Manage','🎨 Giao diện':'🎨 Appearance',
    'Tính mí lon':'Can seam calculator','Thông số nhập theo đơn vị mm':'Enter measurements in mm','Thông số mí ghép':'Seam measurements',
    'Móc thân':'Body Hook','Móc nắp':'Cover Hook','Chiều dài mí ghép(Rộng mí)':'Seam Length (Seam Width)','Độ dày mí ghép':'Seam Thickness',
    'Độ dày vật liệu':'Material Thickness','Độ dày thân lon':'Can body thickness','Độ dày nắp lon':'Can end thickness',
    'Nhập đủ 6 thông số để tính các chỉ số bên dưới.':'Enter all 6 measurements to calculate the indicators below.',
    'TÍNH KẾT QUẢ':'CALCULATE','↻ Reset loại lon':'↻ Reset can type','Xóa ô nhập':'Clear inputs','Kết quả tính toán':'Calculation results','Chia sẻ':'Share',
    'Đánh giá tổng thể':'Overall assessment','CHƯA THIẾT LẬP':'NOT SET','Thiết lập ngưỡng trong Cài đặt để đánh giá Đạt / Không đạt.':'Set thresholds in Settings to assess Pass / Fail.',
    'Độ chồng mí':'Overlap','Tiêu chuẩn':'Standard','Chưa thiết lập':'Not set','Thiết lập ngưỡng Độ chồng mí trong Cài đặt.':'Set the Overlap threshold in Settings.',
    'Phần trăm độ chồng mí':'Overlap percentage','Phần trăm độ móc thân':'Body Hook percentage','Móc thân':'Body Hook','Chưa có dữ liệu':'No data',
    'Khoảng trống bên trong mí ghép':'Free Space inside seam','Thiết lập ngưỡng Khoảng trống trong Cài đặt.':'Set the Free Space threshold in Settings.',
    'Kết quả được tính riêng và lưu trên thiết bị cho từng loại lon.':'Results are calculated and stored separately on this device for each can type.',
    'Lịch sử đo':'Measurement history','Dữ liệu lưu riêng theo từng loại lon':'Data is stored separately for each can type','Xong':'Done',
    '📊 Tổng quan chất lượng':'📊 Quality overview','Tất cả lịch sử':'All history','Đạt':'Pass','Theo dõi':'Monitor','Không đạt':'Fail',
    'Thông số đạt':'Measurements in range','Thông số ngoài giới hạn':'Measurements out of range','Tỷ lệ Min–Max':'Min–Max rate',
    'Tỷ lệ đạt được tính trên các lần đo có trạng thái. Tỷ lệ Min–Max tính riêng các thông số đã được thiết lập giới hạn.':'Pass rate is calculated from measurements with a status. Min–Max rate only uses measurements with configured limits.',
    'Tất cả trạng thái':'All statuses','ĐẠT':'PASS','CẦN THEO DÕI':'MONITOR','KHÔNG ĐẠT':'FAIL','Xu hướng kết quả':'Result trend',
    'Độ chồng mí (mm)':'Overlap (mm)','Khoảng trống (mm)':'Free Space (mm)','Biểu đồ lấy các lần đo đang được lọc.':'The chart uses the currently filtered measurements.',
    '⬇︎ Xuất dữ liệu đang lọc':'⬇︎ Export filtered data','Xóa toàn bộ lịch sử':'Delete all history','Chi tiết lần đo':'Measurement details',
    'Tiêu chuẩn & Cài đặt':'Standards & Settings','THÔNG SỐ ĐO · MIN – MAX':'MEASUREMENT RANGES · MIN – MAX',
    'Đặt khoảng tiêu chuẩn cho 6 thông số đầu vào của riêng loại lon này. Để trống một phía nếu không muốn giới hạn phía đó.':'Set standard ranges for the 6 inputs for this can type. Leave one side blank if you do not want a limit.',
    'BẢO VỆ CÀI ĐẶT':'SETTINGS PROTECTION','Khóa tiêu chuẩn & Min–Max':'Lock standards & Min–Max','Khóa thao tác thay đổi tiêu chuẩn bằng mã PIN 4–6 số.':'Protect standard changes with a 4–6 digit PIN.',
    'Đang mở':'Unlocked','Đặt mã PIN':'Set PIN','Khóa ngay':'Lock now','Tắt khóa':'Disable lock','TIÊU CHÍ KẾT QUẢ':'RESULT CRITERIA',
    'Các ngưỡng bên dưới tiếp tục dùng cho đánh giá Đạt / Không đạt của kết quả tính.':'The thresholds below are used to assess calculated results as Pass / Fail.',
    'Độ chồng mí · Overlap (mm)':'Overlap · Overlap (mm)','% Độ chồng mí tối thiểu':'Minimum Overlap %','% Độ móc thân tối thiểu':'Minimum Body Hook %','Khoảng trống tối đa':'Maximum Free Space',
    'khi tất cả tiêu chí đã thiết lập đều đạt.':'when all configured criteria pass.','Lưu tiêu chuẩn cho loại lon này':'Save standards for this can type',
    'Tùy chỉnh giao diện cho toàn bộ ứng dụng. Thiết lập được lưu ngay trên điện thoại.':'Customize the entire app. Settings are saved on this device.',
    'GIAO DIỆN CÓ SẴN':'PRESET THEMES','Mặc định':'Default','Nhà máy':'Factory','Hồng':'Pink','Cam':'Orange','Tím điện':'Electric Purple',
    'HÌNH NỀN TỪ ĐIỆN THOẠI':'PHONE BACKGROUND','🖼️ Chọn hình nền':'🖼️ Choose background','Chọn ảnh ›':'Choose image ›','Hình nền hiện tại':'Current background',
    'Độ tối hình nền':'Background darkness','Độ phóng to':'Zoom','Vị trí hình nền':'Background position','Giữa':'Center','Phía trên':'Top','Phía dưới':'Bottom','Bên trái':'Left','Bên phải':'Right','Xóa hình nền':'Remove background','ÁP DỤNG':'APPLY','↺ KHÔI PHỤC GIAO DIỆN MẶC ĐỊNH':'↺ RESET APPEARANCE',
    'Quản lý loại lon':'Can type management','Thêm, đổi tên hoặc xóa loại lon. Dữ liệu và tiêu chuẩn của từng loại được lưu riêng.':'Add, rename, or delete can types. Data and standards are stored separately.',
    '＋ THÊM LOẠI LON':'＋ ADD CAN TYPE','Thêm loại lon':'Add can type','LƯU LOẠI LON':'SAVE CAN TYPE','Xuất báo cáo':'Export report','Xuất dữ liệu đo của loại lon đang chọn.':'Export measurements for the selected can type.',
    'CSV hiện tại':'Current CSV','CSV lịch sử':'History CSV','IN / LƯU PDF':'PRINT / SAVE PDF','Đã lưu trên thiết bị':'Saved on device',
    'Mở khóa Cài đặt':'Unlock Settings','Nhập mã PIN để thay đổi Min–Max và tiêu chuẩn.':'Enter the PIN to change Min–Max and standards.','Hủy':'Cancel','MỞ KHÓA':'UNLOCK',
    'NGÔN NGỮ / LANGUAGE':'LANGUAGE / NGÔN NGỮ','Tiếng Việt':'Vietnamese','History sheet':'History','History detail sheet':'Measurement details','Settings sheet':'Settings','Lon số 2':'Can No. 2','Lon số 3':'Can No. 3','Số 3 Dẹp':'No. 3 Flat','Số 3 Vừa':'No. 3 Regular','Số 3 Cao':'No. 3 Tall','Lon số 5':'Can No. 5','Lon A10':'Can A10','Overlap = BH + CH + Te − SL':'Overlap = BH + CH + Te − SL','-- mm':'-- mm','--%':'--%','% Overlap':'% Overlap','% Body Hook Width / % BH':'% Body Hook Width / % BH','Free Space / Gap':'Free Space / Gap','BẢO VỆ CÀI ĐẶT':'SETTINGS PROTECTION','BH · Móc thân':'BH · Body Hook','CH / EH · Móc nắp':'CH / EH · Cover Hook','SL · Rộng mí':'SL · Seam Width','ST · Độ dày mí':'ST · Seam Thickness','Tb · Độ dày thân':'Tb · Body Thickness','Te · Độ dày nắp':'Te · End Thickness','Độ chồng mí · Overlap (mm)':'Overlap · Overlap (mm)','% Độ chồng mí tối thiểu':'Minimum Overlap %','% Độ móc thân tối thiểu':'Minimum Body Hook %','Khoảng trống tối đa':'Maximum Free Space','Các ngưỡng được lưu riêng cho từng loại lon. Để trống một ngưỡng nếu bạn không muốn dùng tiêu chí đó. Ứng dụng chỉ kết luận':'Thresholds are stored separately for each can type. Leave a threshold blank if you do not want to use it. The app only marks Pass','khi tất cả tiêu chí đã thiết lập đều đạt.':'when all configured criteria pass.','Thêm loại lon':'Add can type','Tên, ghi chú, dữ liệu đo, lịch sử và tiêu chuẩn được lưu riêng cho từng loại lon.':'Name, notes, measurements, history, and standards are stored separately for each can type.','Xuất báo cáo':'Export report','Xuất dữ liệu đo của loại lon đang chọn.':'Export measurements for the selected can type.','CSV hiện tại':'Current CSV','CSV lịch sử':'History CSV','IN / LƯU PDF':'PRINT / SAVE PDF','Trên iPhone, sau khi chọn IN / LƯU PDF, bạn có thể dùng menu Chia sẻ của hệ thống để lưu hoặc gửi báo cáo.':'On iPhone, after choosing PRINT / SAVE PDF, use the system Share menu to save or send the report.','Đã lưu trên thiết bị':'Saved on device','Mở khóa Cài đặt':'Unlock Settings','Nhập mã PIN để thay đổi Min–Max và tiêu chuẩn.':'Enter the PIN to change Min–Max and standards.','Hủy':'Cancel','MỞ KHÓA':'UNLOCK','English':'English','中文':'Chinese','ไทย':'Thai'
  },
  zh:{
    'CHỌN LOẠI LON':'选择罐型','⚙️ Quản lý':'⚙️ 管理','🎨 Giao diện':'🎨 界面','Tính mí lon':'罐缝计算','Thông số nhập theo đơn vị mm':'输入单位：mm','Thông số mí ghép':'罐缝参数','Móc thân':'罐身钩','Móc nắp':'罐盖钩','Chiều dài mí ghép(Rộng mí)':'罐缝长度（缝宽）','Độ dày mí ghép':'罐缝厚度','Độ dày vật liệu':'材料厚度','Độ dày thân lon':'罐身材料厚度','Độ dày nắp lon':'罐盖材料厚度','TÍNH KẾT QUẢ':'计算结果','↻ Reset loại lon':'↻ 重置罐型','Xóa ô nhập':'清除输入','Kết quả tính toán':'计算结果','Đánh giá tổng thể':'总体评价','Độ chồng mí':'搭接量','Phần trăm độ chồng mí':'搭接百分比','Phần trăm độ móc thân':'罐身钩百分比','Khoảng trống bên trong mí ghép':'罐缝间隙','Lịch sử đo':'测量历史','Xong':'完成','Đạt':'合格','Theo dõi':'关注','Không đạt':'不合格','Xu hướng kết quả':'结果趋势','Tiêu chuẩn & Cài đặt':'标准与设置','Quản lý loại lon':'罐型管理','Thêm loại lon':'添加罐型','LƯU LOẠI LON':'保存罐型','GIAO DIỆN CÓ SẴN':'预设主题','Mặc định':'默认','Nhà máy':'工厂','Hồng':'粉色','Cam':'橙色','Tím điện':'电光紫','HÌNH NỀN TỪ ĐIỆN THOẠI':'手机背景','🖼️ Chọn hình nền':'🖼️ 选择背景','Chọn ảnh ›':'选择图片 ›','Hình nền hiện tại':'当前背景','Độ phóng to':'缩放','Vị trí hình nền':'背景位置','Giữa':'居中','Phía trên':'顶部','Phía dưới':'底部','Bên trái':'左侧','Bên phải':'右侧','Độ rõ hình nền':'背景显示强度','Xóa hình nền':'删除背景','ÁP DỤNG':'应用','NGÔN NGỮ / LANGUAGE':'语言 / LANGUAGE','Tiếng Việt':'越南语','English':'英语','History sheet':'历史','History detail sheet':'测量详情','Settings sheet':'设置','Lon số 2':'2号罐','Lon số 3':'3号罐','Số 3 Dẹp':'3号扁罐','Số 3 Vừa':'3号标准罐','Số 3 Cao':'3号高罐','Lon số 5':'5号罐','Lon A10':'A10罐','Tính Mí Lon':'罐缝计算','Bạn đang ngoại tuyến. Dữ liệu vẫn hoạt động trên thiết bị.':'您当前处于离线状态。数据仍可在本设备上使用。','Có phiên bản mới':'有新版本','Bản cập nhật đã sẵn sàng để sử dụng.':'更新已准备就绪。','CẬP NHẬT':'更新','Thông số nhập theo đơn vị mm':'输入单位：mm','BH · Body Hook':'BH · 罐身钩','CH / EH · Cover Hook':'CH / EH · 罐盖钩','SL · Seam Length':'SL · 罐缝长度','ST · Seam Thickness':'ST · 罐缝厚度','Overlap = BH + CH + Te − SL':'搭接量 = BH + CH + Te − SL','-- mm':'-- 毫米','--%':'--%','% Overlap':'% 搭接量','% Body Hook Width / % BH':'% 罐身钩宽度 / % BH','Free Space / Gap':'内部间隙 / Gap','BẢO VỆ CÀI ĐẶT':'设置保护','BH · Móc thân':'BH · 罐身钩','CH / EH · Móc nắp':'CH / EH · 罐盖钩','SL · Rộng mí':'SL · 缝宽','ST · Độ dày mí':'ST · 缝厚','Tb · Độ dày thân':'Tb · 罐身厚度','Te · Độ dày nắp':'Te · 罐盖厚度','Độ chồng mí · Overlap (mm)':'搭接量 · Overlap (mm)','% Độ chồng mí tối thiểu':'最小搭接百分比','% Độ móc thân tối thiểu':'最小罐身钩百分比','Khoảng trống tối đa':'最大内部间隙','Các ngưỡng được lưu riêng cho từng loại lon. Để trống một ngưỡng nếu bạn không muốn dùng tiêu chí đó. Ứng dụng chỉ kết luận':'阈值按罐型分别保存。无需使用的阈值可留空。应用仅在','khi tất cả tiêu chí đã thiết lập đều đạt.':'所有已设置的标准均通过时判定为合格。','Tên, ghi chú, dữ liệu đo, lịch sử và tiêu chuẩn được lưu riêng cho từng loại lon.':'名称、备注、测量数据、历史记录和标准均按罐型分别保存。','Xuất báo cáo':'导出报告','Xuất dữ liệu đo của loại lon đang chọn.':'导出当前罐型的测量数据。','CSV hiện tại':'当前 CSV','CSV lịch sử':'历史 CSV','IN / LƯU PDF':'打印 / 保存 PDF','Trên iPhone, sau khi chọn IN / LƯU PDF, bạn có thể dùng menu Chia sẻ của hệ thống để lưu hoặc gửi báo cáo.':'在 iPhone 上选择打印/保存 PDF 后，可使用系统分享菜单保存或发送报告。','Đã lưu trên thiết bị':'已保存在设备上','Mở khóa Cài đặt':'解锁设置','Nhập mã PIN để thay đổi Min–Max và tiêu chuẩn.':'输入 PIN 以修改 Min–Max 和标准。','Hủy':'取消','MỞ KHÓA':'解锁','English':'英语','中文':'中文','ไทย':'泰语'
  },
  th:{
    'CHỌN LOẠI LON':'เลือกประเภทกระป๋อง','⚙️ Quản lý':'⚙️ จัดการ','🎨 Giao diện':'🎨 รูปแบบ','Tính mí lon':'คำนวณตะเข็บกระป๋อง','Thông số nhập theo đơn vị mm':'ป้อนค่าเป็นมม.','Thông số mí ghép':'ค่าตะเข็บกระป๋อง','Móc thân':'ขอเกี่ยวตัวกระป๋อง','Móc nắp':'ขอเกี่ยวฝา','Chiều dài mí ghép(Rộng mí)':'ความยาวตะเข็บ (ความกว้างตะเข็บ)','Độ dày mí ghép':'ความหนาตะเข็บ','Độ dày vật liệu':'ความหนาวัสดุ','Độ dày thân lon':'ความหนาตัวกระป๋อง','Độ dày nắp lon':'ความหนาฝากระป๋อง','TÍNH KẾT QUẢ':'คำนวณผล','↻ Reset loại lon':'↻ รีเซ็ตประเภทกระป๋อง','Xóa ô nhập':'ล้างข้อมูล','Kết quả tính toán':'ผลการคำนวณ','Đánh giá tổng thể':'การประเมินโดยรวม','Độ chồng mí':'ระยะซ้อน','Phần trăm độ chồng mí':'เปอร์เซ็นต์การซ้อน','Phần trăm độ móc thân':'เปอร์เซ็นต์ขอเกี่ยวตัว','Khoảng trống bên trong mí ghép':'ช่องว่างในตะเข็บ','Lịch sử đo':'ประวัติการวัด','Xong':'เสร็จ','Đạt':'ผ่าน','Theo dõi':'ติดตาม','Không đạt':'ไม่ผ่าน','Xu hướng kết quả':'แนวโน้มผลลัพธ์','Tiêu chuẩn & Cài đặt':'มาตรฐานและการตั้งค่า','Quản lý loại lon':'จัดการประเภทกระป๋อง','Thêm loại lon':'เพิ่มประเภทกระป๋อง','LƯU LOẠI LON':'บันทึกประเภทกระป๋อง','GIAO DIỆN CÓ SẴN':'ธีมสำเร็จรูป','Mặc định':'ค่าเริ่มต้น','Nhà máy':'โรงงาน','Hồng':'ชมพู','Cam':'ส้ม','Tím điện':'ม่วงไฟฟ้า','HÌNH NỀN TỪ ĐIỆN THOẠI':'พื้นหลังจากโทรศัพท์','🖼️ Chọn hình nền':'🖼️ เลือกพื้นหลัง','Chọn ảnh ›':'เลือกรูป ›','Hình nền hiện tại':'พื้นหลังปัจจุบัน','Độ phóng to':'ซูม','Vị trí hình nền':'ตำแหน่งพื้นหลัง','Giữa':'ตรงกลาง','Phía trên':'ด้านบน','Phía dưới':'ด้านล่าง','Bên trái':'ด้านซ้าย','Bên phải':'ด้านขวา','Độ rõ hình nền':'ความเข้มของพื้นหลัง','Xóa hình nền':'ลบพื้นหลัง','ÁP DỤNG':'ใช้','NGÔN NGỮ / LANGUAGE':'ภาษา / LANGUAGE','Tiếng Việt':'เวียดนาม','English':'อังกฤษ','History sheet':'ประวัติ','History detail sheet':'รายละเอียดการวัด','Settings sheet':'การตั้งค่า','Lon số 2':'กระป๋องหมายเลข 2','Lon số 3':'กระป๋องหมายเลข 3','Số 3 Dẹp':'หมายเลข 3 แบบเตี้ย','Số 3 Vừa':'หมายเลข 3 มาตรฐาน','Số 3 Cao':'หมายเลข 3 สูง','Lon số 5':'กระป๋องหมายเลข 5','Lon A10':'กระป๋อง A10','Tính Mí Lon':'คำนวณตะเข็บกระป๋อง','Bạn đang ngoại tuyến. Dữ liệu vẫn hoạt động trên thiết bị.':'คุณออฟไลน์อยู่ ข้อมูลยังใช้งานได้บนอุปกรณ์นี้','Có phiên bản mới':'มีเวอร์ชันใหม่','Bản cập nhật đã sẵn sàng để sử dụng.':'มีการอัปเดตพร้อมใช้งาน','CẬP NHẬT':'อัปเดต','Thông số nhập theo đơn vị mm':'ป้อนค่าเป็นมม.','BH · Body Hook':'BH · ขอเกี่ยวตัวกระป๋อง','CH / EH · Cover Hook':'CH / EH · ขอเกี่ยวฝา','SL · Seam Length':'SL · ความยาวตะเข็บ','ST · Seam Thickness':'ST · ความหนาตะเข็บ','Overlap = BH + CH + Te − SL':'ระยะซ้อน = BH + CH + Te − SL','-- mm':'-- มม.','--%':'--%','% Overlap':'% การซ้อน','% Body Hook Width / % BH':'% ความกว้างขอเกี่ยวตัว / % BH','Free Space / Gap':'ช่องว่างภายใน / Gap','BẢO VỆ CÀI ĐẶT':'การป้องกันการตั้งค่า','BH · Móc thân':'BH · ขอเกี่ยวตัว','CH / EH · Móc nắp':'CH / EH · ขอเกี่ยวฝา','SL · Rộng mí':'SL · ความกว้างตะเข็บ','ST · Độ dày mí':'ST · ความหนาตะเข็บ','Tb · Độ dày thân':'Tb · ความหนาตัวกระป๋อง','Te · Độ dày nắp':'Te · ความหนาฝา','Độ chồng mí · Overlap (mm)':'ระยะซ้อน · Overlap (มม.)','% Độ chồng mí tối thiểu':'เปอร์เซ็นต์การซ้อนขั้นต่ำ','% Độ móc thân tối thiểu':'เปอร์เซ็นต์ขอเกี่ยวตัวขั้นต่ำ','Khoảng trống tối đa':'ช่องว่างสูงสุด','Các ngưỡng được lưu riêng cho từng loại lon. Để trống một ngưỡng nếu bạn không muốn dùng tiêu chí đó. Ứng dụng chỉ kết luận':'เกณฑ์จะบันทึกแยกตามประเภทกระป๋อง เว้นว่างเกณฑ์ที่ไม่ต้องการใช้ แอปจะตัดสินผ่านเมื่อ','khi tất cả tiêu chí đã thiết lập đều đạt.':'เกณฑ์ที่ตั้งไว้ทั้งหมดผ่าน','Tên, ghi chú, dữ liệu đo, lịch sử và tiêu chuẩn được lưu riêng cho từng loại lon.':'ชื่อ หมายเหตุ ข้อมูลการวัด ประวัติ และมาตรฐานจะบันทึกแยกตามประเภทกระป๋อง','Xuất báo cáo':'ส่งออกรายงาน','Xuất dữ liệu đo của loại lon đang chọn.':'ส่งออกข้อมูลการวัดของประเภทกระป๋องที่เลือก','CSV hiện tại':'CSV ปัจจุบัน','CSV lịch sử':'CSV ประวัติ','IN / LƯU PDF':'พิมพ์ / บันทึก PDF','Trên iPhone, sau khi chọn IN / LƯU PDF, bạn có thể dùng menu Chia sẻ của hệ thống để lưu hoặc gửi báo cáo.':'บน iPhone หลังเลือกพิมพ์/บันทึก PDF ให้ใช้เมนูแชร์ของระบบเพื่อบันทึกหรือส่งรายงาน','Đã lưu trên thiết bị':'บันทึกในอุปกรณ์แล้ว','Mở khóa Cài đặt':'ปลดล็อกการตั้งค่า','Nhập mã PIN để thay đổi Min–Max và tiêu chuẩn.':'ป้อน PIN เพื่อแก้ไข Min–Max และมาตรฐาน','Hủy':'ยกเลิก','MỞ KHÓA':'ปลดล็อก','English':'อังกฤษ','中文':'จีน','ไทย':'ไทย'
  }

};
let languageApplying=false;
const languageOriginalText=new WeakMap();
const languageOriginalPlaceholder=new WeakMap();
function buildLanguageReverse(lang){
  const rev={};
  Object.keys(LANG_TEXT).forEach(l=>{const d=LANG_TEXT[l]||{};Object.keys(d).forEach(k=>{rev[k]=k;rev[d[k]]=k;});});
  return rev;
}
function translateNodeText(node,lang,dict,reverse){
  if(!node||!node.parentElement||['SCRIPT','STYLE','NOSCRIPT'].includes(node.parentElement.tagName))return;
  const raw=node.nodeValue;
  const base=languageOriginalText.get(node) || reverse[raw] || raw;
  if(!languageOriginalText.has(node))languageOriginalText.set(node,base);
  const out=lang==='vi'?base:(dict[base]||base);
  if(node.nodeValue!==out)node.nodeValue=out;
}
function applyLanguage(lang){
  lang=['en','zh','th'].includes(lang)?lang:'vi';
  localStorage.setItem('tinhMiLonLanguage',lang);
  const dict=LANG_TEXT[lang]||{};
  const reverse=buildLanguageReverse(lang);
  languageApplying=true;
  document.querySelectorAll('[data-language-choice]').forEach(el=>el.classList.toggle('selected',el.dataset.languageChoice===lang));
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>translateNodeText(n,lang,dict,reverse));
  document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
    const current=el.getAttribute('placeholder')||'';
    const base=languageOriginalPlaceholder.get(el)||reverse[current]||current;
    if(!languageOriginalPlaceholder.has(el))languageOriginalPlaceholder.set(el,base);
    el.setAttribute('placeholder',lang==='vi'?base:(dict[base]||base));
  });
  document.documentElement.lang=lang;
  languageApplying=false;
}
let languageObserver;
function initLanguageObserver(){
  if(languageObserver)languageObserver.disconnect();
  languageObserver=new MutationObserver(muts=>{
    if(languageApplying)return;
    const lang=getAppearance().language,dict=LANG_TEXT[lang]||{},reverse=buildLanguageReverse(lang);
    muts.forEach(m=>{
      m.addedNodes&&m.addedNodes.forEach(n=>{
        if(n.nodeType===Node.TEXT_NODE)translateNodeText(n,lang,dict,reverse);
        else if(n.nodeType===Node.ELEMENT_NODE){
          const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);const a=[];while(w.nextNode())a.push(w.currentNode);a.forEach(x=>translateNodeText(x,lang,dict,reverse));
        }
      });
    });
  });
  languageObserver.observe(document.body,{childList:true,subtree:true});
}
function openAppearanceSettings(){applyTheme(getAppearance().theme);applyThemeImage();applyLanguage(getAppearance().language);document.getElementById('appearanceOverlay').classList.add('open')}
function closeAppearanceSettings(){document.getElementById('appearanceOverlay').classList.remove('open')}
function setThemeOpacity(value){value=Math.max(0,Math.min(55,parseInt(value,10)||0));localStorage.setItem('tinhMiLonBgOpacity',String(value));applyThemeImage()}
function setThemeZoom(value){value=Math.max(80,Math.min(140,parseInt(value,10)||100));localStorage.setItem('tinhMiLonBgZoom',String(value));applyThemeImage()}
function setThemePosition(value){const allowed=['center','top','bottom','left','right'];value=allowed.includes(value)?value:'center';localStorage.setItem('tinhMiLonBgPosition',value);applyThemeImage()}
function resetThemeImageView(){localStorage.setItem('tinhMiLonBgOpacity','18');localStorage.setItem('tinhMiLonBgZoom','100');localStorage.setItem('tinhMiLonBgPosition','center');applyThemeImage();showToast('Đã đặt lại cách hiển thị hình nền')}

function handleThemeImage(event){
  const file=event.target.files&&event.target.files[0];if(!file)return;
  if(!file.type.startsWith('image/')){showToast('Vui lòng chọn một hình ảnh');return}
  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const max=1600,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
      const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
      try{const data=c.toDataURL('image/jpeg',.78);localStorage.setItem('tinhMiLonBgImage',data);if(!localStorage.getItem('tinhMiLonBgOpacity'))localStorage.setItem('tinhMiLonBgOpacity','18');applyThemeImage();showToast('Đã đặt hình nền')}catch(e){showToast('Ảnh quá lớn, không thể lưu trên thiết bị')}
    }; img.src=reader.result;
  }; reader.readAsDataURL(file);event.target.value='';
}
function removeThemeImage(){localStorage.removeItem('tinhMiLonBgImage');applyThemeImage();showToast('Đã xóa hình nền')}
function resetAppearance(){
  localStorage.removeItem('tinhMiLonTheme');localStorage.removeItem('tinhMiLonLanguage');
  applyTheme('default');applyThemeImage();applyLanguage('vi');showToast('Đã khôi phục giao diện mặc định');
}
function initAppearance(){applyTheme(getAppearance().theme);applyThemeImage();applyLanguage(getAppearance().language);initLanguageObserver()}

/* ---------- Settings sheet ---------- */
function settingsLockHash(pin){
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(pin))).then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
}
function isSettingsLocked(){return !!localStorage.getItem('tinhMiLonSettingsPinHash')}
let pinMode=null;
function openPinPrompt(mode){
  pinMode=mode;
  const title=document.getElementById('pinTitle'),note=document.getElementById('pinNote'),btn=document.getElementById('pinSubmitBtn'),input=document.getElementById('pinInput');
  if(mode==='unlock'){title.textContent='Mở khóa Cài đặt';note.textContent='Nhập mã PIN để thay đổi Min–Max và tiêu chuẩn.';btn.textContent='MỞ KHÓA';}
  else if(mode==='set'){title.textContent='Đặt mã PIN';note.textContent='Nhập mã PIN 4–6 số. Sau đó bạn sẽ cần mã này để mở Cài đặt.';btn.textContent='TIẾP TỤC';}
  else if(mode==='confirm'){title.textContent='Xác nhận mã PIN';note.textContent='Nhập lại đúng mã PIN vừa đặt.';btn.textContent='LƯU MÃ PIN';}
  input.value='';document.getElementById('pinOverlay').classList.add('open');setTimeout(()=>input.focus(),120);
}
function closePinPrompt(){document.getElementById('pinOverlay').classList.remove('open');pinMode=null}
let pendingPin='';
async function submitPinPrompt(){
  const input=document.getElementById('pinInput');const pin=input.value.trim();
  if(!/^\d{4,6}$/.test(pin)){showToast('Mã PIN phải gồm 4–6 số');input.focus();return}
  if(pinMode==='unlock'){
    const hash=await settingsLockHash(pin);
    if(hash!==localStorage.getItem('tinhMiLonSettingsPinHash')){showToast('Mã PIN không đúng');input.select();return}
    localStorage.setItem('tinhMiLonSettingsUnlocked','1');closePinPrompt();fillSettingsForm();document.getElementById('settingsOverlay').classList.add('open');updateSettingsLockUI();showToast('Đã mở khóa Cài đặt');return;
  }
  if(pinMode==='set'){pendingPin=pin;openPinPrompt('confirm');return}
  if(pinMode==='confirm'){
    if(pin!==pendingPin){showToast('Mã PIN xác nhận không khớp');input.select();return}
    localStorage.setItem('tinhMiLonSettingsPinHash',await settingsLockHash(pin));localStorage.setItem('tinhMiLonSettingsUnlocked','1');pendingPin='';closePinPrompt();updateSettingsLockUI();showToast('Đã đặt mã PIN bảo vệ Cài đặt');return;
  }
}
function fillSettingsForm(){
  const c=ensureCan(current),limits=c.limits||{};
  fields.forEach(f=>{document.getElementById('lim'+f+'Min').value=limits[f+'Min']??'';document.getElementById('lim'+f+'Max').value=limits[f+'Max']??''});
  document.getElementById('thOverlapMin').value=c.thresholds.overlapMin??'';document.getElementById('thOverlapMax').value=c.thresholds.overlapMax??'';document.getElementById('thOverlap').value=c.thresholds.overlapPct??'';document.getElementById('thBodyHook').value=c.thresholds.bodyHookPct??'';document.getElementById('thGapMax').value=c.thresholds.gapMax??'';
}
function updateSettingsLockUI(){
  const locked=isSettingsLocked();const badge=document.getElementById('settingsLockBadge'),setBtn=document.getElementById('setPinBtn'),lockBtn=document.getElementById('lockNowBtn'),disable=document.getElementById('disableLockBtn');
  if(!badge)return;
  badge.textContent=locked?'Đã bật khóa':'Đang mở';badge.className='lock-badge'+(locked?' on':'');
  setBtn.textContent=locked?'Đổi mã PIN':'Đặt mã PIN';lockBtn.style.display=locked?'inline-block':'none';disable.style.display=locked?'inline-block':'none';
}
function setSettingsPin(){openPinPrompt(isSettingsLocked()?'set':'set')}
function lockSettingsNow(){if(!isSettingsLocked())return;localStorage.removeItem('tinhMiLonSettingsUnlocked');closeSettings();showToast('Đã khóa Cài đặt');}
function disableSettingsLock(){if(!isSettingsLocked())return;localStorage.removeItem('tinhMiLonSettingsPinHash');localStorage.removeItem('tinhMiLonSettingsUnlocked');updateSettingsLockUI();showToast('Đã tắt khóa Cài đặt');}
function openSettings(){
  if(isSettingsLocked()&&localStorage.getItem('tinhMiLonSettingsUnlocked')!=='1'){openPinPrompt('unlock');return}
  fillSettingsForm();updateSettingsLockUI();
  const c=ensureCan(current);
  document.getElementById('settingsOverlay').classList.add('open');
}
function closeSettings(){document.getElementById('settingsOverlay').classList.remove('open')}
function readThreshold(id){
  const v=document.getElementById(id).value.trim();
  if(v==='')return null;
  const n=parseFloat(v);
  return Number.isFinite(n)?n:null;
}
function saveSettings(){
  if(isSettingsLocked()&&localStorage.getItem('tinhMiLonSettingsUnlocked')!=='1'){closeSettings();showToast('Cài đặt đang bị khóa');return}
  const c=ensureCan(current);
  c.limits=c.limits||{};
  for(const f of fields){
    const min=readThreshold('lim'+f+'Min');
    const max=readThreshold('lim'+f+'Max');
    if(min!==null&&max!==null&&min>max){
      showToast(f+' Min không được lớn hơn Max');
      return;
    }
    c.limits[f+'Min']=min;
    c.limits[f+'Max']=max;
  }
  const min=readThreshold('thOverlapMin');
  const max=readThreshold('thOverlapMax');
  if(min!==null&&max!==null&&min>max){
    showToast('Độ chồng mí tối thiểu không được lớn hơn tối đa');
    return;
  }
  c.thresholds.overlapMin=min;
  c.thresholds.overlapMax=max;
  c.thresholds.overlapPct=readThreshold('thOverlap');
  c.thresholds.bodyHookPct=readThreshold('thBodyHook');
  c.thresholds.gapMax=readThreshold('thGapMax');
  persist();
  if(c.lastResult)setResults(c.lastResult);
  closeSettings();
  showToast('Đã lưu thông số Min–Max và tiêu chuẩn');
}

/* ---------- Share ---------- */
function shareResult(){
  const c=canData[current];
  if(!c||!c.lastResult||!c.lastResult.overlap){showToast('Hãy tính kết quả trước khi chia sẻ');return}
  const r=c.lastResult;
  const text=current+'\nĐánh giá: '+(r.qualityStatus||'Chưa thiết lập')+'\nOverlap: '+r.overlap+' (% '+r.overlapPct+')\n% Body Hook: '+r.bodyHookPct+'\nGap: '+r.gap;
  if(navigator.share){
    navigator.share({title:'Kết quả '+current,text}).catch(()=>{});
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(()=>showToast('Đã sao chép kết quả'));
  }else{
    showToast(text);
  }
}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}

document.addEventListener('DOMContentLoaded',()=>{
  ['BH','CH','SL','ST','Tb','Te'].forEach(id=>{
    const el=getInputById(id);
    if(el) el.addEventListener('input',()=>{clearInputWarnings(); inputLimitText(id,num(id));});
  });
});


function calculate(){
  const values={};
  ['BH','CH','SL','ST','Tb','Te'].forEach(id=>{
    const el=getInputById(id);
    values[id]=el?parseFloat(String(el.value).replace(',','.')):NaN;
  });
  // Validate first. If invalid denominator, still let original UI handle its own error,
  // then show a precise warning card.
  calculateOriginal();
  setTimeout(()=>{
    const result=(canData && current && canData[current] && canData[current].lastResult) ? canData[current].lastResult : null;
    renderDataWarning(result,values);
  },0);
}


// ===== BƯỚC 4: QUẢN LÝ LOẠI LON =====
let editingCanKey = null;

function normalizeCanName(name){
  return String(name||'').trim().replace(/\s+/g,' ');
}
function canKeyFromName(name){
  return normalizeCanName(name).toLowerCase().replace(/[^a-z0-9à-ỹ]+/gi,'-').replace(/^-+|-+$/g,'') || ('lon-'+Date.now());
}
function getCanMenu(){
  return document.querySelector('.menu');
}
function getExistingCanButtons(){
  const menu=getCanMenu();
  if(!menu)return [];
  return Array.from(menu.querySelectorAll('.main-btn,.sub-btn')).filter(b=>b.dataset.canKey || b.getAttribute('onclick'));
}
function inferCanKey(btn){
  if(btn.dataset.canKey)return btn.dataset.canKey;
  const oc=btn.getAttribute('onclick')||'';
  const m=oc.match(/openCalc(?:ulator)?\(['"]([^'"]+)['"]\)/);
  return m?m[1]:null;
}
function ensureCustomCans(){
  try{
    const raw=JSON.parse(localStorage.getItem('tinhMiLonCanTypes')||'[]');
    if(Array.isArray(raw)){
      raw.forEach(item=>{
        if(item&&item.key&&item.name&&!document.querySelector(`.main-btn[data-can-key="${CSS.escape(item.key)}"]`)){
          addCanButton(item.key,item.name,false);
        }
      });
    }
  }catch(e){}
}
function saveCustomCans(){
  const builtins=[];
  const customs=[];
  getExistingCanButtons().forEach(btn=>{
    const key=inferCanKey(btn);
    if(!key)return;
    if(btn.dataset.custom==='1')customs.push({key,name:btn.dataset.canName||btn.textContent.trim()});
  });
  localStorage.setItem('tinhMiLonCanTypes',JSON.stringify(customs));
}
function addCanButton(key,name,custom=true){
  const menu=getCanMenu();
  if(!menu)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='main-btn';
  btn.dataset.canKey=key;
  btn.dataset.canName=name;
  if(custom)btn.dataset.custom='1';
  btn.textContent=name;
  btn.addEventListener('click',()=>openCalc(key));
  menu.appendChild(btn);
  ensureCan(key);
  canData[key].displayName=name;
}
function renameCanButton(key,name){
  const btn=document.querySelector(`.main-btn[data-can-key="${CSS.escape(key)}"]`) ||
    getExistingCanButtons().find(b=>inferCanKey(b)===key);
  if(btn){
    btn.dataset.canName=name;
    btn.textContent=name;
  }
}
function removeCanButton(key){
  const btn=document.querySelector(`.main-btn[data-can-key="${CSS.escape(key)}"]`) ||
    getExistingCanButtons().find(b=>inferCanKey(b)===key);
  if(btn)btn.remove();
}
function listCanTypes(){
  return getExistingCanButtons().map(btn=>({
    key:inferCanKey(btn),
    name:btn.dataset.canName || btn.textContent.trim(),
    custom:btn.dataset.custom==='1'
  })).filter(x=>x.key);
}
function openCanManager(){
  renderCanManager();
  const o=document.getElementById('canManagerOverlay');
  o.classList.add('open');
}
function closeCanManager(){document.getElementById('canManagerOverlay').classList.remove('open')}
function renderCanManager(){
  const list=document.getElementById('canManageList');
  if(!list)return;
  const types=listCanTypes();
  list.innerHTML='';
  types.forEach(t=>{
    const data=canData[t.key]||{};
    const hist=(data.history||[]).length;
    const item=document.createElement('div');
    item.className='can-manage-item';
    const note=String(data.note||'').trim();
    item.innerHTML=`<div style="font-size:22px">🥫</div>
      <div class="can-manage-name"><div>${escapeHtml(t.name)}</div><div class="can-manage-meta">${hist} lần đo đã lưu${t.custom?' · Loại lon tự thêm':' · Loại lon có sẵn'}</div>${note?`<div class="can-note">${escapeHtml(note)}</div>`:''}</div>
      <div class="can-manage-actions"><button class="can-mini-btn" onclick="openEditCan('${jsEscape(t.key)}')">Sửa</button>
      <button class="can-mini-btn copy" onclick="duplicateCanType('${jsEscape(t.key)}')">Nhân bản</button>
      ${t.custom?`<button class="can-mini-btn delete" onclick="deleteCanType('${jsEscape(t.key)}')">Xóa</button>`:''}</div>`;
    list.appendChild(item);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function jsEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function openAddCan(){
  editingCanKey=null;
  document.getElementById('addCanTitle').textContent='Thêm loại lon';
  document.getElementById('saveCanBtn').textContent='LƯU LOẠI LON';
  document.getElementById('canNameInput').value='';
  document.getElementById('canNoteInput').value='';
  document.getElementById('addCanOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('canNameInput').focus(),150);
}
function openEditCan(key){
  const t=listCanTypes().find(x=>x.key===key);
  if(!t)return;
  editingCanKey=key;
  document.getElementById('addCanTitle').textContent='Đổi tên loại lon';
  document.getElementById('saveCanBtn').textContent='LƯU THAY ĐỔI';
  document.getElementById('canNameInput').value=t.name;
  document.getElementById('canNoteInput').value=(canData[key]&&canData[key].note)||'';
  document.getElementById('addCanOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('canNameInput').select(),150);
}
function closeAddCan(){document.getElementById('addCanOverlay').classList.remove('open')}
function saveCanType(){
  const input=document.getElementById('canNameInput');
  const name=normalizeCanName(input.value);
  const note=String(document.getElementById('canNoteInput').value||'').trim();
  if(!name){showToast('Hãy nhập tên loại lon');input.focus();return;}
  const types=listCanTypes();
  const duplicate=types.find(t=>normalizeCanName(t.name).toLowerCase()===name.toLowerCase() && t.key!==editingCanKey);
  if(duplicate){showToast('Tên loại lon này đã tồn tại');return;}
  if(editingCanKey){
    renameCanButton(editingCanKey,name);
    if(canData[editingCanKey]){canData[editingCanKey].displayName=name;canData[editingCanKey].note=note;}
    showToast('Đã đổi tên và cập nhật ghi chú');
  }else{
    let key=canKeyFromName(name);
    let n=2, base=key;
    while(types.some(t=>t.key===key)||canData[key])key=base+'-'+n++;
    canData[key]={displayName:name,note,inputs:{},thresholds:{},limits:{},history:[]};
    addCanButton(key,name,true);
    showToast('Đã thêm '+name);
  }
  if(typeof persist==='function')persist();
  saveCustomCans();
  closeAddCan();
  renderCanManager();
}
function duplicateCanType(key){
  const t=listCanTypes().find(x=>x.key===key);
  if(!t)return;
  const src=ensureCan(key);
  let base=normalizeCanName(t.name)+' - Bản sao';
  let name=base, n=2;
  while(listCanTypes().some(x=>normalizeCanName(x.name).toLowerCase()===name.toLowerCase())) name=base+' '+n++;
  let newKey=canKeyFromName(name), k=2, keyBase=newKey;
  while(canData[newKey]||listCanTypes().some(x=>x.key===newKey)) newKey=keyBase+'-'+k++;
  canData[newKey]=JSON.parse(JSON.stringify({displayName:name,note:src.note||'',inputs:src.inputs||{},thresholds:src.thresholds||{},limits:src.limits||{},history:[]}));
  canData[newKey].displayName=name;
  canData[newKey].history=[];
  addCanButton(newKey,name,true);
  persist();
  saveCustomCans();
  renderCanManager();
  showToast('Đã nhân bản '+t.name);
}
function deleteCanType(key){
  const t=listCanTypes().find(x=>x.key===key);
  if(!t)return;
  if(!confirm(`Xóa "${t.name}"?\nDữ liệu, lịch sử và tiêu chuẩn của loại lon này sẽ bị xóa.`))return;
  if(current===key){
    const calc=document.querySelector('.calculator');
    const menu=getCanMenu();
    if(calc)calc.style.display='none';
    if(menu)menu.style.display='';
    current=null;
  }
  delete canData[key];
  removeCanButton(key);
  if(typeof persist==='function')persist();
  saveCustomCans();
  renderCanManager();
  showToast('Đã xóa '+t.name);
}
// Khôi phục các loại lon tự thêm sau khi tải trang.
document.addEventListener('DOMContentLoaded',()=>{
  ensureCustomCans();
  renderCanManager();
});

// Bảo đảm mọi loại lon tự thêm đều có thể mở màn hình tính toán.
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.main-btn[data-can-key],.sub-btn[data-can-key]').forEach(btn=>{
    if(!btn.dataset.calcBound){
      btn.dataset.calcBound='1';
      btn.addEventListener('click',()=>openCalc(btn.dataset.canKey));
    }
  });
});


// ===== BƯỚC 5: XUẤT BÁO CÁO =====
function reportDisplayName(){
  const t=(typeof listCanTypes==='function'?listCanTypes():[]).find(x=>x.key===current);
  return (t&&t.name) || current || 'Loại lon';
}
function csvEscape(v){
  const s=String(v==null?'':v);
  return '"'+s.replace(/"/g,'""')+'"';
}
function makeFilename(prefix, ext){
  const d=new Date();
  const stamp=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0');
  return `${prefix}-${reportDisplayName().replace(/[^\wÀ-ỹ-]+/g,'-')}-${stamp}.${ext}`;
}
function getLatestReport(){
  const c=(canData&&current)?(canData[current]||{}):{};
  const r=c.lastResult||null;
  const v=c.values||{};
  return {values:v,result:r,status:(r&&r.status)||'',time:(r&&r.time)||new Date().toISOString()};
}
function openExport(){
  const o=document.getElementById('exportOverlay');
  const p=document.getElementById('reportPreview');
  const data=getLatestReport();
  if(!current){showToast('Hãy chọn loại lon trước');return;}
  if(p){
    if(!data.result){
      p.innerHTML='<div class="rp-title">Chưa có kết quả</div><h4>Hãy nhập số liệu và tính kết quả trước khi xuất báo cáo.</h4>';
    }else{
      p.innerHTML=buildReportHTML(data,false);
    }
  }
  o.classList.add('open');
}
function closeExport(){document.getElementById('exportOverlay').classList.remove('open')}
function nfmt(v){
  const n=Number(v);
  return Number.isFinite(n)?n.toFixed(3).replace(/\.?0+$/,''):'—';
}
function resultValue(r, keys){
  for(const k of keys) if(r&&Number.isFinite(Number(r[k]))) return Number(r[k]);
  return null;
}
function buildReportHTML(data, printable){
  const v=data.values||{}, r=data.result||{};
  const overlap=resultValue(r,['overlap','Overlap','doChongMi']);
  const overlapPct=resultValue(r,['overlapPercent','percentOverlap','overlapPct']);
  const bodyPct=resultValue(r,['bodyHookPercent','percentBodyHook','bodyPct']);
  const free=resultValue(r,['freeSpace','gap','FreeSpace']);
  const status=data.status || r.status || '—';
  const statusText=status==='pass'||status==='ĐẠT'?'ĐẠT':status==='fail'||status==='KHÔNG ĐẠT'?'KHÔNG ĐẠT':status==='unconfigured'||status==='CHƯA THIẾT LẬP'?'CHƯA THIẾT LẬP':status;
  const rows=[
    ['BH – Móc thân',nfmt(v.BH),'mm'],['CH – Móc nắp',nfmt(v.CH),'mm'],['SL – Chiều dài mí',nfmt(v.SL),'mm'],
    ['ST – Độ dày mí',nfmt(v.ST),'mm'],['Tb – Độ dày thân lon',nfmt(v.Tb),'mm'],['Te – Độ dày nắp lon',nfmt(v.Te),'mm'],
    ['Độ chồng mí',nfmt(overlap),'mm'],['% Độ chồng mí',nfmt(overlapPct),'%'],['% Móc thân',nfmt(bodyPct),'%'],['Khoảng trống',nfmt(free),'mm']
  ];
  return `<div class="rp-title">Báo cáo kiểm tra mí lon</div>
    <h4>${escapeHtml(reportDisplayName())}</h4>
    <div>Thời gian: ${new Date(data.time||Date.now()).toLocaleString('vi-VN')}</div>
    <div class="rp-status">Kết quả: ${escapeHtml(statusText)}</div>
    <table>${rows.map(x=>`<tr><td>${x[0]}</td><td>${x[1]} ${x[2]}</td></tr>`).join('')}</table>`;
}
function downloadCSV(text, filename){
  const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportCurrentCSV(){
  const d=getLatestReport();
  if(!d.result){showToast('Chưa có kết quả để xuất');return;}
  const v=d.values||{}, r=d.result||{};
  const rows=[
    ['BÁO CÁO KIỂM TRA MÍ LON',''],
    ['Loại lon',reportDisplayName()],
    ['Thời gian',new Date(d.time||Date.now()).toLocaleString('vi-VN')],
    ['Trạng thái',d.status||r.status||''],
    ['BH',v.BH],['CH',v.CH],['SL',v.SL],['ST',v.ST],['Tb',v.Tb],['Te',v.Te],
    ['Độ chồng mí',resultValue(r,['overlap','Overlap','doChongMi'])],
    ['% Độ chồng mí',resultValue(r,['overlapPercent','percentOverlap','overlapPct'])],
    ['% Móc thân',resultValue(r,['bodyHookPercent','percentBodyHook','bodyPct'])],
    ['Khoảng trống',resultValue(r,['freeSpace','gap','FreeSpace'])]
  ];
  downloadCSV(rows.map(row=>row.map(csvEscape).join(',')).join('\n'),makeFilename('bao-cao-mi-lon','csv'));
  showToast('Đã xuất báo cáo CSV');
}
function exportHistoryCSV(){
  if(!current){showToast('Hãy chọn loại lon trước');return;}
  const hist=((canData[current]||{}).history||[]);
  if(!hist.length){showToast('Chưa có lịch sử để xuất');return;}
  const header=['Thời gian','Loại lon','BH','CH','SL','ST','Tb','Te','Độ chồng mí','% Độ chồng mí','% Móc thân','Khoảng trống','Trạng thái'];
  const rows=[header];
  hist.forEach(h=>{
    const v=h.values||h.input||{}, r=h.result||h;
    rows.push([
      new Date(h.time||h.timestamp||Date.now()).toLocaleString('vi-VN'),reportDisplayName(),
      v.BH,v.CH,v.SL,v.ST,v.Tb,v.Te,
      resultValue(r,['overlap','Overlap','doChongMi']),
      resultValue(r,['overlapPercent','percentOverlap','overlapPct']),
      resultValue(r,['bodyHookPercent','percentBodyHook','bodyPct']),
      resultValue(r,['freeSpace','gap','FreeSpace']),
      h.status||(r&&r.status)||''
    ]);
  });
  downloadCSV(rows.map(row=>row.map(csvEscape).join(',')).join('\n'),makeFilename('lich-su-mi-lon','csv'));
  showToast('Đã xuất lịch sử CSV');
}
function printCurrentReport(){
  const d=getLatestReport();
  if(!d.result){showToast('Chưa có kết quả để tạo báo cáo');return;}
  const pr=document.getElementById('printReport');
  pr.innerHTML='<h2 style="margin:0 0 8px">BÁO CÁO KIỂM TRA MÍ LON</h2>'+buildReportHTML(d,true)+
    '<p style="margin-top:18px;font-size:11px;color:#555">Ứng dụng Tính Mí Lon</p>';
  window.print();
}


// ===== BƯỚC 6: PWA OFFLINE + CẬP NHẬT =====
let pendingServiceWorker = null;

function showSavedIndicator(){
  const el=document.getElementById('saveIndicator');
  if(!el)return;
  el.classList.add('show');
  clearTimeout(window.__saveIndicatorTimer);
  window.__saveIndicatorTimer=setTimeout(()=>el.classList.remove('show'),1400);
}
function updateNetworkStatus(){
  const pill=document.getElementById('networkPill');
  const text=document.getElementById('networkText');
  if(!pill||!text)return;
  if(navigator.onLine){
    pill.classList.remove('show');
  }else{
    text.textContent='Bạn đang ngoại tuyến. Dữ liệu và các chức năng đã tải vẫn dùng được.';
    pill.classList.add('show');
  }
}
function showUpdateCard(){
  const card=document.getElementById('updateCard');
  if(card)card.classList.add('show');
}
function applyAppUpdate(){
  if(pendingServiceWorker){
    pendingServiceWorker.postMessage({type:'SKIP_WAITING'});
    showToast('Đang cập nhật ứng dụng…');
  }else{
    location.reload();
  }
}
async function registerPWA(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    if(reg.waiting){
      pendingServiceWorker=reg.waiting;
      showUpdateCard();
    }
    reg.addEventListener('updatefound',()=>{
      const installing=reg.installing;
      if(!installing)return;
      installing.addEventListener('statechange',()=>{
        if(installing.state==='installed' && navigator.serviceWorker.controller){
          pendingServiceWorker=reg.waiting;
          showUpdateCard();
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(window.__reloadingAfterUpdate)return;
      window.__reloadingAfterUpdate=true;
      location.reload();
    });
  }catch(e){
    console.warn('Không thể đăng ký Service Worker',e);
  }
}
window.addEventListener('online',()=>{updateNetworkStatus();showToast('Đã kết nối Internet');});
window.addEventListener('offline',()=>{updateNetworkStatus();showToast('Bạn đang dùng chế độ ngoại tuyến');});

// Autosave dữ liệu đang nhập để tránh mất khi đóng ứng dụng.
function setupAutosave(){
  ['BH','CH','SL','ST','Tb','Te'].forEach(id=>{
    const el=(typeof getInputById==='function'?getInputById(id):document.getElementById(id));
    if(!el)return;
    el.addEventListener('input',()=>{
      if(!current || !canData || !canData[current])return;
      canData[current].values=canData[current].values||{};
      canData[current].values[id]=el.value;
      try{
        if(typeof persist==='function')persist();
        showSavedIndicator();
      }catch(e){}
    });
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  updateNetworkStatus();
  initAppearance();
  setupAutosave();
  registerPWA();
});



// Mobile keyboard polish for iOS Safari and Android Chrome.
(function(){
  const ids=['BH','CH','SL','ST','Tb','Te'];
  ids.forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const next=document.getElementById(ids[i+1]);
        if(next){ next.focus(); next.select?.(); }
        else { document.getElementById('calcBtn')?.click(); }
      }
    });
  });
  // Keep bottom sheets above the on-screen keyboard on modern mobile browsers.
  if(window.visualViewport){
    const sync=()=>document.documentElement.style.setProperty('--vvh',window.visualViewport.height+'px');
    window.visualViewport.addEventListener('resize',sync,{passive:true});
    sync();
  }
})();


// Mobile keyboard polish for iOS Safari and Android Chrome.
(function(){
  const ids=['BH','CH','SL','ST','Tb','Te'];
  ids.forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        const next=document.getElementById(ids[i+1]);
        if(next){ next.focus(); next.select?.(); }
        else { document.getElementById('calcBtn')?.click(); }
      }
    });
  });
  // Keep bottom sheets above the on-screen keyboard on modern mobile browsers.
  if(window.visualViewport){
    const sync=()=>document.documentElement.style.setProperty('--vvh',window.visualViewport.height+'px');
    window.visualViewport.addEventListener('resize',sync,{passive:true});
    sync();
  }
})();

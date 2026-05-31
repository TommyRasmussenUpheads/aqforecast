var WMO = {
  0:{e:'sunny',l:'Klarvær'}, 1:{e:'sunny',l:'Mest klart'}, 2:{e:'partly',l:'Delvis skyet'},
  3:{e:'cloudy',l:'Overskyet'}, 45:{e:'cloudy',l:'Tåke'}, 48:{e:'cloudy',l:'Rimtåke'},
  51:{e:'rain',l:'Lett yr'}, 53:{e:'rain',l:'Yr'}, 55:{e:'rain',l:'Tett yr'},
  61:{e:'rain',l:'Lett regn'}, 63:{e:'rain',l:'Regn'}, 65:{e:'rain',l:'Kraftig regn'},
  71:{e:'snow',l:'Lett snø'}, 73:{e:'snow',l:'Snø'}, 75:{e:'snow',l:'Kraftig snø'},
  80:{e:'rain',l:'Regnbyger'}, 81:{e:'rain',l:'Regnbyger'}, 82:{e:'rain',l:'Kraftige byger'},
  85:{e:'snow',l:'Snøbyger'}, 95:{e:'storm',l:'Tordenvær'}, 99:{e:'storm',l:'Tordenvær'}
};
function wmo(c){ return WMO[c] || {e:'cloudy',l:'Ukjent'}; }
function weatherIcon(type, size) {
  size = size || 18;
  var s = 'font-size:'+size+'px;';
  if (type === 'sunny')  return '<i class="ti ti-sun" style="'+s+'color:#e8a020" aria-hidden="true"></i>';
  if (type === 'partly') return '<i class="ti ti-cloud-sun" style="'+s+'color:#aab0c0" aria-hidden="true"></i>';
  if (type === 'rain')   return '<i class="ti ti-cloud-rain" style="'+s+'color:#4299e1" aria-hidden="true"></i>';
  if (type === 'snow')   return '<i class="ti ti-snowflake" style="'+s+'color:#76b7fa" aria-hidden="true"></i>';
  if (type === 'storm')  return '<i class="ti ti-bolt" style="'+s+'color:#d69e2e" aria-hidden="true"></i>';
  return '<i class="ti ti-cloud" style="'+s+'color:#aab0c0" aria-hidden="true"></i>';
}
function windDir(d){
  var a=['N','NNØ','NØ','ØNØ','Ø','ØSØ','SØ','SSØ','S','SSV','SV','VSV','V','VNV','NV','NNV'];
  return a[Math.round(d/22.5)%16];
}
function fmtDay(s){
  var d=new Date(s),t=new Date(),tm=new Date();
  tm.setDate(t.getDate()+1);
  if(d.toDateString()===t.toDateString()) return 'I dag';
  if(d.toDateString()===tm.toDateString()) return 'I morgen';
  return d.toLocaleDateString('nb-NO',{weekday:'long',day:'numeric',month:'long'});
}
function groupDays(ts){
  var d={};
  for(var i=0;i<ts.length;i++){
    var k=ts[i].time.slice(0,10);
    if(!d[k]) d[k]=[];
    d[k].push(ts[i]);
  }
  return d;
}
function summarize(entries){
  var temps=[],winds=[],wdirs=[],rain=[],codes=[];
  for(var i=0;i<entries.length;i++){
    var e=entries[i];
    if(e.data.instant.details.air_temperature!=null) temps.push(e.data.instant.details.air_temperature);
    if(e.data.instant.details.wind_speed!=null) winds.push(e.data.instant.details.wind_speed);
    if(e.data.instant.details.wind_from_direction!=null) wdirs.push(e.data.instant.details.wind_from_direction);
    var n1=e.data.next_1_hours, n6=e.data.next_6_hours;
    rain.push((n1&&n1.details.precipitation_amount)||0);
    var c=(n1&&n1.summary.symbol_code)||(n6&&n6.summary.symbol_code);
    if(c) codes.push(c);
  }
  var mid=codes[Math.floor(codes.length/2)]||'0';
  return {
    min:temps.length?Math.round(Math.min.apply(null,temps)):null,
    max:temps.length?Math.round(Math.max.apply(null,temps)):null,
    avgWind:winds.length?Math.round(winds.reduce(function(a,b){return a+b;},0)/winds.length):null,
    windDir:wdirs.length?Math.round(wdirs.reduce(function(a,b){return a+b;},0)/wdirs.length):0,
    rain:Math.round(rain.reduce(function(a,b){return a+b;},0)*10)/10,
    code:parseInt(mid.split('_')[0]),
    hours:entries.slice(0,24)
  };
}
function hourRow(e){
  var h=e.time.slice(11,16);
  var t=e.data.instant.details.air_temperature;
  var n1=e.data.next_1_hours;
  var rain=(n1&&n1.details.precipitation_amount)||0;
  var cs=(n1&&n1.summary.symbol_code)||(e.data.next_6_hours&&e.data.next_6_hours.summary.symbol_code)||'0';
  var w=wmo(parseInt(cs.split('_')[0]));
  var rainHtml=rain>0?'<span style="text-align:right;color:#4299e1;font-size:.72rem">'+rain.toFixed(1)+' mm</span>':'<span></span>';
  return '<div style="display:grid;grid-template-columns:44px 22px 1fr 52px 60px;align-items:center;gap:8px;padding:5px 1.25rem;border-bottom:0.5px solid var(--color-border-tertiary);font-size:.75rem">'+
    '<span style="color:var(--color-text-secondary);font-variant-numeric:tabular-nums">'+h+'</span>'+
    '<span>'+weatherIcon(w.e,15)+'</span>'+
    '<span style="color:var(--color-text-secondary);font-size:.72rem">'+w.l+'</span>'+
    '<span style="text-align:right;font-weight:500">'+(t!=null?Math.round(t)+'°':'–')+'</span>'+
    rainHtml+'</div>';
}
function toggle(id){
  var el=document.getElementById(id),tgl=document.getElementById('tgl'+id);
  var open=el.classList.contains('open');
  el.classList.toggle('open',!open);
  if(tgl) tgl.classList.toggle('open',!open);
}
function makeForecastCard(date,s,idx){
  var w=wmo(s.code),did='day'+idx;
  return '<div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden">'+
    '<div style="padding:1rem 1.25rem;cursor:pointer;user-select:none" onclick="toggle(\''+did+'\')">'+
      '<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="flex:1">'+
          '<div style="font-size:1rem;font-weight:500;text-transform:capitalize">'+fmtDay(date)+'</div>'+
          '<div style="font-size:.75rem;color:var(--color-text-secondary);margin-top:2px">'+date+'</div>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:16px">'+
          '<div style="text-align:center">'+weatherIcon(w.e,28)+'<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:3px;white-space:nowrap">'+w.l+'</div></div>'+
          '<div style="text-align:center;min-width:48px">'+
            '<div style="font-size:1.4rem;font-weight:500">'+(s.max!=null?s.max+'°':'–')+'</div>'+
            '<div style="font-size:.85rem;color:var(--color-text-secondary)">'+(s.min!=null?s.min+'°':'–')+'</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;gap:16px;margin-top:.75rem;padding-top:.75rem;border-top:0.5px solid var(--color-border-tertiary);font-size:.8rem;color:var(--color-text-secondary);flex-wrap:wrap">'+
        '<span style="display:flex;align-items:center;gap:4px"><i class="ti ti-wind" style="font-size:14px" aria-hidden="true"></i>'+(s.avgWind!=null?s.avgWind+' m/s':'')+' '+windDir(s.windDir)+'</span>'+
        '<span style="display:flex;align-items:center;gap:4px"><i class="ti ti-droplet" style="font-size:14px" aria-hidden="true"></i>'+(s.rain>0?s.rain+' mm':'Ingen nedbør')+'</span>'+
        '<span style="margin-left:auto;display:flex;align-items:center;gap:3px;cursor:pointer" id="tgl'+did+'">'+
          '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Timervis'+
        '</span>'+
      '</div>'+
    '</div>'+
    '<div id="'+did+'" style="display:none;border-top:0.5px solid var(--color-border-tertiary)">'+
      '<div style="display:grid;grid-template-columns:44px 22px 1fr 52px 60px;gap:8px;padding:5px 1.25rem 4px;font-size:.65rem;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-tertiary);border-bottom:0.5px solid var(--color-border-tertiary)">'+
        '<span>Time</span><span></span><span>Vær</span><span style="text-align:right">Temp</span><span style="text-align:right">Nedbør</span>'+
      '</div>'+
      s.hours.map(hourRow).join('')+
    '</div>'+
  '</div>';
}

// ─── Tab switching ───────────────────────────────────────────────────────────
var currentTab = 'forecast';
function switchTab(name){
  currentTab = name;
  ['forecast','history','calendar'].forEach(function(t){
    var panel = document.getElementById('tab-'+t);
    var btn = document.getElementById('tab-btn-'+t);
    if(panel) panel.style.display = t===name?'block':'none';
    if(btn) btn.classList.toggle('active', t===name);
  });
}

// ─── Forecast tab ────────────────────────────────────────────────────────────
async function loadForecast(){
  var root=document.getElementById('forecast-root');
  try{
    var res=await fetch('/forecast');
    if(!res.ok) throw new Error('HTTP '+res.status);
    var data=await res.json();
    var today=new Date().toISOString().slice(0,10);
    var days=groupDays(data.properties.timeseries);
    var next2=Object.keys(days).filter(function(d){return d>=today;}).slice(0,2);
    root.innerHTML='<div style="display:flex;flex-direction:column;gap:12px">'+next2.map(function(d,i){return makeForecastCard(d,summarize(days[d]),i);}).join('')+'</div>';
    if(data.properties.meta&&data.properties.meta.updated_at){
      var ts=new Date(data.properties.meta.updated_at);
      document.getElementById('updated').textContent='Oppdatert '+ts.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'});
    }
  }catch(e){
    root.innerHTML='<div style="padding:1rem;background:var(--color-background-danger);border-radius:var(--border-radius-md);color:var(--color-text-danger);font-size:.9rem">Kunne ikke hente prognose: '+e.message+'</div>';
  }
}

// ─── Classifications ────────────────────────────────────────────────────────
var classifications = {};
async function loadClassifications(){
  try{
    var res=await fetch('/classifications');
    var list=await res.json();
    for(var i=0;i<list.length;i++) classifications[list[i].id]=list[i];
  }catch(e){ console.warn('Klarte ikke laste klassifiseringer', e); }
}

// ─── History tab ─────────────────────────────────────────────────────────────
async function fetchHistory(){
  var dateInput=document.getElementById('hist-date');
  var btn=document.getElementById('hist-btn');
  var root=document.getElementById('history-root');
  var date=dateInput.value;
  if(!date){ root.innerHTML='<div style="color:var(--color-text-danger);font-size:.9rem">Velg en dato først.</div>'; return; }
  btn.disabled=true; btn.textContent='Henter...';
  root.innerHTML='<div style="text-align:center;padding:2rem 0;color:var(--color-text-secondary)"><div class="spinner"></div>Henter data...</div>';
  try{
    var res=await fetch('/historical?date='+date);
    if(!res.ok) throw new Error('HTTP '+res.status);
    var d=await res.json();
    if(d.error) throw new Error(d.error);
    root.innerHTML = renderHistCard(d);
  }catch(e){
    root.innerHTML='<div style="padding:1rem;background:var(--color-background-danger);border-radius:var(--border-radius-md);color:var(--color-text-danger);font-size:.9rem">Feil: '+e.message+'</div>';
  }finally{ btn.disabled=false; btn.textContent='Vis'; }
}

function renderHistCard(d) {
  var cls=classifications[d.classification_id]||{label:'Ukjent',icon:'cloudy',description:''};
  var iconType = cls.icon && cls.icon.length < 10 ? cls.icon : 'cloudy';
  var dateStr=new Date(d.date+'T12:00:00').toLocaleDateString('nb-NO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return '<div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:1.25rem">'+
    '<div style="font-size:1rem;font-weight:500;margin-bottom:1rem;display:flex;align-items:center;gap:8px">'+
      weatherIcon(iconType, 22)+' <span>'+dateStr+'</span>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
      histStat('Maks temperatur', parseFloat(d.temp_max).toFixed(1), '°C')+
      histStat('Min temperatur',  parseFloat(d.temp_min).toFixed(1), '°C')+
      histStat('Nedbør totalt',   parseFloat(d.precip_sum).toFixed(1), 'mm')+
      histStat('Timer med nedbør',d.precip_hours, 't')+
      histStat('Maks vind',       parseFloat(d.wind_speed_max).toFixed(1), 'm/s')+
      histStat('Snitt vind',      parseFloat(d.wind_speed_mean).toFixed(1), 'm/s')+
    '</div>'+
    '<div style="margin-top:1rem;padding:.75rem 1rem;background:var(--color-background-success);border:0.5px solid var(--color-border-success);border-radius:var(--border-radius-md);font-size:.9rem;color:var(--color-text-success);display:flex;align-items:center;gap:8px">'+
      weatherIcon(iconType,18)+' <strong>'+cls.label+'</strong>'+(cls.description?' — '+cls.description:'')+
    '</div>'+
  '</div>';
}

function histStat(label, value, unit) {
  return '<div style="background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:.75rem 1rem">'+
    '<div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-secondary);margin-bottom:3px">'+label+'</div>'+
    '<div style="font-size:1.2rem;font-weight:500">'+value+'<span style="font-size:.75rem;color:var(--color-text-secondary)"> '+unit+'</span></div>'+
  '</div>';
}

// ─── Calendar tab ─────────────────────────────────────────────────────────────
var calYear  = new Date().getFullYear();
var calMonth = new Date().getMonth();
var calCache = {};
var calSelected = null;

var MONTHS = ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];
var DAYS   = ['Man','Tir','Ons','Tor','Fre','Lør','Søn'];

function calPrev(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function calNext(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }

function renderCalendar(){
  var grid = document.getElementById('cal-grid');
  var title = document.getElementById('cal-title');
  if(!grid||!title) return;
  title.textContent = MONTHS[calMonth] + ' ' + calYear;

  var today = new Date().toISOString().slice(0,10);
  var firstDay = new Date(calYear, calMonth, 1);
  var lastDay  = new Date(calYear, calMonth+1, 0);
  var startDow = (firstDay.getDay()+6)%7; // Mon=0
  var html = '';

  // Day headers
  for(var d=0;d<7;d++){
    html += '<div style="text-align:center;font-size:.72rem;font-weight:500;color:var(--color-text-secondary);padding-bottom:6px">'+DAYS[d]+'</div>';
  }

  // Empty cells before first day
  for(var e=0;e<startDow;e++) html += '<div></div>';

  // Day cells
  for(var day=1;day<=lastDay.getDate();day++){
    var mm = String(calMonth+1).padStart(2,'0');
    var dd = String(day).padStart(2,'0');
    var dateStr = calYear+'-'+mm+'-'+dd;
    var isToday = dateStr===today;
    var isFuture = dateStr > today;
    var isSelected = dateStr === calSelected;
    var cached = calCache[dateStr];

    var cellStyle = 'border-radius:var(--border-radius-md);padding:4px 2px;text-align:center;cursor:'+(isFuture?'default':'pointer')+';min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;position:relative;';
    if(isSelected) cellStyle += 'background:var(--color-background-info);border:1.5px solid var(--color-border-info);';
    else if(isToday) cellStyle += 'background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);';
    else if(isFuture) cellStyle += 'opacity:0.35;';
    else cellStyle += 'border:0.5px solid transparent;';

    var dayNum = '<span style="font-size:.8rem;font-weight:'+(isToday?'500':'400')+';color:var(--color-text-primary);line-height:1.2">'+day+'</span>';
    var icon = '';
    var temp = '';

    if(cached && !isFuture){
      var cls = classifications[cached.classification_id] || {icon:'cloudy'};
      var iconType = cls.icon && cls.icon.length < 10 ? cls.icon : 'cloudy';
      icon = weatherIcon(iconType, 16);
      if(cached.temp_max != null){
        temp = '<span style="font-size:.72rem;color:var(--color-text-secondary)">'+parseFloat(cached.temp_max).toFixed(0)+'°</span>';
      }
    } else if(!isFuture && !cached) {
      icon = '<span style="font-size:.65rem;color:var(--color-text-secondary)">...</span>';
    }

    var onclick = isFuture ? '' : 'onclick="calSelect(\''+dateStr+'\')"';
    html += '<div style="'+cellStyle+'" '+onclick+'>'+dayNum+icon+temp+'</div>';
  }

  grid.innerHTML = html;

  // Load month data in background
  loadMonthData(calYear, calMonth);
}

async function loadMonthData(year, month){
  var mm = String(month+1).padStart(2,'0');
  var today = new Date().toISOString().slice(0,10);
  var lastDay = new Date(year, month+1, 0).getDate();
  var toFetch = [];

  for(var d=1;d<=lastDay;d++){
    var dd = String(d).padStart(2,'0');
    var dateStr = year+'-'+mm+'-'+dd;
    if(dateStr < today && !calCache[dateStr]) toFetch.push(dateStr);
  }

  // Fetch up to 31 dates in parallel (batched 5 at a time)
  for(var i=0;i<toFetch.length;i+=5){
    var batch = toFetch.slice(i, i+5);
    await Promise.all(batch.map(async function(date){
      try{
        var res = await fetch('/historical?date='+date);
        if(res.ok){ calCache[date] = await res.json(); }
      }catch(err){}
    }));
    renderCalendar();
  }
}

async function calSelect(date){
  calSelected = date;
  renderCalendar();
  var detail = document.getElementById('cal-detail');
  detail.innerHTML = '<div style="text-align:center;padding:1.5rem 0;color:var(--color-text-secondary)"><div class="spinner"></div>Henter...</div>';
  try{
    var res = await fetch('/historical?date='+date);
    if(!res.ok) throw new Error('HTTP '+res.status);
    var d = await res.json();
    if(d.error) throw new Error(d.error);
    calCache[date] = d;
    renderCalendar();
    detail.innerHTML = renderHistCard(d);
  }catch(e){
    detail.innerHTML = '<div style="padding:.75rem 1rem;background:var(--color-background-danger);border-radius:var(--border-radius-md);color:var(--color-text-danger);font-size:.9rem">Feil: '+e.message+'</div>';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
var yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
document.getElementById('hist-date').max = yesterday;
document.getElementById('hist-date').value = yesterday;

loadClassifications();
loadForecast();
renderCalendar();

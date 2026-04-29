// Family Hub - Complete Edition with ErrorBoundary and all crash fixes
import React, { useState, useEffect, useRef, useCallback } from "react";

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  componentDidCatch(e,i){console.error("FamilyHub crashed:",e,i);}
  render(){
    if(this.state.hasError){
      return(
        <div style={{padding:32,textAlign:"center",fontFamily:"sans-serif"}}>
          <div style={{fontSize:48,marginBottom:12}}>🏠</div>
          <h2 style={{color:"#FF6B35",marginBottom:8}}>Family Hub</h2>
          <p style={{color:"#666",marginBottom:16}}>Something went wrong. Tap below to reload.</p>
          <pre style={{background:"#f5f5f5",padding:12,borderRadius:8,fontSize:11,textAlign:"left",overflow:"auto",maxHeight:160,marginBottom:16}}>
            {this.state.error&&this.state.error.toString()}
          </pre>
          <button onClick={()=>window.location.reload()}
            style={{padding:"12px 28px",background:"#FF6B35",color:"white",border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:"pointer"}}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const firebaseConfig = {
  apiKey:"AIzaSyAntr9mGdG-2Mw30w6yhmWjZoJWbN1GNVE",
  authDomain:"family-hub-e9ef9.firebaseapp.com",
  databaseURL:"https://family-hub-e9ef9-default-rtdb.firebaseio.com",
  projectId:"family-hub-e9ef9",
  storageBucket:"family-hub-e9ef9.firebasestorage.app",
  messagingSenderId:"328052012200",
  appId:"1:328052012200:web:7b57ddd06174970d8d3e9d",
};

let DB=null,FS={};
async function loadFirebase(){
  try{
    const{initializeApp,getApps}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const fs=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
    DB=fs.getFirestore(app);FS=fs;return true;
  }catch(e){console.warn("Firebase unavailable:",e.message);return false;}
}
async function fsSet(c,i,d){if(!DB)return;try{await FS.setDoc(FS.doc(DB,c,i),d);}catch(e){}}
async function fsDel(c,i){if(!DB)return;try{await FS.deleteDoc(FS.doc(DB,c,i));}catch(e){}}
async function fsUpd(c,i,d){if(!DB)return;try{await FS.updateDoc(FS.doc(DB,c,i),d);}catch(e){}}
function fsListen(c,cb){if(!DB)return()=>{};try{return FS.onSnapshot(FS.collection(DB,c),s=>cb(s.docs.map(d=>({...d.data(),id:d.id}))));}catch(e){return()=>{};}}
function safeLS(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function safeLSSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}

const DEFAULT_MEMBERS=[
  {id:"m1",name:"Dad",color:"#E85D04",emoji:"👨"},
  {id:"m2",name:"Mom",color:"#7B2D8B",emoji:"👩"},
  {id:"m3",name:"Emma",color:"#0077B6",emoji:"👧"},
  {id:"m4",name:"Liam",color:"#2D6A4F",emoji:"👦"},
  {id:"m5",name:"Sophia",color:"#D62828",emoji:"👧"},
  {id:"m6",name:"Noah",color:"#F4A261",emoji:"👦"},
  {id:"m7",name:"Olivia",color:"#457B9D",emoji:"👧"},
  {id:"m8",name:"Ethan",color:"#6D6875",emoji:"👦"},
];
const EMOJI_OPTIONS=["👨","👩","👧","👦","👶","🧑","👱","🧔","👴","👵","🧒","🧑‍🦰","🧑‍🦱","🧑‍🦳","🧑‍🦲","🐶","🐱","⭐","🌟","🦊"];
const COLOR_PALETTE=["#E85D04","#7B2D8B","#0077B6","#2D6A4F","#D62828","#F4A261","#457B9D","#6D6875","#E63946","#2A9D8F","#E9C46A","#F77F00","#264653","#A8DADC","#9B5DE5","#1D3557"];
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const MEAL_SLOTS=["Breakfast","Lunch","Dinner","Snack"];
const REPEAT_OPTIONS=["none","daily","weekly","monthly","yearly"];
const WEEK_DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOURS=Array.from({length:12},(_,i)=>String(i+1));
const MINUTES=["00","15","30","45"];
const AMPM=["AM","PM"];
const REMINDER_OPTIONS=[
  {label:"None",mins:0},{label:"15 min",mins:15},{label:"30 min",mins:30},
  {label:"1 hour",mins:60},{label:"3 hours",mins:180},{label:"1 day",mins:1440},
];
const WMO_ICONS={0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",51:"🌦️",61:"🌧️",71:"🌨️",80:"🌦️",82:"⛈️",95:"⛈️"};

function fmt(y,m,d){return`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function mKey(y,m){return`${y}-${String(m+1).padStart(2,"0")}`;}
function daysIn(y,m){return new Date(y,m+1,0).getDate();}
function fd(y,m){return new Date(y,m,1).getDay();}
function fmtTime(h,min,ap){return h&&min!==null?`${h}:${min} ${ap}`:"";}
function parseTime(t){
  if(!t)return{hour:"12",minute:"00",ampm:"PM"};
  const m=t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  return m?{hour:m[1],minute:m[2].padStart(2,"0"),ampm:m[3].toUpperCase()}:{hour:"12",minute:"00",ampm:"PM"};
}
function timeToMins(t){try{const[h,m]=t.split(":").map(Number);return h*60+m;}catch(e){return 0;}}
function nowMins(){const n=new Date();return n.getHours()*60+n.getMinutes();}

function notifGranted(){try{return typeof Notification!=="undefined"&&Notification.permission==="granted";}catch(e){return false;}}
async function requestNotifPerm(){try{if(typeof Notification==="undefined")return false;if(Notification.permission==="granted")return true;return(await Notification.requestPermission())==="granted";}catch(e){return false;}}
function sendNotif(title,body){try{if(!notifGranted())return;new Notification(title,{body});}catch(e){}}
const scheduledTimeouts={};
function scheduleEventReminder(ev,mins){
  try{
    if(!notifGranted()||!mins||!ev.time||!ev.date)return;
    if(scheduledTimeouts[ev.id]){clearTimeout(scheduledTimeouts[ev.id]);delete scheduledTimeouts[ev.id];}
    const p=parseTime(ev.time);let h=parseInt(p.hour);
    if(p.ampm==="PM"&&h!==12)h+=12;if(p.ampm==="AM"&&h===12)h=0;
    const[y,mo,d]=ev.date.split("-").map(Number);
    const ms=new Date(new Date(y,mo-1,d,h,parseInt(p.minute)).getTime()-mins*60000).getTime()-Date.now();
    if(ms<=0)return;
    const label=REMINDER_OPTIONS.find(r=>r.mins===mins)?.label||`${mins}min`;
    scheduledTimeouts[ev.id]=setTimeout(()=>{sendNotif(`⏰ ${ev.title}`,`Starting in ${label} at ${ev.time}`);delete scheduledTimeouts[ev.id];},ms);
  }catch(e){}
}
function scheduleDailyChore(timeStr){
  try{
    if(!notifGranted()||!timeStr)return;
    const[hh,mm]=timeStr.split(":").map(Number);
    const now=new Date();let fire=new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm,0,0);
    if(fire<=now)fire.setDate(fire.getDate()+1);
    if(scheduledTimeouts["__chore__"])clearTimeout(scheduledTimeouts["__chore__"]);
    scheduledTimeouts["__chore__"]=setTimeout(()=>{sendNotif("📋 Chore Time!","Check your tasks for today! ⭐");scheduleDailyChore(timeStr);},fire.getTime()-now.getTime());
  }catch(e){}
}

const weatherCache={};
async function fetchWeather(lat,lon,date){
  const key=`${lat.toFixed(2)},${lon.toFixed(2)},${date}`;
  if(weatherCache[key])return weatherCache[key];
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&start_date=${date}&end_date=${date}`);
    const data=await r.json();
    const result={code:data.daily.weathercode[0],max:Math.round(data.daily.temperature_2m_max[0]),min:Math.round(data.daily.temperature_2m_min[0])};
    weatherCache[key]=result;return result;
  }catch(e){return null;}
}
async function geocode(loc){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc)}&format=json&limit=1`);
    const d=await r.json();if(d.length)return{lat:parseFloat(d[0].lat),lon:parseFloat(d[0].lon)};
  }catch(e){}return null;
}

function expandEvents(events,year,month){
  const result=[];const mStart=new Date(year,month,1);const mEnd=new Date(year,month+1,0);
  events.forEach(ev=>{
    const base=new Date(ev.date+"T00:00:00");
    if(!ev.repeat||ev.repeat==="none"){if(ev.date.startsWith(mKey(year,month)))result.push(ev);return;}
    for(let d=new Date(mStart);d<=mEnd;d.setDate(d.getDate()+1)){
      const ds=fmt(d.getFullYear(),d.getMonth(),d.getDate());if(d<base)continue;
      let match=false;
      if(ev.repeat==="daily")match=ev.repeatDays?.length?ev.repeatDays.includes(d.getDay()):true;
      else if(ev.repeat==="weekly")match=d.getDay()===base.getDay();
      else if(ev.repeat==="monthly")match=d.getDate()===base.getDate();
      else if(ev.repeat==="yearly")match=d.getMonth()===base.getMonth()&&d.getDate()===base.getDate();
      if(match)result.push({...ev,date:ds});
    }
  });
  return result;
}

function ScrollPicker({items,value,onChange,width=60}){
  const ref=useRef(null);const itemH=40;
  useEffect(()=>{const idx=items.indexOf(String(value));if(ref.current&&idx>=0)ref.current.scrollTop=idx*itemH;},[value,items]);
  function onScroll(){if(!ref.current)return;const idx=Math.round(ref.current.scrollTop/itemH);const c=Math.max(0,Math.min(idx,items.length-1));if(items[c]!==String(value))onChange(items[c]);}
  return(
    <div style={{position:"relative",width,height:120,overflow:"hidden",borderRadius:12,background:"#FFF3E8"}}>
      <div style={{position:"absolute",top:"50%",left:0,right:0,height:itemH,transform:"translateY(-50%)",background:"#FF6B35",borderRadius:8,opacity:.15,pointerEvents:"none",zIndex:1}}/>
      <div ref={ref} onScroll={onScroll} style={{height:"100%",overflowY:"scroll",scrollSnapType:"y mandatory",paddingTop:40,paddingBottom:40,scrollbarWidth:"none"}}>
        {items.map(item=>(
          <div key={item} onClick={()=>onChange(item)}
            style={{height:itemH,display:"flex",alignItems:"center",justifyContent:"center",scrollSnapAlign:"center",fontSize:18,fontWeight:item===String(value)?900:500,color:item===String(value)?"#FF6B35":"#AAA",cursor:"pointer"}}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimePicker({value,onChange}){
  const p=parseTime(value);
  const[hour,setHour]=useState(p.hour);
  const[minute,setMinute]=useState(p.minute);
  const[ampm,setAmpm]=useState(p.ampm);
  useEffect(()=>{onChange(fmtTime(hour,minute,ampm));},[hour,minute,ampm]);
  return(
    <div>
      <div style={{fontSize:11,fontWeight:800,color:"#888",marginBottom:8}}>TIME</div>
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#AAA",fontWeight:700,marginBottom:4}}>HOUR</div><ScrollPicker items={HOURS} value={hour} onChange={setHour} width={56}/></div>
        <div style={{fontSize:24,fontWeight:800,color:"#FF6B35",paddingTop:16}}>:</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#AAA",fontWeight:700,marginBottom:4}}>MIN</div><ScrollPicker items={MINUTES} value={minute} onChange={setMinute} width={56}/></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#AAA",fontWeight:700,marginBottom:4}}>AM/PM</div><ScrollPicker items={AMPM} value={ampm} onChange={setAmpm} width={60}/></div>
      </div>
    </div>
  );
}

function WeatherBadge({date,location,userCoords}){
  const[weather,setWeather]=useState(null);
  useEffect(()=>{
    if(!date||(!userCoords&&!location))return;
    const diffDays=Math.round((new Date(date+"T00:00:00")-new Date())/(1000*60*60*24));
    if(diffDays<0||diffDays>14)return;
    async function load(){try{let coords=userCoords;if(location){const gc=await geocode(location);if(gc)coords=gc;}if(!coords)return;const w=await fetchWeather(coords.lat,coords.lon,date);if(w)setWeather(w);}catch(e){}}
    load();
  },[date,location,userCoords]);
  if(!weather)return null;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:3,background:"#EFF6FF",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:800,color:"#1D4ED8",marginLeft:4}}>{WMO_ICONS[weather.code]||"🌡️"} {weather.max}°/{weather.min}°F</span>);
}

function SleepScreen({onWake,pin}){
  const[clock,setClock]=useState(null);
  const[showPin,setShowPin]=useState(false);
  const[pinInput,setPinInput]=useState("");
  const[pinError,setPinError]=useState(false);
  useEffect(()=>{setClock(new Date());const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t);},[]);
  const h=clock?clock.getHours():0;const m=clock?clock.getMinutes():0;
  const ap=h>=12?"PM":"AM";const h12=h%12||12;
  const timeStr=`${h12}:${String(m).padStart(2,"0")} ${ap}`;
  const dateStr=clock?`${DAYS[clock.getDay()]}, ${MONTHS[clock.getMonth()]} ${clock.getDate()}`:"";
  function pressDigit(d){const next=pinInput+d;setPinInput(next);if(next.length===4){if(next===pin){onWake();}else{setPinError(true);setPinInput("");setTimeout(()=>setPinError(false),1200);}}}
  return(
    <div style={{position:"fixed",inset:0,background:"linear-gradient(180deg,#0F0C29,#302B63,#24243e)",zIndex:9000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white"}}>
      <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.6)",marginBottom:8,letterSpacing:2}}>{dateStr.toUpperCase()}</div>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:80,lineHeight:1,marginBottom:4}}>{timeStr}</div>
      <div style={{fontSize:22,marginBottom:48,color:"rgba(255,255,255,.7)"}}>Good Night 🌙</div>
      {!showPin?(
        <button onClick={()=>setShowPin(true)} style={{background:"rgba(255,255,255,.15)",border:"2px solid rgba(255,255,255,.3)",borderRadius:20,padding:"10px 24px",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>🔓 Parent Override</button>
      ):(
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.7)",marginBottom:12}}>Enter Parent PIN</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
            {[0,1,2,3].map(i=>(<div key={i} style={{width:16,height:16,borderRadius:"50%",background:pinInput.length>i?(pinError?"#EF4444":"#FF6B35"):"rgba(255,255,255,.3)"}}/>))}
          </div>
          {pinError&&<div style={{color:"#FCA5A5",fontSize:12,fontWeight:700,marginBottom:8}}>Incorrect PIN</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:180,margin:"0 auto"}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
              <button key={i} onClick={()=>{if(d==="⌫")setPinInput(p=>p.slice(0,-1));else if(d!=="")pressDigit(String(d));}}
                style={{padding:"14px",borderRadius:14,border:"2px solid rgba(255,255,255,.2)",background:d===""?"transparent":"rgba(255,255,255,.1)",color:"white",fontSize:18,fontWeight:700,cursor:d===""?"default":"pointer",fontFamily:"'Nunito',sans-serif"}}>
                {d}
              </button>
            ))}
          </div>
          <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{marginTop:12,background:"none",border:"none",color:"rgba(255,255,255,.5)",fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function PinModal({title,onSuccess,onCancel,pin,isSetup=false}){
  const[input,setInput]=useState("");const[confirm,setConfirm]=useState("");
  const[step,setStep]=useState(isSetup?"set":"enter");const[error,setError]=useState("");
  function pressDigit(d){
    if(step==="enter"){const next=input+d;setInput(next);if(next.length===4){if(next===pin){onSuccess();}else{setError("Incorrect PIN");setInput("");setTimeout(()=>setError(""),1200);}}}
    else if(step==="set"){const next=input+d;setInput(next);if(next.length===4)setStep("confirm");}
    else{const next=confirm+d;setConfirm(next);if(next.length===4){if(next===input){onSuccess(input);}else{setError("PINs don't match");setConfirm("");setTimeout(()=>{setError("");setStep("set");setInput("");},1200);}}}
  }
  const dots=step==="confirm"?confirm:input;
  return(
    <div className="mbg">
      <div className="mod fi" style={{textAlign:"center"}}>
        <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#FF6B35",marginBottom:4}}>{title}</h3>
        <p style={{fontSize:13,color:"#888",fontWeight:700,marginBottom:20}}>{step==="enter"?"Enter PIN":step==="set"?"Set a 4-digit PIN":"Confirm PIN"}</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:16}}>
          {[0,1,2,3].map(i=>(<div key={i} style={{width:18,height:18,borderRadius:"50%",background:dots.length>i?(error?"#EF4444":"#FF6B35"):"#EEE"}}/>))}
        </div>
        {error&&<div style={{color:"#EF4444",fontSize:13,fontWeight:700,marginBottom:8}}>{error}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:200,margin:"0 auto 16px"}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
            <button key={i} onClick={()=>{if(d==="⌫"){if(step==="confirm")setConfirm(p=>p.slice(0,-1));else setInput(p=>p.slice(0,-1));}else if(d!=="")pressDigit(String(d));}}
              style={{padding:"14px",borderRadius:14,border:"2px solid #EEE",background:d===""?"transparent":"white",fontSize:18,fontWeight:700,cursor:d===""?"default":"pointer",fontFamily:"'Nunito',sans-serif",color:"#333"}}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={onCancel} style={{...S.cancel,display:"block",width:"100%"}}>Cancel</button>
      </div>
    </div>
  );
}

function EventForm({initial,members,onSave,onCancel,title,userCoords}){
  const[ev,setEv]=useState(initial);
  function toggleDay(dow){const days=ev.repeatDays||[];setEv(p=>({...p,repeatDays:days.includes(dow)?days.filter(d=>d!==dow):[...days,dow]}));}
  const rLabel={none:"Does not repeat",daily:"Daily",weekly:"Weekly",monthly:"Monthly",yearly:"Yearly"};
  return(
    <div>
      <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#FF6B35",marginBottom:14}}>{title}</h3>
      <label style={LBL}>EVENT TITLE</label>
      <input value={ev.title} onChange={e=>setEv(p=>({...p,title:e.target.value}))} placeholder="Event title…" style={{...S.inp,marginBottom:14,display:"block"}}/>
      <div style={{background:"#FFF8F0",borderRadius:14,padding:"12px 14px",marginBottom:14}}><TimePicker value={ev.time} onChange={t=>setEv(p=>({...p,time:t}))}/></div>
      <label style={LBL}>WHO</label>
      <select value={ev.memberId||""} onChange={e=>setEv(p=>({...p,memberId:e.target.value}))} style={{...S.inp,marginBottom:14,display:"block",background:"white"}}>
        <option value="">Family event</option>
        {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
      </select>
      <label style={LBL}>📍 LOCATION (for weather)</label>
      <input value={ev.location||""} onChange={e=>setEv(p=>({...p,location:e.target.value}))} placeholder="Leave blank to use current location…" style={{...S.inp,marginBottom:14,display:"block"}}/>
      {ev.date&&<div style={{background:"#EFF6FF",borderRadius:12,padding:"8px 12px",marginBottom:14,fontSize:13,fontWeight:700,color:"#1D4ED8",display:"flex",alignItems:"center",gap:8}}>Forecast: <WeatherBadge date={ev.date} location={ev.location} userCoords={userCoords}/>{!ev.location&&userCoords&&<span style={{fontSize:11,color:"#60A5FA"}}>Using your location</span>}</div>}
      <label style={LBL}>🔔 REMINDER</label>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {REMINDER_OPTIONS.map(r=>(<button key={r.mins} onClick={()=>setEv(p=>({...p,reminderMins:r.mins}))} style={{padding:"7px 12px",borderRadius:20,border:"none",background:(ev.reminderMins??0)===r.mins?"#FF6B35":"#F0F0F0",color:(ev.reminderMins??0)===r.mins?"white":"#666",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{r.label}</button>))}
      </div>
      <label style={LBL}>REPEAT</label>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {REPEAT_OPTIONS.map(r=>(<button key={r} onClick={()=>setEv(p=>({...p,repeat:r,repeatDays:[]}))} style={{padding:"7px 12px",borderRadius:20,border:"none",background:ev.repeat===r?"#FF6B35":"#F0F0F0",color:ev.repeat===r?"white":"#666",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{rLabel[r]}</button>))}
      </div>
      {ev.repeat==="daily"&&(
        <div style={{marginBottom:14}}>
          <label style={LBL}>WHICH DAYS</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {WEEK_DAYS.map((d,i)=>{const checked=(ev.repeatDays||[]).includes(i);return(<button key={d} onClick={()=>toggleDay(i)} style={{width:42,height:42,borderRadius:"50%",border:"none",background:checked?"#FF6B35":"#F0F0F0",color:checked?"white":"#666",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{d}</button>);})}
          </div>
        </div>
      )}
      {ev.repeat&&ev.repeat!=="none"&&(
        <div style={{background:"#ECFDF5",borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#2D6A4F",fontWeight:700}}>
          🔁 {ev.repeat==="weekly"?"Repeats every week":ev.repeat==="monthly"?"Repeats same date monthly":ev.repeat==="yearly"?"Repeats yearly":ev.repeat==="daily"&&(ev.repeatDays||[]).length===0?"Every day":`Every ${(ev.repeatDays||[]).sort().map(i=>WEEK_DAYS[i]).join(", ")}`}
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={S.cancel}>Cancel</button>
        <button onClick={()=>onSave(ev)} style={S.save}>Save Event</button>
      </div>
    </div>
  );
}

const LBL={fontSize:11,fontWeight:800,color:"#888",display:"block",marginBottom:6};

function FamilyHubInner(){
  const[now,setNow]=useState(null);
  const[fbReady,setFbReady]=useState(false);const[fbStatus,setFbStatus]=useState("connecting");
  const[members,setMembers]=useState(DEFAULT_MEMBERS);const[events,setEvents]=useState([]);
  const[tasks,setTasks]=useState([]);const[listItems,setListItems]=useState([]);
  const[meals,setMeals]=useState({});const[monthNotes,setMonthNotes]=useState({});
  const[notifStatus,setNotifStatus]=useState("unknown");const[showNotifBanner,setShowNotifBanner]=useState(false);
  const[choreTime,setChoreTime]=useState("07:30");const[choreTimeInput,setChoreTimeInput]=useState("07:30");
  const[userCoords,setUserCoords]=useState(null);
  const[sleepMode,setSleepMode]=useState(false);const[sleepStart,setSleepStart]=useState("21:00");const[sleepEnd,setSleepEnd]=useState("07:00");
  const[sleepStartInput,setSleepStartInput]=useState("21:00");const[sleepEndInput,setSleepEndInput]=useState("07:00");
  const[locked,setLocked]=useState(false);const[parentPin,setParentPin]=useState("");
  const[showPinModal,setShowPinModal]=useState(false);const[pinModalMode,setPinModalMode]=useState("unlock");
  const[activeTab,setActiveTab]=useState("calendar");
  const[calYear,setCalYear]=useState(new Date().getFullYear());
  const[calMonth,setCalMonth]=useState(new Date().getMonth());
  const[showDayModal,setShowDayModal]=useState(false);const[showMealModal,setShowMealModal]=useState(false);
  const[showTaskModal,setShowTaskModal]=useState(false);const[showMonthPlanner,setShowMonthPlanner]=useState(false);
  const[showEventForm,setShowEventForm]=useState(false);const[editingMember,setEditingMember]=useState(null);
  const[editingEvent,setEditingEvent]=useState(null);const[selectedDate,setSelectedDate]=useState(null);
  const[selMealDate,setSelMealDate]=useState(null);const[mealInput,setMealInput]=useState({});
  const[monthInput,setMonthInput]=useState("");const[newTask,setNewTask]=useState({text:"",memberId:"",stars:1});
  const[newListItem,setNewListItem]=useState({grocery:"",todo:""});const[activeList,setActiveList]=useState("grocery");
  const[filterMember,setFilterMember]=useState(null);const[toast,setToast]=useState("");
  const blankEvent=useCallback(()=>({title:"",memberId:"",time:"12:00 PM",repeat:"none",repeatDays:[],reminderMins:0,location:""}),[]);

  useEffect(()=>{
    setNow(new Date());
    try{if(typeof Notification!=="undefined"){const perm=Notification.permission;if(perm==="granted")setNotifStatus("granted");else if(perm==="denied")setNotifStatus("denied");else{setNotifStatus("unknown");setShowNotifBanner(true);}}else setNotifStatus("unsupported");}catch(e){}
    try{const sc=safeLS("choreTime");if(sc){setChoreTime(sc);setChoreTimeInput(sc);}const ss=safeLS("sleepStart");if(ss){setSleepStart(ss);setSleepStartInput(ss);}const se=safeLS("sleepEnd");if(se){setSleepEnd(se);setSleepEndInput(se);}const sp=safeLS("parentPin");if(sp)setParentPin(sp);const sl=safeLS("locked");if(sl==="true")setLocked(true);}catch(e){}
    try{if(navigator&&navigator.geolocation)navigator.geolocation.getCurrentPosition(pos=>setUserCoords({lat:pos.coords.latitude,lon:pos.coords.longitude}),()=>{},{timeout:5000});}catch(e){}
  },[]);

  useEffect(()=>{
    let unsubs=[];
    loadFirebase().then(ok=>{
      if(!ok){setFbStatus("demo");return;}
      setFbStatus("live");setFbReady(true);
      try{FS.getDocs(FS.collection(DB,"members")).then(snap=>{if(snap.empty)DEFAULT_MEMBERS.forEach(m=>fsSet("members",m.id,m));});}catch(e){}
      unsubs.push(fsListen("members",setMembers));unsubs.push(fsListen("events",setEvents));
      unsubs.push(fsListen("tasks",setTasks));unsubs.push(fsListen("listItems",setListItems));
      unsubs.push(fsListen("meals",docs=>{const map={};docs.forEach(d=>{map[d.id]=d;});setMeals(map);}));
      unsubs.push(fsListen("monthNotes",docs=>{const map={};docs.forEach(d=>{map[d.id]=d;});setMonthNotes(map);}));
    });
    return()=>unsubs.forEach(u=>u&&u());
  },[]);

  useEffect(()=>{if(notifStatus==="granted")events.forEach(ev=>{if(ev.reminderMins>0)scheduleEventReminder(ev,ev.reminderMins);});},[events,notifStatus]);
  useEffect(()=>{if(notifStatus==="granted"&&choreTime){scheduleDailyChore(choreTime);safeLSSet("choreTime",choreTime);}},[choreTime,notifStatus]);
  useEffect(()=>{safeLSSet("locked",String(locked));},[locked]);
  useEffect(()=>{
    if(!now)return;
    function check(){try{const cur=nowMins();const start=timeToMins(sleepStart);const end=timeToMins(sleepEnd);setSleepMode(start>end?(cur>=start||cur<end):(cur>=start&&cur<end));}catch(e){}}
    check();const t=setInterval(check,30000);return()=>clearInterval(t);
  },[sleepStart,sleepEnd,now]);

  async function enableNotifications(){const granted=await requestNotifPerm();setNotifStatus(granted?"granted":"denied");setShowNotifBanner(false);if(granted){sendNotif("🏠 Family Hub","Notifications are on!");scheduleDailyChore(choreTime);}}
  function flash(msg){setToast(msg);setTimeout(()=>setToast(""),2200);}
  const getMember=id=>members.find(m=>m.id===id);
  const today=now||new Date();
  const todayStr=fmt(today.getFullYear(),today.getMonth(),today.getDate());
  const curMKey=mKey(today.getFullYear(),today.getMonth());
  const viewMKey=mKey(calYear,calMonth);
  const isPast=viewMKey<curMKey;const isFuture=viewMKey>curMKey;
  const dCount=daysIn(calYear,calMonth);const fDay=fd(calYear,calMonth);
  function prevMonth(){if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}
  function nextMonth(){if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}
  const expandedEvents=expandEvents(events,calYear,calMonth);
  function eventsFor(d){return expandedEvents.filter(e=>e.date===d).sort((a,b)=>(a.time||"").localeCompare(b.time||""));}
  function openDayModal(ds){setSelectedDate(ds);setShowDayModal(true);}
  function openNewEventForm(ds){setSelectedDate(ds);setEditingEvent({...blankEvent(),date:ds});setShowEventForm(true);setShowDayModal(false);}
  function openEditEventForm(ev){setEditingEvent({...ev,repeat:ev.repeat||"none",repeatDays:ev.repeatDays||[],reminderMins:ev.reminderMins||0,location:ev.location||""});setShowEventForm(true);setShowDayModal(false);}
  async function saveEvent(ev){if(!ev.title)return;const isEdit=events.some(e=>e.id===ev.id);const id=ev.id||`ev_${Date.now()}`;const data={id,title:ev.title,time:ev.time||"",date:ev.date||selectedDate,memberId:ev.memberId||null,repeat:ev.repeat||"none",repeatDays:ev.repeatDays||[],reminderMins:ev.reminderMins||0,location:ev.location||""};if(fbReady){await fsSet("events",id,data);flash(isEdit?"Event updated ☁️":"Event saved ☁️");}else{if(isEdit)setEvents(p=>p.map(e=>e.id===id?data:e));else setEvents(p=>[...p,data]);}if(data.reminderMins>0)scheduleEventReminder(data,data.reminderMins);setShowEventForm(false);setEditingEvent(null);}
  async function deleteEvent(id){if(scheduledTimeouts[id]){clearTimeout(scheduledTimeouts[id]);delete scheduledTimeouts[id];}if(fbReady){await fsDel("events",id);flash("Deleted");}else setEvents(p=>p.filter(e=>e.id!==id));}
  async function addTask(){if(!newTask.text)return;const id=`tk_${Date.now()}`;const task={id,text:newTask.text,memberId:newTask.memberId||null,stars:newTask.stars,done:false};if(fbReady){await fsSet("tasks",id,task);flash("Task saved ☁️");}else setTasks(p=>[...p,task]);setNewTask({text:"",memberId:"",stars:1});setShowTaskModal(false);}
  async function toggleTask(id){const t=tasks.find(x=>x.id===id);if(!t)return;if(fbReady)await fsUpd("tasks",id,{done:!t.done});else setTasks(p=>p.map(x=>x.id===id?{...x,done:!x.done}:x));}
  async function deleteTask(id){if(fbReady)await fsDel("tasks",id);else setTasks(p=>p.filter(t=>t.id!==id));}
  async function addListItem(type){if(!newListItem[type])return;const id=`li_${Date.now()}`;if(fbReady)await fsSet("listItems",id,{id,text:newListItem[type],type,done:false});else setListItems(p=>[...p,{id,text:newListItem[type],type,done:false}]);setNewListItem(p=>({...p,[type]:""}));}
  async function toggleListItem(id){const item=listItems.find(i=>i.id===id);if(!item)return;if(fbReady)await fsUpd("listItems",id,{done:!item.done});else setListItems(p=>p.map(i=>i.id===id?{...i,done:!i.done}:i));}
  async function deleteListItem(id){if(fbReady)await fsDel("listItems",id);else setListItems(p=>p.filter(i=>i.id!==id));}
  function openMealModal(ds){setSelMealDate(ds);setMealInput(meals[ds]||{});setShowMealModal(true);}
  async function saveMeals(){if(!selMealDate)return;const data={id:selMealDate,...mealInput};if(fbReady){await fsSet("meals",selMealDate,data);flash("Meals saved ☁️");}else setMeals(p=>({...p,[selMealDate]:data}));setShowMealModal(false);}
  function openMonthPlanner(){setMonthInput(monthNotes[viewMKey]?.text||"");setShowMonthPlanner(true);}
  async function saveMonthNote(){const data={id:viewMKey,text:monthInput};if(fbReady){await fsSet("monthNotes",viewMKey,data);flash("Notes saved ☁️");}else setMonthNotes(p=>({...p,[viewMKey]:data}));setShowMonthPlanner(false);}
  async function saveMember(){if(!editingMember)return;if(fbReady){await fsSet("members",editingMember.id,editingMember);flash("Member updated ☁️");}else setMembers(p=>p.map(m=>m.id===editingMember.id?{...editingMember}:m));setEditingMember(null);}
  function saveSleepSettings(){setSleepStart(sleepStartInput);setSleepEnd(sleepEndInput);safeLSSet("sleepStart",sleepStartInput);safeLSSet("sleepEnd",sleepEndInput);flash("Sleep settings saved!");}
  function handlePinSuccess(newPin){if(pinModalMode==="unlock"){setLocked(false);setShowPinModal(false);flash("Unlocked 🔓");}else{setParentPin(newPin);safeLSSet("parentPin",newPin);setLocked(true);setShowPinModal(false);flash("Lock enabled 🔒");}}

  const starMap={};tasks.filter(t=>t.done&&t.memberId).forEach(t=>{starMap[t.memberId]=(starMap[t.memberId]||0)+(t.stars||1);});
  const filteredTasks=filterMember?tasks.filter(t=>t.memberId===filterMember):tasks;
  const activeItems=activeList==="grocery"?listItems.filter(i=>i.type==="grocery"):listItems.filter(i=>i.type==="todo");
  const monthNoteText=monthNotes[viewMKey]?.text||"";
  function repeatBadge(ev){if(!ev.repeat||ev.repeat==="none")return null;const labels={daily:"Daily",weekly:"Weekly",monthly:"Monthly",yearly:"Yearly"};return<span style={{fontSize:10,background:"#ECFDF5",color:"#2D6A4F",padding:"2px 7px",borderRadius:10,fontWeight:800,marginLeft:4}}>🔁 {labels[ev.repeat]}</span>;}
  function reminderBadge(ev){if(!ev.reminderMins)return null;const label=REMINDER_OPTIONS.find(r=>r.mins===ev.reminderMins)?.label||"";return<span style={{fontSize:10,background:"#FFF3E8",color:"#FF6B35",padding:"2px 7px",borderRadius:10,fontWeight:800,marginLeft:4}}>🔔 {label}</span>;}
  const tabs=[{id:"calendar",label:"Calendar",icon:"📅"},{id:"tasks",label:"Tasks",icon:"✅"},{id:"lists",label:"Lists",icon:"📝"},{id:"meals",label:"Meals",icon:"🍽️"},{id:"family",label:"Family",icon:"👨‍👩‍👧‍👦"}];

  return(
    <div style={{fontFamily:"'Nunito',sans-serif",minHeight:"100vh",background:"#FFF8F0"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');*{box-sizing:border-box;margin:0;padding:0;}.dc{transition:all .15s;cursor:pointer;}.dc:hover{background:#FFE8D6!important;transform:scale(1.04);}.hl{transition:all .2s;}.hl:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1);}.lr{transition:all .15s;}.lr:hover{background:#FFF3E8!important;}.mr{transition:all .2s;cursor:pointer;}.mr:hover{transform:translateX(5px);}.tb{transition:all .2s;}.tb:hover{background:#FFF3E8;}.mbg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;}.mod{background:white;border-radius:20px;padding:24px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:92vh;overflow-y:auto;}.fi{animation:fi .3s ease;}@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}input,select,textarea{font-family:'Nunito',sans-serif;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#FFBF69;border-radius:4px;}.cdot{width:28px;height:28px;border-radius:50%;cursor:pointer;transition:all .15s;border:3px solid transparent;}.cdot:hover{transform:scale(1.25);}.eopt{font-size:21px;cursor:pointer;padding:5px;border-radius:8px;border:2px solid transparent;background:transparent;}.eopt:hover{background:#FFE8D6;}.xb{background:none;border:none;cursor:pointer;color:#DDD;font-size:14px;padding:4px 6px;border-radius:6px;}.xb:hover{color:#E63946;background:#FFF0F0;}.eb{background:none;border:none;cursor:pointer;color:#AAA;font-size:13px;padding:4px 6px;border-radius:6px;font-family:'Nunito',sans-serif;font-weight:700;}.eb:hover{color:#FF6B35;background:#FFF3E8;}.lock-pulse{animation:lp 2s infinite;}@keyframes lp{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {sleepMode&&<SleepScreen pin={parentPin} onWake={()=>setSleepMode(false)}/>}
      {showPinModal&&<PinModal title={pinModalMode==="unlock"?"🔓 Unlock App":pinModalMode==="setup"?"🔒 Set PIN":"🔒 Change PIN"} pin={parentPin} isSetup={pinModalMode==="setup"||pinModalMode==="change"} onSuccess={handlePinSuccess} onCancel={()=>setShowPinModal(false)}/>}
      {showNotifBanner&&(<div style={{background:"#FFF3CD",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><div style={{fontSize:13,fontWeight:700,color:"#856404"}}>🔔 Enable notifications for reminders</div><div style={{display:"flex",gap:8,flexShrink:0}}><button onClick={()=>setShowNotifBanner(false)} style={{background:"none",border:"none",fontSize:12,color:"#AAA",cursor:"pointer",fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>Later</button><button onClick={enableNotifications} style={{background:"#FF6B35",color:"white",border:"none",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>Enable</button></div></div>)}
      {fbStatus==="connecting"&&<div style={{background:"#FFF3CD",padding:"8px 16px",fontSize:13,fontWeight:700,color:"#856404",textAlign:"center"}}>⏳ Connecting…</div>}
      {fbStatus==="demo"&&<div style={{background:"#FFF3CD",padding:"8px 16px",fontSize:13,fontWeight:700,color:"#856404",textAlign:"center"}}>⚠️ Demo mode</div>}
      {toast&&<div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#2D6A4F",color:"white",padding:"10px 22px",borderRadius:30,fontWeight:800,fontSize:13,zIndex:9999,whiteSpace:"nowrap"}}>{toast}</div>}

      <div style={{background:"linear-gradient(135deg,#FF6B35,#FF8C42,#FFB347)",padding:"18px 16px 14px"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:26}}>🏠</span><h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:26,color:"white"}}>Family Hub</h1></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {parentPin&&(<button onClick={()=>{if(locked){setPinModalMode("unlock");setShowPinModal(true);}else{setLocked(true);flash("App locked 🔒");}}} style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:16,color:"white"}}>{locked?<span className="lock-pulse">🔒</span>:"🔓"}</button>)}
              <div style={{textAlign:"right"}}>
                <div style={{color:"rgba(255,255,255,.85)",fontSize:11,fontWeight:700}}>{MONTHS[today.getMonth()].slice(0,3)} {today.getDate()}, {today.getFullYear()}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.8)",fontWeight:700,marginTop:1,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:fbStatus==="live"?"#4ADE80":"#FCD34D",display:"inline-block"}}/>{fbStatus==="live"?"Live":"Demo"}<span style={{marginLeft:2}}>{notifStatus==="granted"?"🔔":"🔕"}</span></div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{members.map(m=>(<div key={m.id} style={{background:"rgba(255,255,255,.25)",borderRadius:20,padding:"3px 9px",fontSize:11,color:"white",fontWeight:700,display:"flex",alignItems:"center",gap:4}}><span style={{width:7,height:7,borderRadius:"50%",background:m.color,display:"inline-block"}}/>{m.emoji} {m.name}</div>))}</div>
        </div>
      </div>

      {locked&&(<div style={{background:"#FEF2F2",padding:"8px 16px",textAlign:"center",fontSize:13,fontWeight:800,color:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>🔒 App is locked — viewing only.<button onClick={()=>{setPinModalMode("unlock");setShowPinModal(true);}} style={{background:"#EF4444",color:"white",border:"none",borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>Unlock</button></div>)}

      <div style={{background:"white",boxShadow:"0 2px 10px rgba(0,0,0,.08)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:600,margin:"0 auto",display:"flex"}}>
          {tabs.map(t=>(<button key={t.id} className="tb" onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:"11px 4px 9px",border:"none",background:"none",cursor:"pointer",fontSize:10,fontWeight:800,fontFamily:"'Nunito',sans-serif",color:activeTab===t.id?"#FF6B35":"#999",borderBottom:activeTab===t.id?"3px solid #FF6B35":"3px solid transparent"}}><div style={{fontSize:17,marginBottom:2}}>{t.icon}</div>{t.label}</button>))}
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"16px 12px 100px"}}>

        {activeTab==="calendar"&&(
          <div className="fi">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <button onClick={prevMonth} style={S.nav}>‹</button>
              <div style={{textAlign:"center"}}><h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#FF6B35"}}>{MONTHS[calMonth]} {calYear}</h2><span style={{background:isPast?"#6B7280":isFuture?"#2D6A4F":"#FF6B35",color:"white",fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20}}>{isPast?"📜 Past Record":isFuture?"🗓️ Planning Ahead":"📍 Current Month"}</span></div>
              <button onClick={nextMonth} style={S.nav}>›</button>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
              {[-2,-1,0,1,2].map(off=>{const d=new Date(today.getFullYear(),today.getMonth()+off,1);const y=d.getFullYear();const m=d.getMonth();const active=mKey(y,m)===viewMKey;return(<button key={off} onClick={()=>{setCalYear(y);setCalMonth(m);}} style={{padding:"6px 12px",borderRadius:12,border:"none",background:active?"#FF6B35":off<0?"#F0F0F0":off===0?"#FFE8D6":"#ECFDF5",color:active?"white":off<0?"#888":off===0?"#FF6B35":"#2D6A4F",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif",whiteSpace:"nowrap",flexShrink:0}}>{off<0?"📜":off===0?"📍":"🗓️"} {MONTHS[m].slice(0,3)}{y!==today.getFullYear()?` ${y}`:""}</button>);})}
            </div>
            <div style={{background:isPast?"#F3F4F6":isFuture?"#ECFDF5":"#FFF3E8",borderRadius:14,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,fontSize:13,color:"#666",fontWeight:600,fontStyle:monthNoteText?"normal":"italic"}}>{monthNoteText||(isPast?"No notes.":isFuture?"Tap to plan…":"Add goals…")}</div>
              <button onClick={openMonthPlanner} style={{background:isPast?"#6B7280":"#FF6B35",color:"white",border:"none",borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{isPast?"View":"Edit"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>{DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:800,color:"#AAA"}}>{d}</div>)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {Array.from({length:fDay}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:dCount}).map((_,i)=>{const day=i+1;const ds=fmt(calYear,calMonth,day);const evs=eventsFor(ds);const isToday=ds===todayStr;return(<div key={day} className="dc" onClick={()=>openDayModal(ds)} style={{background:isToday?"#FFE8D6":isPast?"#FAFAFA":"white",borderRadius:10,padding:"5px 3px",minHeight:52,border:isToday?"2px solid #FF6B35":"2px solid transparent",opacity:isPast&&!evs.length?0.5:1}}><div style={{textAlign:"center",fontWeight:isToday?800:600,fontSize:13,color:isToday?"#FF6B35":isPast?"#AAA":"#333",marginBottom:2}}>{day}</div><div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>{evs.slice(0,3).map((ev,ei)=>{const mem=ev.memberId?getMember(ev.memberId):null;return<div key={ei} style={{width:7,height:7,borderRadius:"50%",background:mem?mem.color:"#CCC"}}/>;})}</div></div>);})}
            </div>
            <div style={{marginTop:18}}>
              <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:17,color:"#333",marginBottom:10}}>{isPast?"📜 Events That Month":isFuture?"🗓️ Planned Events":"Upcoming Events"}</h3>
              {expandedEvents.sort((a,b)=>a.date.localeCompare(b.date)).map((ev,ei)=>{const mem=ev.memberId?getMember(ev.memberId):null;return(<div key={`${ev.id}_${ei}`} className="hl" style={{background:"white",borderRadius:14,padding:"11px 14px",marginBottom:7,display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:`4px solid ${mem?mem.color:"#CCC"}`}}><div style={{fontSize:20}}>{mem?mem.emoji:"📅"}</div><div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,display:"flex",alignItems:"center",flexWrap:"wrap",gap:2}}>{ev.title}{repeatBadge(ev)}{reminderBadge(ev)}</div><div style={{fontSize:12,color:"#888",fontWeight:600,display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>{ev.date}{ev.time?` · ${ev.time}`:""}{mem?` · ${mem.name}`:""}<WeatherBadge date={ev.date} location={ev.location} userCoords={userCoords}/></div></div>{!locked&&<button className="eb" onClick={()=>openEditEventForm(events.find(e=>e.id===ev.id)||ev)}>✏️</button>}{!locked&&<button className="xb" onClick={()=>deleteEvent(ev.id)}>✕</button>}</div>);})}
              {expandedEvents.length===0&&<div style={{textAlign:"center",color:"#CCC",fontSize:14,padding:"16px 0"}}>{isPast?"No events recorded.":"No events yet — tap a day to add one."}</div>}
            </div>
          </div>
        )}

        {activeTab==="tasks"&&(
          <div className="fi">
            <div style={{background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:20,padding:16,marginBottom:16}}>
              <h3 style={{fontFamily:"'Fredoka One',cursive",color:"white",fontSize:18,marginBottom:10}}>⭐ Star Board</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{members.filter((_,i)=>i>=2).map(m=>(<div key={m.id} style={{background:"rgba(255,255,255,.3)",borderRadius:12,padding:"8px 4px",textAlign:"center"}}><div style={{fontSize:20}}>{m.emoji}</div><div style={{fontSize:10,fontWeight:800,color:"white"}}>{m.name}</div><div style={{fontSize:15,fontWeight:900,color:"white"}}>⭐ {starMap[m.id]||0}</div></div>))}</div>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}><button onClick={()=>setFilterMember(null)} style={pill(!filterMember,"#FF6B35")}>All</button>{members.map(m=>(<button key={m.id} onClick={()=>setFilterMember(filterMember===m.id?null:m.id)} style={pill(filterMember===m.id,m.color)}>{m.emoji} {m.name}</button>))}</div>
            {filteredTasks.map(t=>{const mem=t.memberId?getMember(t.memberId):null;return(<div key={t.id} className="hl" style={{background:"white",borderRadius:16,padding:"13px 15px",marginBottom:8,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px rgba(0,0,0,.06)",opacity:t.done?0.6:1}}><button onClick={()=>toggleTask(t.id)} style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${mem?mem.color:"#CCC"}`,background:t.done?(mem?mem.color:"#CCC"):"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{t.done&&<span style={{color:"white",fontSize:13}}>✓</span>}</button><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,textDecoration:t.done?"line-through":"none",color:t.done?"#AAA":"#333"}}>{t.text}</div>{mem&&<div style={{fontSize:12,color:mem.color,fontWeight:700}}>{mem.emoji} {mem.name}</div>}</div><div style={{fontSize:13,color:"#FFB300"}}>{"⭐".repeat(t.stars||1)}</div>{!locked&&<button className="xb" onClick={()=>deleteTask(t.id)}>✕</button>}</div>);})}
            {!locked&&<button onClick={()=>setShowTaskModal(true)} style={S.dashed}>+ Add New Task</button>}
          </div>
        )}

        {activeTab==="lists"&&(
          <div className="fi">
            <div style={{display:"flex",gap:8,marginBottom:14,background:"white",borderRadius:16,padding:6}}>{[{id:"grocery",label:"🛒 Grocery"},{id:"todo",label:"✅ To-Do"}].map(l=>(<button key={l.id} onClick={()=>setActiveList(l.id)} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:activeList===l.id?"#FF6B35":"transparent",color:activeList===l.id?"white":"#888",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{l.label}</button>))}</div>
            {!locked&&(<div style={{display:"flex",gap:8,marginBottom:12}}><input value={newListItem[activeList]} onChange={e=>setNewListItem(p=>({...p,[activeList]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addListItem(activeList)} placeholder={`Add to ${activeList==="grocery"?"grocery":"to-do"} list…`} style={S.inp}/><button onClick={()=>addListItem(activeList)} style={S.addBtn}>+</button></div>)}
            {activeItems.map(item=>(<div key={item.id} className="lr" style={{background:"white",borderRadius:14,padding:"13px 15px",marginBottom:7,display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}><div onClick={()=>toggleListItem(item.id)} style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${item.done?"#FF6B35":"#DDD"}`,background:item.done?"#FF6B35":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>{item.done&&<span style={{color:"white",fontSize:12}}>✓</span>}</div><span onClick={()=>toggleListItem(item.id)} style={{flex:1,fontWeight:600,fontSize:15,textDecoration:item.done?"line-through":"none",color:item.done?"#BBB":"#333",cursor:"pointer"}}>{item.text}</span>{!locked&&<button className="xb" onClick={()=>deleteListItem(item.id)}>✕</button>}</div>))}
            <div style={{textAlign:"center",marginTop:10,color:"#AAA",fontSize:13,fontWeight:700}}>{activeItems.filter(i=>i.done).length} of {activeItems.length} done</div>
          </div>
        )}

        {activeTab==="meals"&&(
          <div className="fi">
            <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#333",marginBottom:14}}>This Week's Meals</h3>
            {Array.from({length:7}).map((_,i)=>{const d=new Date(today);d.setDate(today.getDate()-today.getDay()+i);const ds=fmt(d.getFullYear(),d.getMonth(),d.getDate());const dm=meals[ds];const isToday=ds===todayStr;return(<div key={ds} style={{background:isToday?"#FFF3E8":"white",borderRadius:18,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.07)",border:isToday?"2px solid #FF6B35":"2px solid transparent"}}><div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><span style={{fontFamily:"'Fredoka One',cursive",fontSize:15,color:isToday?"#FF6B35":"#333"}}>{DAYS[d.getDay()]} · {MONTHS[d.getMonth()].slice(0,3)} {d.getDate()}</span>{isToday&&<span style={{marginLeft:8,fontSize:10,background:"#FF6B35",color:"white",padding:"2px 8px",borderRadius:10,fontWeight:800}}>TODAY</span>}</div>{!locked&&<button onClick={()=>openMealModal(ds)} style={{background:"#FFE8D6",border:"none",borderRadius:10,padding:"5px 11px",color:"#FF6B35",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>{dm?"Edit":"+ Plan"}</button>}</div>{dm&&(<div style={{padding:"0 16px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{MEAL_SLOTS.map(slot=>dm[slot]&&(<div key={slot} style={{background:"#FFF8F0",borderRadius:10,padding:"7px 10px"}}><div style={{fontSize:9,fontWeight:800,color:"#FF8C42",marginBottom:2}}>{slot.toUpperCase()}</div><div style={{fontSize:13,fontWeight:700,color:"#333"}}>{dm[slot]}</div></div>))}</div>)}</div>);})}
          </div>
        )}

        {activeTab==="family"&&(
          <div className="fi">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:22,color:"#333"}}>Family Members</h3><span style={{fontSize:12,color:"#AAA",fontWeight:700}}>Tap to edit</span></div>
            {members.map(m=>(<div key={m.id} className="mr" onClick={()=>{if(!locked)setEditingMember({...m});}} style={{background:"white",borderRadius:18,padding:"15px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 10px rgba(0,0,0,.07)",borderLeft:`5px solid ${m.color}`,opacity:locked?0.7:1}}><div style={{width:48,height:48,borderRadius:"50%",background:m.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{m.emoji}</div><div style={{flex:1}}><div style={{fontWeight:800,fontSize:16}}>{m.name}</div><div style={{fontSize:12,color:m.color,fontWeight:700}}>⭐ {starMap[m.id]||0} stars earned</div></div><div style={{width:18,height:18,borderRadius:"50%",background:m.color}}/><span style={{fontSize:18,color:"#DDD"}}>›</span></div>))}
            <div style={{background:locked?"#FEF2F2":"#F0FDF4",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,color:locked?"#EF4444":"#2D6A4F",marginBottom:10}}>{locked?"🔒 App is Locked":"🔓 Parental Lock"}</div>
              {!parentPin?(<div><div style={{fontSize:13,color:"#666",fontWeight:600,marginBottom:10}}>Set a 4-digit PIN to lock the app for kids.</div><button onClick={()=>{setPinModalMode("setup");setShowPinModal(true);}} style={{...S.save,flex:"none",padding:"10px 20px"}}>Set PIN & Lock</button></div>):(<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{locked?<button onClick={()=>{setPinModalMode("unlock");setShowPinModal(true);}} style={{...S.save,flex:"none",padding:"9px 18px",background:"#EF4444"}}>🔓 Unlock</button>:<button onClick={()=>{setLocked(true);flash("App locked 🔒");}} style={{...S.save,flex:"none",padding:"9px 18px"}}>🔒 Lock Now</button>}<button onClick={()=>{setPinModalMode("change");setShowPinModal(true);}} style={{...S.cancel,flex:"none",padding:"9px 18px"}}>Change PIN</button></div>)}
            </div>
            <div style={{background:"#F5F3FF",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,color:"#5B21B6",marginBottom:4}}>😴 Sleep Mode</div>
              <div style={{fontSize:12,color:"#7C3AED",fontWeight:600,marginBottom:12}}>Screen goes dark between these hours</div>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
                <div><label style={{fontSize:11,fontWeight:800,color:"#7C3AED",display:"block",marginBottom:4}}>SLEEP AT</label><input type="time" value={sleepStartInput} onChange={e=>setSleepStartInput(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"2px solid #DDD6FE",fontSize:14,fontWeight:700,outline:"none",background:"white",color:"#5B21B6"}}/></div>
                <div style={{fontSize:20,color:"#A78BFA",paddingTop:18}}>→</div>
                <div><label style={{fontSize:11,fontWeight:800,color:"#7C3AED",display:"block",marginBottom:4}}>WAKE AT</label><input type="time" value={sleepEndInput} onChange={e=>setSleepEndInput(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"2px solid #DDD6FE",fontSize:14,fontWeight:700,outline:"none",background:"white",color:"#5B21B6"}}/></div>
              </div>
              <div style={{display:"flex",gap:8}}><button onClick={saveSleepSettings} style={{...S.save,flex:"none",padding:"9px 18px",background:"#7C3AED"}}>Save</button><button onClick={()=>setSleepMode(true)} style={{...S.cancel,flex:"none",padding:"9px 18px",fontSize:12}}>Preview</button></div>
              <div style={{fontSize:11,color:"#A78BFA",fontWeight:600,marginTop:8}}>Currently: {sleepStart} – {sleepEnd} · Parents bypass with PIN</div>
            </div>
            <div style={{background:notifStatus==="granted"?"#ECFDF5":notifStatus==="denied"?"#FEF2F2":"#FFF3CD",borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:15,color:notifStatus==="granted"?"#2D6A4F":notifStatus==="denied"?"#EF4444":"#856404",marginBottom:notifStatus==="granted"?10:0}}>{notifStatus==="granted"?"🔔 Notifications On":notifStatus==="denied"?"🔕 Blocked":"🔔 Notifications Off"}</div>
              {notifStatus==="unknown"&&<button onClick={enableNotifications} style={{...S.save,flex:"none",padding:"8px 16px",marginTop:8}}>Enable</button>}
              {notifStatus==="denied"&&<div style={{fontSize:12,color:"#EF4444",fontWeight:600,marginTop:6}}>Enable in Settings → Notifications</div>}
              {notifStatus==="granted"&&(<div><label style={{fontSize:11,fontWeight:800,color:"#2D6A4F",display:"block",marginBottom:6}}>📋 DAILY CHORE REMINDER</label><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="time" value={choreTimeInput} onChange={e=>setChoreTimeInput(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"2px solid #D1FAE5",fontSize:14,fontWeight:700,outline:"none",background:"white",color:"#2D6A4F"}}/><button onClick={()=>{setChoreTime(choreTimeInput);flash("Reminder set!");}} style={{...S.save,flex:"none",padding:"8px 16px",background:"#2D6A4F"}}>Save</button></div><button onClick={()=>sendNotif("📋 Test","Chore reminder preview!")} style={{marginTop:10,background:"none",border:"2px solid #2D6A4F",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:800,cursor:"pointer",color:"#2D6A4F",fontFamily:"'Nunito',sans-serif"}}>Send Test</button></div>)}
            </div>
            <div style={{padding:13,background:fbStatus==="live"?"#ECFDF5":"#FFF3E8",borderRadius:14,fontSize:13,fontWeight:700,textAlign:"center",color:fbStatus==="live"?"#2D6A4F":"#856404"}}>{fbStatus==="live"?"☁️ All changes sync live across every family device":"🎨 Tap any member to edit"}</div>
          </div>
        )}
      </div>

      {showDayModal&&selectedDate&&(
        <div className="mbg" onClick={()=>setShowDayModal(false)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:20,color:"#FF6B35"}}>{(()=>{try{const d=new Date(selectedDate+"T00:00:00");return`${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`;}catch(e){return selectedDate;}})()}</h3>
              {isPast&&<span style={bdg("#6B7280")}>📜 Past</span>}{isFuture&&<span style={bdg("#2D6A4F")}>🗓️ Future</span>}
            </div>
            {eventsFor(selectedDate).length>0&&(<div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:800,color:"#AAA",marginBottom:7}}>EVENTS THIS DAY</div>{eventsFor(selectedDate).map((ev,ei)=>{const mem=ev.memberId?getMember(ev.memberId):null;return(<div key={`${ev.id}_${ei}`} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#FFF8F0",borderRadius:12,marginBottom:5,borderLeft:`3px solid ${mem?mem.color:"#CCC"}`}}><span style={{fontSize:18}}>{mem?mem.emoji:"📅"}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{ev.title}{repeatBadge(ev)}{reminderBadge(ev)}</div><div style={{fontSize:12,color:"#888",display:"flex",alignItems:"center",gap:4}}>{ev.time&&<span>{ev.time}</span>}{mem&&<span>· {mem.name}</span>}<WeatherBadge date={ev.date} location={ev.location} userCoords={userCoords}/></div></div>{!locked&&<button className="eb" onClick={()=>openEditEventForm(events.find(e=>e.id===ev.id)||ev)}>✏️</button>}{!locked&&<button className="xb" onClick={()=>deleteEvent(ev.id)}>✕</button>}</div>);})}</div>)}
            {!locked&&<button onClick={()=>openNewEventForm(selectedDate)} style={{...S.save,width:"100%",marginTop:4}}>+ Add Event to This Day</button>}
            <button onClick={()=>setShowDayModal(false)} style={{...S.cancel,width:"100%",marginTop:8}}>Close</button>
          </div>
        </div>
      )}
      {showEventForm&&editingEvent&&(<div className="mbg" onClick={()=>{setShowEventForm(false);setEditingEvent(null);}}><div className="mod fi" onClick={e=>e.stopPropagation()}><EventForm initial={editingEvent} members={members} title={events.some(e=>e.id===editingEvent.id)?"✏️ Edit Event":"📅 New Event"} userCoords={userCoords} onSave={saveEvent} onCancel={()=>{setShowEventForm(false);setEditingEvent(null);}}/></div></div>)}
      {showMonthPlanner&&(<div className="mbg" onClick={()=>setShowMonthPlanner(false)}><div className="mod fi" onClick={e=>e.stopPropagation()}><h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:isPast?"#6B7280":"#FF6B35",marginBottom:4}}>{isPast?"📜 Month Record":isFuture?"🗓️ Plan Ahead":"📝 Month Notes"}</h3><p style={{fontSize:13,color:"#888",fontWeight:700,marginBottom:14}}>{MONTHS[calMonth]} {calYear}</p><textarea value={monthInput} onChange={e=>setMonthInput(e.target.value)} readOnly={isPast} placeholder={isFuture?"Goals, trips…":"Notes, highlights…"} rows={6} style={{width:"100%",padding:"12px 14px",borderRadius:14,border:"2px solid #FFE0C8",fontSize:14,fontWeight:600,outline:"none",resize:"vertical",background:isPast?"#FAFAFA":"white"}}/><div style={{display:"flex",gap:8,marginTop:12}}><button onClick={()=>setShowMonthPlanner(false)} style={S.cancel}>Cancel</button>{!isPast&&<button onClick={saveMonthNote} style={S.save}>Save Notes</button>}</div></div></div>)}
      {showTaskModal&&(<div className="mbg" onClick={()=>setShowTaskModal(false)}><div className="mod fi" onClick={e=>e.stopPropagation()}><h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#FF6B35",marginBottom:14}}>Add Task</h3><input value={newTask.text} onChange={e=>setNewTask(p=>({...p,text:e.target.value}))} placeholder="Task description…" style={{...S.inp,marginBottom:10,display:"block"}}/><select value={newTask.memberId} onChange={e=>setNewTask(p=>({...p,memberId:e.target.value}))} style={{...S.inp,marginBottom:10,display:"block",background:"white"}}><option value="">Assign to…</option>{members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}</select><div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:800,color:"#888",display:"block",marginBottom:6}}>⭐ Star Reward</label><div style={{display:"flex",gap:8}}>{[1,2,3].map(n=>(<button key={n} onClick={()=>setNewTask(p=>({...p,stars:n}))} style={{flex:1,padding:"9px",borderRadius:12,border:"none",background:newTask.stars===n?"#FFD700":"#F5F5F5",fontWeight:800,fontSize:16,cursor:"pointer"}}>{"⭐".repeat(n)}</button>))}</div></div><div style={{display:"flex",gap:8}}><button onClick={()=>setShowTaskModal(false)} style={S.cancel}>Cancel</button><button onClick={addTask} style={S.save}>Add Task</button></div></div></div>)}
      {showMealModal&&(<div className="mbg" onClick={()=>setShowMealModal(false)}><div className="mod fi" onClick={e=>e.stopPropagation()}><h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#FF6B35",marginBottom:4}}>Plan Meals</h3><p style={{fontSize:13,color:"#888",fontWeight:700,marginBottom:14}}>📅 {selMealDate}</p>{MEAL_SLOTS.map(slot=>(<div key={slot} style={{marginBottom:9}}><label style={{fontSize:11,fontWeight:800,color:"#FF8C42",display:"block",marginBottom:4}}>{slot.toUpperCase()}</label><input value={mealInput[slot]||""} onChange={e=>setMealInput(p=>({...p,[slot]:e.target.value}))} placeholder={`What's for ${slot.toLowerCase()}?`} style={S.inp}/></div>))}<div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>setShowMealModal(false)} style={S.cancel}>Cancel</button><button onClick={saveMeals} style={S.save}>Save Meals</button></div></div></div>)}
      {editingMember&&(<div className="mbg" onClick={()=>setEditingMember(null)}><div className="mod fi" onClick={e=>e.stopPropagation()}><h3 style={{fontFamily:"'Fredoka One',cursive",fontSize:21,color:"#FF6B35",marginBottom:14}}>Edit Member</h3><div style={{display:"flex",alignItems:"center",gap:14,background:"#FFF8F0",borderRadius:16,padding:14,marginBottom:18,borderLeft:`5px solid ${editingMember.color}`}}><div style={{width:52,height:52,borderRadius:"50%",background:editingMember.color+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{editingMember.emoji}</div><div><div style={{fontWeight:900,fontSize:18}}>{editingMember.name||"Name…"}</div><div style={{fontSize:12,color:editingMember.color,fontWeight:700}}>⭐ {starMap[editingMember.id]||0} stars</div></div></div><label style={LBL}>NAME</label><input value={editingMember.name} onChange={e=>setEditingMember(p=>({...p,name:e.target.value}))} placeholder="Name" style={{...S.inp,marginBottom:16,display:"block"}}/><label style={LBL}>EMOJI</label><div style={{display:"flex",flexWrap:"wrap",gap:4,background:"#FFF8F0",borderRadius:12,padding:10,marginBottom:16}}>{EMOJI_OPTIONS.map(em=>(<button key={em} className="eopt" onClick={()=>setEditingMember(p=>({...p,emoji:em}))} style={{background:editingMember.emoji===em?"#FFE8D6":"transparent",border:editingMember.emoji===em?"2px solid #FF6B35":"2px solid transparent"}}>{em}</button>))}</div><label style={LBL}>COLOR</label><div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>{COLOR_PALETTE.map(c=>(<div key={c} className="cdot" onClick={()=>setEditingMember(p=>({...p,color:c}))} style={{background:c,border:editingMember.color===c?"3px solid #111":"3px solid transparent",transform:editingMember.color===c?"scale(1.3)":"scale(1)"}}/>))}</div><div style={{display:"flex",gap:8}}><button onClick={()=>setEditingMember(null)} style={S.cancel}>Cancel</button><button onClick={saveMember} style={S.save}>Save Changes</button></div></div></div>)}
    </div>
  );
}

const S={
  nav:{background:"#FFE8D6",border:"none",borderRadius:12,width:40,height:40,fontSize:18,cursor:"pointer",color:"#FF6B35",fontWeight:800},
  inp:{width:"100%",padding:"11px 14px",borderRadius:12,border:"2px solid #FFE0C8",fontSize:14,outline:"none",fontWeight:600},
  addBtn:{padding:"11px 18px",borderRadius:12,border:"none",background:"#FF6B35",color:"white",fontWeight:800,fontSize:18,cursor:"pointer"},
  cancel:{flex:1,padding:"12px",borderRadius:12,border:"2px solid #EEE",background:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'Nunito',sans-serif",color:"#888"},
  save:{flex:1,padding:"12px",borderRadius:12,border:"none",background:"#FF6B35",color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'Nunito',sans-serif"},
  dashed:{width:"100%",padding:"13px",borderRadius:16,border:"2px dashed #FFBF69",background:"transparent",color:"#FF8C42",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8,fontFamily:"'Nunito',sans-serif"},
};
function pill(active,color){return{padding:"5px 11px",borderRadius:20,border:"none",background:active?color:"#F0F0F0",color:active?"white":"#666",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"};}
function bdg(bg){return{background:bg,color:"white",fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20};}

export default function FamilyHub(){
  return(<ErrorBoundary><FamilyHubInner/></ErrorBoundary>);
}

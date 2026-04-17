import React from "react";
// ============================================================
//  FAMILY HUB — Firebase Firestore Edition
//  Firebase loads dynamically so it works in the preview AND
//  in production (Vercel). Your real config is already wired in.
// ============================================================

import { useState, useEffect, useCallback } from "react";

// ── 🔥 YOUR FIREBASE CONFIG ──────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAntr9mGdG-2Mw30w6yhmWjZoJWbN1GNVE",
  authDomain:        "family-hub-e9ef9.firebaseapp.com",
  databaseURL:       "https://family-hub-e9ef9-default-rtdb.firebaseio.com",
  projectId:         "family-hub-e9ef9",
  storageBucket:     "family-hub-e9ef9.firebasestorage.app",
  messagingSenderId: "328052012200",
  appId:             "1:328052012200:web:7b57ddd06174970d8d3e9d",
};
// ────────────────────────────────────────────────────────────

// Firebase module refs — populated after dynamic import
let DB = null;
let FS = {};  // firestore functions

async function loadFirebase() {
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const firestore = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    DB = firestore.getFirestore(app);
    FS = firestore;
    return true;
  } catch (e) {
    console.warn("Firebase could not load:", e.message);
    return false;
  }
}

// Firestore helpers — safe-wrapped so demo mode works if Firebase fails
async function fsSet(col, id, data) {
  if (!DB) return;
  await FS.setDoc(FS.doc(DB, col, id), data);
}
async function fsDel(col, id) {
  if (!DB) return;
  await FS.deleteDoc(FS.doc(DB, col, id));
}
async function fsUpd(col, id, data) {
  if (!DB) return;
  await FS.updateDoc(FS.doc(DB, col, id), data);
}
function fsListen(col, cb) {
  if (!DB) return () => {};
  return FS.onSnapshot(FS.collection(DB, col), snap => {
    cb(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  });
}
function fsListenDoc(col, id, cb) {
  if (!DB) return () => {};
  return FS.onSnapshot(FS.doc(DB, col, id), snap => {
    cb(snap.exists() ? snap.data() : null);
  });
}

// ── Constants ────────────────────────────────────────────────
const DEFAULT_MEMBERS = [
  { id: "m1", name: "Dad",    color: "#E85D04", emoji: "👨" },
  { id: "m2", name: "Mom",    color: "#7B2D8B", emoji: "👩" },
  { id: "m3", name: "Emma",   color: "#0077B6", emoji: "👧" },
  { id: "m4", name: "Liam",   color: "#2D6A4F", emoji: "👦" },
  { id: "m5", name: "Sophia", color: "#D62828", emoji: "👧" },
  { id: "m6", name: "Noah",   color: "#F4A261", emoji: "👦" },
  { id: "m7", name: "Olivia", color: "#457B9D", emoji: "👧" },
  { id: "m8", name: "Ethan",  color: "#6D6875", emoji: "👦" },
];
const EMOJI_OPTIONS = ["👨","👩","👧","👦","👶","🧑","👱","🧔","👴","👵","🧒","🧑‍🦰","🧑‍🦱","🧑‍🦳","🧑‍🦲","🐶","🐱","⭐","🌟","🦊"];
const COLOR_PALETTE = ["#E85D04","#7B2D8B","#0077B6","#2D6A4F","#D62828","#F4A261","#457B9D","#6D6875","#E63946","#2A9D8F","#E9C46A","#F77F00","#264653","#A8DADC","#9B5DE5","#1D3557"];
const DAYS      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MEAL_SLOTS = ["Breakfast","Lunch","Dinner","Snack"];

const today    = new Date();
const todayStr = fmt(today.getFullYear(), today.getMonth(), today.getDate());
const curMKey  = mKey(today.getFullYear(), today.getMonth());

function fmt(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function mKey(y, m)   { return `${y}-${String(m+1).padStart(2,"0")}`; }
function daysIn(y, m) { return new Date(y, m+1, 0).getDate(); }
function fd(y, m)     { return new Date(y, m, 1).getDay(); }

// ── App ──────────────────────────────────────────────────────
export default function FamilyHub() {
  const [fbReady,  setFbReady]  = useState(false);
  const [fbStatus, setFbStatus] = useState("connecting"); // connecting | live | demo

  // Data state — used in both live and demo mode
  const [members,    setMembers]    = useState(DEFAULT_MEMBERS);
  const [events,     setEvents]     = useState([]);
  const [tasks,      setTasks]      = useState([]);
  const [listItems,  setListItems]  = useState([]);
  const [meals,      setMeals]      = useState({});
  const [monthNotes, setMonthNotes] = useState({});

  // UI state
  const [activeTab,        setActiveTab]        = useState("calendar");
  const [calYear,          setCalYear]          = useState(today.getFullYear());
  const [calMonth,         setCalMonth]         = useState(today.getMonth());
  const [showDayModal,     setShowDayModal]     = useState(false);
  const [showMealModal,    setShowMealModal]    = useState(false);
  const [showTaskModal,    setShowTaskModal]    = useState(false);
  const [showMonthPlanner, setShowMonthPlanner] = useState(false);
  const [editingMember,    setEditingMember]    = useState(null);
  const [selectedDate,     setSelectedDate]     = useState(null);
  const [selMealDate,      setSelMealDate]      = useState(null);
  const [mealInput,        setMealInput]        = useState({});
  const [monthInput,       setMonthInput]       = useState("");
  const [newEvent,         setNewEvent]         = useState({ title:"", memberId:"", time:"" });
  const [newTask,          setNewTask]          = useState({ text:"", memberId:"", stars:1 });
  const [newListItem,      setNewListItem]      = useState({ grocery:"", todo:"" });
  const [activeList,       setActiveList]       = useState("grocery");
  const [filterMember,     setFilterMember]     = useState(null);
  const [toast,            setToast]            = useState("");

  // ── Firebase init + listeners ──
  useEffect(() => {
    let unsubs = [];
    loadFirebase().then(ok => {
      if (!ok) { setFbStatus("demo"); return; }
      setFbStatus("live");
      setFbReady(true);

      // Seed members if empty
      FS.getDocs(FS.collection(DB, "members")).then(snap => {
        if (snap.empty) DEFAULT_MEMBERS.forEach(m => fsSet("members", m.id, m));
      });

      unsubs.push(fsListen("members",   setMembers));
      unsubs.push(fsListen("events",    setEvents));
      unsubs.push(fsListen("tasks",     setTasks));
      unsubs.push(fsListen("listItems", setListItems));

      // meals and monthNotes stored as doc maps
      unsubs.push(fsListen("meals", docs => {
        const map = {};
        docs.forEach(d => { map[d.id] = d; });
        setMeals(map);
      }));
      unsubs.push(fsListen("monthNotes", docs => {
        const map = {};
        docs.forEach(d => { map[d.id] = d; });
        setMonthNotes(map);
      }));
    });
    return () => unsubs.forEach(u => u());
  }, []);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  const getMember = id => members.find(m => m.id === id);

  // ── Calendar helpers ──
  const viewMKey  = mKey(calYear, calMonth);
  const isPast    = viewMKey < curMKey;
  const isFuture  = viewMKey > curMKey;
  const dCount    = daysIn(calYear, calMonth);
  const fDay      = fd(calYear, calMonth);

  function prevMonth() { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }
  function nextMonth() { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }

  function eventsFor(d) { return events.filter(e => e.date === d).sort((a,b) => (a.time||"").localeCompare(b.time||"")); }

  // ── Event actions ──
  function openDay(ds) { setSelectedDate(ds); setNewEvent({title:"",memberId:"",time:""}); setShowDayModal(true); }

  async function addEvent() {
    if (!newEvent.title || !selectedDate) return;
    const id = `ev_${Date.now()}`;
    const ev = { id, title: newEvent.title, time: newEvent.time, date: selectedDate, memberId: newEvent.memberId || null };
    if (fbReady) { await fsSet("events", id, ev); flash("Event saved ☁️"); }
    else setEvents(p => [...p, ev]);
    setNewEvent({title:"",memberId:"",time:""});
  }

  async function deleteEvent(id) {
    if (fbReady) { await fsDel("events", id); flash("Deleted"); }
    else setEvents(p => p.filter(e => e.id !== id));
  }

  // ── Task actions ──
  async function addTask() {
    if (!newTask.text) return;
    const id = `tk_${Date.now()}`;
    const task = { id, text: newTask.text, memberId: newTask.memberId || null, stars: newTask.stars, done: false };
    if (fbReady) { await fsSet("tasks", id, task); flash("Task saved ☁️"); }
    else setTasks(p => [...p, task]);
    setNewTask({text:"",memberId:"",stars:1});
    setShowTaskModal(false);
  }

  async function toggleTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (fbReady) await fsUpd("tasks", id, { done: !t.done });
    else setTasks(p => p.map(x => x.id===id ? {...x, done:!x.done} : x));
  }

  async function deleteTask(id) {
    if (fbReady) await fsDel("tasks", id);
    else setTasks(p => p.filter(t => t.id !== id));
  }

  // ── List actions ──
  async function addListItem(type) {
    if (!newListItem[type]) return;
    const id = `li_${Date.now()}`;
    const item = { id, text: newListItem[type], type, done: false };
    if (fbReady) await fsSet("listItems", id, item);
    else setListItems(p => [...p, item]);
    setNewListItem(p => ({...p, [type]: ""}));
  }

  async function toggleListItem(id) {
    const item = listItems.find(i => i.id === id);
    if (!item) return;
    if (fbReady) await fsUpd("listItems", id, { done: !item.done });
    else setListItems(p => p.map(i => i.id===id ? {...i, done:!i.done} : i));
  }

  async function deleteListItem(id) {
    if (fbReady) await fsDel("listItems", id);
    else setListItems(p => p.filter(i => i.id !== id));
  }

  // ── Meal actions ──
  function openMealModal(ds) { setSelMealDate(ds); setMealInput(meals[ds]||{}); setShowMealModal(true); }

  async function saveMeals() {
    if (!selMealDate) return;
    const data = { id: selMealDate, ...mealInput };
    if (fbReady) { await fsSet("meals", selMealDate, data); flash("Meals saved ☁️"); }
    else setMeals(p => ({...p, [selMealDate]: data}));
    setShowMealModal(false);
  }

  // ── Month notes ──
  function openMonthPlanner() { setMonthInput(monthNotes[viewMKey]?.text || ""); setShowMonthPlanner(true); }

  async function saveMonthNote() {
    const data = { id: viewMKey, text: monthInput };
    if (fbReady) { await fsSet("monthNotes", viewMKey, data); flash("Notes saved ☁️"); }
    else setMonthNotes(p => ({...p, [viewMKey]: data}));
    setShowMonthPlanner(false);
  }

  // ── Member actions ──
  async function saveMember() {
    if (!editingMember) return;
    if (fbReady) { await fsSet("members", editingMember.id, editingMember); flash("Member updated ☁️"); }
    else setMembers(p => p.map(m => m.id===editingMember.id ? {...editingMember} : m));
    setEditingMember(null);
  }

  // ── Derived ──
  const starMap = {};
  tasks.filter(t => t.done && t.memberId).forEach(t => {
    starMap[t.memberId] = (starMap[t.memberId]||0) + (t.stars||1);
  });

  const filteredTasks = filterMember ? tasks.filter(t => t.memberId === filterMember) : tasks;
  const groceryItems  = listItems.filter(i => i.type === "grocery");
  const todoItems     = listItems.filter(i => i.type === "todo");
  const activeItems   = activeList === "grocery" ? groceryItems : todoItems;
  const monthNoteText = monthNotes[viewMKey]?.text || "";

  const tabs = [
    { id:"calendar", label:"Calendar", icon:"📅" },
    { id:"tasks",    label:"Tasks",    icon:"✅" },
    { id:"lists",    label:"Lists",    icon:"📝" },
    { id:"meals",    label:"Meals",    icon:"🍽️" },
    { id:"family",   label:"Family",   icon:"👨‍👩‍👧‍👦" },
  ];

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:"#FFF8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .dc{transition:all .15s;cursor:pointer;} .dc:hover{background:#FFE8D6!important;transform:scale(1.04);}
        .hl{transition:all .2s;} .hl:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1);}
        .lr{transition:all .15s;} .lr:hover{background:#FFF3E8!important;}
        .mr{transition:all .2s;cursor:pointer;} .mr:hover{transform:translateX(5px);}
        .tb{transition:all .2s;} .tb:hover{background:#FFF3E8;}
        .mbg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;}
        .mod{background:white;border-radius:20px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;}
        .fi{animation:fi .3s ease;} @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input,select,textarea{font-family:'Nunito',sans-serif;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#FFBF69;border-radius:4px;}
        .cdot{width:28px;height:28px;border-radius:50%;cursor:pointer;transition:all .15s;border:3px solid transparent;} .cdot:hover{transform:scale(1.25);}
        .eopt{font-size:21px;cursor:pointer;padding:5px;border-radius:8px;border:2px solid transparent;background:transparent;transition:all .15s;} .eopt:hover{background:#FFE8D6;}
        .xb{background:none;border:none;cursor:pointer;color:#DDD;font-size:14px;padding:4px 6px;border-radius:6px;} .xb:hover{color:#E63946;background:#FFF0F0;}
      `}</style>

      {/* Status banner */}
      {fbStatus === "connecting" && (
        <div style={{ background:"#FFF3CD", padding:"9px 16px", fontSize:13, fontWeight:700, color:"#856404", textAlign:"center" }}>
          ⏳ Connecting to Firebase…
        </div>
      )}
      {fbStatus === "demo" && (
        <div style={{ background:"#FFF3CD", padding:"9px 16px", fontSize:13, fontWeight:700, color:"#856404", textAlign:"center" }}>
          ⚠️ Demo mode — running locally, changes won't sync. Check your Firebase config or network.
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"#2D6A4F", color:"white", padding:"10px 22px", borderRadius:30, fontWeight:800, fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,.2)", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#FF6B35,#FF8C42,#FFB347)", padding:"18px 16px 14px", boxShadow:"0 4px 20px rgba(255,107,53,.3)" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:26 }}>🏠</span>
              <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:"white" }}>Family Hub</h1>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"rgba(255,255,255,.85)", fontSize:12, fontWeight:700 }}>
                {MONTHS[today.getMonth()].slice(0,3)} {today.getDate()}, {today.getFullYear()}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.8)", fontWeight:700, marginTop:2, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background: fbStatus==="live"?"#4ADE80":fbStatus==="demo"?"#FCD34D":"#94A3B8", display:"inline-block" }} />
                {fbStatus==="live"?"Live sync ON":fbStatus==="demo"?"Demo mode":"Connecting…"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {members.map(m => (
              <div key={m.id} style={{ background:"rgba(255,255,255,.25)", borderRadius:20, padding:"3px 9px", fontSize:12, color:"white", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:m.color, display:"inline-block" }} />
                {m.emoji} {m.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"white", boxShadow:"0 2px 10px rgba(0,0,0,.08)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:600, margin:"0 auto", display:"flex" }}>
          {tabs.map(t => (
            <button key={t.id} className="tb" onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:"11px 4px 9px", border:"none", background:"none", cursor:"pointer", fontSize:10, fontWeight:800, fontFamily:"'Nunito',sans-serif", color:activeTab===t.id?"#FF6B35":"#999", borderBottom:activeTab===t.id?"3px solid #FF6B35":"3px solid transparent" }}>
              <div style={{ fontSize:17, marginBottom:2 }}>{t.icon}</div>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 12px 100px" }}>

        {/* ══ CALENDAR ══ */}
        {activeTab === "calendar" && (
          <div className="fi">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <button onClick={prevMonth} style={S.nav}>‹</button>
              <div style={{ textAlign:"center" }}>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#FF6B35" }}>{MONTHS[calMonth]} {calYear}</h2>
                <span style={{ background:isPast?"#6B7280":isFuture?"#2D6A4F":"#FF6B35", color:"white", fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:20 }}>
                  {isPast?"📜 Past Record":isFuture?"🗓️ Planning Ahead":"📍 Current Month"}
                </span>
              </div>
              <button onClick={nextMonth} style={S.nav}>›</button>
            </div>

            {/* Quick jump */}
            <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
              {[-2,-1,0,1,2].map(off => {
                const d  = new Date(today.getFullYear(), today.getMonth()+off, 1);
                const y = d.getFullYear(); const m = d.getMonth();
                const active = mKey(y,m) === viewMKey;
                return (
                  <button key={off} onClick={() => { setCalYear(y); setCalMonth(m); }}
                    style={{ padding:"6px 12px", borderRadius:12, border:"none", background:active?"#FF6B35":off<0?"#F0F0F0":off===0?"#FFE8D6":"#ECFDF5", color:active?"white":off<0?"#888":off===0?"#FF6B35":"#2D6A4F", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap", flexShrink:0 }}>
                    {off<0?"📜":off===0?"📍":"🗓️"} {MONTHS[m].slice(0,3)}{y!==today.getFullYear()?` ${y}`:""}
                  </button>
                );
              })}
            </div>

            {/* Month notes */}
            <div style={{ background:isPast?"#F3F4F6":isFuture?"#ECFDF5":"#FFF3E8", borderRadius:14, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, fontSize:13, color:"#666", fontWeight:600, fontStyle:monthNoteText?"normal":"italic" }}>
                {monthNoteText || (isPast?"No notes for this month.":isFuture?"Tap to add planning notes…":"Add notes or goals for this month…")}
              </div>
              <button onClick={openMonthPlanner} style={{ background:isPast?"#6B7280":"#FF6B35", color:"white", border:"none", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                {isPast?"View":"Edit"}
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:3 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:800, color:"#AAA" }}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
              {Array.from({length:fDay}).map((_,i) => <div key={`e${i}`} />)}
              {Array.from({length:dCount}).map((_,i) => {
                const day = i+1;
                const ds  = fmt(calYear,calMonth,day);
                const evs = eventsFor(ds);
                const isToday = ds===todayStr;
                return (
                  <div key={day} className="dc" onClick={() => openDay(ds)}
                    style={{ background:isToday?"#FFE8D6":isPast?"#FAFAFA":"white", borderRadius:10, padding:"5px 3px", minHeight:52, border:isToday?"2px solid #FF6B35":"2px solid transparent", opacity:isPast&&!evs.length?0.5:1 }}>
                    <div style={{ textAlign:"center", fontWeight:isToday?800:600, fontSize:13, color:isToday?"#FF6B35":isPast?"#AAA":"#333", marginBottom:2 }}>{day}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:2, justifyContent:"center" }}>
                      {evs.slice(0,3).map(ev => {
                        const mem = ev.memberId ? getMember(ev.memberId) : null;
                        return <div key={ev.id} style={{ width:7, height:7, borderRadius:"50%", background:mem?mem.color:"#CCC" }} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month events list */}
            <div style={{ marginTop:18 }}>
              <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:17, color:"#333", marginBottom:10 }}>
                {isPast?"📜 Events That Month":isFuture?"🗓️ Planned Events":"Upcoming Events"}
              </h3>
              {events.filter(ev => ev.date.startsWith(viewMKey)).sort((a,b)=>a.date.localeCompare(b.date)).map(ev => {
                const mem = ev.memberId ? getMember(ev.memberId) : null;
                return (
                  <div key={ev.id} className="hl" style={{ background:"white", borderRadius:14, padding:"11px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:10, boxShadow:"0 2px 8px rgba(0,0,0,.06)", borderLeft:`4px solid ${mem?mem.color:"#CCC"}` }}>
                    <div style={{ fontSize:20 }}>{mem?mem.emoji:"📅"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:14 }}>{ev.title}</div>
                      <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>{ev.date}{ev.time?` · ${ev.time}`:""}{mem?` · ${mem.name}`:""}</div>
                    </div>
                    <button className="xb" onClick={() => deleteEvent(ev.id)}>✕</button>
                  </div>
                );
              })}
              {events.filter(ev => ev.date.startsWith(viewMKey)).length===0 && (
                <div style={{ textAlign:"center", color:"#CCC", fontSize:14, padding:"16px 0" }}>
                  {isPast?"No events recorded.":"No events yet — tap a day to add one."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TASKS ══ */}
        {activeTab === "tasks" && (
          <div className="fi">
            <div style={{ background:"linear-gradient(135deg,#FFD700,#FFA500)", borderRadius:20, padding:16, marginBottom:16, boxShadow:"0 4px 15px rgba(255,165,0,.3)" }}>
              <h3 style={{ fontFamily:"'Fredoka One',cursive", color:"white", fontSize:18, marginBottom:10 }}>⭐ Star Board</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {members.filter((_,i)=>i>=2).map(m => (
                  <div key={m.id} style={{ background:"rgba(255,255,255,.3)", borderRadius:12, padding:"8px 4px", textAlign:"center" }}>
                    <div style={{ fontSize:20 }}>{m.emoji}</div>
                    <div style={{ fontSize:10, fontWeight:800, color:"white" }}>{m.name}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:"white" }}>⭐ {starMap[m.id]||0}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:5, marginBottom:14, flexWrap:"wrap" }}>
              <button onClick={()=>setFilterMember(null)} style={pill(!filterMember,"#FF6B35")}>All</button>
              {members.map(m => (
                <button key={m.id} onClick={()=>setFilterMember(filterMember===m.id?null:m.id)} style={pill(filterMember===m.id,m.color)}>
                  {m.emoji} {m.name}
                </button>
              ))}
            </div>
            {filteredTasks.map(t => {
              const mem = t.memberId ? getMember(t.memberId) : null;
              return (
                <div key={t.id} className="hl" style={{ background:"white", borderRadius:16, padding:"13px 15px", marginBottom:8, display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)", opacity:t.done?.6:1 }}>
                  <button onClick={()=>toggleTask(t.id)} style={{ width:28, height:28, borderRadius:"50%", border:`3px solid ${mem?mem.color:"#CCC"}`, background:t.done?(mem?mem.color:"#CCC"):"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {t.done && <span style={{ color:"white", fontSize:13 }}>✓</span>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, textDecoration:t.done?"line-through":"none", color:t.done?"#AAA":"#333" }}>{t.text}</div>
                    {mem && <div style={{ fontSize:12, color:mem.color, fontWeight:700 }}>{mem.emoji} {mem.name}</div>}
                  </div>
                  <div style={{ fontSize:13, color:"#FFB300" }}>{"⭐".repeat(t.stars||1)}</div>
                  <button className="xb" onClick={()=>deleteTask(t.id)}>✕</button>
                </div>
              );
            })}
            <button onClick={()=>setShowTaskModal(true)} style={S.dashed}>+ Add New Task</button>
          </div>
        )}

        {/* ══ LISTS ══ */}
        {activeTab === "lists" && (
          <div className="fi">
            <div style={{ display:"flex", gap:8, marginBottom:14, background:"white", borderRadius:16, padding:6, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
              {[{id:"grocery",label:"🛒 Grocery"},{id:"todo",label:"✅ To-Do"}].map(l => (
                <button key={l.id} onClick={()=>setActiveList(l.id)}
                  style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:activeList===l.id?"#FF6B35":"transparent", color:activeList===l.id?"white":"#888", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all .2s" }}>
                  {l.label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input value={newListItem[activeList]} onChange={e=>setNewListItem(p=>({...p,[activeList]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addListItem(activeList)}
                placeholder={`Add to ${activeList==="grocery"?"grocery":"to-do"} list…`} style={S.inp} />
              <button onClick={()=>addListItem(activeList)} style={S.addBtn}>+</button>
            </div>
            {activeItems.map(item => (
              <div key={item.id} className="lr" style={{ background:"white", borderRadius:14, padding:"13px 15px", marginBottom:7, display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 6px rgba(0,0,0,.05)" }}>
                <div onClick={()=>toggleListItem(item.id)} style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${item.done?"#FF6B35":"#DDD"}`, background:item.done?"#FF6B35":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer" }}>
                  {item.done && <span style={{ color:"white", fontSize:12 }}>✓</span>}
                </div>
                <span onClick={()=>toggleListItem(item.id)} style={{ flex:1, fontWeight:600, fontSize:15, textDecoration:item.done?"line-through":"none", color:item.done?"#BBB":"#333", cursor:"pointer" }}>{item.text}</span>
                <button className="xb" onClick={()=>deleteListItem(item.id)}>✕</button>
              </div>
            ))}
            <div style={{ textAlign:"center", marginTop:10, color:"#AAA", fontSize:13, fontWeight:700 }}>
              {activeItems.filter(i=>i.done).length} of {activeItems.length} done
            </div>
          </div>
        )}

        {/* ══ MEALS ══ */}
        {activeTab === "meals" && (
          <div className="fi">
            <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:"#333", marginBottom:14 }}>This Week's Meals</h3>
            {Array.from({length:7}).map((_,i) => {
              const d  = new Date(today);
              d.setDate(today.getDate() - today.getDay() + i);
              const ds = fmt(d.getFullYear(),d.getMonth(),d.getDate());
              const dm = meals[ds];
              const isToday = ds===todayStr;
              return (
                <div key={ds} style={{ background:isToday?"#FFF3E8":"white", borderRadius:18, marginBottom:10, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.07)", border:isToday?"2px solid #FF6B35":"2px solid transparent" }}>
                  <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:isToday?"#FF6B35":"#333" }}>
                        {DAYS[d.getDay()]} · {MONTHS[d.getMonth()].slice(0,3)} {d.getDate()}
                      </span>
                      {isToday && <span style={{ marginLeft:8, fontSize:10, background:"#FF6B35", color:"white", padding:"2px 8px", borderRadius:10, fontWeight:800 }}>TODAY</span>}
                    </div>
                    <button onClick={()=>openMealModal(ds)} style={{ background:"#FFE8D6", border:"none", borderRadius:10, padding:"5px 11px", color:"#FF6B35", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                      {dm?"Edit":"+ Plan"}
                    </button>
                  </div>
                  {dm && (
                    <div style={{ padding:"0 16px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                      {MEAL_SLOTS.map(slot => dm[slot] && (
                        <div key={slot} style={{ background:"#FFF8F0", borderRadius:10, padding:"7px 10px" }}>
                          <div style={{ fontSize:9, fontWeight:800, color:"#FF8C42", marginBottom:2 }}>{slot.toUpperCase()}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#333" }}>{dm[slot]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ FAMILY ══ */}
        {activeTab === "family" && (
          <div className="fi">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#333" }}>Family Members</h3>
              <span style={{ fontSize:12, color:"#AAA", fontWeight:700 }}>Tap to edit</span>
            </div>
            {members.map(m => (
              <div key={m.id} className="mr" onClick={()=>setEditingMember({...m})}
                style={{ background:"white", borderRadius:18, padding:"15px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, boxShadow:"0 2px 10px rgba(0,0,0,.07)", borderLeft:`5px solid ${m.color}` }}>
                <div style={{ width:48, height:48, borderRadius:"50%", background:m.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{m.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>{m.name}</div>
                  <div style={{ fontSize:12, color:m.color, fontWeight:700 }}>⭐ {starMap[m.id]||0} stars earned</div>
                </div>
                <div style={{ width:18, height:18, borderRadius:"50%", background:m.color }} />
                <span style={{ fontSize:18, color:"#DDD" }}>›</span>
              </div>
            ))}
            <div style={{ marginTop:6, padding:13, background: fbStatus==="live"?"#ECFDF5":"#FFF3E8", borderRadius:14, fontSize:13, fontWeight:700, textAlign:"center", color: fbStatus==="live"?"#2D6A4F":"#856404" }}>
              {fbStatus==="live"?"☁️ All changes sync live across every family device":"🎨 Tap any member to edit name, color, or emoji"}
            </div>
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}

      {/* Day modal */}
      {showDayModal && selectedDate && (
        <div className="mbg" onClick={()=>setShowDayModal(false)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:"#FF6B35" }}>
                {(()=>{ const d=new Date(selectedDate+"T00:00:00"); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`; })()}
              </h3>
              {isPast&&<span style={bdg("#6B7280")}>📜 Past</span>}
              {isFuture&&<span style={bdg("#2D6A4F")}>🗓️ Future</span>}
            </div>
            {eventsFor(selectedDate).length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#AAA", marginBottom:7 }}>EVENTS THIS DAY</div>
                {eventsFor(selectedDate).map(ev => {
                  const mem = ev.memberId ? getMember(ev.memberId) : null;
                  return (
                    <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"#FFF8F0", borderRadius:12, marginBottom:5, borderLeft:`3px solid ${mem?mem.color:"#CCC"}` }}>
                      <span style={{ fontSize:18 }}>{mem?mem.emoji:"📅"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{ev.title}</div>
                        {ev.time&&<div style={{ fontSize:12, color:"#888" }}>{ev.time}{mem?` · ${mem.name}`:""}</div>}
                      </div>
                      <button className="xb" onClick={()=>deleteEvent(ev.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize:11, fontWeight:800, color:"#AAA", marginBottom:8 }}>{isPast?"ADD TO RECORD":"ADD EVENT"}</div>
            <input value={newEvent.title} onChange={e=>setNewEvent(p=>({...p,title:e.target.value}))} placeholder="Event title…" style={{ ...S.inp, marginBottom:8, display:"block" }} />
            <input value={newEvent.time}  onChange={e=>setNewEvent(p=>({...p,time:e.target.value}))}  placeholder="Time (e.g. 4:00 PM)" style={{ ...S.inp, marginBottom:8, display:"block" }} />
            <select value={newEvent.memberId} onChange={e=>setNewEvent(p=>({...p,memberId:e.target.value}))} style={{ ...S.inp, marginBottom:12, display:"block", background:"white" }}>
              <option value="">Family event</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowDayModal(false)} style={S.cancel}>Close</button>
              <button onClick={addEvent} style={S.save}>Add Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Month planner */}
      {showMonthPlanner && (
        <div className="mbg" onClick={()=>setShowMonthPlanner(false)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:21, color:isPast?"#6B7280":"#FF6B35", marginBottom:4 }}>
              {isPast?"📜 Month Record":isFuture?"🗓️ Plan Ahead":"📝 Month Notes"}
            </h3>
            <p style={{ fontSize:13, color:"#888", fontWeight:700, marginBottom:14 }}>{MONTHS[calMonth]} {calYear}</p>
            <textarea value={monthInput} onChange={e=>setMonthInput(e.target.value)} readOnly={isPast}
              placeholder={isFuture?"Goals, trips, dates to prepare for…":"Notes, goals, or highlights…"}
              rows={6} style={{ width:"100%", padding:"12px 14px", borderRadius:14, border:"2px solid #FFE0C8", fontSize:14, fontWeight:600, outline:"none", resize:"vertical", background:isPast?"#FAFAFA":"white" }} />
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={()=>setShowMonthPlanner(false)} style={S.cancel}>Cancel</button>
              {!isPast&&<button onClick={saveMonthNote} style={S.save}>Save Notes</button>}
            </div>
          </div>
        </div>
      )}

      {/* Add task */}
      {showTaskModal && (
        <div className="mbg" onClick={()=>setShowTaskModal(false)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:21, color:"#FF6B35", marginBottom:14 }}>Add Task</h3>
            <input value={newTask.text} onChange={e=>setNewTask(p=>({...p,text:e.target.value}))} placeholder="Task description…" style={{ ...S.inp, marginBottom:10, display:"block" }} />
            <select value={newTask.memberId} onChange={e=>setNewTask(p=>({...p,memberId:e.target.value}))} style={{ ...S.inp, marginBottom:10, display:"block", background:"white" }}>
              <option value="">Assign to…</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
            </select>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:800, color:"#888", display:"block", marginBottom:6 }}>⭐ Star Reward</label>
              <div style={{ display:"flex", gap:8 }}>
                {[1,2,3].map(n=>(
                  <button key={n} onClick={()=>setNewTask(p=>({...p,stars:n}))}
                    style={{ flex:1, padding:"9px", borderRadius:12, border:"none", background:newTask.stars===n?"#FFD700":"#F5F5F5", fontWeight:800, fontSize:16, cursor:"pointer" }}>
                    {"⭐".repeat(n)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setShowTaskModal(false)} style={S.cancel}>Cancel</button>
              <button onClick={addTask} style={S.save}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Meal modal */}
      {showMealModal && (
        <div className="mbg" onClick={()=>setShowMealModal(false)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:21, color:"#FF6B35", marginBottom:4 }}>Plan Meals</h3>
            <p style={{ fontSize:13, color:"#888", fontWeight:700, marginBottom:14 }}>📅 {selMealDate}</p>
            {MEAL_SLOTS.map(slot=>(
              <div key={slot} style={{ marginBottom:9 }}>
                <label style={{ fontSize:11, fontWeight:800, color:"#FF8C42", display:"block", marginBottom:4 }}>{slot.toUpperCase()}</label>
                <input value={mealInput[slot]||""} onChange={e=>setMealInput(p=>({...p,[slot]:e.target.value}))} placeholder={`What's for ${slot.toLowerCase()}?`} style={S.inp} />
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <button onClick={()=>setShowMealModal(false)} style={S.cancel}>Cancel</button>
              <button onClick={saveMeals} style={S.save}>Save Meals</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit member */}
      {editingMember && (
        <div className="mbg" onClick={()=>setEditingMember(null)}>
          <div className="mod fi" onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Fredoka One',cursive", fontSize:21, color:"#FF6B35", marginBottom:14 }}>Edit Member</h3>
            <div style={{ display:"flex", alignItems:"center", gap:14, background:"#FFF8F0", borderRadius:16, padding:14, marginBottom:18, borderLeft:`5px solid ${editingMember.color}` }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:editingMember.color+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{editingMember.emoji}</div>
              <div>
                <div style={{ fontWeight:900, fontSize:18 }}>{editingMember.name||"Name…"}</div>
                <div style={{ fontSize:12, color:editingMember.color, fontWeight:700 }}>⭐ {starMap[editingMember.id]||0} stars</div>
              </div>
            </div>
            <label style={{ fontSize:11, fontWeight:800, color:"#888", display:"block", marginBottom:5 }}>NAME</label>
            <input value={editingMember.name} onChange={e=>setEditingMember(p=>({...p,name:e.target.value}))} placeholder="Name" style={{ ...S.inp, marginBottom:16, display:"block" }} />
            <label style={{ fontSize:11, fontWeight:800, color:"#888", display:"block", marginBottom:8 }}>EMOJI</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, background:"#FFF8F0", borderRadius:12, padding:10, marginBottom:16 }}>
              {EMOJI_OPTIONS.map(em=>(
                <button key={em} className="eopt" onClick={()=>setEditingMember(p=>({...p,emoji:em}))}
                  style={{ background:editingMember.emoji===em?"#FFE8D6":"transparent", border:editingMember.emoji===em?"2px solid #FF6B35":"2px solid transparent" }}>
                  {em}
                </button>
              ))}
            </div>
            <label style={{ fontSize:11, fontWeight:800, color:"#888", display:"block", marginBottom:8 }}>COLOR</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:9, marginBottom:20 }}>
              {COLOR_PALETTE.map(c=>(
                <div key={c} className="cdot" onClick={()=>setEditingMember(p=>({...p,color:c}))}
                  style={{ background:c, border:editingMember.color===c?"3px solid #111":"3px solid transparent", transform:editingMember.color===c?"scale(1.3)":"scale(1)" }} />
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setEditingMember(null)} style={S.cancel}>Cancel</button>
              <button onClick={saveMember} style={S.save}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────
const S = {
  nav:    { background:"#FFE8D6", border:"none", borderRadius:12, width:40, height:40, fontSize:18, cursor:"pointer", color:"#FF6B35", fontWeight:800 },
  inp:    { width:"100%", padding:"11px 14px", borderRadius:12, border:"2px solid #FFE0C8", fontSize:14, outline:"none", fontWeight:600 },
  addBtn: { padding:"11px 18px", borderRadius:12, border:"none", background:"#FF6B35", color:"white", fontWeight:800, fontSize:18, cursor:"pointer" },
  cancel: { flex:1, padding:"12px", borderRadius:12, border:"2px solid #EEE", background:"white", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif", color:"#888" },
  save:   { flex:1, padding:"12px", borderRadius:12, border:"none", background:"#FF6B35", color:"white", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  dashed: { width:"100%", padding:"13px", borderRadius:16, border:"2px dashed #FFBF69", background:"transparent", color:"#FF8C42", fontWeight:800, fontSize:15, cursor:"pointer", marginTop:8, fontFamily:"'Nunito',sans-serif" },
};
function pill(active, color) {
  return { padding:"5px 11px", borderRadius:20, border:"none", background:active?color:"#F0F0F0", color:active?"white":"#666", fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif" };
}
function bdg(bg) {
  return { background:bg, color:"white", fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:20 };
}

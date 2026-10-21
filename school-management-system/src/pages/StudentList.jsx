// import { useEffect, useMemo, useState } from "react";
// import StudentCard from "../components/StudentCard";
// import StudentReport from "../components/StudentReport";
// import "../StudentModule.css";

// const API = "http://localhost:5000/api/students";
// export default function StudentList() {
//   const [students, setStudents] = useState([]);
//   const [search, setSearch] = useState("");
//   const [selected, setSelected] = useState(null);
//   const [view, setView] = useState("list");
//   const [error, setError] = useState("");
//   async function load() {
//     try { const r = await fetch(API); const j = await r.json(); if (!r.ok) throw new Error(j.message); setStudents((Array.isArray(j) ? j : (j.data || [])).filter(s => !s.isDeleted)); }
//     catch(e) { setError(e.message || "Could not load students."); }
//   }
//   useEffect(() => { load(); }, []);
//   const filtered = useMemo(() => {
//     const q = search.toLowerCase().trim();
//     return students.filter(s => [s.firstName,s.middleName,s.lastName,s.admissionNumber,s.rollNumber,s.className,s.father?.name,s.father?.phone].some(v => String(v||"").toLowerCase().includes(q)));
//   }, [students, search]);
//   async function softDelete(s) {
//     if (!window.confirm(`Move ${s.firstName} ${s.lastName} to Deleted Students?`)) return;
//     try { const r = await fetch(`${API}/${s._id}`, {method:"DELETE"}); const j = await r.json(); if (!r.ok) throw new Error(j.message); await load(); }
//     catch(e) { setError(e.message || "Delete failed. Ensure soft-delete backend route is installed."); }
//   }
//   if (view === "report" && selected) return <StudentReport student={selected} onBack={() => setView("list")} />;
//   return <div className="sm-page"><div className="sm-header"><div><span className="sm-eyebrow">STUDENT RECORDS</span><h1>Student List</h1><p>Search, view, print or move student records to Deleted Students.</p></div><button className="sm-outline-btn" onClick={load}>↻ Refresh</button></div>
//     <div className="sm-list-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, admission no., roll no., class or parent phone..."/><span>{filtered.length} student(s)</span></div>
//     {error && <div className="sm-notice error">{error}</div>}
//     <div className="sm-group"><div className="sm-table-wrap"><table className="sm-table"><thead><tr><th>Student</th><th>Admission No.</th><th>Roll No.</th><th>Class</th><th>Father</th><th>Actions</th></tr></thead><tbody>
//       {filtered.map(s=><tr key={s._id}><td>{s.firstName} {s.lastName}</td><td>{s.admissionNumber}</td><td>{s.rollNumber}</td><td>{s.className} {s.section}</td><td>{s.father?.name || "—"}</td><td><div className="sm-row-actions"><button onClick={()=>{setSelected(s);setView("report");}}>Report</button><button onClick={()=>{setSelected(s);setView("card");}}>Card</button><button className="danger" onClick={()=>softDelete(s)}>Delete</button></div></td></tr>)}
//       {!filtered.length && <tr><td colSpan="6">No matching students found.</td></tr>}
//     </tbody></table></div></div>
//     {view === "card" && selected && <div className="sm-card-preview"><button className="sm-outline-btn" onClick={()=>setView("list")}>Close card</button><StudentCard student={selected} onReport={()=>setView("report")}/></div>}
//     <style>{`.sm-list-toolbar{display:flex;gap:14px;align-items:center;margin-bottom:17px}.sm-list-toolbar input{flex:1;min-width:0;height:43px;padding:0 13px;border:1px solid #d5deea;border-radius:8px;font-size:13px}.sm-list-toolbar span{font-size:12px;color:#64748b;white-space:nowrap}.sm-row-actions{display:flex;gap:6px}.sm-row-actions button{border:1px solid #dbe3ef;background:white;color:#1d4ed8;border-radius:6px;padding:7px 9px;font-size:11px;cursor:pointer}.sm-row-actions button.danger{color:#b91c1c}.sm-card-preview{display:flex;flex-direction:column;align-items:flex-start;gap:15px;margin-top:20px}.sm-card-preview>button{align-self:flex-end}@media(max-width:700px){.sm-list-toolbar{align-items:stretch;flex-direction:column}.sm-row-actions{flex-wrap:wrap}}`}</style>
//   </div>;
// }

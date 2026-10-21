// import { useEffect, useState } from "react";
// import "../StudentModule.css";

// const API = "http://localhost:5000/api/students";
// export default function DeletedStudents() {
//   const [students,setStudents]=useState([]);
//   const [error,setError]=useState("");
//   async function load(){
//     try { const r=await fetch(`${API}/deleted`); const j=await r.json(); if(!r.ok) throw new Error(j.message||"Unable to load deleted students."); setStudents(Array.isArray(j)?j:(j.data||[])); setError(""); }
//     catch(e){setError(e.message||"Could not load deleted students. Install the soft-delete routes first.");}
//   }
//   useEffect(()=>{load();},[]);
//   async function restore(s){
//     if(!window.confirm(`Restore ${s.firstName} ${s.lastName}?`)) return;
//     try { const r=await fetch(`${API}/${s._id}/restore`,{method:"PATCH"}); const j=await r.json(); if(!r.ok) throw new Error(j.message||"Restore failed."); await load(); }
//     catch(e){setError(e.message||"Restore failed.");}
//   }
//   return <div className="sm-page"><div className="sm-header"><div><span className="sm-eyebrow">RECOVERY</span><h1>Deleted Students</h1><p>Restore student records that were previously deleted.</p></div><button className="sm-outline-btn" onClick={load}>↻ Refresh</button></div>
//     {error&&<div className="sm-notice error">{error}</div>}
//     <div className="sm-group"><div className="sm-table-wrap"><table className="sm-table"><thead><tr><th>Name</th><th>Admission No.</th><th>Roll No.</th><th>Class</th><th>Deleted At</th><th>Action</th></tr></thead><tbody>
//       {students.map(s=><tr key={s._id}><td>{s.firstName} {s.lastName}</td><td>{s.admissionNumber}</td><td>{s.rollNumber}</td><td>{s.className} {s.section}</td><td>{s.deletedAt?new Date(s.deletedAt).toLocaleString():"—"}</td><td><button className="sm-primary-btn" onClick={()=>restore(s)}>Restore</button></td></tr>)}
//       {!students.length&&<tr><td colSpan="6">No deleted students found.</td></tr>}
//     </tbody></table></div></div>
//   </div>;
// }

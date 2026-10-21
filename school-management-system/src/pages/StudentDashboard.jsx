// import { useEffect, useState } from "react";
// import "../StudentModule.css";

// const API = "http://localhost:5000/api/students";
// export default function StudentDashboard() {
//   const [students, setStudents] = useState([]);
//   const [error, setError] = useState("");
//   useEffect(() => { fetch(API).then(r => r.json()).then(j => setStudents(Array.isArray(j) ? j : (j.data || []))).catch(() => setError("Could not load students. Check the backend.")); }, []);
//   const active = students.filter(s => !s.isDeleted);
//   const today = new Date().toISOString().slice(0, 10);
//   const recent = active.filter(s => String(s.admissionDate || "").slice(0,10) === today).length;
//   const cards = [
//     ["Total Active Students", active.length, "users"],
//     ["Deleted Students", students.filter(s => s.isDeleted).length, "archive"],
//     ["Today's Admissions", recent, "user-plus"],
//     ["Classes Represented", new Set(active.map(s => s.className).filter(Boolean)).size, "school"]
//   ];
//   return <div className="sm-page"><div className="sm-header"><div><span className="sm-eyebrow">OVERVIEW</span><h1>Student Dashboard</h1><p>Student admission and record summary.</p></div><button className="sm-primary-btn" onClick={() => window.location.reload()}>↻ Refresh</button></div>
//     {error && <div className="sm-notice error">{error}</div>}
//     <div className="student-stat-grid">{cards.map(([label,value,icon])=><div className="student-stat" key={label}><span>{icon === "users" ? "♙" : icon === "archive" ? "▣" : icon === "user-plus" ? "＋" : "⌂"}</span><p>{label}</p><strong>{value}</strong></div>)}</div>
//     <div className="sm-group"><div className="sm-group-title"><h3>Recently Added Students</h3><p>Latest student records in the database.</p></div>
//       {active.length === 0 ? <p>No students found yet.</p> : <div className="sm-table-wrap"><table className="sm-table"><thead><tr><th>Name</th><th>Admission No.</th><th>Class</th><th>Admission Date</th></tr></thead><tbody>{[...active].sort((a,b)=>String(b.admissionDate||"").localeCompare(String(a.admissionDate||""))).slice(0,8).map(s=><tr key={s._id}><td>{s.firstName} {s.lastName}</td><td>{s.admissionNumber}</td><td>{s.className} {s.section}</td><td>{s.admissionDate || "—"}</td></tr>)}</tbody></table></div>}
//     </div>
//     <style>{`.student-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px}.student-stat{background:white;border:1px solid #e1e8f0;border-radius:13px;padding:20px}.student-stat>span{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eaf1ff;color:#2563eb;font-size:22px}.student-stat p{color:#64748b;font-size:12px;margin:15px 0 8px}.student-stat strong{font-size:28px}.sm-table-wrap{overflow:auto}.sm-table{width:100%;border-collapse:collapse;font-size:13px}.sm-table th,.sm-table td{text-align:left;padding:13px 11px;border-bottom:1px solid #e8edf4;white-space:nowrap}.sm-table th{background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase}@media(max-width:800px){.student-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
//   </div>;
// }

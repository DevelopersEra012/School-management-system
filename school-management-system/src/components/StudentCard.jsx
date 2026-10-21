import "./StudentAdmission.css";

export default function StudentCard({ student, onReport }) {
  if (!student) return null;
  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  return <article className="student-card-print" style={{border:"1px solid #dbe3ef",borderRadius:14,padding:20,maxWidth:460,background:"#fff",color:"#172033"}}>
    <div style={{display:"flex",gap:15,alignItems:"center"}}>
      {student.studentPhoto ? <img src={student.studentPhoto} alt="Student" style={{width:82,height:95,objectFit:"cover",borderRadius:9}}/> : <div style={{width:82,height:95,borderRadius:9,display:"grid",placeItems:"center",background:"#eaf1ff",color:"#2563eb",fontSize:28,fontWeight:800}}>{(student.firstName||"S").charAt(0).toUpperCase()}</div>}
      <div><small style={{color:"#2563eb",fontWeight:800,letterSpacing:1}}>SCHOOL STUDENT CARD</small><h2 style={{margin:"7px 0"}}>{name}</h2><p style={{margin:"5px 0",fontSize:13}}>Admission No: {student.admissionNumber}</p><p style={{margin:"5px 0",fontSize:13}}>Roll No: {student.rollNumber}</p></div>
    </div>
    <hr style={{border:0,borderTop:"1px solid #e5eaf2",margin:"16px 0"}}/>
    <p>Class: <strong>{student.className} {student.section}</strong></p>
    <p>Date of Birth: <strong>{student.dateOfBirth || "—"}</strong></p>
    <p>Father: <strong>{student.father?.name || "—"}</strong></p>
    <div style={{display:"flex",gap:8,marginTop:16}}><button className="sm-outline-btn" onClick={() => window.print()}>Print / Save PDF</button>{onReport && <button className="sm-primary-btn" onClick={onReport}>Full Report</button>}</div>
  </article>;
}

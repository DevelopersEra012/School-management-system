import "./StudentAdmission.css";

const Row = ({ label, value }) => <div className="report-row"><span>{label}</span><strong>{value || "—"}</strong></div>;

export default function StudentReport({ student, onBack }) {
  if (!student) return <div className="sm-page">No student selected.</div>;
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  return <div className="sm-page report-page">
    <div className="sm-header no-print"><div><span className="sm-eyebrow">STUDENT RECORD</span><h1>Student Overall Report</h1><p>Review, print or save this report as PDF.</p></div><div className="sm-header-actions"><button className="sm-outline-btn" onClick={onBack}>← Back</button><button className="sm-primary-btn" onClick={() => window.print()}>Print / Save PDF</button></div></div>
    <article className="report-paper">
      <header className="report-title"><h1>STUDENT INFORMATION REPORT</h1><p>School Management System</p></header>
      <div className="report-identity">
        {student.studentPhoto ? <img src={student.studentPhoto} alt="Student" /> : <div className="report-placeholder">{(student.firstName || "S").charAt(0).toUpperCase()}</div>}
        <div><h2>{fullName}</h2><p>Admission Number: <strong>{student.admissionNumber}</strong></p><p>Roll Number: <strong>{student.rollNumber}</strong></p><p>Class: <strong>{student.className} {student.section}</strong></p></div>
      </div>
      <h3>Admission Details</h3><div className="report-grid">
        <Row label="Admission Number" value={student.admissionNumber}/><Row label="Roll Number" value={student.rollNumber}/><Row label="Admission Date" value={student.admissionDate}/><Row label="Class" value={student.className}/><Row label="Section" value={student.section}/><Row label="Biometric ID" value={student.biometricId}/>
      </div>
      <h3>Student Personal Information</h3><div className="report-grid">
        <Row label="Full Name" value={fullName}/><Row label="Gender" value={student.gender}/><Row label="Date of Birth" value={student.dateOfBirth}/><Row label="Blood Group" value={student.bloodGroup}/><Row label="Religion" value={student.religion}/><Row label="Caste" value={student.caste}/><Row label="Mother Tongue" value={student.motherTongue}/><Row label="Place of Birth" value={student.placeOfBirth}/><Row label="Nationality" value={student.nationality}/><Row label="Student Phone" value={student.studentPhone}/><Row label="Student Email" value={student.studentEmail}/>
      </div>
      <h3>Father Details</h3><div className="report-grid"><Row label="Name" value={student.father?.name}/><Row label="Phone" value={student.father?.phone}/><Row label="Occupation" value={student.father?.occupation}/><Row label="Qualification" value={student.father?.qualification}/><Row label="CNIC" value={student.father?.cnic}/></div>
      <h3>Mother Details</h3><div className="report-grid"><Row label="Name" value={student.mother?.name}/><Row label="Phone" value={student.mother?.phone}/><Row label="Occupation" value={student.mother?.occupation}/><Row label="Qualification" value={student.mother?.qualification}/><Row label="CNIC" value={student.mother?.cnic}/></div>
      <h3>Guardian, Account & Address</h3><div className="report-grid"><Row label="Guardian Name" value={student.emergencyContact?.name}/><Row label="Parent Login Email" value={student.parentLoginEmail}/><Row label="Guardian Address" value={student.guardianAddress}/><Row label="Current Address" value={student.currentAddress}/><Row label="Permanent Address" value={student.permanentAddress}/></div>
      <h3>Documents</h3><div className="report-grid"><Row label="Student Photo URL" value={student.studentPhoto}/><Row label="Birth Certificate URL" value={student.birthCertificate}/></div>
      <footer className="report-footer">Generated from the School Management System student record.</footer>
    </article>
    <style>{`.report-paper{max-width:900px;margin:0 auto;background:white;padding:38px;border:1px solid #e1e8f0;border-radius:12px;color:#172033}.report-title{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:18px}.report-title h1{font-size:21px;letter-spacing:1px}.report-title p{color:#64748b}.report-identity{display:flex;gap:20px;align-items:center;padding:24px 0}.report-identity img,.report-placeholder{width:100px;height:115px;object-fit:cover;border-radius:8px}.report-placeholder{display:grid;place-items:center;background:#eaf1ff;color:#2563eb;font-size:35px;font-weight:bold}.report-identity h2{margin:0 0 12px}.report-identity p{font-size:13px;margin:7px 0}.report-paper h3{margin:25px 0 12px;padding-bottom:8px;border-bottom:1px solid #dbe3ef;color:#1d4ed8;font-size:15px}.report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.report-row{display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #edf1f6;font-size:12px;overflow-wrap:anywhere}.report-row span{color:#64748b}.report-row strong{text-align:right;white-space:pre-wrap}.report-footer{margin-top:32px;padding-top:12px;border-top:1px solid #dbe3ef;color:#94a3b8;font-size:11px}@media(max-width:600px){.report-paper{padding:18px}.report-grid{grid-template-columns:1fr}.report-identity{align-items:flex-start}}@media print{@page{size:A4;margin:12mm}body{background:white!important}.no-print{display:none!important}.sm-page{padding:0!important;background:white!important}.report-paper{max-width:none;border:0;border-radius:0;padding:0}.report-paper h3{break-after:avoid}.report-row{break-inside:avoid}}`}</style>
  </div>;
}

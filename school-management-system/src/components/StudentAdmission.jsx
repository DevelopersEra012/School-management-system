
import { useState } from "react";
import "./StudentAdmission.css";

const API = "http://localhost:5000/api/students";

const STEPS = [
  "Admission Details",
  "Student Information",
  "Parent & Guardian",
  "Documents",
];

const emptyForm = () => ({
  admissionNumber: "",
  rollNumber: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  className: "",
  section: "",
  biometricId: "",

  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  religion: "",
  caste: "",
  motherTongue: "",
  placeOfBirth: "",
  nationality: "Pakistani",
  studentPhone: "",
  studentEmail: "",

  fatherName: "",
  fatherPhone: "",
  fatherOccupation: "",
  fatherQualification: "",
  fatherCnic: "",

  motherName: "",
  motherPhone: "",
  motherOccupation: "",
  motherQualification: "",
  motherCnic: "",

  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianOccupation: "",
  guardianAddress: "",
  currentAddress: "",
  permanentAddress: "",
  parentLoginEmail: "",
});

const emptyFiles = () => ({
  studentPhoto: null,
  birthCertificate: null,
  fatherPhoto: null,
  motherPhoto: null,
});

function Field({
  label,
  name,
  form,
  change,
  type = "text",
  required = false,
  options,
}) {
  return (
    <div className="sm-field">
      <label htmlFor={name}>
        {label}
        {required && <em> *</em>}
      </label>

      {options ? (
        <select
          id={name}
          name={name}
          value={form[name] || ""}
          onChange={change}
          required={required}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={form[name] || ""}
          onChange={change}
          required={required}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}
    </div>
  );
}

function FileField({ label, name, file, onChange, accept }) {
  return (
    <div className="sm-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        onChange={onChange}
      />
      {file && <small>Selected: {file.name}</small>}
    </div>
  );
}

function Group({ title, note, children }) {
  return (
    <section className="sm-group">
      <div className="sm-group-title">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      <div className="sm-grid">{children}</div>
    </section>
  );
}

export default function StudentAdmission() {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState(emptyFiles);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("error");
  const [success, setSuccess] = useState(null);

  const [parentMode, setParentMode] = useState("existing");
  const [parentQuery, setParentQuery] = useState("");
  const [parentResults, setParentResults] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [searchingParents, setSearchingParents] = useState(false);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const changeFile = (event) => {
    const { name, files: selected } = event.target;
    const file = selected?.[0] || null;

    if (file && file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setNotice("Each file must be 5 MB or smaller.");
      setNoticeType("error");
      return;
    }

    setFiles((old) => ({ ...old, [name]: file }));
    setNotice("");
  };

  const notify = (message, type = "error") => {
    setNotice(message);
    setNoticeType(type);
  };

  function validateStep() {
    const requiredFields = {
      0: [
        ["admissionNumber", "Admission number"],
        ["rollNumber", "Roll number"],
        ["admissionDate", "Admission date"],
        ["className", "Class"],
        ["section", "Section"],
      ],
      1: [
        ["firstName", "First name"],
        ["lastName", "Last name"],
        ["gender", "Gender"],
        ["dateOfBirth", "Date of birth"],
      ],
    };

    for (const [key, label] of requiredFields[step] || []) {
      if (!String(form[key] || "").trim()) {
        notify(`${label} is required.`);
        return false;
      }
    }

    return true;
  }

  function next() {
    if (busy || step >= 3) return;
    if (!validateStep()) return;

    setNotice("");
    setStep((old) => Math.min(old + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previous() {
    if (busy) return;

    setNotice("");
    setStep((old) => Math.max(old - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function searchExistingParents() {
    const term = parentQuery.trim();

    if (!term) {
      notify("Enter a parent name, phone, CNIC or email.");
      return;
    }

    setSearchingParents(true);
    setNotice("");

    try {
      const response = await fetch(API);
      const result = await response.json();

      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unable to load students.");
      }

      const matches = result.data.filter((student) => {
        const values = [
          student.father?.name,
          student.father?.phone,
          student.father?.cnic,
          student.mother?.name,
          student.mother?.phone,
          student.mother?.cnic,
          student.emergencyContact?.name,
          student.emergencyContact?.phone,
          student.emergencyContact?.email,
          student.parentLoginEmail,
        ];

        return values.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term.toLowerCase())
        );
      });

      setParentResults(matches);

      if (matches.length === 0) {
        notify("No existing parent found. You can select New Parent.");
      }
    } catch (error) {
      notify(error.message || "Parent search failed.");
    } finally {
      setSearchingParents(false);
    }
  }

  function selectExistingParent(student) {
    setSelectedParent(student);

    setForm((old) => ({
      ...old,

      fatherName: student.father?.name || "",
      fatherPhone: student.father?.phone || "",
      fatherOccupation: student.father?.occupation || "",
      fatherQualification: student.father?.qualification || "",
      fatherCnic: student.father?.cnic || "",

      motherName: student.mother?.name || "",
      motherPhone: student.mother?.phone || "",
      motherOccupation: student.mother?.occupation || "",
      motherQualification: student.mother?.qualification || "",
      motherCnic: student.mother?.cnic || "",

      guardianName: student.emergencyContact?.name || "",
      guardianPhone: student.emergencyContact?.phone || "",
      guardianRelationship: student.emergencyContact?.relationship || "",
      guardianEmail: student.emergencyContact?.email || "",
      guardianOccupation: student.emergencyContact?.occupation || "",

      guardianAddress: student.guardianAddress || "",
      currentAddress: student.currentAddress || "",
      permanentAddress: student.permanentAddress || "",
      parentLoginEmail: student.parentLoginEmail || "",
    }));

    notify("Parent details loaded. Please review before submitting.", "success");
  }

  function chooseNewParent() {
    setParentMode("new");
    setSelectedParent(null);
    setParentQuery("");
    setParentResults([]);
    setNotice("");
  }

  async function submit() {
    // This function cannot submit from another step.
    if (step !== 3 || busy || success) return;

    setBusy(true);
    setNotice("");

    const payload = {
      admissionNumber: form.admissionNumber.trim(),
      rollNumber: form.rollNumber.trim(),
      admissionDate: form.admissionDate,
      className: form.className.trim(),
      section: form.section.trim(),
      biometricId: form.biometricId,

      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      bloodGroup: form.bloodGroup,
      religion: form.religion,
      caste: form.caste,
      motherTongue: form.motherTongue,
      placeOfBirth: form.placeOfBirth,
      nationality: form.nationality,
      studentPhone: form.studentPhone,
      studentEmail: form.studentEmail,

      father: {
        name: form.fatherName,
        phone: form.fatherPhone,
        occupation: form.fatherOccupation,
        qualification: form.fatherQualification,
        cnic: form.fatherCnic,
      },

      mother: {
        name: form.motherName,
        phone: form.motherPhone,
        occupation: form.motherOccupation,
        qualification: form.motherQualification,
        cnic: form.motherCnic,
      },

      emergencyContact: {
        name: form.guardianName,
        phone: form.guardianPhone,
        relationship: form.guardianRelationship,
        email: form.guardianEmail,
        occupation: form.guardianOccupation,
      },

      guardianAddress: form.guardianAddress,
      currentAddress: form.currentAddress,
      permanentAddress: form.permanentAddress,
      parentLoginEmail: form.parentLoginEmail,
    };

    try {
      const body = new FormData();
      body.append("studentData", JSON.stringify(payload));

      Object.entries(files).forEach(([key, file]) => {
        if (file) body.append(key, file);
      });

      const response = await fetch(API, {
        method: "POST",
        body,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Student could not be created.");
      }

      setSuccess(result.data);
      notify("Student created successfully.", "success");
    } catch (error) {
      notify(error.message || "Unable to connect to backend.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setForm(emptyForm());
    setFiles(emptyFiles());
    setStep(0);
    setBusy(false);
    setNotice("");
    setNoticeType("error");
    setSuccess(null);

    setParentMode("existing");
    setParentQuery("");
    setParentResults([]);
    setSelectedParent(null);
    setSearchingParents(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const studentName = [
    form.firstName,
    form.middleName,
    form.lastName,
  ].filter(Boolean).join(" ");

  return (
    <div className="sm-page">
      <div className="sm-header">
        <div>
          <span className="sm-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Student Admission</h1>
          <p>Complete the four steps, then submit the admission.</p>
        </div>

        <button
          type="button"
          className="sm-primary-btn"
          onClick={reset}
          disabled={busy}
        >
          + New Student
        </button>
      </div>

      <div className="sm-card">
        <div className="sm-steps">
          {STEPS.map((title, index) => (
            <button
              type="button"
              key={title}
              className={`sm-step ${
                index === step ? "current" : index < step ? "done" : ""
              }`}
              onClick={() => {
                if (index < step && !busy) {
                  setStep(index);
                  setNotice("");
                }
              }}
              disabled={busy}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              <small>{title}</small>
            </button>
          ))}
        </div>

        {notice && (
          <div className={`sm-notice ${noticeType}`} role="status">
            {notice}
          </div>
        )}

        {/* No HTML form: Next buttons cannot submit the admission. */}
        <div className="sm-admission-form">
          {step === 0 && (
            <div className="sm-content">
              <Group title="Admission Details">
                <Field label="Admission Number" name="admissionNumber" form={form} change={change} required />
                <Field label="Roll Number" name="rollNumber" form={form} change={change} required />
                <Field label="Admission Date" name="admissionDate" form={form} change={change} type="date" required />
                <Field label="Class" name="className" form={form} change={change} required />
                <Field label="Section" name="section" form={form} change={change} required />
                <Field label="Biometric ID" name="biometricId" form={form} change={change} />
              </Group>
            </div>
          )}

          {step === 1 && (
            <div className="sm-content">
              <Group title="Student Personal Information">
                <Field label="First Name" name="firstName" form={form} change={change} required />
                <Field label="Middle Name" name="middleName" form={form} change={change} />
                <Field label="Last Name" name="lastName" form={form} change={change} required />
                <Field label="Gender" name="gender" form={form} change={change} options={["Male", "Female", "Other"]} required />
                <Field label="Date of Birth" name="dateOfBirth" form={form} change={change} type="date" required />
                <Field label="Blood Group" name="bloodGroup" form={form} change={change} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
                <Field label="Religion" name="religion" form={form} change={change} />
                <Field label="Caste" name="caste" form={form} change={change} />
                <Field label="Mother Tongue" name="motherTongue" form={form} change={change} />
                <Field label="Place of Birth" name="placeOfBirth" form={form} change={change} />
                <Field label="Nationality" name="nationality" form={form} change={change} />
                <Field label="Student Phone" name="studentPhone" form={form} change={change} type="tel" />
                <Field label="Student Email" name="studentEmail" form={form} change={change} type="email" />
              </Group>
            </div>
          )}

          {step === 2 && (
            <div className="sm-content">
              <Group
                title="Parent Registration"
                note="Select an existing parent or enter details for a new parent."
              >
                <div className="sm-parent-options">
                  <button
                    type="button"
                    className={`sm-parent-option ${parentMode === "existing" ? "active" : ""}`}
                    onClick={() => {
                      setParentMode("existing");
                      setNotice("");
                    }}
                  >
                    <strong>Existing Parent</strong>
                    <small>Search saved parent details</small>
                  </button>

                  <button
                    type="button"
                    className={`sm-parent-option ${parentMode === "new" ? "active" : ""}`}
                    onClick={chooseNewParent}
                  >
                    <strong>New Parent</strong>
                    <small>Enter new parent details</small>
                  </button>
                </div>

                {parentMode === "existing" && (
                  <div className="sm-parent-search">
                    <label htmlFor="parentSearch">Search Existing Parent</label>

                    <div className="sm-parent-search-row">
                      <input
                        id="parentSearch"
                        value={parentQuery}
                        onChange={(event) => setParentQuery(event.target.value)}
                        placeholder="Name, phone, CNIC or email"
                      />

                      <button
                        type="button"
                        className="sm-primary-btn"
                        onClick={searchExistingParents}
                        disabled={searchingParents}
                      >
                        {searchingParents ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {parentResults.map((student) => (
                      <div className="sm-parent-result" key={student._id}>
                        <div>
                          <strong>
                            {[student.father?.name, student.mother?.name]
                              .filter(Boolean).join(" / ") ||
                              student.emergencyContact?.name ||
                              "Parent name unavailable"}
                          </strong>
                          <small>
                            Existing student: {[student.firstName, student.lastName]
                              .filter(Boolean).join(" ")}
                          </small>
                          <small>Admission: {student.admissionNumber}</small>
                        </div>

                        <button
                          type="button"
                          className="sm-outline-btn"
                          onClick={() => selectExistingParent(student)}
                        >
                          Use Details
                        </button>
                      </div>
                    ))}

                    {selectedParent && (
                      <p className="sm-parent-selected">
                        Parent details loaded. Please review them below.
                      </p>
                    )}
                  </div>
                )}
              </Group>

              <Group title="Father Details">
                <Field label="Father Name" name="fatherName" form={form} change={change} />
                <Field label="Father Phone" name="fatherPhone" form={form} change={change} type="tel" />
                <Field label="Father Occupation" name="fatherOccupation" form={form} change={change} />
                <Field label="Father Qualification" name="fatherQualification" form={form} change={change} />
                <Field label="Father CNIC" name="fatherCnic" form={form} change={change} />
              </Group>

              <Group title="Mother Details">
                <Field label="Mother Name" name="motherName" form={form} change={change} />
                <Field label="Mother Phone" name="motherPhone" form={form} change={change} type="tel" />
                <Field label="Mother Occupation" name="motherOccupation" form={form} change={change} />
                <Field label="Mother Qualification" name="motherQualification" form={form} change={change} />
                <Field label="Mother CNIC" name="motherCnic" form={form} change={change} />
              </Group>

              <Group title="Guardian Details">
                <Field label="Guardian Name" name="guardianName" form={form} change={change} />
                <Field label="Relationship" name="guardianRelationship" form={form} change={change} />
                <Field label="Guardian Phone" name="guardianPhone" form={form} change={change} type="tel" />
                <Field label="Guardian Email" name="guardianEmail" form={form} change={change} type="email" />
                <Field label="Guardian Occupation" name="guardianOccupation" form={form} change={change} />
                <Field label="Guardian Address" name="guardianAddress" form={form} change={change} />
              </Group>

              <Group title="Addresses & Parent Account">
                <Field label="Current Address" name="currentAddress" form={form} change={change} />
                <Field label="Permanent Address" name="permanentAddress" form={form} change={change} />
                <Field label="Parent Login Email" name="parentLoginEmail" form={form} change={change} type="email" />
              </Group>
            </div>
          )}

          {step === 3 && (
            <div className="sm-content">
              <Group
                title="Upload Documents"
                note="Choose files from your computer. Maximum size: 5 MB per file."
              >
                <FileField label="Student Photo" name="studentPhoto" file={files.studentPhoto} onChange={changeFile} accept="image/*" />
                <FileField label="Birth Certificate" name="birthCertificate" file={files.birthCertificate} onChange={changeFile} accept=".pdf,image/*" />
                <FileField label="Father Photo" name="fatherPhoto" file={files.fatherPhoto} onChange={changeFile} accept="image/*" />
                <FileField label="Mother Photo" name="motherPhoto" file={files.motherPhoto} onChange={changeFile} accept="image/*" />
              </Group>

              <Group title="Review Admission">
                <div className="sm-review">
                  <p><b>Student:</b> {studentName || "—"}</p>
                  <p><b>Admission No:</b> {form.admissionNumber || "—"}</p>
                  <p><b>Roll No:</b> {form.rollNumber || "—"}</p>
                  <p><b>Class / Section:</b> {form.className || "—"} / {form.section || "—"}</p>
                  <p><b>Date of Birth:</b> {form.dateOfBirth || "—"}</p>
                  <p><b>Father:</b> {form.fatherName || "—"}</p>
                  <p><b>Mother:</b> {form.motherName || "—"}</p>
                  <p><b>Guardian:</b> {form.guardianName || "—"}</p>
                  <p><b>Student Photo:</b> {files.studentPhoto?.name || "Not selected"}</p>
                  <p><b>Birth Certificate:</b> {files.birthCertificate?.name || "Not selected"}</p>
                </div>
              </Group>
            </div>
          )}

          <div className="sm-footer">
            <button
              type="button"
              className="sm-outline-btn"
              onClick={previous}
              disabled={step === 0 || busy}
            >
              ← Previous
            </button>

            <span>Step {step + 1} of {STEPS.length}</span>

            {step < 3 ? (
              <button
                type="button"
                className="sm-primary-btn"
                onClick={next}
                disabled={busy}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                className="sm-primary-btn"
                onClick={submit}
                disabled={busy || Boolean(success)}
              >
                {busy ? "Creating..." : "Create Student"}
              </button>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="sm-modal-backdrop">
          <div className="sm-success-modal" role="dialog" aria-modal="true">
            <div className="sm-success-check">✓</div>
            <p className="sm-success-eyebrow">ADMISSION COMPLETED</p>
            <h2>Student Created Successfully!</h2>
            <p>The student record has been saved.</p>

            <div className="sm-review">
              <p>
                <b>Name:</b>{" "}
                {[success.firstName, success.middleName, success.lastName]
                  .filter(Boolean).join(" ")}
              </p>
              <p><b>Admission No:</b> {success.admissionNumber}</p>
              <p><b>Roll No:</b> {success.rollNumber}</p>
              <p><b>Class:</b> {success.className} {success.section}</p>
            </div>

            <button
              type="button"
              className="sm-primary-btn"
              onClick={reset}
            >
              Done / New Admission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

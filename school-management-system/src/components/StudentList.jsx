
import { useEffect, useMemo, useState } from "react";
import "./StudentList.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const emptyForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  admissionNumber: "",
  rollNumber: "",
  className: "",
  section: "",
  admissionDate: "",
};

function StudentList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/students`);
      const result = await response.json();

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unable to load students.");
      }

      setStudents(result.data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend se connection nahi ho raha. Express server check karein."
          : err.message || "Students load nahi ho sake."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const getFullName = (student) =>
    [student.firstName, student.middleName, student.lastName]
      .filter(Boolean)
      .join(" ") || "N/A";

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toDateInput = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "";

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const classes = useMemo(
    () =>
      [
        ...new Set(
          students.map((student) => student.className).filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return students.filter((student) => {
      const name = getFullName(student).toLowerCase();

      const matchesSearch =
        name.includes(searchText) ||
        String(student.admissionNumber || "")
          .toLowerCase()
          .includes(searchText) ||
        String(student.rollNumber || "")
          .toLowerCase()
          .includes(searchText);

      const matchesClass =
        selectedClass === "All Classes" ||
        student.className === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, search, selectedClass]);

  const startEditing = (student) => {
    setNotice("");
    setEditingStudent(student);

    setForm({
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      lastName: student.lastName || "",
      admissionNumber: student.admissionNumber || "",
      rollNumber: student.rollNumber || "",
      className: student.className || "",
      section: student.section || "",
      admissionDate: toDateInput(student.admissionDate),
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingStudent?._id) {
      setNotice("Student ID nahi mila.");
      return;
    }

    try {
      setSaving(true);
      setNotice("");

      const response = await fetch(
        `${API_URL}/api/students/${editingStudent._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Student update nahi hua.");
      }

      setEditingStudent(null);
      setForm(emptyForm);
      setNotice("Student details successfully update ho gayi hain.");
      await fetchStudents();
    } catch (err) {
      setNotice(err.message || "Student update nahi hua.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    if (!student._id) {
      setNotice("Student ID nahi mila; delete nahi kiya ja sakta.");
      return;
    }

    const confirmed = window.confirm(
      `Kya aap "${getFullName(student)}" ko permanently delete karna chahti hain?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(student._id);
      setNotice("");

      const response = await fetch(
        `${API_URL}/api/students/${student._id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Student delete nahi hua.");
      }

      if (editingStudent?._id === student._id) {
        setEditingStudent(null);
      }

      setNotice("Student successfully delete ho gaya.");
      await fetchStudents();
    } catch (err) {
      setNotice(err.message || "Student delete nahi hua.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="student-list-page">
      <div className="sl-header">
        <div>
          <h1>Student List</h1>
          <p>View, edit and manage admitted students.</p>
        </div>

        <button
          className="sl-refresh-btn"
          onClick={fetchStudents}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      <div className="sl-summary">
        <div className="sl-summary-card">
          <span>Total Students</span>
          <strong>{students.length}</strong>
        </div>

        <div className="sl-summary-card">
          <span>Classes</span>
          <strong>{classes.length}</strong>
        </div>

        <div className="sl-summary-card">
          <span>Showing Results</span>
          <strong>{filteredStudents.length}</strong>
        </div>
      </div>

      {notice && (
        <div className="sl-notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {editingStudent && (
        <form className="sl-edit-form" onSubmit={handleUpdate}>
          <div className="sl-edit-heading">
            <div>
              <h2>Edit Student</h2>
              <p>Update the student's details below.</p>
            </div>

            <button
              type="button"
              className="sl-cancel-btn"
              onClick={() => {
                setEditingStudent(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          </div>

          <div className="sl-form-grid">
            <label>
              First Name *
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Middle Name
              <input
                name="middleName"
                value={form.middleName}
                onChange={handleFormChange}
              />
            </label>

            <label>
              Last Name *
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Admission Number *
              <input
                name="admissionNumber"
                value={form.admissionNumber}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Roll Number *
              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Class *
              <input
                name="className"
                value={form.className}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Section *
              <input
                name="section"
                value={form.section}
                onChange={handleFormChange}
                required
              />
            </label>

            <label>
              Admission Date *
              <input
                type="date"
                name="admissionDate"
                value={form.admissionDate}
                onChange={handleFormChange}
                required
              />
            </label>
          </div>

          <div className="sl-form-actions">
            <button
              type="button"
              className="sl-cancel-btn"
              onClick={() => setEditingStudent(null)}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="sl-save-btn"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      <div className="sl-table-card">
        <div className="sl-toolbar">
          <div className="sl-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search name, admission no. or roll no."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            aria-label="Filter by class"
          >
            <option value="All Classes">All Classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                Class {className}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="sl-message">Loading students from database...</div>
        ) : error ? (
          <div className="sl-message sl-error">
            <p>{error}</p>
            <button onClick={fetchStudents}>Try Again</button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="sl-message">
            {students.length === 0
              ? "Database mein abhi koi student nahi hai."
              : "Aapki search se koi student match nahi hua."}
          </div>
        ) : (
          <div className="sl-table-wrapper">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Roll No.</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Admission Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student._id || student.admissionNumber}>
                    <td>{index + 1}</td>

                    <td>
                      <div className="sl-student-info">
                        {student.studentPhoto ? (
                          <img
                            className="sl-avatar"
                            src={
                              student.studentPhoto.startsWith("http")
                                ? student.studentPhoto
                                : `${API_URL}/${student.studentPhoto.replace(/^\/+/, "")}`
                            }
                            alt={getFullName(student)}
                          />
                        ) : (
                          <div className="sl-avatar sl-avatar-placeholder">
                            {getFullName(student).charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span>{getFullName(student)}</span>
                      </div>
                    </td>

                    <td>{student.admissionNumber || "N/A"}</td>
                    <td>{student.rollNumber || "N/A"}</td>
                    <td>{student.className || "N/A"}</td>
                    <td>{student.section || "N/A"}</td>
                    <td>{formatDate(student.admissionDate)}</td>

                    <td>
                      <div className="sl-actions">
                        <button
                          className="sl-edit-btn"
                          onClick={() => startEditing(student)}
                          disabled={Boolean(deletingId)}
                        >
                          Edit
                        </button>

                        <button
                          className="sl-delete-btn"
                          onClick={() => handleDelete(student)}
                          disabled={Boolean(deletingId)}
                        >
                          {deletingId === student._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredStudents.length > 0 && (
          <div className="sl-table-footer">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentList;

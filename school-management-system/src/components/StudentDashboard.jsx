
import { useCallback, useEffect, useMemo, useState } from "react";
import "./StudentDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

/* Student name */
function getStudentName(student) {
  const name = [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unnamed Student";
}

/* Student photo URL */
function getPhotoUrl(photo) {
  if (!photo || typeof photo !== "string") {
    return "";
  }

  const value = photo.trim();

  if (!value) {
    return "";
  }

  if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) {
    return value;
  }

  const normalizedPath = value.replace(/\\/g, "/");

  return `${API_URL}/${normalizedPath.replace(/^\/+/, "")}`;
}

/* Date formatting */
function formatDate(date) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* Read an error message from the API */
async function getErrorMessage(response) {
  try {
    const result = await response.json();

    return (
      result.message ||
      result.error ||
      "The request could not be completed."
    );
  } catch {
    return "The request could not be completed.";
  }
}

/* Photo only: no initials or letter icon */
function StudentPhoto({ student }) {
  const [failed, setFailed] = useState(false);

  const photoUrl = getPhotoUrl(student.studentPhoto);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  if (!photoUrl || failed) {
    return null;
  }

  return (
    <img
      className="sd-avatar sd-photo"
      src={photoUrl}
      alt={getStudentName(student)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function StudentDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [editForm, setEditForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    admissionNumber: "",
    rollNumber: "",
    className: "",
    section: "",
    admissionDate: "",
  });

  /* Load students from the backend */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/students`);

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = await response.json();

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : [];

      setStudents(records.filter((student) => !student.isDeleted));
    } catch (err) {
      setError(
        err.message ||
          "Unable to load students. Please check your backend server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents, refreshKey]);

  /* Dashboard statistics */
  const stats = useMemo(() => {
    const classCounts = {};
    const sectionCounts = {};

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let thisMonth = 0;

    students.forEach((student) => {
      const className = student.className || "Not assigned";
      const section = student.section || "Not assigned";

      classCounts[className] = (classCounts[className] || 0) + 1;
      sectionCounts[section] = (sectionCounts[section] || 0) + 1;

      const admissionDate =
        student.admissionDate || student.createdAt;

      if (admissionDate) {
        const date = new Date(admissionDate);

        if (
          !Number.isNaN(date.getTime()) &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        ) {
          thisMonth += 1;
        }
      }
    });

    const classList = Object.entries(classCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const sectionList = Object.entries(sectionCounts).sort(
      (a, b) => b[1] - a[1]
    );

    return {
      total: students.length,
      classes: Object.keys(classCounts).length,
      sections: Object.keys(sectionCounts).length,
      thisMonth,
      classCounts,
      classList,
      sectionList,
    };
  }, [students]);

  /* Latest five admissions */
  const recentStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        const dateA = new Date(
          a.admissionDate || a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.admissionDate || b.createdAt || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [students]);

  /* Open edit modal */
  function openEdit(student) {
    setNotice("");
    setSelectedStudent(student);

    setEditForm({
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      lastName: student.lastName || "",
      admissionNumber: student.admissionNumber || "",
      rollNumber: student.rollNumber || "",
      className: student.className || "",
      section: student.section || "",
      admissionDate: student.admissionDate
        ? String(student.admissionDate).slice(0, 10)
        : "",
    });
  }

  function closeEdit() {
    if (saving) {
      return;
    }

    setSelectedStudent(null);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  /* Save student changes */
  async function saveEdit(event) {
    event.preventDefault();

    if (!selectedStudent) {
      return;
    }

    const studentId = selectedStudent._id || selectedStudent.id;

    if (!studentId) {
      setNotice("Student ID was not found.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/api/students/${encodeURIComponent(studentId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setSelectedStudent(null);
      setNotice("Student updated successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setNotice(err.message || "Could not update student.");
    } finally {
      setSaving(false);
    }
  }

  /* Delete student */
  async function deleteStudent(student) {
    const studentId = student._id || student.id;

    if (!studentId) {
      setNotice("Student ID was not found.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${getStudentName(student)}?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(String(studentId));
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/api/students/${encodeURIComponent(studentId)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setNotice("Student deleted successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setNotice(err.message || "Could not delete student.");
    } finally {
      setDeletingId("");
    }
  }

  /* Loading state */
  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="sd-state-card">
          <div className="sd-spinner" />
          <h2>Loading Dashboard</h2>
          <p>Please wait while student records are loading.</p>
        </div>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div className="student-dashboard">
        <div className="sd-error">
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>

          <button
            type="button"
            className="sd-button"
            onClick={() => setRefreshKey((previous) => previous + 1)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="sd-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>
            Overview of student admissions and academic records.
          </p>
        </div>

        <button
          type="button"
          className="sd-button"
          onClick={() => setRefreshKey((previous) => previous + 1)}
        >
          ↻ Refresh Data
        </button>
      </header>

      {notice && (
        <div className="sd-notice" role="status">
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistics cards */}
      <section className="sd-stats-grid">
        <div className="sd-stat-card">
          <div className="sd-stat-icon blue">♙</div>
          <p className="sd-stat-title">Total Students</p>
          <h2>{stats.total}</h2>
          <p className="sd-stat-description">
            Registered student records
          </p>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-icon green">▦</div>
          <p className="sd-stat-title">Total Classes</p>
          <h2>{stats.classes}</h2>
          <p className="sd-stat-description">
            Classes with student records
          </p>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-icon orange">▤</div>
          <p className="sd-stat-title">Total Sections</p>
          <h2>{stats.sections}</h2>
          <p className="sd-stat-description">
            Sections with student records
          </p>
        </div>

        <div className="sd-stat-card">
          <div className="sd-stat-icon purple">＋</div>
          <p className="sd-stat-title">Admissions This Month</p>
          <h2>{stats.thisMonth}</h2>
          <p className="sd-stat-description">
            Based on admission date or record date
          </p>
        </div>
      </section>

      {/* Class distribution and database overview */}
      <section className="sd-content-grid">
        <div className="sd-panel">
          <div className="sd-panel-heading">
            <div>
              <h2>Students by Class</h2>
              <p>Distribution of registered students</p>
            </div>
          </div>

          {stats.classList.length === 0 ? (
            <div className="sd-empty">
              No class records available yet.
            </div>
          ) : (
            <div className="sd-class-list">
              {stats.classList.map(([className, count]) => {
                const percentage =
                  stats.total > 0
                    ? (count / stats.total) * 100
                    : 0;

                return (
                  <div className="sd-class-row" key={className}>
                    <div className="sd-class-label">
                      <span>{className}</span>
                      <strong>{count}</strong>
                    </div>

                    <div className="sd-progress-track">
                      <div
                        className="sd-progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="sd-class-footer">
                <span>Total registered students</span>
                <strong>{stats.total}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="sd-panel">
          <div className="sd-panel-heading">
            <div>
              <h2>Database Overview</h2>
              <p>Current student record summary</p>
            </div>
          </div>

          <div className="sd-summary-total">
            <div className="sd-summary-icon">✓</div>
            <h3>{stats.total}</h3>
            <p>Total Student Records</p>
          </div>

          <div className="sd-summary-row">
            <span>Classes</span>
            <strong>{stats.classes}</strong>
          </div>

          <div className="sd-summary-row">
            <span>Sections</span>
            <strong>{stats.sections}</strong>
          </div>

          <div className="sd-summary-row">
            <span>New Admissions This Month</span>
            <strong>{stats.thisMonth}</strong>
          </div>
        </div>
      </section>

      {/* Recent admissions table */}
      <section className="sd-panel sd-admissions-panel">
        <div className="sd-panel-heading">
          <div>
            <h2>Recent Student Admissions</h2>
            <p>Latest student records from your database</p>
          </div>

          <span className="sd-record-count">
            {students.length} Students
          </span>
        </div>

        {recentStudents.length === 0 ? (
          <div className="sd-empty">
            No students found. Add a student to see records here.
          </div>
        ) : (
          <div className="sd-table-wrapper">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No.</th>
                  <th>Roll No.</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Admission Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {recentStudents.map((student) => {
                  const studentId = String(
                    student._id || student.id || ""
                  );

                  return (
                    <tr key={studentId || getStudentName(student)}>
                      <td>
                        <div className="sd-student-name">
                          <StudentPhoto student={student} />

                          <strong>{getStudentName(student)}</strong>
                        </div>
                      </td>

                      <td>{student.admissionNumber || "—"}</td>
                      <td>{student.rollNumber || "—"}</td>
                      <td>{student.className || "—"}</td>
                      <td>{student.section || "—"}</td>
                      <td>
                        {formatDate(
                          student.admissionDate || student.createdAt
                        )}
                      </td>

                      <td>
                        <div className="sd-actions">
                          <button
                            type="button"
                            className="sd-action-edit"
                            onClick={() => openEdit(student)}
                            disabled={!studentId}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="sd-action-delete"
                            onClick={() => deleteStudent(student)}
                            disabled={
                              !studentId ||
                              deletingId === studentId
                            }
                          >
                            {deletingId === studentId
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit student modal */}
      {selectedStudent && (
        <div
          className="sd-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <div
            className="sd-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sd-edit-title"
          >
            <div className="sd-modal-header">
              <div>
                <h2 id="sd-edit-title">Edit Student</h2>
                <p>Update the student's basic information.</p>
              </div>

              <button
                type="button"
                className="sd-modal-close"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close edit form"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveEdit}>
              <div className="sd-edit-grid">
                <label>
                  First Name *
                  <input
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleEditChange}
                    required
                  />
                </label>

                <label>
                  Middle Name
                  <input
                    name="middleName"
                    value={editForm.middleName}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Last Name
                  <input
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Admission Number
                  <input
                    name="admissionNumber"
                    value={editForm.admissionNumber}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Roll Number
                  <input
                    name="rollNumber"
                    value={editForm.rollNumber}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Class
                  <input
                    name="className"
                    value={editForm.className}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Section
                  <input
                    name="section"
                    value={editForm.section}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  Admission Date
                  <input
                    type="date"
                    name="admissionDate"
                    value={editForm.admissionDate}
                    onChange={handleEditChange}
                  />
                </label>
              </div>

              <div className="sd-modal-actions">
                <button
                  type="button"
                  className="sd-modal-cancel"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="sd-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;

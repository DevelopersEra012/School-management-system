
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import AttendanceReport from "./AttendanceReport.jsx";
import "./StudentAttendance.css";



const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const today = () => {
  const date = new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
};

const fullName = (student) =>
  [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

const STATUSES = ["Present", "Absent", "Late", "Leave"];

export default function StudentAttendance() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reportSelection, setReportSelection] = useState(null);

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  };

  const loadOptions = useCallback(async () => {
    try {
      const result = await request(
        `${API_URL}/api/attendance/options`
      );

      setClasses(result.classes || []);
      setSections(result.sections || []);

      setClassName((current) =>
        current && (result.classes || []).includes(current)
          ? current
          : (result.classes || [])[0] || ""
      );
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!className || !date) {
      setStudents([]);
      setAttendance({});
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({
        className,
        date,
      });

      if (section) params.set("section", section);

      const [studentResult, attendanceResult] = await Promise.all([
        request(
          `${API_URL}/api/attendance/students?${params.toString()}`
        ),
        request(
          `${API_URL}/api/attendance?${params.toString()}`
        ),
      ]);

      const studentList = studentResult.data || [];
      const savedRecords = attendanceResult.data || [];
      const nextAttendance = {};

      studentList.forEach((student) => {
        nextAttendance[student._id] = {
          status: "Present",
          remarks: "",
        };
      });

      savedRecords.forEach((record) => {
        const id =
          typeof record.studentId === "object"
            ? record.studentId?._id
            : record.studentId;

        if (id && nextAttendance[id]) {
          nextAttendance[id] = {
            status: record.status,
            remarks: record.remarks || "",
          };
        }
      });

      setStudents(studentList);
      setAttendance(nextAttendance);
    } catch (err) {
      setError(err.message);
      setStudents([]);
      setAttendance({});
    } finally {
      setLoading(false);
    }
  }, [className, section, date]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return students;

    return students.filter((student) => {
      const searchable = [
        fullName(student),
        student.rollNumber,
        student.admissionNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [students, search]);

  const totals = useMemo(() => {
    const result = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Leave: 0,
    };

    students.forEach((student) => {
      const status = attendance[student._id]?.status;
      if (result[status] !== undefined) result[status] += 1;
    });

    return result;
  }, [students, attendance]);

  const updateRecord = (studentId, field, value) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || {
          status: "Present",
          remarks: "",
        }),
        [field]: value,
      },
    }));
    setMessage("");
  };

  const markAll = (status) => {
    setAttendance((current) => {
      const updated = { ...current };

      visibleStudents.forEach((student) => {
        updated[student._id] = {
          ...(updated[student._id] || {}),
          status,
          remarks: updated[student._id]?.remarks || "",
        };
      });

      return updated;
    });

    setMessage("");
  };

  const saveAttendance = async () => {
    if (!className || !date || students.length === 0) {
      setError("Please select a class with students.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`${API_URL}/api/attendance/bulk`, {
        method: "POST",
        body: JSON.stringify({
          attendanceDate: date,
          records: students.map((student) => ({
            studentId: student._id,
            status: attendance[student._id]?.status || "Present",
            remarks: attendance[student._id]?.remarks || "",
          })),
        }),
      });

      setMessage("Attendance saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      [
        "Date",
        "Class",
        "Section",
        "Roll Number",
        "Admission Number",
        "Student Name",
        "Status",
        "Remarks",
      ],
      ...visibleStudents.map((student) => [
        date,
        className,
        section,
        student.rollNumber || "",
        student.admissionNumber || "",
        fullName(student),
        attendance[student._id]?.status || "Present",
        attendance[student._id]?.remarks || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `attendance-${className}-${date}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  if (reportSelection) {
    return (
      <AttendanceReport
        className={reportSelection.className}
        section={reportSelection.section}
        onBack={() => setReportSelection(null)}
      />
    );
  }

  return (
    <main className="attendance-page">
      <header className="attendance-header">
        <div>
          <div className="attendance-eyebrow">
            SCHOOL MANAGEMENT SYSTEM
          </div>
          <h1>Student Attendance</h1>
          <p>Manage daily attendance and review class records.</p>
        </div>

        <div className="attendance-header-actions">
          <button
            className="attendance-button secondary"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={17} /> Print
          </button>

          <button
            className="attendance-button primary"
            onClick={saveAttendance}
            disabled={saving || loading}
            type="button"
          >
            {saving ? (
              <LoaderCircle className="attendance-spin" size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </header>

      {error && (
        <div className="attendance-alert error">{error}</div>
      )}

      {message && (
        <div className="attendance-alert success">{message}</div>
      )}

      <section className="attendance-filters">
        <div className="attendance-field">
          <label htmlFor="attendance-class">Class</label>
          <select
            id="attendance-class"
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection("");
            }}
          >
            <option value="">Select class</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-field">
          <label htmlFor="attendance-section">Section</label>
          <select
            id="attendance-section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="">All sections</option>
            {sections.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-field">
          <label htmlFor="attendance-date">Attendance Date</label>
          <div className="attendance-input-icon">
            <CalendarDays size={17} />
            <input
              id="attendance-date"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <button
          className="attendance-button secondary refresh-button"
          onClick={loadAttendance}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </section>

      <section className="attendance-stats">
        <div className="attendance-stat">
          <div className="attendance-stat-icon blue">
            <Users size={21} />
          </div>
          <div>
            <span>Total Students</span>
            <strong>{students.length}</strong>
          </div>
        </div>

        {STATUSES.map((status) => (
          <div className="attendance-stat" key={status}>
            <div
              className={`attendance-stat-icon ${status.toLowerCase()}`}
            >
              <CheckCircle2 size={21} />
            </div>
            <div>
              <span>{status}</span>
              <strong>{totals[status]}</strong>
            </div>
          </div>
        ))}
      </section>

      <section className="attendance-panel">
        <div className="attendance-panel-heading">
          <div>
            <h2>Class Attendance Register</h2>
            <p>
              {className || "No class selected"}
              {section ? ` · Section ${section}` : " · All sections"}
              {date ? ` · ${date}` : ""}
            </p>
          </div>

          <div className="attendance-toolbar">
            <button
              className="attendance-button report-button"
              type="button"
              onClick={() => {
                if (!className) {
                  setError("Please select a class first.");
                  return;
                }
                setReportSelection({ className, section });
              }}
            >
              <FileText size={17} /> Overall Report
            </button>

            <button
              className="attendance-button secondary"
              onClick={() => markAll("Present")}
              type="button"
            >
              All Present
            </button>

            <button
              className="attendance-button secondary"
              onClick={() => markAll("Absent")}
              type="button"
            >
              All Absent
            </button>

            <button
              className="attendance-button secondary"
              onClick={exportCSV}
              disabled={!visibleStudents.length}
              type="button"
            >
              <Download size={17} /> CSV
            </button>
          </div>
        </div>

        <div className="attendance-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number..."
          />
        </div>

        {loading ? (
          <div className="attendance-empty">
            <LoaderCircle className="attendance-spin" size={25} />
            <p>Loading attendance...</p>
          </div>
        ) : !className ? (
          <div className="attendance-empty">
            <ClipboardList size={30} />
            <p>Please select a class to view students.</p>
          </div>
        ) : visibleStudents.length === 0 ? (
          <div className="attendance-empty">
            <Users size={30} />
            <p>No students found for this selection.</p>
            <span>Check the class, section and student records.</span>
          </div>
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No.</th>
                  <th>Student Name</th>
                  <th>Admission No.</th>
                  <th>Attendance Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student, index) => (
                  <tr key={student._id}>
                    <td>{index + 1}</td>
                    <td className="attendance-roll">
                      {student.rollNumber || "—"}
                    </td>
                    <td>
                      <div className="attendance-student-name">
                        <span className="attendance-avatar">
                          {fullName(student).charAt(0).toUpperCase() || "S"}
                        </span>
                        <strong>{fullName(student) || "Unnamed Student"}</strong>
                      </div>
                    </td>
                    <td>{student.admissionNumber || "—"}</td>
                    <td>
                      <select
                        className={`attendance-status-select ${(
                          attendance[student._id]?.status || "Present"
                        ).toLowerCase()}`}
                        value={
                          attendance[student._id]?.status || "Present"
                        }
                        onChange={(e) =>
                          updateRecord(
                            student._id,
                            "status",
                            e.target.value
                          )
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="attendance-remarks"
                        value={attendance[student._id]?.remarks || ""}
                        onChange={(e) =>
                          updateRecord(
                            student._id,
                            "remarks",
                            e.target.value
                          )
                        }
                        placeholder="Optional"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

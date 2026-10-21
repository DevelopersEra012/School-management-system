
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  LoaderCircle,
  Printer,
  RefreshCw,
} from "lucide-react";

import "./AttendanceReport.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const getToday = () => {
  const date = new Date();
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
};

const getMonthStart = () => `${getToday().slice(0, 7)}-01`;

const studentName = (student) =>
  [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

const getPhotoUrl = (photo) => {
  if (!photo || typeof photo !== "string") return "";

  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://") ||
    photo.startsWith("data:image/")
  ) {
    return photo;
  }

  if (photo.startsWith("/")) {
    return `${API_URL}${photo}`;
  }

  return "";
};

const getInitials = (student) => {
  const name = studentName(student);

  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "S"
  );
};

const emptyTotals = {
  Present: 0,
  Absent: 0,
  Late: 0,
  Leave: 0,
};

export default function AttendanceReport({
  className,
  section,
  onBack,
}) {
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);

  const loadReport = useCallback(async () => {
    if (!className || !startDate || !endDate) {
      setError("Please select a valid class and date range.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        className,
        startDate,
        endDate,
      });

      if (section) {
        params.set("section", section);
      }

      const response = await fetch(
        `${API_URL}/api/attendance/report?${params.toString()}`
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to load attendance report."
        );
      }

      setReport(result);
    } catch (err) {
      setError(err.message || "Unable to load report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [className, section, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const totals = report?.classTotals || emptyTotals;

  const exportCSV = () => {
    if (!report?.data?.length) return;

    const rows = [
      [
        "Roll Number",
        "Admission Number",
        "Student Name",
        "Class",
        "Section",
        "Present",
        "Absent",
        "Late",
        "Leave",
        "Attendance Percentage",
      ],
      ...report.data.map((student) => [
        student.rollNumber || "",
        student.admissionNumber || "",
        studentName(student),
        student.className || "",
        student.section || "",
        student.totals?.Present ?? 0,
        student.totals?.Absent ?? 0,
        student.totals?.Late ?? 0,
        student.totals?.Leave ?? 0,
        `${student.percentage ?? 0}%`,
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
    link.download = `attendance-report-${className}-${startDate}-to-${endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!report?.data?.length) {
      setError("There is no student data to print.");
      return;
    }

    window.print();
  };

  return (
    <main className="ar-page">
      <header className="ar-header">
        <div>
          <div className="ar-eyebrow">
            SCHOOL ERP · ATTENDANCE MANAGEMENT
          </div>

          <h1>Overall Attendance Report</h1>

          <p>
            Class: <strong>{className || "Not selected"}</strong>
            {section
              ? ` · Section ${section}`
              : " · All sections"}
          </p>
        </div>

        <button
          type="button"
          className="ar-button ar-secondary ar-no-print"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Attendance
        </button>
      </header>

      {error && (
        <div className="ar-alert ar-no-print" role="alert">
          {error}
        </div>
      )}

      <section className="ar-filter ar-no-print">
        <div className="ar-field">
          <label htmlFor="report-start">Start Date</label>

          <div className="ar-date-input">
            <CalendarDays size={17} />

            <input
              id="report-start"
              type="date"
              value={startDate}
              max={getToday()}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
            />
          </div>
        </div>

        <div className="ar-field">
          <label htmlFor="report-end">End Date</label>

          <div className="ar-date-input">
            <CalendarDays size={17} />

            <input
              id="report-end"
              type="date"
              value={endDate}
              min={startDate}
              max={getToday()}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
            />
          </div>
        </div>

        <button
          type="button"
          className="ar-button ar-primary"
          onClick={loadReport}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="ar-spin" size={17} />
          ) : (
            <RefreshCw size={17} />
          )}
          Generate Report
        </button>

        <button
          type="button"
          className="ar-button ar-secondary"
          onClick={handlePrint}
          disabled={loading || !report?.data?.length}
        >
          <Printer size={17} />
          Print Report
        </button>

        <button
          type="button"
          className="ar-button ar-secondary"
          onClick={exportCSV}
          disabled={!report?.data?.length}
        >
          <Download size={17} />
          Export CSV
        </button>
      </section>

      <section className="ar-summary">
        <div className="ar-summary-card">
          <span>Total Students</span>
          <strong>{report?.totalStudents ?? 0}</strong>
        </div>

        <div className="ar-summary-card">
          <span>Present Records</span>
          <strong>{totals.Present}</strong>
        </div>

        <div className="ar-summary-card">
          <span>Absent Records</span>
          <strong>{totals.Absent}</strong>
        </div>

        <div className="ar-summary-card">
          <span>Late Records</span>
          <strong>{totals.Late}</strong>
        </div>

        <div className="ar-summary-card">
          <span>Leave Records</span>
          <strong>{totals.Leave}</strong>
        </div>
      </section>

      <section className="ar-panel">
        <div className="ar-panel-heading">
          <div>
            <h2>Student Attendance Summary</h2>

            <p>
              Report Period: {startDate} to {endDate}
            </p>
          </div>

          <span className="ar-count">
            {report?.data?.length || 0} students
          </span>
        </div>

        {loading ? (
          <div className="ar-empty">
            <LoaderCircle className="ar-spin" size={26} />
            <p>Generating report...</p>
          </div>
        ) : !report?.data?.length ? (
          <div className="ar-empty">
            <p>No student records found.</p>
            <span>
              Check the selected class, section and date range.
            </span>
          </div>
        ) : (
          <div className="ar-table-wrap">
            <table className="ar-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Roll No.</th>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Class / Section</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Attendance %</th>
                  <th className="ar-no-print">History</th>
                </tr>
              </thead>

              <tbody>
                {report.data.map((student) => {
                  const photoUrl = getPhotoUrl(
                    student.studentPhoto
                  );

                  const studentTotals = {
                    ...emptyTotals,
                    ...(student.totals || {}),
                  };

                  return (
                    <tr key={student._id}>
                      <td className="ar-photo-cell">
                        {photoUrl ? (
                          <img
                            className="ar-student-photo"
                            src={photoUrl}
                            alt={studentName(student)}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                              const fallback =
                                event.currentTarget.nextElementSibling;

                              if (fallback) {
                                fallback.style.display = "inline-flex";
                              }
                            }}
                          />
                        ) : null}

                        <span
                          className="ar-student-avatar"
                          style={{
                            display: photoUrl ? "none" : "inline-flex",
                          }}
                        >
                          {getInitials(student)}
                        </span>
                      </td>

                      <td>{student.rollNumber || "—"}</td>

                      <td>{student.admissionNumber || "—"}</td>

                      <td className="ar-student-name">
                        {studentName(student) || "Unnamed Student"}
                      </td>

                      <td>
                        {student.className || className}
                        {student.section
                          ? ` - ${student.section}`
                          : ""}
                      </td>

                      <td>
                        <span className="ar-badge present">
                          {studentTotals.Present}
                        </span>
                      </td>

                      <td>
                        <span className="ar-badge absent">
                          {studentTotals.Absent}
                        </span>
                      </td>

                      <td>
                        <span className="ar-badge late">
                          {studentTotals.Late}
                        </span>
                      </td>

                      <td>
                        <span className="ar-badge leave">
                          {studentTotals.Leave}
                        </span>
                      </td>

                      <td>
                        <div className="ar-percentage">
                          <div className="ar-progress">
                            <span
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    Number(student.percentage) || 0
                                  )
                                )}%`,
                              }}
                            />
                          </div>

                          <strong>
                            {student.percentage ?? 0}%
                          </strong>
                        </div>
                      </td>

                      <td className="ar-no-print">
                        <button
                          type="button"
                          className="ar-history-button"
                          onClick={() =>
                            setSelectedHistory(
                              selectedHistory === student._id
                                ? null
                                : student._id
                            )
                          }
                        >
                          {selectedHistory === student._id
                            ? "Hide"
                            : "View History"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {report.data.map((student) =>
                  selectedHistory === student._id ? (
                    <tr
                      className="ar-history-row"
                      key={`${student._id}-history`}
                    >
                      <td colSpan={11}>
                        <div className="ar-history">
                          <h3>
                            Daily History: {studentName(student)}
                          </h3>

                          {!student.history?.length ? (
                            <p>
                              No attendance entries in this date range.
                            </p>
                          ) : (
                            <div className="ar-history-list">
                              {student.history.map(
                                (record, index) => (
                                  <div
                                    className="ar-history-item"
                                    key={`${record.attendanceDate}-${index}`}
                                  >
                                    <strong>
                                      {record.attendanceDate}
                                    </strong>

                                    <span
                                      className={`ar-badge ${String(
                                        record.status
                                      ).toLowerCase()}`}
                                    >
                                      {record.status}
                                    </span>

                                    {record.remarks && (
                                      <span>{record.remarks}</span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="ar-footer">
        <p>
          Attendance percentage is calculated using Present and Late
          records divided by Present + Absent + Late. Leave days are
          excluded.
        </p>

        <p>
          Generated on: {getToday()} | School ERP Attendance Report
        </p>
      </footer>
    </main>
  );
}

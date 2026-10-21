
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RotateCcw,
  Eye,
  Printer,
  Wallet,
  Users,
  AlertCircle,
  X,
  RefreshCw,
  UserRound,
  ReceiptText,
} from "lucide-react";

// IMPORTANT: make sure this CSS filename matches your actual file.
// If your file is SearchDueFee.css (singular), change the line below.
import "./SearchDueFees.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getStudentId(record) {
  return getId(record.studentId) || getId(record.student);
}

function getStudentName(student = {}, record = {}) {
  const fullName = [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
    .trim();

  return (
    fullName ||
    student.fullName ||
    student.name ||
    student.studentName ||
    record.studentName ||
    "Unnamed Student"
  );
}

function getAdmissionNumber(record) {
  const student = record.student || {};

  return (
    record.admissionNumber ||
    student.admissionNumber ||
    student.admissionNo ||
    "N/A"
  );
}

function getClassName(record) {
  const student = record.student || {};

  return (
    record.className ||
    student.className ||
    student.class ||
    student.grade ||
    "N/A"
  );
}

function getSection(record) {
  return record.section || record.student?.section || "";
}

function getPhotoUrl(photo) {
  if (!photo) return "";

  const value = String(photo).trim();

  if (/^(https?:\/\/|data:image\/)/i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${API_URL}/${value}`;
  }

  return `${API_URL}/uploads/students/${value}`;
}

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPeriod(record) {
  if (!record.feePeriod) {
    return record.description || "Period not set";
  }

  const period = String(record.feePeriod);
  const parts = period.split("-");

  if (parts.length !== 2) return period;

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!year || month < 1 || month > 12) {
    return period;
  }

  return new Date(year, month - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

function getAssignmentAmount(record) {
  return Math.max(
    0,
    Number(record.amount ?? record.totalAmount ?? 0) || 0
  );
}

function getPaidAmount(record) {
  return Math.max(0, Number(record.paidAmount || 0) || 0);
}

function getOutstandingAmount(record) {
  const amount = getAssignmentAmount(record);
  const paid = getPaidAmount(record);

  return Math.max(
    0,
    Math.round((amount - paid + Number.EPSILON) * 100) / 100
  );
}

function getAssignmentStatus(record) {
  const outstanding = getOutstandingAmount(record);
  const paid = getPaidAmount(record);

  if (outstanding <= 0) return "Paid";
  if (paid > 0) return "Partially Paid";

  return "Pending";
}

function getStatusClass(status) {
  return String(status)
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDueTimestamp(record) {
  if (!record.dueDate) return Number.MAX_SAFE_INTEGER;

  const time = new Date(record.dueDate).getTime();

  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export default function SearchDueFees() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedFeeType, setSelectedFeeType] =
    useState("All Fee Types");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDueRecords() {
    try {
      setLoading(true);
      setError("");

      // Due fees must come from assignments, not payment transactions.
      const assignmentResponse = await fetch(
        `${API_URL}/api/fees/assignments`
      );

      const assignmentResult = await assignmentResponse.json();

      if (!assignmentResponse.ok) {
        throw new Error(
          assignmentResult.message ||
            "Could not load fee assignments."
        );
      }

      const assignmentList = Array.isArray(assignmentResult)
        ? assignmentResult
        : Array.isArray(assignmentResult.data)
          ? assignmentResult.data
          : Array.isArray(assignmentResult.assignments)
            ? assignmentResult.assignments
            : null;

      if (!assignmentList) {
        throw new Error(
          "The fee assignments API returned an invalid response."
        );
      }

      setAssignments(assignmentList);

      // Fetch student profiles for accurate name, class and photo.
      try {
        const studentsResponse = await fetch(
          `${API_URL}/api/students`
        );

        if (studentsResponse.ok) {
          const studentsResult = await studentsResponse.json();

          const studentList = Array.isArray(studentsResult)
            ? studentsResult
            : Array.isArray(studentsResult.data)
              ? studentsResult.data
              : [];

          setStudents(studentList);
        } else {
          setStudents([]);
        }
      } catch {
        // Assignments can still be displayed if student lookup fails.
        setStudents([]);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fee assignments. Check your backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDueRecords();
  }, []);

  const studentsById = useMemo(() => {
    return new Map(
      students.map((student) => [
        String(student._id || student.id),
        student,
      ])
    );
  }, [students]);

  // Convert each saved assignment to one consistent format.
  const outstandingAssignments = useMemo(() => {
    return assignments
      .map((assignment, index) => {
        const studentId = getStudentId(assignment);
        const linkedStudent = studentId
          ? studentsById.get(studentId)
          : null;

        const embeddedStudent =
          assignment.student &&
          typeof assignment.student === "object"
            ? assignment.student
            : {};

        const student = {
          ...(linkedStudent || {}),
          ...embeddedStudent,

          firstName:
            linkedStudent?.firstName || embeddedStudent.firstName,
          middleName:
            linkedStudent?.middleName || embeddedStudent.middleName,
          lastName:
            linkedStudent?.lastName || embeddedStudent.lastName,

          name:
            embeddedStudent.name ||
            linkedStudent?.name ||
            assignment.studentName,

          studentName:
            embeddedStudent.studentName ||
            linkedStudent?.studentName ||
            assignment.studentName,

          admissionNumber:
            assignment.admissionNumber ||
            embeddedStudent.admissionNumber ||
            linkedStudent?.admissionNumber,

          className:
            assignment.className ||
            embeddedStudent.className ||
            linkedStudent?.className,

          section:
            assignment.section ||
            embeddedStudent.section ||
            linkedStudent?.section,

          studentPhoto:
            embeddedStudent.studentPhoto ||
            linkedStudent?.studentPhoto ||
            embeddedStudent.photo ||
            linkedStudent?.photo,
        };

        const amount = getAssignmentAmount(assignment);
        const paidAmount = getPaidAmount(assignment);
        const outstanding = getOutstandingAmount(assignment);

        return {
          ...assignment,

          id: String(
            assignment._id ||
              assignment.id ||
              `${studentId || "student"}-${index}`
          ),

          studentId:
            studentId ||
            String(
              assignment.admissionNumber ||
                assignment.studentName ||
                `unknown-${index}`
            ),

          student,
          studentName: getStudentName(student, assignment),
          admissionNumber: getAdmissionNumber({
            ...assignment,
            student,
          }),
          className: getClassName({
            ...assignment,
            student,
          }),
          section: getSection({
            ...assignment,
            student,
          }),
          photo:
            student.studentPhoto ||
            assignment.studentPhoto ||
            student.photo ||
            "",

          feeType: assignment.feeType || "Other Fee",
          feePeriod: getPeriod(assignment),
          amount,
          paidAmount,
          outstanding,
          dueDate: assignment.dueDate || "",
          status: getAssignmentStatus(assignment),
        };
      })
      // Exclude fully paid assignments from the due list.
      .filter((record) => record.outstanding > 0);
  }, [assignments, studentsById]);

  const classOptions = useMemo(() => {
    return [
      "All Classes",
      ...Array.from(
        new Set(
          outstandingAssignments
            .map((record) => record.className)
            .filter((value) => value && value !== "N/A")
        )
      ).sort(),
    ];
  }, [outstandingAssignments]);

  const feeTypeOptions = useMemo(() => {
    return [
      "All Fee Types",
      ...Array.from(
        new Set(outstandingAssignments.map((record) => record.feeType))
      ).sort(),
    ];
  }, [outstandingAssignments]);

  // Apply search and filters to individual fee assignments first.
  const filteredAssignments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return outstandingAssignments.filter((record) => {
      const searchableText = [
        record.studentName,
        record.admissionNumber,
        record.className,
        record.section,
        record.feeType,
        record.feePeriod,
        record.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesClass =
        selectedClass === "All Classes" ||
        record.className === selectedClass;

      const matchesFeeType =
        selectedFeeType === "All Fee Types" ||
        record.feeType === selectedFeeType;

      return (
        matchesSearch &&
        matchesClass &&
        matchesFeeType
      );
    });
  }, [
    outstandingAssignments,
    searchTerm,
    selectedClass,
    selectedFeeType,
  ]);

  // Group the remaining assignments so each student appears once.
  const groupedStudents = useMemo(() => {
    const groups = new Map();

    for (const record of filteredAssignments) {
      const key =
        record.studentId ||
        record.admissionNumber ||
        record.studentName.toLowerCase();

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          studentId: record.studentId,
          studentName: record.studentName,
          admissionNumber: record.admissionNumber,
          className: record.className,
          section: record.section,
          photo: record.photo,
          assignments: [],
          totalFee: 0,
          totalPaid: 0,
          totalOutstanding: 0,
        });
      }

      const group = groups.get(key);

      group.assignments.push(record);
      group.totalFee += record.amount;
      group.totalPaid += record.paidAmount;
      group.totalOutstanding += record.outstanding;
    }

    return Array.from(groups.values())
      .map((group) => {
        group.totalFee =
          Math.round((group.totalFee + Number.EPSILON) * 100) / 100;

        group.totalPaid =
          Math.round((group.totalPaid + Number.EPSILON) * 100) / 100;

        group.totalOutstanding =
          Math.round(
            (group.totalOutstanding + Number.EPSILON) * 100
          ) / 100;

        group.assignments.sort(
          (a, b) => getDueTimestamp(a) - getDueTimestamp(b)
        );

        group.nextDueDate =
          group.assignments.find((item) => item.dueDate)?.dueDate || "";

        group.feeCount = group.assignments.length;

        group.status =
          group.totalPaid > 0 ? "Partially Paid" : "Pending";

        return group;
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredAssignments]);

  const totalOutstanding = groupedStudents.reduce(
    (sum, student) => sum + student.totalOutstanding,
    0
  );

  const totalOutstandingItems = filteredAssignments.length;

  function resetFilters() {
    setSearchTerm("");
    setSelectedClass("All Classes");
    setSelectedFeeType("All Fee Types");
    setSelectedStudent(null);
  }

  function handlePrint(student) {
    setSelectedStudent(student);

    window.setTimeout(() => {
      window.print();
    }, 300);
  }

  return (
    <div className="sdf-page">
      <header className="sdf-header">
        <div>
          <span className="sdf-eyebrow">
            FEE AND FINANCE / SEARCH DUE FEES
          </span>

          <h1>Search Due Fees</h1>

          <p>
            View each student's outstanding fees in one summary.
          </p>
        </div>

        <div className="sdf-header-actions">
          <button
            type="button"
            className="sdf-reset-btn"
            onClick={resetFilters}
          >
            <RotateCcw size={17} />
            Reset Filters
          </button>

          <button
            type="button"
            className="sdf-refresh-btn"
            onClick={fetchDueRecords}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </header>

      <div className="sdf-info-banner">
        <AlertCircle size={19} />
        <p>
          This page shows outstanding fee assignments, not individual
          payment transactions. Each student appears once in the summary.
        </p>
      </div>

      {error && (
        <div className="sdf-error-banner" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Unable to load fee assignments</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchDueRecords}>
            Try Again
          </button>
        </div>
      )}

      <section className="sdf-stats">
        <article className="sdf-stat-card">
          <div className="sdf-stat-icon sdf-icon-purple">
            <Users size={22} />
          </div>
          <div className="sdf-stat-content">
            <span>Students With Outstanding Fees</span>
            <h2>{loading ? "—" : groupedStudents.length}</h2>
          </div>
        </article>

        <article className="sdf-stat-card">
          <div className="sdf-stat-icon sdf-icon-orange">
            <Wallet size={22} />
          </div>
          <div className="sdf-stat-content">
            <span>Total Outstanding Amount</span>
            <h2>
              {loading ? "—" : formatCurrency(totalOutstanding)}
            </h2>
          </div>
        </article>

        <article className="sdf-stat-card">
          <div className="sdf-stat-icon sdf-icon-blue">
            <ReceiptText size={22} />
          </div>
          <div className="sdf-stat-content">
            <span>Outstanding Fee Items</span>
            <h2>{loading ? "—" : totalOutstandingItems}</h2>
          </div>
        </article>
      </section>

      <section className="sdf-panel">
        <div className="sdf-panel-heading">
          <div>
            <h2>Find Student Dues</h2>
            <p>
              Search by name, admission number, class or fee type.
            </p>
          </div>
        </div>

        <div className="sdf-filters">
          <label className="sdf-search-box">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search student or fee..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by class"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
          >
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by fee type"
            value={selectedFeeType}
            onChange={(event) => setSelectedFeeType(event.target.value)}
          >
            {feeTypeOptions.map((feeType) => (
              <option key={feeType} value={feeType}>
                {feeType}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="sdf-panel sdf-table-panel">
        <div className="sdf-panel-heading">
          <div>
            <h2>Student Outstanding Summary</h2>
            <p>
              Open details to see each individual outstanding assignment.
            </p>
          </div>

          <span className="sdf-record-count">
            {loading ? "Loading..." : `${groupedStudents.length} students`}
          </span>
        </div>

        {loading ? (
          <div className="sdf-state">
            <RefreshCw size={25} />
            <p>Loading saved fee assignments...</p>
          </div>
        ) : error ? (
          <div className="sdf-state">
            <AlertCircle size={28} />
            <p>Fee assignments could not be loaded.</p>
          </div>
        ) : groupedStudents.length === 0 ? (
          <div className="sdf-state">
            <Search size={30} />
            <h3>No outstanding fees found</h3>
            <p>
              No saved fee assignments with a remaining balance match
              these filters.
            </p>
          </div>
        ) : (
          <div className="sdf-table-wrapper">
            <table className="sdf-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Class</th>
                  <th>Fee Items</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Next Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {groupedStudents.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <div className="sdf-student-name">
                        <div className="sdf-student-photo-wrap">
                          {group.photo && (
                            <img
                              className="sdf-student-photo"
                              src={getPhotoUrl(group.photo)}
                              alt={`${group.studentName} profile`}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";

                                event.currentTarget.parentElement
                                  ?.querySelector(".sdf-photo-fallback")
                                  ?.classList.remove(
                                    "sdf-photo-fallback-hidden"
                                  );
                              }}
                            />
                          )}

                          <span
                            className={`sdf-photo-fallback ${
                              group.photo
                                ? "sdf-photo-fallback-hidden"
                                : ""
                            }`}
                          >
                            <UserRound size={18} />
                          </span>
                        </div>

                        <div className="sdf-student-text">
                          <strong>{group.studentName}</strong>
                          {group.section && (
                            <small>Section {group.section}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>{group.admissionNumber}</td>
                    <td>{group.className}</td>

                    <td>
                      <span className="sdf-count-pill">
                        {group.feeCount}{" "}
                        {group.feeCount === 1 ? "fee" : "fees"}
                      </span>
                    </td>

                    <td>{formatCurrency(group.totalFee)}</td>
                    <td>{formatCurrency(group.totalPaid)}</td>

                    <td>
                      <strong className="sdf-due-amount">
                        {formatCurrency(group.totalOutstanding)}
                      </strong>
                    </td>

                    <td>{formatDate(group.nextDueDate)}</td>

                    <td>
                      <span
                        className={`sdf-status sdf-status-${getStatusClass(
                          group.status
                        )}`}
                      >
                        {group.status}
                      </span>
                    </td>

                    <td>
                      <div className="sdf-actions">
                        <button
                          type="button"
                          className="sdf-action-btn"
                          title="View outstanding fee details"
                          aria-label={`View fees for ${group.studentName}`}
                          onClick={() => setSelectedStudent(group)}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          className="sdf-action-btn"
                          title="Print student dues"
                          aria-label={`Print fees for ${group.studentName}`}
                          onClick={() => handlePrint(group)}
                        >
                          <Printer size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={6}>Total outstanding</td>
                  <td className="sdf-total-footer">
                    {formatCurrency(totalOutstanding)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {selectedStudent && (
        <div
          className="sdf-modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <section
            className="sdf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sdf-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sdf-modal-header">
              <div className="sdf-modal-student">
                <div className="sdf-student-photo-wrap sdf-modal-photo">
                  {selectedStudent.photo && (
                    <img
                      className="sdf-student-photo"
                      src={getPhotoUrl(selectedStudent.photo)}
                      alt={`${selectedStudent.studentName} profile`}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        event.currentTarget.parentElement
                          ?.querySelector(".sdf-photo-fallback")
                          ?.classList.remove(
                            "sdf-photo-fallback-hidden"
                          );
                      }}
                    />
                  )}

                  <span
                    className={`sdf-photo-fallback ${
                      selectedStudent.photo
                        ? "sdf-photo-fallback-hidden"
                        : ""
                    }`}
                  >
                    <UserRound size={20} />
                  </span>
                </div>

                <div>
                  <span className="sdf-eyebrow">
                    OUTSTANDING FEE DETAILS
                  </span>
                  <h2 id="sdf-modal-title">
                    {selectedStudent.studentName}
                  </h2>
                  <p>
                    Admission: {selectedStudent.admissionNumber}
                    {" · "}
                    Class: {selectedStudent.className}
                    {selectedStudent.section
                      ? ` · Section ${selectedStudent.section}`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="sdf-close-btn"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close fee details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="sdf-modal-summary">
              <div>
                <span>Fee Items</span>
                <strong>{selectedStudent.feeCount}</strong>
              </div>
              <div>
                <span>Total Fee</span>
                <strong>{formatCurrency(selectedStudent.totalFee)}</strong>
              </div>
              <div>
                <span>Paid</span>
                <strong>{formatCurrency(selectedStudent.totalPaid)}</strong>
              </div>
              <div>
                <span>Outstanding</span>
                <strong className="sdf-due-amount">
                  {formatCurrency(selectedStudent.totalOutstanding)}
                </strong>
              </div>
            </div>

            <div className="sdf-modal-section-heading">
              <h3>Individual Outstanding Fees</h3>
              <p>
                Each row represents one saved fee assignment.
              </p>
            </div>

            <div className="sdf-detail-table-wrap">
              <table className="sdf-detail-table">
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th>Period</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedStudent.assignments.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.feeType}</strong>
                        {record.description && (
                          <small>{record.description}</small>
                        )}
                      </td>
                      <td>{record.feePeriod}</td>
                      <td>{formatCurrency(record.amount)}</td>
                      <td>{formatCurrency(record.paidAmount)}</td>
                      <td>
                        <strong className="sdf-due-amount">
                          {formatCurrency(record.outstanding)}
                        </strong>
                      </td>
                      <td>{formatDate(record.dueDate)}</td>
                      <td>
                        <span
                          className={`sdf-status sdf-status-${getStatusClass(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sdf-modal-footer">
              <button
                type="button"
                className="sdf-secondary-btn"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="sdf-primary-btn"
                onClick={() => handlePrint(selectedStudent)}
              >
                <Printer size={17} />
                Print Student Dues
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

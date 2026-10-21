
import { useEffect, useState } from "react";
import {
  RefreshCw,
  ReceiptText,
  Wallet,
  CircleDollarSign,
  AlertCircle,
  UserRound,
} from "lucide-react";

import "./FeeDashboard.css";
// import "./FeeDashboard.css";

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

function getStudentId(fee) {
  return getId(fee.studentId) || getId(fee.student);
}

function getStudentName(fee, linkedStudent) {
  const embeddedStudent =
    fee.student && typeof fee.student === "object"
      ? fee.student
      : {};

  const profiles = [linkedStudent || {}, embeddedStudent];

  for (const student of profiles) {
    const fullName = [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(
        (part) => typeof part === "string" && part.trim()
      )
      .join(" ")
      .trim();

    if (fullName) return fullName;

    const savedName =
      student.fullName ||
      student.name ||
      student.studentName;

    if (
      typeof savedName === "string" &&
      savedName.trim()
    ) {
      return savedName.trim();
    }
  }

  return fee.studentName || "Student record not linked";
}

function getAdmissionNumber(fee, linkedStudent) {
  const student =
    fee.student && typeof fee.student === "object"
      ? fee.student
      : {};

  return (
    linkedStudent?.admissionNumber ||
    linkedStudent?.admissionNo ||
    fee.admissionNumber ||
    student.admissionNumber ||
    student.admissionNo ||
    "N/A"
  );
}

function getClassName(fee, linkedStudent) {
  const student =
    fee.student && typeof fee.student === "object"
      ? fee.student
      : {};

  const className =
    fee.className ||
    linkedStudent?.className ||
    linkedStudent?.class ||
    student.className ||
    student.class ||
    student.grade ||
    "";

  const section =
    fee.section ||
    linkedStudent?.section ||
    student.section ||
    "";

  if (!className) return "N/A";

  return section
    ? `${className} · Section ${section}`
    : className;
}

function getAmount(fee) {
  return Math.max(
    0,
    Number(fee.amount ?? fee.totalAmount ?? 0) || 0
  );
}

function getPaidAmount(fee) {
  return Math.max(
    0,
    Number(fee.paidAmount ?? fee.amountPaid ?? 0) || 0
  );
}

function getOutstanding(fee) {
  const amount = getAmount(fee);
  const paid = getPaidAmount(fee);

  return Math.max(
    0,
    Math.round((amount - paid + Number.EPSILON) * 100) / 100
  );
}

function getStatus(fee) {
  const amount = getAmount(fee);
  const paid = getPaidAmount(fee);
  const outstanding = getOutstanding(fee);

  if (amount > 0 && outstanding === 0) return "Paid";
  if (paid > 0) return "Partially Paid";

  return "Pending";
}

function getStatusClass(status) {
  return String(status)
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
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

function getStudentPhoto(fee, linkedStudent) {
  const embeddedStudent =
    fee.student && typeof fee.student === "object"
      ? fee.student
      : {};

  return (
    linkedStudent?.studentPhoto ||
    linkedStudent?.photo ||
    embeddedStudent.studentPhoto ||
    embeddedStudent.photo ||
    fee.studentPhoto ||
    ""
  );
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

function FeeDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchFeeData() {
    try {
      setLoading(true);
      setError("");

      // Assigned fees are stored in the feeAssignments collection.
      const response = await fetch(
        `${API_URL}/api/fees/assignments`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load fee assignments."
        );
      }

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.assignments)
            ? result.assignments
            : null;

      if (!records) {
        throw new Error(
          "The fee assignments API returned an invalid response."
        );
      }

      // Sort by newest assignment first.
      const sortedRecords = [...records].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();

        return dateB - dateA;
      });

      setAssignments(sortedRecords);

      // Load student details and profile photos separately.
      try {
        const studentResponse = await fetch(
          `${API_URL}/api/students`
        );

        if (studentResponse.ok) {
          const studentResult = await studentResponse.json();

          const studentRecords = Array.isArray(studentResult)
            ? studentResult
            : Array.isArray(studentResult.data)
              ? studentResult.data
              : [];

          setStudents(studentRecords);
        } else {
          setStudents([]);
        }
      } catch {
        // The dashboard can still show saved fee assignments without profiles.
        setStudents([]);
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeeData();
  }, []);

  const studentsById = new Map(
    students.map((student) => [
      String(student._id || student.id),
      student,
    ])
  );

  const totalFees = assignments.reduce(
    (sum, fee) => sum + getAmount(fee),
    0
  );

  const totalPaid = assignments.reduce(
    (sum, fee) => sum + getPaidAmount(fee),
    0
  );

  const totalDue = assignments.reduce(
    (sum, fee) => sum + getOutstanding(fee),
    0
  );

  const formatCount = (value) =>
    Number(value || 0).toLocaleString("en-PK");

  if (loading) {
    return (
      <div className="fee-dashboard">
        <p className="fee-message">
          Loading fee assignments...
        </p>
      </div>
    );
  }

  return (
    <div className="fee-dashboard">
      <div className="fee-dashboard-header">
        <div>
          <h1>Fee Dashboard</h1>
          <p>
            Monitor assigned fees, payments and outstanding balances.
          </p>
        </div>

        <button
          type="button"
          className="fee-refresh-button"
          onClick={fetchFeeData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>

      <p className="fee-message">
        Dashboard totals are calculated from saved fee assignments and
        the payments allocated to them.
      </p>

      {error && (
        <div className="fee-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Unable to load fee dashboard</strong>
            <p>{error}</p>
            <p>
              Please confirm that the backend is running and
              GET /api/fees/assignments is available.
            </p>
          </div>
        </div>
      )}

      {!error && (
        <>
          <div className="fee-summary-grid">
            <div className="fee-summary-card">
              <ReceiptText size={22} />
              <span>Total Assigned Fees</span>
              <h2>{formatCurrency(totalFees)}</h2>
            </div>

            <div className="fee-summary-card">
              <Wallet size={22} />
              <span>Total Paid</span>
              <h2>{formatCurrency(totalPaid)}</h2>
            </div>

            <div className="fee-summary-card">
              <CircleDollarSign size={22} />
              <span>Total Outstanding</span>
              <h2>{formatCurrency(totalDue)}</h2>
            </div>

            <div className="fee-summary-card">
              <ReceiptText size={22} />
              <span>Fee Assignments</span>
              <h2>{formatCount(assignments.length)}</h2>
            </div>
          </div>

          <div className="fee-table-container">
            <h2>Recent Fee Assignments</h2>

            {assignments.length === 0 ? (
              <p className="fee-message">
                No fee assignments found. Assign fees to students
                to see them here.
              </p>
            ) : (
              <div className="fee-table-scroll">
                <table className="fee-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Admission No.</th>
                      <th>Fee Type</th>
                      <th>Total Amount</th>
                      <th>Paid</th>
                      <th>Outstanding</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {assignments.map((fee, index) => {
                      const studentId = getStudentId(fee);
                      const linkedStudent = studentId
                        ? studentsById.get(studentId)
                        : null;

                      const studentName = getStudentName(
                        fee,
                        linkedStudent
                      );

                      const photo = getStudentPhoto(
                        fee,
                        linkedStudent
                      );

                      const amount = getAmount(fee);
                      const paid = getPaidAmount(fee);
                      const outstanding = getOutstanding(fee);
                      const status = getStatus(fee);

                      return (
                        <tr
                          key={
                            fee._id ||
                            fee.id ||
                            `${studentId}-${fee.feeType}-${index}`
                          }
                        >
                          <td>
                            <div className="fee-student-cell">
                              <div className="fee-student-photo-wrap">
                                {photo && (
                                  <img
                                    className="fee-student-photo"
                                    src={getPhotoUrl(photo)}
                                    alt={`${studentName} profile`}
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display =
                                        "none";

                                      event.currentTarget.parentElement
                                        ?.querySelector(
                                          ".fee-photo-fallback"
                                        )
                                        ?.classList.remove(
                                          "fee-photo-fallback-hidden"
                                        );
                                    }}
                                  />
                                )}

                                <span
                                  className={`fee-photo-fallback ${
                                    photo
                                      ? "fee-photo-fallback-hidden"
                                      : ""
                                  }`}
                                >
                                  <UserRound size={17} />
                                </span>
                              </div>

                              <div className="fee-student-details">
                                <strong>{studentName}</strong>
                                <small>
                                  {getClassName(fee, linkedStudent)}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            {getAdmissionNumber(fee, linkedStudent)}
                          </td>

                          <td>{fee.feeType || "Other Fee"}</td>

                          <td>{formatCurrency(amount)}</td>

                          <td>{formatCurrency(paid)}</td>

                          <td>
                            <strong>{formatCurrency(outstanding)}</strong>
                          </td>

                          <td>{formatDate(fee.dueDate)}</td>

                          <td>
                            <span
                              className={`fee-status fee-status-${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default FeeDashboard;

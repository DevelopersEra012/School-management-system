
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  RotateCcw,
  Download,
  Smartphone,
  Wallet,
  ReceiptText,
  CalendarDays,
  AlertCircle,
  Printer,
  UserRound,
} from "lucide-react";

import "./OnlineTransaction.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function normalizeMethod(method) {
  return String(method || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Recognized electronic/mobile-wallet payment methods.
// Cash is deliberately excluded.
function isOnlineTransaction(record) {
  const method = normalizeMethod(record.paymentMethod);

  return [
    "banktransfer",
    "banktransfers",
    "easypaisa",
    "easypaisawallet",
    "jazzcash",
    "jazzcashwallet",
    "online",
    "onlinepayment",
    "internetbanking",
    "mobilewallet",
    "ibft",
    "raast",
    "debitcard",
    "creditcard",
    "card",
  ].includes(method);
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getStudentId(record) {
  return (
    getId(record.studentId) ||
    getId(record.student)
  );
}

function getEmbeddedStudent(record) {
  return record.student && typeof record.student === "object"
    ? record.student
    : {};
}

function getNameFromProfile(student = {}) {
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
    ""
  );
}

function getStudentName(record, linkedStudent) {
  const fullName =
    getNameFromProfile(linkedStudent || {}) ||
    getNameFromProfile(getEmbeddedStudent(record));

  if (fullName) return fullName;

  const savedName = record.studentName;

  if (
    typeof savedName === "string" &&
    savedName.trim().length > 1
  ) {
    return savedName.trim();
  }

  return "Student record not linked";
}

function getAdmissionNumber(record, linkedStudent) {
  const student = getEmbeddedStudent(record);

  return (
    linkedStudent?.admissionNumber ||
    linkedStudent?.admissionNo ||
    record.admissionNumber ||
    student.admissionNumber ||
    student.admissionNo ||
    "N/A"
  );
}

function getClassName(record, linkedStudent) {
  const student = getEmbeddedStudent(record);

  const className =
    linkedStudent?.className ||
    linkedStudent?.class ||
    record.className ||
    student.className ||
    student.class ||
    student.grade ||
    "";

  const section =
    linkedStudent?.section ||
    record.section ||
    student.section ||
    "";

  if (!className) return section ? `Section ${section}` : "Class not set";

  return section
    ? `${className} · Section ${section}`
    : className;
}

function getStudentPhoto(record, linkedStudent) {
  const student = getEmbeddedStudent(record);

  return (
    linkedStudent?.studentPhoto ||
    linkedStudent?.photo ||
    student.studentPhoto ||
    student.photo ||
    record.studentPhoto ||
    ""
  );
}

function getStudentPhotoUrl(photo) {
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

  // For database values containing only the saved filename.
  return `${API_URL}/uploads/students/${value}`;
}

function getPaymentAmount(record) {
  // Do not use record.amount as a fallback: older fee records may store
  // the assigned fee in that field instead of the actual amount received.
  return (
    Number(
      record.paidAmount ??
        record.amountPaid ??
        record.paymentAmount ??
        0
    ) || 0
  );
}

function getDateValue(record) {
  return record.paymentDate || record.createdAt || "";
}

function getDateKey(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function escapeCSV(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function getMethodClass(method) {
  return (
    normalizeMethod(method) || "other"
  );
}

export default function OnlineTransaction() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedMethod, setSelectedMethod] =
    useState("All Methods");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError("");

      // Load real payment records from the backend.
      const response = await fetch(`${API_URL}/api/fees`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not load transaction records."
        );
      }

      const data = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.fees)
            ? result.fees
            : null;

      if (!data) {
        throw new Error(
          "The transactions API returned an invalid response."
        );
      }

      // Only include recognized electronic payment methods.
      setRecords(data.filter(isOnlineTransaction));

      // Fetch profiles separately for their photos and complete names.
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
        // The transaction register can still work without student profiles.
        setStudents([]);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the transactions API."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const studentsById = useMemo(() => {
    return new Map(
      students.map((student) => [
        String(student._id || student.id),
        student,
      ])
    );
  }, [students]);

  const methodOptions = useMemo(() => {
    return [
      "All Methods",
      ...new Set(
        records
          .map((record) => record.paymentMethod)
          .filter(Boolean)
      ),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const linkedStudent = studentsById.get(getStudentId(record));

      const studentName = getStudentName(record, linkedStudent);
      const admissionNumber = getAdmissionNumber(
        record,
        linkedStudent
      );
      const className = getClassName(record, linkedStudent);

      const searchableText = [
        studentName,
        admissionNumber,
        className,
        record.receiptNumber,
        record.feeType,
        record.paymentMethod,
        record.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const dateKey = getDateKey(getDateValue(record));

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesMethod =
        selectedMethod === "All Methods" ||
        record.paymentMethod === selectedMethod;

      const matchesStartDate =
        !startDate || (dateKey && dateKey >= startDate);

      const matchesEndDate =
        !endDate || (dateKey && dateKey <= endDate);

      return (
        matchesSearch &&
        matchesMethod &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    records,
    studentsById,
    search,
    selectedMethod,
    startDate,
    endDate,
  ]);

  const totalCollected = records.reduce(
    (sum, record) => sum + getPaymentAmount(record),
    0
  );

  const filteredTotal = filteredRecords.reduce(
    (sum, record) => sum + getPaymentAmount(record),
    0
  );

  function resetFilters() {
    setSearch("");
    setSelectedMethod("All Methods");
    setStartDate("");
    setEndDate("");
  }

  function exportCSV() {
    if (filteredRecords.length === 0) {
      window.alert("There are no online transactions to export.");
      return;
    }

    const headers = [
      "Receipt Number",
      "Payment Date",
      "Student Name",
      "Admission Number",
      "Class",
      "Fee Type",
      "Payment Method",
      "Amount Received",
      "Transaction Reference",
      "Record Status",
    ];

    const rows = filteredRecords.map((record) => {
      const linkedStudent = studentsById.get(getStudentId(record));

      return [
        record.receiptNumber || "",
        formatDate(getDateValue(record)),
        getStudentName(record, linkedStudent),
        getAdmissionNumber(record, linkedStudent),
        getClassName(record, linkedStudent),
        record.feeType || "",
        record.paymentMethod || "",
        getPaymentAmount(record),
        record.reference || "",
        "Saved in database",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "school-erp-online-transactions.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="otx-page">
      <header className="otx-header">
        <div>
          <span className="otx-eyebrow">
            FEE AND FINANCE / ONLINE TRANSACTION
          </span>

          <h1>Online Transactions</h1>

          <p>
            Review recorded bank transfer and mobile wallet payments.
          </p>
        </div>

        <div className="otx-header-actions">
          <button
            type="button"
            className="otx-button otx-button-light"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            className="otx-button otx-button-light"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="otx-button otx-button-primary"
            onClick={exportCSV}
            disabled={loading || filteredRecords.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      <div className="otx-info-banner">
        <AlertCircle size={19} />
        <p>
          This page displays saved payment records. A saved record alone
          does not confirm settlement by a bank or mobile wallet provider.
        </p>
      </div>

      {error && (
        <div className="otx-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Unable to load online transactions</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="otx-stats">
        <article className="otx-stat-card">
          <div className="otx-stat-icon otx-icon-purple">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>Online Transaction Records</span>
            <h2>{loading ? "—" : records.length}</h2>
            <p>Saved electronic payment entries</p>
          </div>
        </article>

        <article className="otx-stat-card">
          <div className="otx-stat-icon otx-icon-green">
            <Wallet size={22} />
          </div>
          <div>
            <span>Total Recorded Online Amount</span>
            <h2>{loading ? "—" : formatCurrency(totalCollected)}</h2>
            <p>All recognized online-method records</p>
          </div>
        </article>

        <article className="otx-stat-card">
          <div className="otx-stat-icon otx-icon-blue">
            <Smartphone size={22} />
          </div>
          <div>
            <span>Filtered Results</span>
            <h2>{loading ? "—" : filteredRecords.length}</h2>
            <p>Matches your current filters</p>
          </div>
        </article>
      </section>

      <section className="otx-panel">
        <div className="otx-panel-heading">
          <div>
            <h2>Online Payment Register</h2>
            <p>
              Search by student, receipt number, payment method or reference.
            </p>
          </div>

          <span className="otx-record-count">
            {loading ? "Loading..." : `${filteredRecords.length} records`}
          </span>
        </div>

        <div className="otx-filters">
          <label className="otx-search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by payment method"
            value={selectedMethod}
            onChange={(event) => setSelectedMethod(event.target.value)}
          >
            {methodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <label className="otx-date-field">
            <span>From date</span>
            <input
              type="date"
              aria-label="From date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="otx-date-field">
            <span>To date</span>
            <input
              type="date"
              aria-label="To date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="otx-state">
            <RefreshCw size={26} />
            <p>Loading saved online transaction records...</p>
          </div>
        ) : error ? (
          <div className="otx-state">
            <AlertCircle size={28} />
            <p>Transactions could not be loaded.</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="otx-state">
            <Smartphone size={34} />
            <h3>No online transactions found</h3>
            <p>
              No saved bank transfer, EasyPaisa, JazzCash or other recognized
              electronic payment records match your filters.
            </p>
          </div>
        ) : (
          <div className="otx-table-wrap">
            <table className="otx-table">
              <thead>
                <tr>
                  <th>Receipt Number</th>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Fee Type</th>
                  <th>Payment Method</th>
                  <th>Reference</th>
                  <th>Amount Received</th>
                  <th>Record Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record, index) => {
                  const linkedStudent = studentsById.get(
                    getStudentId(record)
                  );

                  const studentName = getStudentName(
                    record,
                    linkedStudent
                  );

                  const admissionNumber = getAdmissionNumber(
                    record,
                    linkedStudent
                  );

                  const studentPhoto = getStudentPhoto(
                    record,
                    linkedStudent
                  );

                  const recordKey =
                    record._id ||
                    record.id ||
                    record.receiptNumber ||
                    `online-transaction-${index}`;

                  return (
                    <tr key={recordKey}>
                      <td>
                        <span className="otx-receipt">
                          {record.receiptNumber || "—"}
                        </span>
                      </td>

                      <td>{formatDate(getDateValue(record))}</td>

                      <td>
                        <div className="otx-student">
                          <div className="otx-photo-wrap">
                            {studentPhoto && (
                              <img
                                className="otx-student-photo"
                                src={getStudentPhotoUrl(studentPhoto)}
                                alt={`${studentName} profile`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";

                                  event.currentTarget.parentElement
                                    ?.querySelector(".otx-photo-fallback")
                                    ?.classList.remove(
                                      "otx-photo-fallback-hidden"
                                    );
                                }}
                              />
                            )}

                            <span
                              className={`otx-photo-fallback ${
                                studentPhoto
                                  ? "otx-photo-fallback-hidden"
                                  : ""
                              }`}
                              aria-label="Student photo unavailable"
                            >
                              <UserRound size={19} />
                            </span>
                          </div>

                          <div className="otx-student-details">
                            <strong>{studentName}</strong>
                            <small>
                              Admission: {admissionNumber}
                            </small>
                            <small>
                              {getClassName(record, linkedStudent)}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{record.feeType || "—"}</td>

                      <td>
                        <span
                          className={`otx-method otx-method-${getMethodClass(
                            record.paymentMethod
                          )}`}
                        >
                          {record.paymentMethod || "—"}
                        </span>
                      </td>

                      <td className="otx-reference">
                        {record.reference || "—"}
                      </td>

                      <td className="otx-amount">
                        {formatCurrency(getPaymentAmount(record))}
                      </td>

                      <td>
                        <span className="otx-saved-badge">
                          <span />
                          Saved
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={6}>Total in filtered results</td>
                  <td className="otx-amount">
                    {formatCurrency(filteredTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <footer className="otx-panel-footer">
          <span>
            Source: saved fee records in your MongoDB database
          </span>

          <button
            type="button"
            className="otx-print-button"
            onClick={() => window.print()}
            disabled={loading || filteredRecords.length === 0}
          >
            <Printer size={16} />
            Print Register
          </button>
        </footer>
      </section>
    </div>
  );
}

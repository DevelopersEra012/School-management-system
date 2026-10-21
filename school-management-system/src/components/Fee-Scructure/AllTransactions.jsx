
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  RotateCcw,
  Download,
  ReceiptText,
  Wallet,
  Banknote,
  AlertCircle,
  CalendarDays,
  Printer,
  UserRound,
} from "lucide-react";

import "./AllTransactions.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getEmbeddedStudent(record) {
  return record.student && typeof record.student === "object"
    ? record.student
    : {};
}

function getStudentId(record) {
  const id =
    record.studentId?._id ||
    record.studentId ||
    record.student?._id ||
    record.student?.id;

  return id ? String(id) : "";
}

function getStudentName(record, linkedStudent) {
  const profiles = [
    linkedStudent || {},
    getEmbeddedStudent(record),
  ];

  for (const student of profiles) {
    const fullName = [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ")
      .trim();

    if (fullName) return fullName;

    const savedName =
      student.fullName ||
      student.name ||
      student.studentName;

    if (typeof savedName === "string" && savedName.trim()) {
      return savedName.trim();
    }
  }

  const transactionName = record.studentName;

  if (
    typeof transactionName === "string" &&
    transactionName.trim().length > 1
  ) {
    return transactionName.trim();
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
    linkedStudent?.grade ||
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

  if (!className) return "N/A";

  return section ? `${className} · Section ${section}` : className;
}

function getStudentPhoto(record, linkedStudent) {
  const embeddedStudent = getEmbeddedStudent(record);

  return (
    linkedStudent?.studentPhoto ||
    linkedStudent?.photo ||
    embeddedStudent.studentPhoto ||
    embeddedStudent.photo ||
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

  return `${API_URL}/uploads/students/${value}`;
}

function getPaymentAmount(record) {
  return (
    Number(
      record.paidAmount ??
        record.amountPaid ??
        record.paymentAmount ??
        0
    ) || 0
  );
}

function getTotalFee(record) {
  return (
    Number(
      record.totalAmount ??
        record.totalDue ??
        record.amount ??
        0
    ) || 0
  );
}

function getStatus(record) {
  if (record.status) return record.status;

  const paid = getPaymentAmount(record);
  const total = getTotalFee(record);

  const balance = Number(
    record.balanceDue ??
      record.remaining ??
      Math.max(0, total - paid)
  );

  if (balance <= 0 && total > 0) return "Paid";
  if (paid > 0) return "Partially Paid";

  return "Pending";
}

function getStatusClass(status) {
  return String(status)
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDateValue(record) {
  return record.paymentDate || record.createdAt || "";
}

function getDateKey(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function AllTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("All Methods");
  const [status, setStatus] = useState("All Statuses");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/fees`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not load fee transactions."
        );
      }

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.fees)
            ? result.fees
            : null;

      if (!records) {
        throw new Error(
          "The fee transactions API returned an invalid response."
        );
      }

      setTransactions(records);

      // Student data is loaded separately to get saved profile photos.
      try {
        const studentResponse = await fetch(`${API_URL}/api/students`);

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
        // Transaction history will still work if student records fail to load.
        setStudents([]);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to load transactions. Check whether the backend is running."
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

  const paymentMethods = useMemo(() => {
    return [
      "All Methods",
      ...new Set(
        transactions
          .map((item) => item.paymentMethod)
          .filter(Boolean)
      ),
    ];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((record) => {
      const linkedStudent = studentsById.get(getStudentId(record));

      const studentName = getStudentName(record, linkedStudent);
      const admissionNumber = getAdmissionNumber(record, linkedStudent);
      const className = getClassName(record, linkedStudent);

      const searchableText = [
        studentName,
        admissionNumber,
        className,
        record.receiptNumber,
        record.feeType,
        record.reference,
        record.paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const dateKey = getDateKey(getDateValue(record));

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesMethod =
        paymentMethod === "All Methods" ||
        record.paymentMethod === paymentMethod;

      const matchesStatus =
        status === "All Statuses" ||
        getStatus(record) === status;

      const matchesStartDate =
        !startDate || (dateKey && dateKey >= startDate);

      const matchesEndDate =
        !endDate || (dateKey && dateKey <= endDate);

      return (
        matchesSearch &&
        matchesMethod &&
        matchesStatus &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    transactions,
    studentsById,
    search,
    paymentMethod,
    status,
    startDate,
    endDate,
  ]);

  const totalCollected = transactions.reduce(
    (sum, record) => sum + getPaymentAmount(record),
    0
  );

  const cashCollected = transactions.reduce(
    (sum, record) =>
      sum +
      (record.paymentMethod?.toLowerCase() === "cash"
        ? getPaymentAmount(record)
        : 0),
    0
  );

  const otherCollected = totalCollected - cashCollected;

  const filteredTotal = filteredTransactions.reduce(
    (sum, record) => sum + getPaymentAmount(record),
    0
  );

  function resetFilters() {
    setSearch("");
    setPaymentMethod("All Methods");
    setStatus("All Statuses");
    setStartDate("");
    setEndDate("");
  }

  function exportCSV() {
    if (filteredTransactions.length === 0) {
      window.alert("There are no transactions to export.");
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
      "Status",
    ];

    const rows = filteredTransactions.map((record) => {
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
        getStatus(record),
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
    link.download = "school-erp-transactions.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="atx-page">
      <header className="atx-header">
        <div>
          <span className="atx-eyebrow">
            FEE AND FINANCE / ALL TRANSACTIONS
          </span>

          <h1>All Transactions</h1>

          <p>
            View, search and export recorded student fee payments.
          </p>
        </div>

        <div className="atx-header-actions">
          <button
            type="button"
            className="atx-button atx-button-light"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            className="atx-button atx-button-light"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="atx-button atx-button-primary"
            onClick={exportCSV}
            disabled={loading || filteredTransactions.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="atx-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Unable to load transactions</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="atx-metrics">
        <article className="atx-metric-card">
          <div className="atx-metric-icon atx-purple">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>Total Transactions</span>
            <h2>{loading ? "—" : transactions.length}</h2>
            <p>Saved fee records</p>
          </div>
        </article>

        <article className="atx-metric-card">
          <div className="atx-metric-icon atx-green">
            <Wallet size={22} />
          </div>
          <div>
            <span>Total Amount Received</span>
            <h2>{loading ? "—" : formatCurrency(totalCollected)}</h2>
            <p>All saved payment records</p>
          </div>
        </article>

        <article className="atx-metric-card">
          <div className="atx-metric-icon atx-blue">
            <Banknote size={22} />
          </div>
          <div>
            <span>Cash Collections</span>
            <h2>{loading ? "—" : formatCurrency(cashCollected)}</h2>
            <p>Recorded cash payments</p>
          </div>
        </article>

        <article className="atx-metric-card">
          <div className="atx-metric-icon atx-orange">
            <CalendarDays size={22} />
          </div>
          <div>
            <span>Other Payment Methods</span>
            <h2>{loading ? "—" : formatCurrency(otherCollected)}</h2>
            <p>Non-cash payment methods</p>
          </div>
        </article>
      </section>

      <section className="atx-panel">
        <div className="atx-panel-heading">
          <div>
            <h2>Transaction Register</h2>
            <p>
              Search by receipt number, student, admission number or fee type.
            </p>
          </div>

          <span className="atx-record-count">
            {loading
              ? "Loading..."
              : `${filteredTransactions.length} records`}
          </span>
        </div>

        <div className="atx-filters">
          <label className="atx-search-box">
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
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>

          <label className="atx-date-field">
            <span>From</span>
            <input
              type="date"
              aria-label="Start date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="atx-date-field">
            <span>To</span>
            <input
              type="date"
              aria-label="End date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="atx-state">
            <RefreshCw size={25} />
            <p>Loading saved transactions...</p>
          </div>
        ) : error ? (
          <div className="atx-state">
            <AlertCircle size={27} />
            <p>Transactions could not be loaded.</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="atx-state">
            <ReceiptText size={32} />
            <h3>No transactions found</h3>
            <p>
              No saved transactions match your current filters.
            </p>

            <button
              type="button"
              className="atx-button atx-button-light"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="atx-table-wrap">
            <table className="atx-table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Payment Date</th>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Fee Type</th>
                  <th>Method</th>
                  <th>Amount Received</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((record, index) => {
                  const recordKey =
                    record._id ||
                    record.id ||
                    record.receiptNumber ||
                    `transaction-${index}`;

                  const linkedStudent = studentsById.get(
                    getStudentId(record)
                  );

                  const studentName = getStudentName(
                    record,
                    linkedStudent
                  );

                  const photo = getStudentPhoto(
                    record,
                    linkedStudent
                  );

                  const currentStatus = getStatus(record);

                  return (
                    <tr key={recordKey}>
                      <td>
                        <span className="atx-receipt-number">
                          {record.receiptNumber || "—"}
                        </span>
                      </td>

                      <td>{formatDate(getDateValue(record))}</td>

                      <td>
                        <div className="atx-student">
                          <div className="atx-student-photo-wrap">
                            {photo && (
                              <img
                                className="atx-student-photo"
                                src={getStudentPhotoUrl(photo)}
                                alt={`${studentName} profile`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";

                                  event.currentTarget.parentElement
                                    ?.querySelector(".atx-photo-fallback")
                                    ?.classList.remove(
                                      "atx-photo-fallback-hidden"
                                    );
                                }}
                              />
                            )}

                            <span
                              className={`atx-photo-fallback ${
                                photo
                                  ? "atx-photo-fallback-hidden"
                                  : ""
                              }`}
                              aria-label="Student photo unavailable"
                            >
                              <UserRound size={19} />
                            </span>
                          </div>

                          <div className="atx-student-details">
                            <strong>{studentName}</strong>
                            <small>
                              {getClassName(record, linkedStudent)}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {getAdmissionNumber(record, linkedStudent)}
                      </td>

                      <td>{record.feeType || "—"}</td>

                      <td>
                        <span className="atx-method">
                          {record.paymentMethod || "—"}
                        </span>
                      </td>

                      <td className="atx-amount">
                        {formatCurrency(getPaymentAmount(record))}
                      </td>

                      <td>
                        <span
                          className={`atx-status atx-status-${getStatusClass(
                            currentStatus
                          )}`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <td colSpan={6}>
                    Total received in filtered results
                  </td>

                  <td className="atx-amount">
                    {formatCurrency(filteredTotal)}
                  </td>

                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="atx-panel-footer">
          <span>
            Data source: your existing fee records in MongoDB
          </span>

          <button
            type="button"
            className="atx-print-button"
            onClick={() => window.print()}
            disabled={loading || filteredTransactions.length === 0}
          >
            <Printer size={16} />
            Print Register
          </button>
        </div>
      </section>
    </div>
  );
}

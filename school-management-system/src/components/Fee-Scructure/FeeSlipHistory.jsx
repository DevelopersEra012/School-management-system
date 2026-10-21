
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ReceiptText,
  Wallet,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Printer,
  CalendarDays,
  UserRound,
} from "lucide-react";

import "./FeeSlipHistory.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Handle API responses returned as arrays or { data: [...] }.
function getList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function getStudentName(student) {
  if (!student) return "Unnamed Student";

  return (
    [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    student.name ||
    student.fullName ||
    student.studentName ||
    "Unnamed Student"
  );
}

function getAdmissionNumber(record) {
  return (
    record.admissionNumber ||
    record.student?.admissionNumber ||
    "N/A"
  );
}

function getStudentId(record) {
  if (record.studentId && typeof record.studentId === "object") {
    return String(record.studentId._id || record.studentId.id || "");
  }

  if (record.student && typeof record.student === "object") {
    return String(record.student._id || record.student.id || "");
  }

  return String(record.studentId || record.student || "");
}

/*
  Resolve the student's photo from:
  1. The saved fee record
  2. An embedded student object
  3. The Students API, matched by student ID or admission number
*/
function getStudentPhotoUrl(record, students) {
  const studentId = getStudentId(record);

  const linkedStudent = students.find((student) => {
    const id = String(student._id || student.id || "");
    return studentId && id === studentId;
  });

  const admissionNumber = getAdmissionNumber(record);

  const admissionMatchedStudent =
    linkedStudent ||
    students.find(
      (student) =>
        admissionNumber !== "N/A" &&
        String(student.admissionNumber || student.admissionNo || "") ===
          String(admissionNumber)
    );

  const embeddedStudent =
    record.student && typeof record.student === "object"
      ? record.student
      : record.studentId && typeof record.studentId === "object"
        ? record.studentId
        : null;

  const photoCandidates = [
    record.studentPhoto,
    record.photoUrl,
    record.photo,
    record.imageUrl,
    record.image,
    embeddedStudent?.studentPhoto,
    embeddedStudent?.photoUrl,
    embeddedStudent?.photo,
    admissionMatchedStudent?.studentPhoto,
    admissionMatchedStudent?.photoUrl,
    admissionMatchedStudent?.photo,
    admissionMatchedStudent?.imageUrl,
    admissionMatchedStudent?.image,
  ];

  const photo = photoCandidates.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (!photo) return "";

  let path = photo.trim().replace(/\\/g, "/");

  // Keep data URLs and absolute web URLs unchanged.
  if (
    path.startsWith("data:image/") ||
    /^https?:\/\//i.test(path)
  ) {
    return path;
  }

  // If a local filesystem path includes an uploads directory,
  // convert it into a web-accessible /uploads path.
  const uploadsIndex = path.toLowerCase().indexOf("/uploads/");

  if (uploadsIndex !== -1) {
    path = path.slice(uploadsIndex);
    return `${API_URL}${path}`;
  }

  if (/^[a-z]:\//i.test(path)) {
    // A Windows disk path is not directly accessible by the browser.
    // Fall back to the filename under the backend uploads directory.
    const filename = path.split("/").pop();
    return filename ? `${API_URL}/uploads/${encodeURIComponent(filename)}` : "";
  }

  if (path.startsWith("/")) {
    return `${API_URL}${path}`;
  }

  if (path.startsWith("uploads/")) {
    return `${API_URL}/${path}`;
  }

  // Relative paths such as students/photo.jpg are assumed to
  // be relative to the backend uploads directory.
  return `${API_URL}/uploads/${path}`;
}

function getAssignedAmount(record) {
  return Math.max(
    0,
    Number(record.amount ?? record.totalAmount ?? 0) || 0
  );
}

function getPaidAmount(record) {
  return Math.max(0, Number(record.paidAmount || 0) || 0);
}

function getBalance(record) {
  const explicitBalance = record.balanceDue ?? record.remaining;

  if (explicitBalance !== undefined && explicitBalance !== null) {
    return Math.max(0, Number(explicitBalance) || 0);
  }

  return Math.max(0, getAssignedAmount(record) - getPaidAmount(record));
}

function getStatus(record) {
  const balance = getBalance(record);
  const paid = getPaidAmount(record);
  const savedStatus = String(record.status || "").toLowerCase();

  if (balance <= 0) return "Paid";

  if (paid > 0) return "Partially Paid";

  if (savedStatus === "overdue") return "Overdue";

  if (record.dueDate) {
    const dueDate = new Date(record.dueDate);

    if (
      !Number.isNaN(dueDate.getTime()) &&
      dueDate.getTime() < new Date().setHours(0, 0, 0, 0)
    ) {
      return "Overdue";
    }
  }

  return "Pending";
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
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

function formatPeriod(value) {
  if (!value) return "—";

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) return value;

  return new Date(year, month - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

function getSlipNumber(record) {
  const id = record._id || record.id;

  return id ? `FS-${String(id).slice(-6).toUpperCase()}` : "FEE-SLIP";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

// Opens a printable fee slip for the selected assignment.
function printSlip(record, photoUrl) {
  const popup = window.open("", "_blank", "width=900,height=750");

  if (!popup) {
    throw new Error(
      "Print window was blocked. Please allow pop-ups and try again."
    );
  }

  const studentName = escapeHtml(
    record.studentName || getStudentName(record.student)
  );

  const photo = photoUrl
    ? `<img class="student-photo" src="${escapeHtml(photoUrl)}" alt="Student photo" />`
    : "";

  const admissionNumber = escapeHtml(getAdmissionNumber(record));
  const className = escapeHtml(
    record.className || record.student?.className || "N/A"
  );
  const section = escapeHtml(record.section || "—");
  const feeType = escapeHtml(record.feeType || "School Fee");
  const period = escapeHtml(formatPeriod(record.feePeriod));
  const slipNumber = escapeHtml(getSlipNumber(record));
  const assignedAmount = formatCurrency(getAssignedAmount(record));
  const paidAmount = formatCurrency(getPaidAmount(record));
  const balance = formatCurrency(getBalance(record));
  const dueDate = escapeHtml(formatDate(record.dueDate));
  const status = escapeHtml(getStatus(record));
  const description = escapeHtml(record.description || "—");
  const createdDate = escapeHtml(
    formatDate(record.createdAt || new Date())
  );

  popup.document.open();

  popup.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${slipNumber} - Fee Slip</title>

        <style>
          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 32px;
            color: #1e293b;
            background: #f1f5f9;
            font-family: Arial, Helvetica, sans-serif;
          }

          .slip {
            max-width: 760px;
            margin: 0 auto;
            padding: 32px;
            background: #fff;
            border: 1px solid #dbe3ef;
            border-radius: 12px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding-bottom: 22px;
            border-bottom: 2px solid #315be8;
          }

          h1 {
            margin: 0 0 7px;
            font-size: 25px;
          }

          p {
            margin: 5px 0;
            line-height: 1.6;
          }

          .muted {
            color: #64748b;
            font-size: 12px;
          }

          .slip-no {
            text-align: right;
            font-size: 13px;
          }

          .student-block {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .student-photo {
            width: 76px;
            height: 76px;
            flex-shrink: 0;
            object-fit: cover;
            border-radius: 50%;
            border: 2px solid #dce3ee;
          }

          .section-title {
            margin: 26px 0 12px;
            font-size: 14px;
            font-weight: 700;
          }

          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            padding: 17px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .detail-label {
            margin-bottom: 4px;
            color: #64748b;
            font-size: 11px;
          }

          .detail-value {
            font-size: 13px;
            font-weight: 700;
            overflow-wrap: anywhere;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 13px 10px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            font-size: 12px;
          }

          th {
            background: #f8fafc;
            color: #475569;
          }

          td.amount {
            text-align: right;
            white-space: nowrap;
          }

          .total {
            color: #315be8;
            font-weight: 700;
          }

          .balance {
            color: #b45309;
            font-weight: 700;
          }

          .notes {
            margin-top: 20px;
            font-size: 12px;
            line-height: 1.7;
          }

          .footer {
            margin-top: 34px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 11px;
            text-align: center;
          }

          .print-button {
            display: block;
            margin: 20px auto;
            padding: 12px 22px;
            color: white;
            background: #315be8;
            border: none;
            border-radius: 7px;
            cursor: pointer;
          }

          @media print {
            body {
              padding: 0;
              background: white;
            }

            .slip {
              max-width: none;
              padding: 15px;
              border: none;
              border-radius: 0;
            }

            .print-button {
              display: none;
            }

            @page {
              size: A4;
              margin: 15mm;
            }
          }
        </style>
      </head>

      <body>
        <main class="slip">
          <div class="header">
            <div>
              <h1>School Fee Slip</h1>
              <p class="muted">School Management System</p>
              <p>Student Fee Record</p>
            </div>

            <div class="slip-no">
              <strong>${slipNumber}</strong>
              <p class="muted">Record Date: ${createdDate}</p>
            </div>
          </div>

          <h2 class="section-title">Student Information</h2>

          <div class="details">
            <div class="student-block">
              ${photo}
              <div>
                <div class="detail-label">Student Name</div>
                <div class="detail-value">${studentName}</div>
              </div>
            </div>

            <div>
              <div class="detail-label">Admission Number</div>
              <div class="detail-value">${admissionNumber}</div>
            </div>

            <div>
              <div class="detail-label">Class</div>
              <div class="detail-value">${className}</div>
            </div>

            <div>
              <div class="detail-label">Section</div>
              <div class="detail-value">${section}</div>
            </div>
          </div>

          <h2 class="section-title">Fee Details</h2>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th>Due Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${feeType}</td>
                <td>${period}</td>
                <td>${dueDate}</td>
                <td class="amount">${assignedAmount}</td>
              </tr>
            </tbody>
          </table>

          <h2 class="section-title">Payment Summary</h2>

          <table>
            <tbody>
              <tr>
                <td>Total Assigned Amount</td>
                <td class="amount total">${assignedAmount}</td>
              </tr>
              <tr>
                <td>Paid Amount</td>
                <td class="amount">${paidAmount}</td>
              </tr>
              <tr>
                <td><strong>Remaining Balance</strong></td>
                <td class="amount balance">${balance}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td class="amount"><strong>${status}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="notes">
            <strong>Notes:</strong>
            <p>${description}</p>
          </div>

          <div class="footer">
            This slip displays the saved fee assignment record.
            Contact the school office if any information needs correction.
          </div>

          <button class="print-button" onclick="window.print()">
            Print Fee Slip
          </button>
        </main>
      </body>
    </html>
  `);

  popup.document.close();
  popup.focus();
}

export default function FeeSlipHistory() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [periodFilter, setPeriodFilter] = useState("All Periods");

  async function fetchHistory() {
    setLoading(true);
    setError("");

    try {
      const [assignmentsResponse, studentsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/fees/assignments`),
          fetch(`${API_URL}/api/students`),
        ]);

      const [assignmentsResult, studentsResult] = await Promise.all([
        assignmentsResponse.json().catch(() => ({})),
        studentsResponse.json().catch(() => ({})),
      ]);

      if (!assignmentsResponse.ok) {
        throw new Error(
          assignmentsResult.message ||
            "Could not load fee slip history."
        );
      }

      setRecords(getList(assignmentsResult));

      // Keep displaying fee history even if the student photo API fails.
      setStudents(
        studentsResponse.ok ? getList(studentsResult) : []
      );

      if (!studentsResponse.ok) {
        setError(
          studentsResult.message ||
            "Fee history loaded, but student photos could not be loaded."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fee slip history. Check the backend server."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  const periods = useMemo(() => {
    return [
      ...new Set(
        records.map((record) => record.feePeriod).filter(Boolean)
      ),
    ].sort().reverse();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const searchable = [
        getSlipNumber(record),
        getStudentName(
          record.student && typeof record.student === "object"
            ? record.student
            : record
        ),
        getAdmissionNumber(record),
        record.className,
        record.section,
        record.feeType,
        record.feePeriod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        getStatus(record) === statusFilter;

      const matchesPeriod =
        periodFilter === "All Periods" ||
        record.feePeriod === periodFilter;

      return matchesSearch && matchesStatus && matchesPeriod;
    });
  }, [records, search, statusFilter, periodFilter]);

  const totalAssigned = records.reduce(
    (sum, record) => sum + getAssignedAmount(record),
    0
  );

  const totalOutstanding = records.reduce(
    (sum, record) => sum + getBalance(record),
    0
  );

  const paidCount = records.filter(
    (record) => getStatus(record) === "Paid"
  ).length;

  function handlePrint(record) {
    try {
      setError("");

      const photoUrl = getStudentPhotoUrl(record, students);

      printSlip(record, photoUrl);
    } catch (err) {
      setError(err.message || "Could not open the print window.");
    }
  }

  return (
    <div className="fsh-page">
      <header className="fsh-header">
        <div>
          <span className="fsh-eyebrow">
            FEE AND FINANCE / FEE SLIP HISTORY
          </span>

          <h1>Fee Slip History</h1>

          <p>
            Search saved fee assignments, check payment balances and print fee slips.
          </p>
        </div>

        <button
          type="button"
          className="fsh-button fsh-button-light"
          onClick={fetchHistory}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh History
        </button>
      </header>

      {error && (
        <div className="fsh-alert fsh-alert-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Notice</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="fsh-stats">
        <article className="fsh-stat-card">
          <div className="fsh-stat-icon fsh-purple">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>Total Fee Slips</span>
            <h2>{loading ? "—" : records.length}</h2>
            <p>Saved fee assignment records</p>
          </div>
        </article>

        <article className="fsh-stat-card">
          <div className="fsh-stat-icon fsh-blue">
            <Wallet size={22} />
          </div>
          <div>
            <span>Total Assigned</span>
            <h2>{loading ? "—" : formatCurrency(totalAssigned)}</h2>
            <p>Total assigned amount</p>
          </div>
        </article>

        <article className="fsh-stat-card">
          <div className="fsh-stat-icon fsh-orange">
            <Clock3 size={22} />
          </div>
          <div>
            <span>Outstanding Balance</span>
            <h2>{loading ? "—" : formatCurrency(totalOutstanding)}</h2>
            <p>Remaining amount due</p>
          </div>
        </article>

        <article className="fsh-stat-card">
          <div className="fsh-stat-icon fsh-green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Paid Fee Records</span>
            <h2>{loading ? "—" : paidCount}</h2>
            <p>Fully paid assignments</p>
          </div>
        </article>
      </section>

      <section className="fsh-panel">
        <div className="fsh-panel-heading">
          <div>
            <h2>Saved Fee Slips</h2>
            <p>
              Search by student, admission number, fee type or fee period.
            </p>
          </div>

          <span className="fsh-count">
            {loading ? "Loading..." : `${filteredRecords.length} records`}
          </span>
        </div>

        <div className="fsh-filters">
          <div className="fsh-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search student, slip number or fee type..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Filter fee slips by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Paid">Paid</option>
          </select>

          <select
            aria-label="Filter fee slips by period"
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="All Periods">All Periods</option>

            {periods.map((period) => (
              <option key={period} value={period}>
                {formatPeriod(period)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="fsh-state">
            <RefreshCw size={26} />
            <p>Loading fee slip history...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="fsh-state">
            <ReceiptText size={34} />
            <h3>No fee slips found</h3>
            <p>
              Saved fee assignments will appear here. Try changing your
              search text or filters.
            </p>
          </div>
        ) : (
          <div className="fsh-table-wrap">
            <table className="fsh-table">
              <thead>
                <tr>
                  <th>Slip No.</th>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Fee Type</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record, index) => {
                  const status = getStatus(record);
                  const photoUrl = getStudentPhotoUrl(record, students);

                  return (
                    <tr key={record._id || record.id || index}>
                      <td>
                        <span className="fsh-slip-number">
                          {getSlipNumber(record)}
                        </span>
                      </td>

                      <td>
                        <div className="fsh-student-cell">
                          <div className="fsh-student-avatar">
                            <UserRound
                              className="fsh-avatar-fallback"
                              size={18}
                            />

                            {photoUrl && (
                              <img
                                className="fsh-student-photo"
                                src={photoUrl}
                                alt={`${getStudentName(record)} photo`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>

                          <strong>
                            {getStudentName(
                              record.student &&
                                typeof record.student === "object"
                                ? record.student
                                : record
                            )}
                          </strong>
                        </div>
                      </td>

                      <td>{getAdmissionNumber(record)}</td>
                      <td>{record.feeType || "School Fee"}</td>
                      <td>{formatPeriod(record.feePeriod)}</td>

                      <td className="fsh-money">
                        {formatCurrency(getAssignedAmount(record))}
                      </td>

                      <td>{formatCurrency(getBalance(record))}</td>
                      <td>{formatDate(record.dueDate)}</td>

                      <td>
                        <span
                          className={`fsh-status fsh-status-${status
                            .toLowerCase()
                            .replace(/[^a-z]+/g, "-")
                            .replace(/^-|-$/g, "")}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="fsh-print-button"
                          onClick={() => handlePrint(record)}
                          title="Open and print fee slip"
                        >
                          <Printer size={15} />
                          Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="fsh-note">
          <CalendarDays size={17} />

          <p>
            This page displays saved fee assignment records. The slip number
            is generated for display and is not a permanent challan number
            stored separately in the database.
          </p>
        </div>
      </section>
    </div>
  );
}

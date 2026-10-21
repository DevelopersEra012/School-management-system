
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  RotateCcw,
  Printer,
  ReceiptText,
  Wallet,
  Users,
  AlertCircle,
  X,
  UserRound,
} from "lucide-react";

import "./FeeChallan.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Get the student's name from the saved fee record.
function getStudentName(record) {
  const student =
    record.student && typeof record.student === "object"
      ? record.student
      : {};

  return (
    record.studentName ||
    student.name ||
    student.fullName ||
    student.studentName ||
    [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Student"
  );
}

function getAdmissionNumber(record) {
  return (
    record.admissionNumber ||
    record.student?.admissionNumber ||
    record.student?.admissionNo ||
    "N/A"
  );
}

function getClassName(record) {
  return (
    record.className ||
    record.student?.className ||
    record.student?.class ||
    record.student?.grade ||
    "N/A"
  );
}

function getTotalFee(record) {
  return Math.max(
    0,
    Number(
      record.totalAmount ??
        record.totalDue ??
        record.amount ??
        0
    ) || 0
  );
}

function getPaidAmount(record) {
  return Math.max(
    0,
    Number(
      record.paidAmount ??
        record.amountPaid ??
        0
    ) || 0
  );
}

function getBalance(record) {
  const calculatedBalance = Math.max(
    0,
    getTotalFee(record) - getPaidAmount(record)
  );

  return Math.max(
    0,
    Number(
      record.balanceDue ??
        record.remaining ??
        calculatedBalance
    ) || 0
  );
}

function getStatus(record) {
  if (record.status) return record.status;

  if (getBalance(record) === 0 && getTotalFee(record) > 0) {
    return "Paid";
  }

  if (getPaidAmount(record) > 0) {
    return "Partially Paid";
  }

  return "Pending";
}

function getRecordReference(record) {
  return (
    record.challanNumber ||
    record.receiptNumber ||
    record._id ||
    record.id ||
    "N/A"
  );
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
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

// Find the student's actual photo in the saved student records.
function getStudentPhoto(record, studentsById) {
  const embeddedStudent =
    record.student && typeof record.student === "object"
      ? record.student
      : {};

  const studentId =
    typeof record.studentId === "object"
      ? record.studentId?._id || record.studentId?.id
      : record.studentId || embeddedStudent._id;

  const existingStudent = studentId
    ? studentsById.get(String(studentId))
    : null;

  return (
    record.studentPhoto ||
    embeddedStudent.studentPhoto ||
    embeddedStudent.photo ||
    existingStudent?.studentPhoto ||
    existingStudent?.photo ||
    ""
  );
}

// Convert a saved upload path into a usable image URL.
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

export default function FeeChallan() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedChallan, setSelectedChallan] = useState(null);

  // Match existing fee records to their student records using student IDs.
  const studentsById = useMemo(
    () =>
      new Map(
        students.map((student) => [
          String(student._id || student.id),
          student,
        ])
      ),
    [students]
  );

  async function fetchRecords() {
    try {
      setLoading(true);
      setError("");

      const feesResponse = await fetch(`${API_URL}/api/fees`);
      const feesResult = await feesResponse.json();

      if (!feesResponse.ok) {
        throw new Error(
          feesResult.message || "Could not load saved fee records."
        );
      }

      const feeList = Array.isArray(feesResult)
        ? feesResult
        : Array.isArray(feesResult.data)
          ? feesResult.data
          : Array.isArray(feesResult.fees)
            ? feesResult.fees
            : null;

      if (!feeList) {
        throw new Error("The fee API returned an invalid response.");
      }

      setRecords(feeList);

      // Fetch the existing student records so their photos can be displayed.
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
        }
      } catch (studentError) {
        // Saved fee records can still be displayed without student photos.
        console.warn(
          "Could not load student photos:",
          studentError.message
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to load fee records. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const searchableText = [
        getStudentName(record),
        getAdmissionNumber(record),
        getClassName(record),
        record.feeType,
        record.receiptNumber,
        record.challanNumber,
        record.paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const recordStatus = getStatus(record);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        recordStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const outstandingCount = records.filter(
    (record) => getBalance(record) > 0
  ).length;

  const totalReceived = records.reduce(
    (sum, record) => sum + getPaidAmount(record),
    0
  );

  function resetFilters() {
    setSearch("");
    setStatusFilter("All Statuses");
    setSelectedChallan(null);
  }

  function handlePrint() {
    if (!selectedChallan) return;
    window.print();
  }

  return (
    <div className="fc-page">
      <header className="fc-header">
        <div>
          <span className="fc-eyebrow">
            FEE AND FINANCE / FEE CHALLANS
          </span>

          <h1>Fee Challans</h1>

          <p>
            Find saved fee records and prepare a printable fee document.
          </p>
        </div>

        <div className="fc-header-actions">
          <button
            type="button"
            className="fc-button fc-button-light"
            onClick={resetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            className="fc-button fc-button-primary"
            onClick={fetchRecords}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh Records
          </button>
        </div>
      </header>

      <div className="fc-info-banner">
        <AlertCircle size={19} />
        <p>
          Challans are generated from records already saved in the database.
          A due date is shown only when that date exists in the record.
        </p>
      </div>

      {error && (
        <div className="fc-error" role="alert">
          <AlertCircle size={20} />

          <div>
            <strong>Unable to load fee records</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="fc-stats">
        <article className="fc-stat-card">
          <div className="fc-stat-icon fc-purple">
            <ReceiptText size={22} />
          </div>

          <div>
            <span>Saved Fee Records</span>
            <h2>{loading ? "—" : records.length}</h2>
            <p>Available for viewing and printing</p>
          </div>
        </article>

        <article className="fc-stat-card">
          <div className="fc-stat-icon fc-orange">
            <Wallet size={22} />
          </div>

          <div>
            <span>Records With Balance</span>
            <h2>{loading ? "—" : outstandingCount}</h2>
            <p>Saved records with an outstanding amount</p>
          </div>
        </article>

        <article className="fc-stat-card">
          <div className="fc-stat-icon fc-green">
            <Users size={22} />
          </div>

          <div>
            <span>Recorded Amount Received</span>
            <h2>{loading ? "—" : formatCurrency(totalReceived)}</h2>
            <p>Sum of saved payment records</p>
          </div>
        </article>
      </section>

      <section className="fc-panel">
        <div className="fc-panel-heading">
          <div>
            <h2>Fee Record Register</h2>
            <p>
              Search by student name, admission number, fee type or receipt number.
            </p>
          </div>

          <span className="fc-count">
            {loading ? "Loading..." : `${filteredRecords.length} records`}
          </span>
        </div>

        <div className="fc-filters">
          <label className="fc-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search student or receipt number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter by fee status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>All Statuses</option>
            <option>Paid</option>
            <option>Partially Paid</option>
            <option>Pending</option>
          </select>
        </div>

        {loading ? (
          <div className="fc-state">
            <RefreshCw size={27} />
            <p>Loading saved fee records...</p>
          </div>
        ) : error ? (
          <div className="fc-state">
            <AlertCircle size={28} />
            <p>Fee records could not be loaded.</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="fc-state">
            <ReceiptText size={33} />
            <h3>No fee records found</h3>
            <p>
              There are no saved records matching your search and filters.
            </p>
          </div>
        ) : (
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Record / Receipt No.</th>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Class</th>
                  <th>Fee Type</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record, index) => {
                  const recordId =
                    record._id ||
                    record.id ||
                    record.receiptNumber ||
                    index;

                  const photo = getStudentPhoto(
                    record,
                    studentsById
                  );

                  return (
                    <tr key={recordId}>
                      <td>
                        <span className="fc-reference">
                          {getRecordReference(record)}
                        </span>
                      </td>

                      <td>
                        <div className="fc-student">
                          <div className="fc-avatar-wrap">
                            {photo && (
                              <img
                                className="fc-avatar-image"
                                src={getStudentPhotoUrl(photo)}
                                alt={`${getStudentName(record)} photo`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";

                                  event.currentTarget.parentElement
                                    ?.querySelector(".fc-avatar-fallback")
                                    ?.classList.remove(
                                      "fc-avatar-fallback-hidden"
                                    );
                                }}
                              />
                            )}

                            <span
                              className={`fc-avatar-fallback ${
                                photo
                                  ? "fc-avatar-fallback-hidden"
                                  : ""
                              }`}
                              aria-label="Student photo unavailable"
                            >
                              <UserRound size={18} />
                            </span>
                          </div>

                          <strong>{getStudentName(record)}</strong>
                        </div>
                      </td>

                      <td>{getAdmissionNumber(record)}</td>
                      <td>{getClassName(record)}</td>
                      <td>{record.feeType || "—"}</td>
                      <td>{formatCurrency(getTotalFee(record))}</td>
                      <td>{formatCurrency(getPaidAmount(record))}</td>

                      <td>
                        <strong className="fc-balance">
                          {formatCurrency(getBalance(record))}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          record.dueDate || record.feeDueDate
                        )}
                      </td>

                      <td>
                        <span
                          className={`fc-status fc-status-${getStatus(record)
                            .toLowerCase()
                            .replace(/[^a-z]+/g, "-")
                            .replace(/^-|-$/g, "")}`}
                        >
                          {getStatus(record)}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="fc-view-button"
                          onClick={() => setSelectedChallan(record)}
                        >
                          <ReceiptText size={16} />
                          View / Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedChallan && (
        <div
          className="fc-modal-overlay"
          onClick={() => setSelectedChallan(null)}
        >
          <section
            className="fc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fc-document-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fc-modal-toolbar">
              <div>
                <h2>Printable Fee Document</h2>
                <p>Review the details before printing.</p>
              </div>

              <button
                type="button"
                className="fc-close-button"
                onClick={() => setSelectedChallan(null)}
                aria-label="Close challan preview"
              >
                <X size={21} />
              </button>
            </div>

            <div className="fc-print-paper">
              <div className="fc-print-brand">
                <div className="fc-school-mark">
                  <ReceiptText size={25} />
                </div>

                <div>
                  <h2 id="fc-document-title">School ERP</h2>
                  <p>Student Fee Record</p>
                </div>
              </div>

              <div className="fc-document-title">
                <h3>FEE CHALLAN / PAYMENT RECORD</h3>
                <span>{getStatus(selectedChallan)}</span>
              </div>

              <div className="fc-document-reference">
                <div>
                  <span>Record / Receipt Number</span>
                  <strong>
                    {getRecordReference(selectedChallan)}
                  </strong>
                </div>

                <div>
                  <span>Record Created</span>
                  <strong>
                    {formatDate(selectedChallan.createdAt)}
                  </strong>
                </div>
              </div>

              <div className="fc-document-section-title">
                Student Information
              </div>

              <div className="fc-document-grid">
                <div>
                  <span>Student Name</span>
                  <strong>{getStudentName(selectedChallan)}</strong>
                </div>

                <div>
                  <span>Admission Number</span>
                  <strong>
                    {getAdmissionNumber(selectedChallan)}
                  </strong>
                </div>

                <div>
                  <span>Class / Section</span>
                  <strong>{getClassName(selectedChallan)}</strong>
                </div>

                <div>
                  <span>Fee Type</span>
                  <strong>{selectedChallan.feeType || "—"}</strong>
                </div>

                <div>
                  <span>Due Date</span>
                  <strong>
                    {formatDate(
                      selectedChallan.dueDate ||
                        selectedChallan.feeDueDate
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Method</span>
                  <strong>
                    {selectedChallan.paymentMethod || "—"}
                  </strong>
                </div>

                <div>
                  <span>Payment Date</span>
                  <strong>
                    {formatDate(selectedChallan.paymentDate)}
                  </strong>
                </div>

                <div>
                  <span>Transaction Reference</span>
                  <strong>{selectedChallan.reference || "—"}</strong>
                </div>
              </div>

              <div className="fc-document-section-title">
                Fee Summary
              </div>

              <table className="fc-amount-table">
                <tbody>
                  <tr>
                    <td>Total Fee Amount</td>
                    <td>
                      {formatCurrency(getTotalFee(selectedChallan))}
                    </td>
                  </tr>

                  <tr>
                    <td>Amount Paid / Received</td>
                    <td>
                      {formatCurrency(getPaidAmount(selectedChallan))}
                    </td>
                  </tr>

                  <tr className="fc-balance-row">
                    <td>Remaining Balance</td>
                    <td>
                      {formatCurrency(getBalance(selectedChallan))}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="fc-document-note">
                This document is generated from the saved fee record in
                the School ERP database. A blank due date means no due
                date was saved with this record.
              </div>

              <div className="fc-signatures">
                <div>
                  <span>Student / Parent Signature</span>
                </div>

                <div>
                  <span>Authorized Signature</span>
                </div>
              </div>
            </div>

            <div className="fc-modal-footer">
              <button
                type="button"
                className="fc-button fc-button-light"
                onClick={() => setSelectedChallan(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="fc-button fc-button-primary"
                onClick={handlePrint}
              >
                <Printer size={17} />
                Print Fee Document
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

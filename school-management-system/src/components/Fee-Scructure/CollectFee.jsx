
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  UserRound,
  Wallet,
  ReceiptText,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import "./collectFee.css";


const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getTodayDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getStudentName(student = {}) {
  return (
    [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    student.name ||
    student.studentName ||
    student.fullName ||
    "Unnamed Student"
  );
}

function getAdmissionNumber(student = {}) {
  return (
    student.admissionNumber ||
    student.admissionNo ||
    student.registrationNumber ||
    "N/A"
  );
}

function getClassName(student = {}) {
  return student.className || student.class || student.grade || "N/A";
}

function getAssignmentId(assignment) {
  return String(assignment._id || assignment.id || "");
}

function getAssignmentStudentId(assignment) {
  const id =
    assignment.studentId?._id ||
    assignment.studentId ||
    assignment.student?._id;

  return id ? String(id) : "";
}

function getAssignmentBalance(assignment) {
  return Math.max(
    0,
    Number(
      assignment.balanceDue ??
        assignment.remaining ??
        assignment.amount ??
        assignment.totalAmount ??
        0
    ) || 0
  );
}

function getFeePeriod(value) {
  if (!value) return "";

  const [year, month] = value.split("-").map(Number);

  if (!year || !month) return value;

  return new Date(year, month - 1, 1).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
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

function getAssignmentDueDate(assignment) {
  return assignment.dueDate
    ? new Date(assignment.dueDate).getTime()
    : Number.MAX_SAFE_INTEGER;
}

export default function CollectFee() {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);

  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [reference, setReference] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const [studentsResponse, assignmentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/fees/assignments`),
      ]);

      const [studentsResult, assignmentsResult] = await Promise.all([
        studentsResponse.json(),
        assignmentsResponse.json(),
      ]);

      if (!studentsResponse.ok) {
        throw new Error(
          studentsResult.message || "Could not load students."
        );
      }

      if (!assignmentsResponse.ok) {
        throw new Error(
          assignmentsResult.message || "Could not load fee assignments."
        );
      }

      const studentList = Array.isArray(studentsResult)
        ? studentsResult
        : Array.isArray(studentsResult.data)
          ? studentsResult.data
          : [];

      const assignmentList = Array.isArray(assignmentsResult.data)
        ? assignmentsResult.data
        : [];

      setStudents(studentList);
      setAssignments(assignmentList);
    } catch (err) {
      setError(err.message || "Could not load student and fee data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) =>
      [
        getStudentName(student),
        getAdmissionNumber(student),
        student.rollNumber,
        getClassName(student),
        student.section,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [students, search]);

  // Only the selected student's fee assignments are considered.
  const studentAssignments = useMemo(() => {
    if (!selectedStudent) return [];

    const studentId = String(
      selectedStudent._id || selectedStudent.id
    );

    return assignments
      .filter(
        (assignment) =>
          getAssignmentStudentId(assignment) === studentId &&
          getAssignmentBalance(assignment) > 0
      )
      .sort(
        (a, b) =>
          getAssignmentDueDate(a) - getAssignmentDueDate(b)
      );
  }, [assignments, selectedStudent]);

  const selectedAssignments = useMemo(
    () =>
      studentAssignments.filter((assignment) =>
        selectedAssignmentIds.includes(getAssignmentId(assignment))
      ),
    [studentAssignments, selectedAssignmentIds]
  );

  const selectedTotalDue = roundMoney(
    selectedAssignments.reduce(
      (sum, assignment) => sum + getAssignmentBalance(assignment),
      0
    )
  );

  const paid = Number(amountPaid) || 0;

  const remainingAfterPayment = roundMoney(
    Math.max(0, selectedTotalDue - paid)
  );

  // Preview how one collected amount will be allocated to the selected fees.
  // The oldest due dates receive payment first.
  const plannedAllocations = useMemo(() => {
    let amountRemaining = roundMoney(Math.max(0, Number(amountPaid) || 0));

    return selectedAssignments.map((assignment) => {
      const balanceBefore = getAssignmentBalance(assignment);
      const allocated = roundMoney(
        Math.min(balanceBefore, amountRemaining)
      );

      amountRemaining = roundMoney(amountRemaining - allocated);

      return {
        assignmentId: getAssignmentId(assignment),
        feeType: assignment.feeType,
        feePeriod: assignment.feePeriod,
        balanceBefore,
        amountPaid: allocated,
        remainingAfter: roundMoney(balanceBefore - allocated),
      };
    });
  }, [selectedAssignments, amountPaid]);

  function selectStudent(student) {
    setSelectedStudent(student);
    setSearch(getStudentName(student));

    const studentId = String(student._id || student.id);

    const openAssignments = assignments
      .filter(
        (assignment) =>
          getAssignmentStudentId(assignment) === studentId &&
          getAssignmentBalance(assignment) > 0
      )
      .sort(
        (a, b) =>
          getAssignmentDueDate(a) - getAssignmentDueDate(b)
      );

    // Select all outstanding fees by default for the combined voucher.
    setSelectedAssignmentIds(
      openAssignments.map(getAssignmentId)
    );

    setAmountPaid("");
    setPaymentMethod("Cash");
    setPaymentDate(getTodayDate());
    setReference("");
    setMessage("");
    setError("");
    setReceipt(null);
  }

  function toggleAssignment(assignmentId, checked) {
    setSelectedAssignmentIds((previous) =>
      checked
        ? [...new Set([...previous, assignmentId])]
        : previous.filter((id) => id !== assignmentId)
    );

    setAmountPaid("");
    setMessage("");
    setError("");
    setReceipt(null);
  }

  function selectAllOutstanding() {
    setSelectedAssignmentIds(
      studentAssignments.map(getAssignmentId)
    );

    setAmountPaid("");
    setMessage("");
    setReceipt(null);
  }

  function clearAssignmentSelection() {
    setSelectedAssignmentIds([]);
    setAmountPaid("");
    setMessage("");
    setReceipt(null);
  }

  function resetForm() {
    setSelectedStudent(null);
    setSearch("");
    setSelectedAssignmentIds([]);
    setAmountPaid("");
    setPaymentMethod("Cash");
    setPaymentDate(getTodayDate());
    setReference("");
    setMessage("");
    setError("");
    setReceipt(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setReceipt(null);

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (selectedAssignments.length === 0 || selectedTotalDue <= 0) {
      setError("Please select at least one fee with an outstanding balance.");
      return;
    }

    if (!Number.isFinite(paid) || paid <= 0) {
      setError("Please enter an amount received greater than zero.");
      return;
    }

    if (paid > selectedTotalDue) {
      setError(
        "The amount received cannot exceed the selected outstanding fees."
      );
      return;
    }

    if (!paymentDate) {
      setError("Please select the payment date.");
      return;
    }

    if (paymentMethod !== "Cash" && !reference.trim()) {
      setError("Please enter the transaction or cheque reference.");
      return;
    }

    const studentId = String(
      selectedStudent._id || selectedStudent.id
    );

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/fees/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          allocations: plannedAllocations.map((allocation) => ({
            assignmentId: allocation.assignmentId,
            amountPaid: allocation.amountPaid,
          })),
          paymentMethod,
          paymentDate,
          reference: reference.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "The payment could not be saved."
        );
      }

      const savedPayment = result.data;

      // The receipt is based on the backend's successful saved response.
      setReceipt({
        ...savedPayment,
        studentName: getStudentName(selectedStudent),
        admissionNumber: getAdmissionNumber(selectedStudent),
        className: getClassName(selectedStudent),
        selectedOutstanding: Number(savedPayment.totalDue ?? selectedTotalDue),
        amountPaid: Number(savedPayment.amountPaid ?? paid),
        remaining: Number(savedPayment.remaining ?? remainingAfterPayment),
        paymentMethod: savedPayment.paymentMethod || paymentMethod,
        paymentDate: savedPayment.paymentDate || paymentDate,
        allocations: Array.isArray(savedPayment.allocations)
          ? savedPayment.allocations
          : plannedAllocations,
      });

      setMessage(
        "Payment saved successfully. Selected assignment balances have been updated."
      );

      setAmountPaid("");
      setReference("");
      setPaymentDate(getTodayDate());

      // Reload authoritative assignment balances after the payment.
      const updatedResponse = await fetch(
        `${API_URL}/api/fees/assignments`
      );

      if (updatedResponse.ok) {
        const updatedResult = await updatedResponse.json();

        const latestAssignments = Array.isArray(updatedResult.data)
          ? updatedResult.data
          : [];

        setAssignments(latestAssignments);

        const openIds = latestAssignments
          .filter(
            (assignment) =>
              getAssignmentStudentId(assignment) === studentId &&
              getAssignmentBalance(assignment) > 0
          )
          .sort(
            (a, b) =>
              getAssignmentDueDate(a) - getAssignmentDueDate(b)
          )
          .map(getAssignmentId);

        setSelectedAssignmentIds(openIds);
      }
    } catch (err) {
      setError(
        err.message ||
          "Payment could not be saved. Check your backend and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="collect-fee-page">
      <header className="cf-header">
        <div>
          <p className="cf-breadcrumb">
            FEE AND FINANCE / COLLECT FEE
          </p>
          <h1>Collect Fee</h1>
          <p>
            Select a student, combine outstanding fees and record a payment.
          </p>
        </div>

        <div className="cf-header-actions">
          <button
            type="button"
            className="cf-btn cf-btn-light"
            onClick={resetForm}
            disabled={saving}
          >
            <RotateCcw size={16} />
            Clear Form
          </button>

          <button
            type="button"
            className="cf-btn cf-btn-light"
            onClick={fetchData}
            disabled={saving || loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="cf-alert cf-error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="cf-alert cf-success" role="status">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      <div className="cf-layout">
        <section className="cf-card">
          <div className="cf-section-heading">
            <div className="cf-icon cf-icon-blue">
              <UserRound size={21} />
            </div>
            <div>
              <h2>Student Information</h2>
              <p>Search and select an existing student.</p>
            </div>
          </div>

          <label className="cf-label" htmlFor="student-search">
            Search Student *
          </label>

          <div className="cf-search">
            <Search size={18} />
            <input
              id="student-search"
              type="search"
              placeholder="Name, admission number or roll number"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedStudent(null);
                setSelectedAssignmentIds([]);
                setReceipt(null);
                setMessage("");
              }}
            />
          </div>

          <div className="cf-student-list">
            {loading ? (
              <p className="cf-empty">Loading students...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="cf-empty">No matching students found.</p>
            ) : (
              filteredStudents.slice(0, 8).map((student) => {
                const id = String(student._id || student.id);
                const selectedId = String(
                  selectedStudent?._id || selectedStudent?.id || ""
                );

                return (
                  <button
                    type="button"
                    key={id}
                    className={`cf-student ${
                      selectedId === id ? "cf-student-selected" : ""
                    }`}
                    onClick={() => selectStudent(student)}
                  >
                    <span className="cf-avatar">
                      {getStudentName(student).charAt(0).toUpperCase()}
                    </span>

                    <span className="cf-student-details">
                      <strong>{getStudentName(student)}</strong>
                      <small>
                        Admission: {getAdmissionNumber(student)} · Class:{" "}
                        {getClassName(student)}
                      </small>
                    </span>

                    {selectedId === id && (
                      <CheckCircle2 size={18} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {selectedStudent && (
            <div className="cf-selected">
              <CheckCircle2 size={18} />
              <div>
                <strong>{getStudentName(selectedStudent)}</strong>
                <p>
                  Admission No: {getAdmissionNumber(selectedStudent)}
                </p>
              </div>
            </div>
          )}

          <div className="cf-divider" />

          <div className="cf-section-heading">
            <div className="cf-icon cf-icon-purple">
              <ReceiptText size={21} />
            </div>
            <div>
              <h2>Outstanding Assigned Fees</h2>
              <p>
                Select the fee assignments to include in this payment voucher.
              </p>
            </div>
          </div>

          {!selectedStudent ? (
            <p className="cf-empty">
              Select a student to load that student's assigned fees.
            </p>
          ) : studentAssignments.length === 0 ? (
            <div className="cf-no-assignments">
              <Wallet size={24} />
              <strong>No outstanding assigned fees</strong>
              <p>
                This student has no unpaid fee assignments. Assign a fee first
                or refresh the records.
              </p>
            </div>
          ) : (
            <>
              <div className="cf-assignment-toolbar">
                <span>
                  {selectedAssignments.length} of{" "}
                  {studentAssignments.length} selected
                </span>

                <div>
                  <button
                    type="button"
                    onClick={selectAllOutstanding}
                    disabled={
                      saving ||
                      selectedAssignments.length === studentAssignments.length
                    }
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={clearAssignmentSelection}
                    disabled={saving || selectedAssignments.length === 0}
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="cf-assignment-list">
                {studentAssignments.map((assignment) => {
                  const id = getAssignmentId(assignment);
                  const checked = selectedAssignmentIds.includes(id);

                  return (
                    <label
                      className={`cf-assignment-option ${
                        checked ? "cf-assignment-checked" : ""
                      }`}
                      key={id}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={(event) =>
                          toggleAssignment(id, event.target.checked)
                        }
                      />

                      <span className="cf-assignment-info">
                        <strong>{assignment.feeType}</strong>
                        <small>
                          {getFeePeriod(assignment.feePeriod)}
                          {" · Due "}
                          {formatDate(assignment.dueDate)}
                        </small>
                      </span>

                      <span className="cf-assignment-balance">
                        {formatCurrency(getAssignmentBalance(assignment))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="cf-divider" />

          <div className="cf-section-heading">
            <div className="cf-icon cf-icon-green">
              <Wallet size={21} />
            </div>
            <div>
              <h2>Payment Details</h2>
              <p>
                Receive an amount against the selected fee assignments.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="cf-amount-summary">
              <div>
                <span>Selected Outstanding</span>
                <strong>{formatCurrency(selectedTotalDue)}</strong>
              </div>

              <div>
                <span>Receiving Now</span>
                <strong className="cf-green-text">
                  {formatCurrency(paid)}
                </strong>
              </div>

              <div>
                <span>Balance After Payment</span>
                <strong className="cf-orange-text">
                  {formatCurrency(remainingAfterPayment)}
                </strong>
              </div>
            </div>

            <div className="cf-form-grid">
              <div className="cf-field cf-full">
                <label className="cf-label" htmlFor="amount-paid">
                  Amount Receiving (PKR) *
                </label>
                <input
                  id="amount-paid"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedTotalDue || undefined}
                  placeholder="Enter amount received"
                  value={amountPaid}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  required
                  disabled={
                    !selectedStudent ||
                    selectedAssignments.length === 0 ||
                    saving
                  }
                />
                <small className="cf-field-help">
                  Payment is allocated in due-date order across the selected
                  assignments. Any unpaid balance remains due.
                </small>
              </div>

              <div className="cf-field">
                <label className="cf-label" htmlFor="payment-method">
                  Payment Method *
                </label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  required
                  disabled={saving}
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>EasyPaisa</option>
                  <option>JazzCash</option>
                  <option>Cheque</option>
                </select>
              </div>

              <div className="cf-field">
                <label className="cf-label" htmlFor="payment-date">
                  Payment Date *
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              {paymentMethod !== "Cash" && (
                <div className="cf-field cf-full">
                  <label className="cf-label" htmlFor="payment-reference">
                    Transaction / Cheque Reference *
                  </label>
                  <input
                    id="payment-reference"
                    type="text"
                    placeholder="Enter reference number"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    required
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            <div className="cf-actions">
              <button
                type="button"
                className="cf-btn cf-btn-light"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="cf-btn cf-btn-primary"
                disabled={
                  saving ||
                  loading ||
                  !selectedStudent ||
                  selectedAssignments.length === 0
                }
              >
                <ReceiptText size={17} />
                {saving ? "Saving Payment..." : "Save Payment & Generate Receipt"}
              </button>
            </div>
          </form>
        </section>

        <aside className="cf-side">
          <section className="cf-card cf-help-card">
            <div className="cf-icon cf-icon-purple">
              <ReceiptText size={22} />
            </div>

            <h2>Collection Guide</h2>

            <ul>
              <li>Select the student first.</li>
              <li>Review the fees and periods selected for the voucher.</li>
              <li>Check the combined outstanding amount.</li>
              <li>Enter the amount actually received.</li>
              <li>Save payment before printing the receipt.</li>
            </ul>
          </section>

          {receipt && (
            <section className="cf-card cf-receipt" id="cf-receipt">
              <div className="cf-receipt-top">
                <div className="cf-icon cf-icon-green">
                  <CheckCircle2 size={22} />
                </div>
                <span className="cf-receipt-badge">SAVED</span>
              </div>

              <h2>Fee Payment Receipt</h2>
              <p className="cf-receipt-number">
                Receipt No: {receipt.receiptNumber || "—"}
              </p>

              <div className="cf-receipt-row">
                <span>Student</span>
                <strong>{receipt.studentName}</strong>
              </div>

              <div className="cf-receipt-row">
                <span>Admission No.</span>
                <strong>{receipt.admissionNumber}</strong>
              </div>

              <div className="cf-receipt-row">
                <span>Class</span>
                <strong>{receipt.className}</strong>
              </div>

              <div className="cf-receipt-row">
                <span>Payment Method</span>
                <strong>{receipt.paymentMethod}</strong>
              </div>

              <div className="cf-receipt-row">
                <span>Payment Date</span>
                <strong>{formatDate(receipt.paymentDate)}</strong>
              </div>

              {receipt.reference && (
                <div className="cf-receipt-row">
                  <span>Reference</span>
                  <strong>{receipt.reference}</strong>
                </div>
              )}

              <div className="cf-receipt-allocation-heading">
                Fees included in this payment
              </div>

              <div className="cf-receipt-allocation-list">
                {(receipt.allocations || []).map((item, index) => (
                  <div
                    className="cf-receipt-allocation"
                    key={String(item.assignmentId || index)}
                  >
                    <div>
                      <strong>{item.feeType}</strong>
                      <small>{getFeePeriod(item.feePeriod)}</small>
                    </div>

                    <div>
                      <strong>{formatCurrency(item.amountPaid)}</strong>
                      <small>
                        Remaining: {formatCurrency(item.remainingAfter)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cf-receipt-row">
                <span>Selected Outstanding Before Payment</span>
                <strong>
                  {formatCurrency(receipt.selectedOutstanding)}
                </strong>
              </div>

              <div className="cf-receipt-total">
                <span>Amount Received</span>
                <strong>{formatCurrency(receipt.amountPaid)}</strong>
              </div>

              <div className="cf-receipt-row">
                <span>Balance After Payment</span>
                <strong>
                  {formatCurrency(receipt.remaining)}
                </strong>
              </div>

              <button
                type="button"
                className="cf-btn cf-btn-primary cf-print-btn"
                onClick={() => window.print()}
              >
                <Printer size={17} />
                Print Receipt
              </button>

              <p className="cf-receipt-note">
                Payment saved in MongoDB and the relevant assignment balances
                were updated.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

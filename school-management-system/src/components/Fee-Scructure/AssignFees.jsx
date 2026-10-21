
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  RotateCcw,
  Save,
  Wallet,
  Users,
  UserRound,
  CalendarDays,
  ReceiptText,
  AlertCircle,
  CheckCircle2,
  Layers3,
} from "lucide-react";

import "./AssignFees.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getCurrentPeriod() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getStudentName(student) {
  if (!student || typeof student !== "object") {
    return "Unnamed Student";
  }

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

function getAdmissionNumber(student) {
  if (!student || typeof student !== "object") return "N/A";

  return student.admissionNumber || student.admissionNo || "N/A";
}

function getClassName(student) {
  if (!student || typeof student !== "object") return "N/A";

  return student.className || student.class || student.grade || "N/A";
}

function getList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
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

function getAssignmentBalance(record) {
  const explicitBalance = record.balanceDue ?? record.remaining;

  if (explicitBalance !== undefined && explicitBalance !== null) {
    return Math.max(0, Number(explicitBalance) || 0);
  }

  const assigned = Number(record.amount ?? record.totalAmount ?? 0);
  const paid = Number(record.paidAmount || 0);

  return Math.max(0, assigned - paid);
}

function getAssignmentStatus(record) {
  const status = String(record.status || "").toLowerCase();

  if (status === "paid") return "Paid";

  if (
    status === "partially paid" ||
    status === "partially-paid" ||
    status === "partial"
  ) {
    return "Partially Paid";
  }

  if (status === "pending" || status === "unpaid") {
    return "Pending";
  }

  if (getAssignmentBalance(record) <= 0) return "Paid";

  if (Number(record.paidAmount || 0) > 0) {
    return "Partially Paid";
  }

  return "Pending";
}

function getRecordStudentObject(record) {
  if (record.student && typeof record.student === "object") {
    return record.student;
  }

  if (record.studentId && typeof record.studentId === "object") {
    return record.studentId;
  }

  return null;
}

function getRecordStudentId(record) {
  const reference = record.studentId ?? record.student;

  if (reference && typeof reference === "object") {
    return String(reference._id || reference.id || "");
  }

  return String(reference || "");
}

function findLinkedStudent(record, students) {
  const embeddedStudent = getRecordStudentObject(record);

  const studentId =
    getRecordStudentId(record) ||
    String(embeddedStudent?._id || embeddedStudent?.id || "");

  if (studentId) {
    const matchedById = students.find(
      (student) =>
        String(student._id || student.id || "") === studentId
    );

    if (matchedById) return matchedById;
  }

  const admissionNumber =
    record.admissionNumber ||
    embeddedStudent?.admissionNumber ||
    embeddedStudent?.admissionNo;

  if (admissionNumber) {
    const matchedByAdmission = students.find(
      (student) =>
        String(student.admissionNumber || student.admissionNo || "") ===
        String(admissionNumber)
    );

    if (matchedByAdmission) return matchedByAdmission;
  }

  const recordName =
    record.studentName ||
    (embeddedStudent ? getStudentName(embeddedStudent) : "");

  if (recordName && recordName !== "Unnamed Student") {
    return (
      students.find(
        (student) =>
          getStudentName(student).trim().toLowerCase() ===
          recordName.trim().toLowerCase()
      ) || null
    );
  }

  return null;
}

function getAssignmentStudentName(record, students = []) {
  if (record.studentName) return record.studentName;

  const embeddedStudent = getRecordStudentObject(record);

  if (embeddedStudent) {
    const name = getStudentName(embeddedStudent);

    if (name !== "Unnamed Student") return name;
  }

  const linkedStudent = findLinkedStudent(record, students);

  return linkedStudent ? getStudentName(linkedStudent) : "Unnamed Student";
}

/*
  Gets the student's photo from the fee record or its matching student.
  Supports studentPhoto, photo, photoUrl, imageUrl and image fields.
*/
function getStudentPhotoUrl(record, students) {
  const embeddedStudent = getRecordStudentObject(record);
  const linkedStudent = findLinkedStudent(record, students);

  const candidates = [
    record.studentPhoto,
    record.photoUrl,
    record.photo,
    record.imageUrl,
    record.image,
    embeddedStudent?.studentPhoto,
    embeddedStudent?.photoUrl,
    embeddedStudent?.photo,
    embeddedStudent?.imageUrl,
    embeddedStudent?.image,
    linkedStudent?.studentPhoto,
    linkedStudent?.photoUrl,
    linkedStudent?.photo,
    linkedStudent?.imageUrl,
    linkedStudent?.image,
  ];

  const photo = candidates.find(
    (value) => typeof value === "string" && value.trim()
  );

  if (!photo) return "";

  let path = photo.trim().replace(/\\/g, "/");

  // External URLs and data URLs should be used as they are.
  if (
    path.startsWith("data:image/") ||
    /^https?:\/\//i.test(path)
  ) {
    return path;
  }

  // Extract the web-accessible uploads path from saved local paths.
  const uploadsIndex = path.toLowerCase().indexOf("uploads/");

  if (uploadsIndex !== -1) {
    path = path.slice(uploadsIndex);
    return `${API_URL}/${path}`;
  }

  // Absolute server-relative path, e.g. /images/student.jpg.
  if (path.startsWith("/")) {
    return `${API_URL}${path}`;
  }

  // Otherwise assume the filename is stored in backend/uploads.
  return `${API_URL}/uploads/${path}`;
}

function getGroupFeeTypes(group) {
  if (!Array.isArray(group?.feeTypes)) return [];

  return group.feeTypes.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      item.name &&
      String(item.status || "Active").toLowerCase() === "active"
  );
}

function getFeeTypeId(item) {
  return String(item?._id || item?.id || "");
}

export default function AssignFees() {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [feeGroups, setFeeGroups] = useState([]);

  const [scope, setScope] = useState("individual");
  const [assignmentMode, setAssignmentMode] = useState("single");

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("All Sections");

  const [feeType, setFeeType] = useState("");
  const [amount, setAmount] = useState("");

  const [selectedFeeGroupId, setSelectedFeeGroupId] = useState("");
  const [groupAmounts, setGroupAmounts] = useState({});

  const [feePeriod, setFeePeriod] = useState(getCurrentPeriod());
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [recordSearch, setRecordSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [
        studentsResponse,
        assignmentsResponse,
        typesResponse,
        groupsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/students`),
        fetch(`${API_URL}/api/fees/assignments`),
        fetch(`${API_URL}/api/fee-types`),
        fetch(`${API_URL}/api/fee-groups`),
      ]);

      const [
        studentsResult,
        assignmentsResult,
        typesResult,
        groupsResult,
      ] = await Promise.all([
        readJson(studentsResponse),
        readJson(assignmentsResponse),
        readJson(typesResponse),
        readJson(groupsResponse),
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

      if (!typesResponse.ok) {
        throw new Error(
          typesResult.message || "Could not load fee types."
        );
      }

      if (!groupsResponse.ok) {
        throw new Error(
          groupsResult.message ||
            "Could not load fee groups. Check the backend route."
        );
      }

      const studentList = getList(studentsResult);
      const assignmentList = getList(assignmentsResult);

      const activeFeeTypes = getList(typesResult).filter(
        (item) =>
          String(item.status || "Active").toLowerCase() === "active"
      );

      const activeGroups = getList(groupsResult).filter(
        (group) =>
          String(group.status || "Active").toLowerCase() === "active"
      );

      setStudents(studentList);
      setAssignments(assignmentList);
      setFeeTypes(activeFeeTypes);
      setFeeGroups(activeGroups);

      setFeeType((previous) =>
        activeFeeTypes.some((item) => item.name === previous)
          ? previous
          : activeFeeTypes[0]?.name || ""
      );

      setSelectedFeeGroupId((previous) =>
        activeGroups.some(
          (group) => String(group._id || group.id) === previous
        )
          ? previous
          : activeGroups[0]
            ? String(activeGroups[0]._id || activeGroups[0].id)
            : ""
      );

      setSelectedClass((previous) => {
        const classes = studentList
          .map(getClassName)
          .filter((name) => name !== "N/A");

        return previous && classes.includes(previous)
          ? previous
          : classes[0] || "";
      });

      // Keep default amounts for currently selected group items.
      const currentGroup = activeGroups.find(
        (group) =>
          String(group._id || group.id) === selectedFeeGroupId
      );

      if (currentGroup) {
        setGroupAmounts((previous) => {
          const next = { ...previous };

          getGroupFeeTypes(currentGroup).forEach((item) => {
            const id = getFeeTypeId(item);

            if (next[id] === undefined) {
              next[id] =
                Number(item.defaultAmount) > 0
                  ? String(item.defaultAmount)
                  : "";
            }
          });

          return next;
        });
      }
    } catch (err) {
      setError(err.message || "Unable to load fee data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const selectedStudent = students.find(
    (student) =>
      String(student._id || student.id) === selectedStudentId
  );

  const selectedFeeGroup = feeGroups.find(
    (group) =>
      String(group._id || group.id) === selectedFeeGroupId
  );

  const selectedGroupFeeTypes = useMemo(
    () => getGroupFeeTypes(selectedFeeGroup),
    [selectedFeeGroup]
  );

  const packageTotal = selectedGroupFeeTypes.reduce((sum, item) => {
    const id = getFeeTypeId(item);
    return sum + (Number(groupAmounts[id]) || 0);
  }, 0);

  const classOptions = useMemo(
    () =>
      [
        ...new Set(
          students
            .map(getClassName)
            .filter((name) => name !== "N/A")
        ),
      ].sort(),
    [students]
  );

  const sectionOptions = useMemo(() => {
    const sections = students
      .filter((student) => getClassName(student) === selectedClass)
      .map((student) => student.section)
      .filter(Boolean);

    return [
      "All Sections",
      ...new Set(sections),
    ].filter((section, index, array) => array.indexOf(section) === index);
  }, [students, selectedClass]);

  const studentsInSelectedClass = students.filter((student) => {
    const matchesClass = getClassName(student) === selectedClass;

    const matchesSection =
      selectedSection === "All Sections" ||
      student.section === selectedSection;

    return matchesClass && matchesSection;
  });

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

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
  }, [students, studentSearch]);

  const filteredAssignments = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();

    return assignments.filter((record) => {
      const searchable = [
        getAssignmentStudentName(record, students),
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

      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "All Statuses" ||
          getAssignmentStatus(record) === statusFilter)
      );
    });
  }, [assignments, students, recordSearch, statusFilter]);

  const totalAssigned = assignments.reduce(
    (sum, record) =>
      sum + Number(record.amount ?? record.totalAmount ?? 0),
    0
  );

  const totalOutstanding = assignments.reduce(
    (sum, record) => sum + getAssignmentBalance(record),
    0
  );

  function handleSingleFeeChange(event) {
    const selectedName = event.target.value;
    setFeeType(selectedName);

    const item = feeTypes.find((type) => type.name === selectedName);

    setAmount(
      item && Number(item.defaultAmount) > 0
        ? String(item.defaultAmount)
        : ""
    );
  }

  function handleGroupChange(event) {
    const groupId = event.target.value;
    setSelectedFeeGroupId(groupId);

    const group = feeGroups.find(
      (item) => String(item._id || item.id) === groupId
    );

    const nextAmounts = {};

    getGroupFeeTypes(group).forEach((item) => {
      const id = getFeeTypeId(item);

      nextAmounts[id] =
        Number(item.defaultAmount) > 0
          ? String(item.defaultAmount)
          : "";
    });

    setGroupAmounts(nextAmounts);
  }

  function resetForm() {
    setScope("individual");
    setAssignmentMode("single");
    setStudentSearch("");
    setSelectedStudentId("");
    setSelectedSection("All Sections");
    setAmount("");
    setFeePeriod(getCurrentPeriod());
    setDueDate("");
    setDescription("");
    setRecordSearch("");
    setStatusFilter("All Statuses");
    setError("");
    setSuccess("");
  }

  function buildTargetPayload() {
    const payload = {
      scope,
      feePeriod,
      dueDate,
      description: description.trim(),
    };

    if (scope === "individual") {
      payload.studentId = selectedStudentId;
    }

    if (scope === "class") {
      payload.className = selectedClass;
      payload.section =
        selectedSection === "All Sections" ? "" : selectedSection;
    }

    return payload;
  }

  async function postSingleAssignment(payload) {
    const response = await fetch(
      `${API_URL}/api/fees/assignments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await readJson(response);

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "A fee assignment could not be saved."
      );
    }

    return result;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (students.length === 0) {
      setError("No students found. Please add students first.");
      return;
    }

    if (scope === "individual" && !selectedStudentId) {
      setError("Please select a student.");
      return;
    }

    if (scope === "class" && !selectedClass) {
      setError("Please select a class.");
      return;
    }

    if (
      scope === "class" &&
      studentsInSelectedClass.length === 0
    ) {
      setError("No students found in the selected class or section.");
      return;
    }

    if (!feePeriod || !dueDate) {
      setError("Please select the fee period and due date.");
      return;
    }

    let itemsToAssign = [];

    if (assignmentMode === "single") {
      if (feeTypes.length === 0) {
        setError("No active fee types found.");
        return;
      }

      if (!feeType) {
        setError("Please select a fee type.");
        return;
      }

      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        setError("Please enter a fee amount greater than zero.");
        return;
      }

      const selectedType = feeTypes.find(
        (item) => item.name === feeType
      );

      itemsToAssign = [
        {
          id: getFeeTypeId(selectedType || {}),
          name: feeType,
          amount: Number(amount),
        },
      ];
    } else {
      if (!selectedFeeGroup) {
        setError("Please select a fee group.");
        return;
      }

      if (selectedGroupFeeTypes.length === 0) {
        setError(
          "This group has no active fee types. Check the Fee Group contents and API populate route."
        );
        return;
      }

      for (const item of selectedGroupFeeTypes) {
        const itemAmount = Number(groupAmounts[getFeeTypeId(item)]);

        if (!Number.isFinite(itemAmount) || itemAmount <= 0) {
          setError(
            `Please enter a valid amount for "${item.name}".`
          );
          return;
        }
      }

      itemsToAssign = selectedGroupFeeTypes.map((item) => ({
        id: getFeeTypeId(item),
        name: item.name,
        amount: Number(groupAmounts[getFeeTypeId(item)]),
      }));
    }

    const basePayload = buildTargetPayload();
    const completedItems = [];

    try {
      setSaving(true);

      // Current backend accepts one fee type per request.
      // Therefore a group is submitted as separate fee item assignments.
      for (const item of itemsToAssign) {
        const notes =
          assignmentMode === "group"
            ? [
                `Fee Group: ${selectedFeeGroup.name}`,
                description.trim(),
              ]
                .filter(Boolean)
                .join(" | ")
            : description.trim();

        await postSingleAssignment({
          ...basePayload,
          feeType: item.name,
          feeTypeId: item.id,
          amount: item.amount,
          description: notes,
        });

        completedItems.push(item.name);
      }

      await fetchData();

      setSuccess(
        assignmentMode === "group"
          ? `Fee group "${selectedFeeGroup.name}" submitted: ${completedItems.length} fee item(s).`
          : `Fee "${itemsToAssign[0].name}" assigned successfully.`
      );

      setAmount("");
      setDescription("");
      setStudentSearch("");
      setSelectedStudentId("");
      setRecordSearch("");
    } catch (err) {
      const partialMessage =
        completedItems.length > 0
          ? ` ${completedItems.length} item(s) were submitted before the error. Refresh and verify saved records before retrying.`
          : "";

      setError(
        (err.message || "Fee assignment failed.") + partialMessage
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="af-page">
      <header className="af-header">
        <div>
          <span className="af-eyebrow">
            FEE AND FINANCE / ASSIGN FEES
          </span>

          <h1>Assign Fees</h1>

          <p>
            Assign an individual fee or a complete fee package to students.
          </p>
        </div>

        <button
          type="button"
          className="af-button af-button-light"
          onClick={fetchData}
          disabled={loading || saving}
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </header>

      {error && (
        <div className="af-alert af-alert-error" role="alert">
          <AlertCircle size={20} />

          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="af-alert af-alert-success" role="status">
          <CheckCircle2 size={20} />
          <p>{success}</p>
        </div>
      )}

      <section className="af-stats">
        <article className="af-stat-card">
          <div className="af-stat-icon af-purple">
            <ReceiptText size={22} />
          </div>

          <div>
            <span>Fee Assignments</span>
            <h2>{loading ? "—" : assignments.length}</h2>
            <p>Saved assignment records</p>
          </div>
        </article>

        <article className="af-stat-card">
          <div className="af-stat-icon af-blue">
            <Wallet size={22} />
          </div>

          <div>
            <span>Total Assigned Amount</span>
            <h2>{loading ? "—" : formatCurrency(totalAssigned)}</h2>
            <p>Total amounts assigned</p>
          </div>
        </article>

        <article className="af-stat-card">
          <div className="af-stat-icon af-orange">
            <Users size={22} />
          </div>

          <div>
            <span>Outstanding Balance</span>
            <h2>{loading ? "—" : formatCurrency(totalOutstanding)}</h2>
            <p>Remaining balance</p>
          </div>
        </article>
      </section>

      <section className="af-panel">
        <div className="af-panel-heading">
          <div>
            <h2>New Fee Assignment</h2>
            <p>
              Select a student scope, then choose an individual fee or package.
            </p>
          </div>

          <span className="af-step-badge">NEW ASSIGNMENT</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="af-form-grid">
            <div className="af-field af-full">
              <label htmlFor="af-scope">
                Assign To <span>*</span>
              </label>

              <select
                id="af-scope"
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value);
                  setSelectedStudentId("");
                  setStudentSearch("");
                  setError("");
                  setSuccess("");
                }}
                disabled={saving}
              >
                <option value="individual">Individual Student</option>
                <option value="class">Class / Section</option>
                <option value="all">All Students</option>
              </select>
            </div>

            {scope === "individual" && (
              <>
                <div className="af-field af-full">
                  <label htmlFor="af-student-search">Search Student</label>

                  <div className="af-search-box">
                    <Search size={18} />

                    <input
                      id="af-student-search"
                      type="search"
                      placeholder="Search by name, admission or roll number"
                      value={studentSearch}
                      onChange={(event) => {
                        setStudentSearch(event.target.value);
                        setSelectedStudentId("");
                      }}
                    />
                  </div>
                </div>

                <div className="af-field af-full">
                  <label htmlFor="af-student">
                    Select Student <span>*</span>
                  </label>

                  <select
                    id="af-student"
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedStudentId(event.target.value)
                    }
                    disabled={loading || students.length === 0}
                    required
                  >
                    <option value="">Choose a student</option>

                    {filteredStudents.map((student) => {
                      const id = String(student._id || student.id);

                      return (
                        <option key={id} value={id}>
                          {getStudentName(student)} — Admission:{" "}
                          {getAdmissionNumber(student)} — Class:{" "}
                          {getClassName(student)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="af-selected-student af-full">
                    <div className="af-selected-avatar">
                      <UserRound size={20} />
                    </div>

                    <div>
                      <strong>{getStudentName(selectedStudent)}</strong>

                      <p>
                        Admission: {getAdmissionNumber(selectedStudent)}
                        {" · "}
                        Class: {getClassName(selectedStudent)}
                        {selectedStudent.section
                          ? ` · Section: ${selectedStudent.section}`
                          : ""}
                      </p>
                    </div>

                    <CheckCircle2 size={20} />
                  </div>
                )}
              </>
            )}

            {scope === "class" && (
              <>
                <div className="af-field">
                  <label htmlFor="af-class">
                    Select Class <span>*</span>
                  </label>

                  <select
                    id="af-class"
                    value={selectedClass}
                    onChange={(event) => {
                      setSelectedClass(event.target.value);
                      setSelectedSection("All Sections");
                    }}
                    required
                  >
                    <option value="">Choose class</option>

                    {classOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="af-field">
                  <label htmlFor="af-section">Select Section</label>

                  <select
                    id="af-section"
                    value={selectedSection}
                    onChange={(event) =>
                      setSelectedSection(event.target.value)
                    }
                  >
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="af-selected-student af-full">
                  <div className="af-selected-avatar">
                    <Users size={20} />
                  </div>

                  <div>
                    <strong>
                      {studentsInSelectedClass.length} student(s) selected
                    </strong>

                    <p>
                      {selectedClass || "Select a class"}
                      {" · "}
                      {selectedSection}
                    </p>
                  </div>
                </div>
              </>
            )}

            {scope === "all" && (
              <div className="af-selected-student af-full">
                <div className="af-selected-avatar">
                  <Users size={20} />
                </div>

                <div>
                  <strong>{students.length} student(s) selected</strong>

                  <p>
                    Every student returned by the Students API will be targeted.
                  </p>
                </div>
              </div>
            )}

            <div className="af-field af-full">
              <label htmlFor="af-assignment-mode">
                Fee Assignment Type <span>*</span>
              </label>

              <select
                id="af-assignment-mode"
                value={assignmentMode}
                onChange={(event) => {
                  setAssignmentMode(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                disabled={saving}
              >
                <option value="single">Single Fee Type</option>
                <option value="group">
                  Fee Group Package — Multiple Fees
                </option>
              </select>

              <small className="af-field-help">
                Choose one fee or a package containing multiple fee items.
              </small>
            </div>

            {assignmentMode === "single" && (
              <>
                <div className="af-field">
                  <label htmlFor="af-fee-type">
                    Fee Type <span>*</span>
                  </label>

                  <select
                    id="af-fee-type"
                    value={feeType}
                    onChange={(event) => {
                      const name = event.target.value;
                      setFeeType(name);

                      const selected = feeTypes.find(
                        (item) => item.name === name
                      );

                      setAmount(
                        selected && Number(selected.defaultAmount) > 0
                          ? String(selected.defaultAmount)
                          : ""
                      );
                    }}
                    required
                    disabled={loading || feeTypes.length === 0}
                  >
                    <option value="">Select a fee type</option>

                    {feeTypes.map((item) => (
                      <option
                        key={item._id || item.id || item.name}
                        value={item.name}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="af-field">
                  <label htmlFor="af-amount">
                    Fee Amount Per Student (PKR) <span>*</span>
                  </label>

                  <input
                    id="af-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Enter fee amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {assignmentMode === "group" && (
              <div className="af-field af-full">
                <label htmlFor="af-fee-group">
                  Select Fee Group <span>*</span>
                </label>

                <select
                  id="af-fee-group"
                  value={selectedFeeGroupId}
                  onChange={(event) => {
                    const groupId = event.target.value;
                    setSelectedFeeGroupId(groupId);

                    const group = feeGroups.find(
                      (item) =>
                        String(item._id || item.id) === groupId
                    );

                    const nextAmounts = {};

                    getGroupFeeTypes(group).forEach((item) => {
                      const id = getFeeTypeId(item);

                      nextAmounts[id] =
                        Number(item.defaultAmount) > 0
                          ? String(item.defaultAmount)
                          : "";
                    });

                    setGroupAmounts(nextAmounts);
                  }}
                  disabled={loading || feeGroups.length === 0}
                  required
                >
                  <option value="">Choose a fee group package</option>

                  {feeGroups.map((group) => (
                    <option
                      key={group._id || group.id}
                      value={String(group._id || group.id)}
                    >
                      {group.name} ({group.code})
                    </option>
                  ))}
                </select>

                {!loading && feeGroups.length === 0 && (
                  <small className="af-field-help">
                    No active Fee Groups found. Create an active group
                    and refresh this page.
                  </small>
                )}

                {selectedFeeGroup && (
                  <div className="af-package-box">
                    <div className="af-package-heading">
                      <div className="af-package-icon">
                        <Layers3 size={21} />
                      </div>

                      <div>
                        <strong>{selectedFeeGroup.name}</strong>
                        <p>
                          {selectedGroupFeeTypes.length} active fee item(s)
                          in this package
                        </p>
                      </div>
                    </div>

                    {selectedGroupFeeTypes.length === 0 ? (
                      <div className="af-package-warning">
                        This group has no active populated fee types.
                        Check the Fee Group contents and backend populate route.
                      </div>
                    ) : (
                      <div className="af-package-items">
                        {selectedGroupFeeTypes.map((item) => {
                          const id = getFeeTypeId(item);

                          return (
                            <div className="af-package-item" key={id}>
                              <div className="af-package-item-info">
                                <strong>{item.name}</strong>

                                <small>
                                  {item.code || "Fee Type"}
                                  {Number(item.defaultAmount) > 0
                                    ? ` · Default ${formatCurrency(item.defaultAmount)}`
                                    : ""}
                                </small>
                              </div>

                              <div className="af-package-amount">
                                <label htmlFor={`af-package-${id}`}>
                                  Amount (PKR)
                                </label>

                                <input
                                  id={`af-package-${id}`}
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={groupAmounts[id] ?? ""}
                                  onChange={(event) =>
                                    setGroupAmounts((previous) => ({
                                      ...previous,
                                      [id]: event.target.value,
                                    }))
                                  }
                                  required
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="af-package-total">
                      <span>Total Package Amount Per Student</span>
                      <strong>{formatCurrency(packageTotal)}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="af-field">
              <label htmlFor="af-period">
                Fee Period <span>*</span>
              </label>

              <div className="af-input-icon">
                <CalendarDays size={17} />

                <input
                  id="af-period"
                  type="month"
                  value={feePeriod}
                  onChange={(event) => setFeePeriod(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="af-field">
              <label htmlFor="af-due-date">
                Due Date <span>*</span>
              </label>

              <div className="af-input-icon">
                <CalendarDays size={17} />

                <input
                  id="af-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="af-field af-full">
              <label htmlFor="af-description">Notes (Optional)</label>

              <textarea
                id="af-description"
                rows="3"
                maxLength="500"
                placeholder="Add notes about this fee assignment..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>

          <div className="af-form-footer">
            <p>
              <AlertCircle size={15} />
              Check the student scope and every fee amount before saving.
            </p>

            <div className="af-form-actions">
              <button
                type="button"
                className="af-button af-button-light"
                onClick={resetForm}
                disabled={saving}
              >
                <RotateCcw size={16} />
                Clear Form
              </button>

              <button
                type="submit"
                className="af-button af-button-primary"
                disabled={saving || loading}
              >
                <Save size={17} />
                {saving ? "Saving Assignment..." : "Assign Fee"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="af-panel af-list-panel">
        <div className="af-panel-heading">
          <div>
            <h2>Saved Fee Assignments</h2>
            <p>Review saved fee items and outstanding balances.</p>
          </div>

          <span className="af-record-count">
            {loading ? "Loading..." : `${filteredAssignments.length} records`}
          </span>
        </div>

        <div className="af-list-filters">
          <div className="af-search-box">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search student, fee type or period..."
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Filter assignments by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        {loading ? (
          <div className="af-state">
            <RefreshCw size={26} />
            <p>Loading fee assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="af-state">
            <ReceiptText size={32} />
            <h3>No fee assignments found</h3>
            <p>Saved fee assignments will appear here.</p>
          </div>
        ) : (
          <div className="af-table-wrap">
            <table className="af-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Fee Type</th>
                  <th>Fee Period</th>
                  <th>Assigned Amount</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredAssignments.map((record, index) => {
                  const status = getAssignmentStatus(record);
                  const studentName = getAssignmentStudentName(
                    record,
                    students
                  );
                  const photoUrl = getStudentPhotoUrl(
                    record,
                    students
                  );

                  return (
                    <tr key={record._id || record.id || index}>
                      <td>
                        <div className="af-student-cell">
                          <div className="af-student-avatar">
                            <UserRound
                              className="af-avatar-fallback"
                              size={18}
                              strokeWidth={2}
                            />

                            {photoUrl && (
                              <img
                                className="af-student-photo"
                                src={photoUrl}
                                alt={`${studentName} photo`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>

                          <strong>{studentName}</strong>
                        </div>
                      </td>

                      <td>{getAdmissionNumber(record)}</td>
                      <td>{record.className || "N/A"}</td>
                      <td>{record.section || "—"}</td>
                      <td>{record.feeType || "—"}</td>
                      <td>{formatPeriod(record.feePeriod)}</td>

                      <td className="af-money">
                        {formatCurrency(
                          record.amount ?? record.totalAmount
                        )}
                      </td>

                      <td>
                        {formatCurrency(getAssignmentBalance(record))}
                      </td>

                      <td>{formatDate(record.dueDate)}</td>

                      <td>
                        <span
                          className={`af-status af-status-${status
                            .toLowerCase()
                            .replace(/[^a-z]+/g, "-")
                            .replace(/^-|-$/g, "")}`}
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
      </section>
    </div>
  );
}

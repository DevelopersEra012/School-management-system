
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  GraduationCap,
  RefreshCw,
  X,
  UserRound,
  Mail,
  Phone,
  BriefcaseBusiness,
  Eye,
  ArrowLeft,
} from "lucide-react";

import TeacherAdmission from "./TeacherAdmission.jsx";
import "./TeacherList.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const API = `${API_URL}/api/teachers`;

function photoUrl(photo) {
  if (!photo) return "";

  if (/^https?:\/\//i.test(photo)) return photo;

  return `${API_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

export default function TeacherList() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formMode, setFormMode] = useState("list");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewTeacher, setViewTeacher] = useState(null);

  const loadTeachers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(API);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load teachers.");
      }

      setTeachers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = useMemo(() => {
    const term = search.toLowerCase().trim();

    return teachers.filter((teacher) => {
      const fullName =
        `${teacher.firstName || ""} ${teacher.lastName || ""}`
          .toLowerCase()
          .trim();

      const matchesSearch =
        fullName.includes(term) ||
        (teacher.employeeId || "").toLowerCase().includes(term) ||
        (teacher.email || "").toLowerCase().includes(term) ||
        (teacher.phone || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || teacher.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const activeCount = teachers.filter(
    (teacher) => teacher.status === "Active"
  ).length;

  const inactiveCount = teachers.filter(
    (teacher) => teacher.status === "Inactive"
  ).length;

  const subjectCount = new Set(
    teachers.flatMap((teacher) => teacher.subjects || [])
  ).size;

  const openAdd = () => {
    setSelectedTeacher(null);
    setViewTeacher(null);
    setFormMode("add");
  };

  const openEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setViewTeacher(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    setSelectedTeacher(null);
    setFormMode("list");
  };

  const handleSaved = async () => {
    setSelectedTeacher(null);
    setFormMode("list");
    await loadTeachers();
  };

  const deleteTeacher = async (teacher) => {
    const name =
      `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to delete ${name || "this teacher"}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(teacher._id);

    try {
      const response = await fetch(`${API}/${teacher._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete teacher.");
      }

      setTeachers((previous) =>
        previous.filter((item) => item._id !== teacher._id)
      );

      if (viewTeacher?._id === teacher._id) {
        setViewTeacher(null);
      }

      window.alert(result.message || "Teacher deleted successfully.");
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  // Open the shared admission form for adding or editing.
  if (formMode === "add" || formMode === "edit") {
    return (
      <TeacherAdmission
        key={formMode === "edit" ? selectedTeacher?._id : "new-teacher"}
        teacher={formMode === "edit" ? selectedTeacher : null}
        onSaved={handleSaved}
        onCancel={closeForm}
      />
    );
  }

  return (
    <main className="teacher-page">
      <header className="teacher-heading">
        <div>
          <span className="teacher-eyebrow">SCHOOL MANAGEMENT</span>
          <h1>Teacher Management</h1>
          <p>Manage teacher profiles, subjects and assigned classes.</p>
        </div>

        <button
          type="button"
          className="teacher-primary-btn"
          onClick={openAdd}
        >
          <Plus size={18} />
          Add Teacher
        </button>
      </header>

      <section className="teacher-stats">
        <div className="teacher-stat-card">
          <div className="teacher-stat-icon purple">
            <Users size={22} />
          </div>
          <div>
            <span>Total Teachers</span>
            <strong>{teachers.length}</strong>
          </div>
        </div>

        <div className="teacher-stat-card">
          <div className="teacher-stat-icon green">
            <GraduationCap size={22} />
          </div>
          <div>
            <span>Active Teachers</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="teacher-stat-card">
          <div className="teacher-stat-icon blue">
            <BookOpen size={22} />
          </div>
          <div>
            <span>Subjects</span>
            <strong>{subjectCount}</strong>
          </div>
        </div>

        <div className="teacher-stat-card">
          <div className="teacher-stat-icon orange">
            <UserRound size={22} />
          </div>
          <div>
            <span>Inactive Teachers</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </section>

      <section className="teacher-table-card">
        <div className="teacher-table-heading">
          <div>
            <h2>All Teachers</h2>
            <p>{filteredTeachers.length} teachers found</p>
          </div>

          <button
            type="button"
            className="teacher-refresh-btn"
            onClick={loadTeachers}
            title="Refresh teachers"
            disabled={loading}
          >
            <RefreshCw size={17} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="teacher-toolbar">
          <div className="teacher-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, email or phone..."
              aria-label="Search teachers"
            />
            {search && (
              <button
                type="button"
                title="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter teachers by status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="teacher-table-scroll">
          <table className="teacher-table">
            <thead>
              <tr>
                <th>TEACHER</th>
                <th>EMPLOYEE ID</th>
                <th>SUBJECTS</th>
                <th>ASSIGNED CLASSES</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="teacher-empty">
                    <RefreshCw size={20} />
                    <span>Loading teachers...</span>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="teacher-empty">
                    <Users size={30} />
                    <strong>No teachers found</strong>
                    <span>
                      Try another search or click Add Teacher to get started.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher._id}>
                    <td>
                      <div className="teacher-person">
                        {teacher.photo ? (
                          <img
                            className="teacher-avatar"
                            src={photoUrl(teacher.photo)}
                            alt={`${teacher.firstName || ""} ${teacher.lastName || ""}`}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="teacher-avatar teacher-initials">
                            {(teacher.firstName || "T").charAt(0)}
                            {(teacher.lastName || "").charAt(0)}
                          </div>
                        )}

                        <div>
                          <strong>
                            {teacher.firstName} {teacher.lastName}
                          </strong>
                          <span>
                            <Mail size={13} />
                            {teacher.email || "No email added"}
                          </span>
                          {teacher.phone && (
                            <span>
                              <Phone size={13} />
                              {teacher.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="teacher-id">
                        {teacher.employeeId || "—"}
                      </span>
                    </td>

                    <td>
                      <div className="teacher-tags">
                        {(teacher.subjects || []).length > 0 ? (
                          teacher.subjects.map((subject, index) => (
                            <span key={`${subject}-${index}`}>{subject}</span>
                          ))
                        ) : (
                          <span className="teacher-muted">Not assigned</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {(teacher.assignedClasses || []).join(", ") || "—"}
                    </td>

                    <td>
                      <span
                        className={`teacher-status ${
                          teacher.status === "Active"
                            ? "is-active"
                            : "is-inactive"
                        }`}
                      >
                        {teacher.status || "Active"}
                      </span>
                    </td>

                    <td>
                      <div className="teacher-actions">
                        <button
                          type="button"
                          className="teacher-view-action"
                          title="View teacher details"
                          aria-label="View teacher details"
                          onClick={() => setViewTeacher(teacher)}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          className="teacher-edit-action"
                          title="Edit teacher"
                          aria-label="Edit teacher"
                          onClick={() => openEdit(teacher)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="teacher-delete-action"
                          title="Delete teacher"
                          aria-label="Delete teacher"
                          disabled={deletingId === teacher._id}
                          onClick={() => deleteTeacher(teacher)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {viewTeacher && (
        <div
          className="teacher-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewTeacher(null);
            }
          }}
        >
          <section
            className="teacher-modal teacher-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-details-title"
          >
            <div className="teacher-modal-header">
              <div>
                <h2 id="teacher-details-title">Teacher Profile</h2>
                <p>Complete available teacher information</p>
              </div>

              <button
                type="button"
                className="teacher-close-btn"
                onClick={() => setViewTeacher(null)}
                aria-label="Close teacher profile"
              >
                <X size={20} />
              </button>
            </div>

            <div className="teacher-profile-summary">
              {viewTeacher.photo ? (
                <img
                  src={photoUrl(viewTeacher.photo)}
                  alt={`${viewTeacher.firstName || ""} ${viewTeacher.lastName || ""}`}
                  className="teacher-profile-photo"
                />
              ) : (
                <div className="teacher-profile-photo teacher-initials">
                  {(viewTeacher.firstName || "T").charAt(0)}
                  {(viewTeacher.lastName || "").charAt(0)}
                </div>
              )}

              <div>
                <h3>
                  {viewTeacher.firstName} {viewTeacher.lastName}
                </h3>
                <p>{viewTeacher.designation || "Teacher"}</p>
                <span className={`teacher-status ${
                  viewTeacher.status === "Active" ? "is-active" : "is-inactive"
                }`}>
                  {viewTeacher.status || "Active"}
                </span>
              </div>
            </div>

            <div className="teacher-profile-grid">
              <ProfileItem label="Employee ID" value={viewTeacher.employeeId} />
              <ProfileItem label="Email" value={viewTeacher.email} />
              <ProfileItem label="Phone" value={viewTeacher.phone} />
              <ProfileItem label="Gender" value={viewTeacher.gender} />
              <ProfileItem label="Date of Birth" value={viewTeacher.dateOfBirth ? String(viewTeacher.dateOfBirth).slice(0, 10) : ""} />
              <ProfileItem label="Department" value={viewTeacher.department} />
              <ProfileItem label="Qualification" value={viewTeacher.qualification} />
              <ProfileItem label="Joining Date" value={viewTeacher.joiningDate ? String(viewTeacher.joiningDate).slice(0, 10) : ""} />
              <ProfileItem label="Subjects" value={(viewTeacher.subjects || []).join(", ")} />
              <ProfileItem label="Assigned Classes" value={(viewTeacher.assignedClasses || []).join(", ")} />
              <ProfileItem label="Address" value={viewTeacher.address} />
            </div>

            <div className="teacher-modal-footer">
              <button
                type="button"
                className="teacher-cancel-btn"
                onClick={() => setViewTeacher(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="teacher-primary-btn"
                onClick={() => openEdit(viewTeacher)}
              >
                <Pencil size={16} />
                Edit Information
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="teacher-profile-item">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

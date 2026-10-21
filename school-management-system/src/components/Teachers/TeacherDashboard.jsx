
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  RefreshCw,
  GraduationCap,
} from "lucide-react";

import "./TeacherDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getPhotoUrl(photo) {
  if (!photo) return "";

  if (/^https?:\/\//i.test(photo)) return photo;

  return `${API_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
}

export default function TeacherDashboard({ setActiveView }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeachers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/teachers`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load teachers.");
      }

      setTeachers(result.data || []);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const activeTeachers = teachers.filter(
    (teacher) => teacher.status === "Active"
  );

  const inactiveTeachers = teachers.filter(
    (teacher) => teacher.status === "Inactive"
  );

  const subjects = [
    ...new Set(teachers.flatMap((teacher) => teacher.subjects || [])),
  ];

  const recentTeachers = [...teachers]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
    .slice(0, 6);

  return (
    <main className="teacher-dashboard">
      <div className="td-heading">
        <div>
          <span className="td-eyebrow">SCHOOL ERP / OVERVIEW</span>
          <h1>Teacher Dashboard</h1>
          <p>Monitor your school's teaching staff in one place.</p>
        </div>

        <div className="td-heading-actions">
          <button
            type="button"
            className="td-refresh"
            onClick={loadTeachers}
            title="Refresh dashboard"
          >
            <RefreshCw size={17} />
          </button>

          <button
            type="button"
            className="td-add-button"
            onClick={() => setActiveView?.("Teacher Admission")}
          >
            <Users size={17} />
            Add Teacher
          </button>
        </div>
      </div>

      {error && (
        <div className="td-error">
          {error}
          <button type="button" onClick={loadTeachers}>
            Retry
          </button>
        </div>
      )}

      <section className="td-stats">
        <div className="td-stat-card">
          <div className="td-stat-icon td-purple">
            <Users size={23} />
          </div>
          <div>
            <span>Total Teachers</span>
            <strong>{loading ? "—" : teachers.length}</strong>
            <small>All registered teachers</small>
          </div>
        </div>

        <div className="td-stat-card">
          <div className="td-stat-icon td-green">
            <UserCheck size={23} />
          </div>
          <div>
            <span>Active Teachers</span>
            <strong>{loading ? "—" : activeTeachers.length}</strong>
            <small>Currently active</small>
          </div>
        </div>

        <div className="td-stat-card">
          <div className="td-stat-icon td-orange">
            <UserX size={23} />
          </div>
          <div>
            <span>Inactive Teachers</span>
            <strong>{loading ? "—" : inactiveTeachers.length}</strong>
            <small>Not currently active</small>
          </div>
        </div>

        <div className="td-stat-card">
          <div className="td-stat-icon td-blue">
            <BookOpen size={23} />
          </div>
          <div>
            <span>Total Subjects</span>
            <strong>{loading ? "—" : subjects.length}</strong>
            <small>Unique listed subjects</small>
          </div>
        </div>
      </section>

      <section className="td-content-card">
        <div className="td-content-heading">
          <div>
            <h2>Recently Added Teachers</h2>
            <p>Latest teacher profiles in your database.</p>
          </div>

          <button
            type="button"
            className="td-view-all"
            onClick={() => setActiveView?.("Teacher List")}
          >
            View All
          </button>
        </div>

        {loading ? (
          <div className="td-empty">Loading teacher records...</div>
        ) : recentTeachers.length === 0 ? (
          <div className="td-empty">
            <div className="td-empty-icon">
              <GraduationCap size={30} />
            </div>
            <h3>No teachers added yet</h3>
            <p>Add your first teacher to see their profile here.</p>
            <button
              type="button"
              className="td-add-button"
              onClick={() => setActiveView?.("Teacher Admission")}
            >
              <Users size={16} />
              Add First Teacher
            </button>
          </div>
        ) : (
          <div className="td-teacher-grid">
            {recentTeachers.map((teacher) => (
              <article className="td-teacher-card" key={teacher._id}>
                <div className="td-teacher-top">
                  {teacher.photo ? (
                    <img
                      src={getPhotoUrl(teacher.photo)}
                      alt={`${teacher.firstName} ${teacher.lastName || ""}`}
                      className="td-avatar"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="td-avatar td-avatar-fallback">
                      {(teacher.firstName || "T")[0]}
                      {(teacher.lastName || "")[0]}
                    </div>
                  )}

                  <span
                    className={`td-status ${
                      teacher.status === "Active"
                        ? "td-status-active"
                        : "td-status-inactive"
                    }`}
                  >
                    {teacher.status || "Active"}
                  </span>
                </div>

                <h3>
                  {teacher.firstName} {teacher.lastName}
                </h3>

                <p className="td-designation">
                  {teacher.designation || "Teacher"}
                </p>

                <div className="td-teacher-detail">
                  <span>Employee ID</span>
                  <strong>{teacher.employeeId || "—"}</strong>
                </div>

                <div className="td-teacher-detail">
                  <span>Qualification</span>
                  <strong>{teacher.qualification || "Not added"}</strong>
                </div>

                <div className="td-subject-list">
                  {(teacher.subjects || []).length ? (
                    teacher.subjects.slice(0, 3).map((subject) => (
                      <span key={subject}>{subject}</span>
                    ))
                  ) : (
                    <span className="td-no-subject">No subjects assigned</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
 

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Upload,
  UserPlus,
  Save,
  X,
  CheckCircle2,
  BriefcaseBusiness,
  MapPin,
} from "lucide-react";

import "./TeacherAdmission.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API = `${API_URL}/api/teachers`;

const initialForm = {
  employeeId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  designation: "Teacher",
  department: "",
  qualification: "",
  subjects: "",
  assignedClasses: "",
  joiningDate: "",
  status: "Active",
  address: "",
};

function getPhotoUrl(photo) {
  if (!photo) return "";

  if (/^https?:\/\//i.test(photo)) {
    return photo;
  }

  return `${API_URL}${photo.startsWith("/") ? "" : "/"}${photo}`;
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

export default function TeacherAdmission({
  setActiveView,
  teacher = null,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState({ ...initialForm });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fileRef = useRef(null);

  const isEditing = Boolean(teacher?._id);

  // Load existing teacher information when editing.
  useEffect(() => {
    if (teacher) {
      setForm({
        employeeId: teacher.employeeId || "",
        firstName: teacher.firstName || "",
        lastName: teacher.lastName || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        gender: teacher.gender || "",
        dateOfBirth: formatDate(teacher.dateOfBirth),
        designation: teacher.designation || "Teacher",
        department: teacher.department || "",
        qualification: teacher.qualification || "",
        subjects: Array.isArray(teacher.subjects)
          ? teacher.subjects.join(", ")
          : "",
        assignedClasses: Array.isArray(teacher.assignedClasses)
          ? teacher.assignedClasses.join(", ")
          : "",
        joiningDate: formatDate(teacher.joiningDate),
        status: teacher.status || "Active",
        address: teacher.address || "",
      });

      setPreview(getPhotoUrl(teacher.photo));
    } else {
      setForm({ ...initialForm });
      setPreview("");
    }

    setPhoto(null);
    setSuccess("");
    setError("");
  }, [teacher]);

  // Show a preview when a new photo is selected.
  useEffect(() => {
    if (!photo) return;

    const imageUrl = URL.createObjectURL(photo);
    setPreview(imageUrl);

    return () => URL.revokeObjectURL(imageUrl);
  }, [photo]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccess("");
    setError("");
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be 5 MB or less.");
      event.target.value = "";
      return;
    }

    setError("");
    setSuccess("");
    setPhoto(file);
  };

  const resetForm = () => {
    setForm({ ...initialForm });
    setPhoto(null);
    setPreview("");
    setSuccess("");
    setError("");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    if (setActiveView) {
      setActiveView("Teacher List");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.employeeId.trim() || !form.firstName.trim()) {
      setError("Employee ID and First Name are required.");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === "subjects" || key === "assignedClasses") {
          const list = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

          data.append(key, JSON.stringify(list));
        } else {
          data.append(key, value);
        }
      });

      // Only send a photo when a new file has been selected.
      // If editing without a new photo, the backend should retain
      // the existing photo.
      if (photo) {
        data.append("photo", photo);
      }

      const url = isEditing
        ? `${API}/${teacher._id}`
        : API;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Could not update teacher."
              : "Teacher admission failed.")
        );
      }

      const successMessage =
        result.message ||
        (isEditing
          ? "Teacher updated successfully!"
          : "Teacher admitted successfully!");

      if (onSaved) {
        // Teacher List handles closing the form and refreshing records.
        await onSaved(result.data);
      } else {
        setSuccess(successMessage);

        // Reset only after a new admission, not after editing.
        if (!isEditing) {
          setForm({ ...initialForm });
          setPhoto(null);
          setPreview("");

          if (fileRef.current) {
            fileRef.current.value = "";
          }
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="teacher-admission-page">
      <div className="ta-heading">
        <div>
          <span className="ta-eyebrow">TEACHER MANAGEMENT</span>

          <h1>
            {isEditing ? "Edit Teacher" : "Teacher Admission"}
          </h1>

          <p>
            {isEditing
              ? "Review and update the teacher's complete information."
              : "Add a new teacher to your school records."}
          </p>
        </div>

        <button
          type="button"
          className="ta-back-button"
          onClick={handleBack}
          disabled={saving}
        >
          <ArrowLeft size={17} />
          Teacher List
        </button>
      </div>

      {success && (
        <div className="ta-success" role="status">
          <CheckCircle2 size={20} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="ta-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      <form className="ta-form" onSubmit={handleSubmit}>
        {/* PROFILE PHOTO */}
        <section className="ta-card">
          <div className="ta-section-heading">
            <div className="ta-section-icon">
              <Camera size={20} />
            </div>

            <div>
              <h2>Profile Photo</h2>
              <p>Upload a clear photo of the teacher.</p>
            </div>
          </div>

          <div className="ta-photo-area">
            {preview ? (
              <img
                className="ta-photo-preview"
                src={preview}
                alt="Teacher profile preview"
              />
            ) : (
              <div className="ta-photo-placeholder">
                <UserPlus size={30} />
              </div>
            )}

            <div className="ta-photo-info">
              <strong>Teacher Photograph</strong>
              <span>JPG, PNG, WEBP or GIF · Maximum 5 MB</span>

              <button
                type="button"
                className="ta-upload-button"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} />
                Choose Photo
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhoto}
                hidden
              />

              {photo && <small>{photo.name}</small>}
            </div>
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section className="ta-card">
          <div className="ta-section-heading">
            <div className="ta-section-icon">
              <UserPlus size={20} />
            </div>

            <div>
              <h2>Personal Information</h2>
              <p>Enter the teacher's personal details.</p>
            </div>
          </div>

          <div className="ta-grid">
            <label>
              Employee ID *
              <input
                name="employeeId"
                value={form.employeeId}
                onChange={handleChange}
                placeholder="e.g. TCH-001"
                required
              />
            </label>

            <label>
              First Name *
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                required
              />
            </label>

            <label>
              Last Name
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="teacher@example.com"
              />
            </label>

            <label>
              Phone Number
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="03XX-XXXXXXX"
              />
            </label>

            <label>
              Gender
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Date of Birth
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
              />
            </label>

            <label>
              Residential Address
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
              />
            </label>
          </div>
        </section>

        {/* EMPLOYMENT INFORMATION */}
        <section className="ta-card">
          <div className="ta-section-heading">
            <div className="ta-section-icon">
              <BriefcaseBusiness size={20} />
            </div>

            <div>
              <h2>Employment Information</h2>
              <p>Set the teacher's role, subjects and classes.</p>
            </div>
          </div>

          <div className="ta-grid">
            <label>
              Designation
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Senior Teacher"
              />
            </label>

            <label>
              Department
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="Science Department"
              />
            </label>

            <label>
              Qualification
              <input
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
                placeholder="MSc, B.Ed, BS..."
              />
            </label>

            <label>
              Joining Date
              <input
                type="date"
                name="joiningDate"
                value={form.joiningDate}
                onChange={handleChange}
              />
            </label>

            <label>
              Subjects
              <input
                name="subjects"
                value={form.subjects}
                onChange={handleChange}
                placeholder="Math, English, Science"
              />
              <small>Separate subjects with commas.</small>
            </label>

            <label>
              Assigned Classes
              <input
                name="assignedClasses"
                value={form.assignedClasses}
                onChange={handleChange}
                placeholder="Class 6, Class 7"
              />
              <small>Separate classes with commas.</small>
            </label>

            <label>
              Employment Status
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>
        </section>

        {/* FORM ACTIONS */}
        <div className="ta-form-actions">
          {!isEditing && (
            <button
              type="button"
              className="ta-reset-button"
              onClick={resetForm}
              disabled={saving}
            >
              <X size={17} />
              Clear Form
            </button>
          )}

          <button
            type="submit"
            className="ta-submit-button"
            disabled={saving}
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : isEditing
                ? "Update Teacher"
                : "Save Teacher"}
          </button>
        </div>
      </form>
    </main>
  );
}

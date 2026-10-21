
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Save,
  Tags,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";

import "./FeeType.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  name: "",
  code: "",
  defaultAmount: "0",
  description: "",
  status: "Active",
};

function currency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

export default function FeeType() {
  const [feeTypes, setFeeTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function fetchFeeTypes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/fee-types`);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to load fee types."
        );
      }

      const records = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : null;

      if (!records) {
        throw new Error(
          "The fee types API returned an invalid response."
        );
      }

      setFeeTypes(records);
    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeeTypes();
  }, []);

  const filteredFeeTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return feeTypes.filter((feeType) => {
      const matchesSearch = [
        feeType.name,
        feeType.code,
        feeType.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        feeType.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [feeTypes, search, statusFilter]);

  const activeCount = feeTypes.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCount = feeTypes.filter(
    (item) => item.status === "Inactive"
  ).length;

  function openAddModal() {
    setEditingId("");
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setError("");
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingId(item._id);

    setForm({
      name: item.name || "",
      code: item.code || "",
      defaultAmount: String(item.defaultAmount ?? 0),
      description: item.description || "",
      status: item.status || "Active",
    });

    setFormError("");
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingId("");
    setForm({ ...EMPTY_FORM });
    setFormError("");
  }

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const defaultAmount = Number(form.defaultAmount);

    if (!name) {
      setFormError("Please enter the fee type name.");
      return;
    }

    if (!code) {
      setFormError("Please enter the fee code.");
      return;
    }

    if (
      form.defaultAmount.trim() === "" ||
      !Number.isFinite(defaultAmount) ||
      defaultAmount < 0
    ) {
      setFormError(
        "Default amount must be zero or a positive number."
      );
      return;
    }

    const payload = {
      name,
      code,
      defaultAmount,
      description: form.description.trim(),
      status: form.status,
    };

    try {
      setSaving(true);

      const url = editingId
        ? `${API_URL}/api/fee-types/${editingId}`
        : `${API_URL}/api/fee-types`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to save the fee type."
        );
      }

      setModalOpen(false);
      setEditingId("");
      setForm({ ...EMPTY_FORM });

      setNotice(
        result.message ||
          (editingId
            ? "Fee type updated successfully."
            : "Fee type created successfully.")
      );

      await fetchFeeTypes();
    } catch (err) {
      setFormError(
        err.message || "Unable to save the fee type."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Delete "${item.name}" (${item.code})?\n\nThis removes the fee type record from MongoDB. If it has already been used in fee assignments, historical records may still refer to its name.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setDeletingId(item._id);

    try {
      const response = await fetch(
        `${API_URL}/api/fee-types/${item._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Could not delete the fee type."
        );
      }

      setNotice(result.message || "Fee type deleted.");
      await fetchFeeTypes();
    } catch (err) {
      setError(err.message || "Could not delete the fee type.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="ft-page">
      <header className="ft-header">
        <div>
          <span className="ft-eyebrow">
            FEE AND FINANCE / FEE TYPE
          </span>

          <h1>Fee Type</h1>

          <p>
            Create and manage the types of fees used by your school.
          </p>
        </div>

        <div className="ft-header-actions">
          <button
            type="button"
            className="ft-btn ft-btn-light"
            onClick={fetchFeeTypes}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="ft-btn ft-btn-primary"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Fee Type
          </button>
        </div>
      </header>

      {error && (
        <div className="ft-alert ft-alert-error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="ft-alert ft-alert-success" role="status">
          <CheckCircle2 size={19} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="ft-stats">
        <article className="ft-stat-card">
          <div className="ft-stat-icon ft-purple">
            <Tags size={21} />
          </div>
          <div>
            <span>Total Fee Types</span>
            <strong>{loading ? "—" : feeTypes.length}</strong>
          </div>
        </article>

        <article className="ft-stat-card">
          <div className="ft-stat-icon ft-green">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Active</span>
            <strong>{loading ? "—" : activeCount}</strong>
          </div>
        </article>

        <article className="ft-stat-card">
          <div className="ft-stat-icon ft-orange">
            <AlertCircle size={21} />
          </div>
          <div>
            <span>Inactive</span>
            <strong>{loading ? "—" : inactiveCount}</strong>
          </div>
        </article>
      </section>

      <section className="ft-panel">
        <div className="ft-panel-heading">
          <div>
            <h2>Fee Type Register</h2>
            <p>
              Search, edit or manage the fee types saved in MongoDB.
            </p>
          </div>

          <span className="ft-count">
            {loading ? "Loading..." : `${filteredFeeTypes.length} records`}
          </span>
        </div>

        <div className="ft-filters">
          <label className="ft-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, code or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Filter fee types by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="ft-empty">
            <RefreshCw size={25} />
            <p>Loading fee types...</p>
          </div>
        ) : error && feeTypes.length === 0 ? (
          <div className="ft-empty">
            <AlertCircle size={27} />
            <p>Fee types could not be loaded.</p>
            <button
              type="button"
              className="ft-btn ft-btn-light"
              onClick={fetchFeeTypes}
            >
              Try Again
            </button>
          </div>
        ) : filteredFeeTypes.length === 0 ? (
          <div className="ft-empty">
            <Tags size={30} />
            <h3>No fee types found</h3>
            <p>
              {feeTypes.length === 0
                ? "Create your first fee type to start building your school's fee register."
                : "No fee types match your current search or status filter."}
            </p>

            {feeTypes.length === 0 && (
              <button
                type="button"
                className="ft-btn ft-btn-primary"
                onClick={openAddModal}
              >
                <Plus size={16} />
                Add First Fee Type
              </button>
            )}
          </div>
        ) : (
          <div className="ft-table-wrap">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Fee Type Name</th>
                  <th>Fee Code</th>
                  <th>Default Amount</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFeeTypes.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="ft-name-cell">
                        <span className="ft-name-icon">
                          <Tags size={17} />
                        </span>
                        <strong>{item.name}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="ft-code">{item.code}</span>
                    </td>

                    <td className="ft-amount">
                      <IndianRupee size={14} />
                      {currency(item.defaultAmount)}
                    </td>

                    <td className="ft-description">
                      {item.description || "—"}
                    </td>

                    <td>
                      <span
                        className={`ft-status ${
                          item.status === "Active"
                            ? "ft-status-active"
                            : "ft-status-inactive"
                        }`}
                      >
                        {item.status || "Active"}
                      </span>
                    </td>

                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(
                            "en-PK",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>

                    <td>
                      <div className="ft-row-actions">
                        <button
                          type="button"
                          className="ft-icon-btn ft-edit-btn"
                          title="Edit fee type"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => openEditModal(item)}
                          disabled={Boolean(deletingId)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="ft-icon-btn ft-delete-btn"
                          title="Delete fee type"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => handleDelete(item)}
                          disabled={
                            deletingId === item._id ||
                            Boolean(deletingId)
                          }
                        >
                          {deletingId === item._id ? (
                            <RefreshCw size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="ft-panel-footer">
          <span>
            Data source: fee type records saved in MongoDB
          </span>
        </footer>
      </section>

      {modalOpen && (
        <div
          className="ft-modal-overlay"
          onClick={closeModal}
        >
          <section
            className="ft-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ft-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="ft-modal-header">
              <div>
                <span className="ft-eyebrow">
                  FEE AND FINANCE / CONFIGURATION
                </span>

                <h2 id="ft-modal-title">
                  {editingId ? "Edit Fee Type" : "Add Fee Type"}
                </h2>

                <p>
                  Enter the fee category details below.
                </p>
              </div>

              <button
                type="button"
                className="ft-close-btn"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </header>

            <form className="ft-form" onSubmit={handleSubmit}>
              {formError && (
                <div
                  className="ft-alert ft-alert-error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="ft-form-grid">
                <div className="ft-field">
                  <label htmlFor="ft-name">
                    Fee Type Name *
                  </label>
                  <input
                    id="ft-name"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Monthly Tuition Fee"
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    required
                    disabled={saving}
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="ft-code">
                    Fee Code *
                  </label>
                  <input
                    id="ft-code"
                    type="text"
                    maxLength={30}
                    placeholder="e.g. TUITION-MONTHLY"
                    value={form.code}
                    onChange={(event) =>
                      updateField(
                        "code",
                        event.target.value.toUpperCase()
                      )
                    }
                    required
                    disabled={saving}
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="ft-amount">
                    Default Amount (PKR) *
                  </label>
                  <input
                    id="ft-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.defaultAmount}
                    onChange={(event) =>
                      updateField(
                        "defaultAmount",
                        event.target.value
                      )
                    }
                    required
                    disabled={saving}
                  />
                  <small>
                    You can set this to 0 if the amount varies by student.
                  </small>
                </div>

                <div className="ft-field">
                  <label htmlFor="ft-status">Status *</label>
                  <select
                    id="ft-status"
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    disabled={saving}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="ft-field ft-field-full">
                  <label htmlFor="ft-description">
                    Description
                  </label>
                  <textarea
                    id="ft-description"
                    rows={3}
                    maxLength={500}
                    placeholder="Optional details about this fee type..."
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <footer className="ft-modal-footer">
                <button
                  type="button"
                  className="ft-btn ft-btn-light"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ft-btn ft-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw size={16} />
                  ) : (
                    <Save size={16} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Fee Type"
                      : "Save Fee Type"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

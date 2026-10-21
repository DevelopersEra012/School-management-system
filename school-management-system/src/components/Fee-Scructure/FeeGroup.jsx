
import { useEffect, useMemo, useState } from "react";
import {
  Layers3,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
} from "lucide-react";

import "./FeeGroup.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  status: "Active",
  feeTypes: [],
};

function getList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
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

function getFeeTypeNames(group) {
  if (!Array.isArray(group.feeTypes) || group.feeTypes.length === 0) {
    return [];
  }

  return group.feeTypes.map((item) =>
    typeof item === "string" ? item : item.name || "Fee Type"
  );
}

export default function FeeGroup() {
  const [groups, setGroups] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [groupsResponse, typesResponse] = await Promise.all([
        fetch(`${API_URL}/api/fee-groups`),
        fetch(`${API_URL}/api/fee-types`),
      ]);

      const [groupsResult, typesResult] = await Promise.all([
        groupsResponse.json(),
        typesResponse.json(),
      ]);

      if (!groupsResponse.ok) {
        throw new Error(
          groupsResult.message || "Could not load fee groups."
        );
      }

      if (!typesResponse.ok) {
        throw new Error(
          typesResult.message || "Could not load fee types."
        );
      }

      setGroups(getList(groupsResult));
      setFeeTypes(getList(typesResult));
    } catch (err) {
      setError(
        err.message ||
          "Unable to load data. Please check the backend server."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groups.filter((group) => {
      const typeNames = getFeeTypeNames(group).join(" ");

      const searchable = [
        group.name,
        group.code,
        group.description,
        group.status,
        typeNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        group.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [groups, search, statusFilter]);

  const activeCount = groups.filter(
    (group) => group.status === "Active"
  ).length;

  const inactiveCount = groups.filter(
    (group) => group.status === "Inactive"
  ).length;

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  function toggleFeeType(typeId) {
    setForm((previous) => {
      const alreadySelected = previous.feeTypes.includes(typeId);

      return {
        ...previous,
        feeTypes: alreadySelected
          ? previous.feeTypes.filter((id) => id !== typeId)
          : [...previous.feeTypes, typeId],
      };
    });
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId("");
    setError("");
    setSuccess("");
  }

  function handleEdit(group) {
    const selectedIds = Array.isArray(group.feeTypes)
      ? group.feeTypes.map((item) =>
          typeof item === "string" ? item : item._id
        ).filter(Boolean)
      : [];

    setForm({
      name: group.name || "",
      code: group.code || "",
      description: group.description || "",
      status: group.status || "Active",
      feeTypes: selectedIds,
    });

    setEditingId(group._id || group.id || "");
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter the fee group name.");
      return;
    }

    if (!form.code.trim()) {
      setError("Please enter the fee group code.");
      return;
    }

    if (form.feeTypes.length === 0) {
      setError("Please select at least one fee type for this group.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      status: form.status,
      feeTypes: form.feeTypes,
    };

    try {
      setSaving(true);

      const url = editingId
        ? `${API_URL}/api/fee-groups/${editingId}`
        : `${API_URL}/api/fee-groups`;

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
          result.message || "Fee group could not be saved."
        );
      }

      setSuccess(
        result.message ||
          (editingId
            ? "Fee group updated successfully."
            : "Fee group created successfully.")
      );

      setForm(EMPTY_FORM);
      setEditingId("");

      await fetchData();
    } catch (err) {
      setError(err.message || "Could not save the fee group.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(group) {
    const id = group._id || group.id;

    if (!id) {
      setError("This fee group has no valid database ID.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the "${group.name}" fee group?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/fee-groups/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Fee group could not be deleted."
        );
      }

      if (editingId === id) {
        resetForm();
      }

      setSuccess(result.message || "Fee group deleted successfully.");

      await fetchData();
    } catch (err) {
      setError(err.message || "Could not delete the fee group.");
    }
  }

  return (
    <div className="fg-page">
      <header className="fg-header">
        <div>
          <span className="fg-eyebrow">FEE AND FINANCE / FEE GROUP</span>
          <h1>Fee Group</h1>
          <p>
            Organize fee types into groups for easier fee management.
          </p>
        </div>

        <button
          type="button"
          className="fg-button fg-button-light"
          onClick={fetchData}
          disabled={loading || saving}
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </header>

      {error && (
        <div className="fg-alert fg-alert-error" role="alert">
          <AlertCircle size={20} />
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="fg-alert fg-alert-success" role="status">
          <CheckCircle2 size={20} />
          <p>{success}</p>
        </div>
      )}

      <section className="fg-stats">
        <article className="fg-stat-card">
          <div className="fg-stat-icon fg-purple">
            <Layers3 size={22} />
          </div>
          <div>
            <span>Total Fee Groups</span>
            <h2>{loading ? "—" : groups.length}</h2>
            <p>All saved groups</p>
          </div>
        </article>

        <article className="fg-stat-card">
          <div className="fg-stat-icon fg-green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Active Groups</span>
            <h2>{loading ? "—" : activeCount}</h2>
            <p>Currently active</p>
          </div>
        </article>

        <article className="fg-stat-card">
          <div className="fg-stat-icon fg-orange">
            <ReceiptText size={22} />
          </div>
          <div>
            <span>Inactive Groups</span>
            <h2>{loading ? "—" : inactiveCount}</h2>
            <p>Currently inactive</p>
          </div>
        </article>
      </section>

      <section className="fg-panel">
        <div className="fg-panel-heading">
          <div>
            <h2>{editingId ? "Edit Fee Group" : "Create Fee Group"}</h2>
            <p>
              Enter group details and select the fee types that belong
              to this group.
            </p>
          </div>

          {editingId && (
            <span className="fg-edit-badge">EDITING</span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fg-form-grid">
            <div className="fg-field">
              <label htmlFor="fg-name">
                Group Name <span>*</span>
              </label>
              <input
                id="fg-name"
                name="name"
                type="text"
                maxLength="100"
                placeholder="e.g. Monthly School Fees"
                value={form.name}
                onChange={handleFormChange}
                required
                disabled={saving}
              />
            </div>

            <div className="fg-field">
              <label htmlFor="fg-code">
                Group Code <span>*</span>
              </label>
              <input
                id="fg-code"
                name="code"
                type="text"
                maxLength="30"
                placeholder="e.g. MONTHLY"
                value={form.code}
                onChange={handleFormChange}
                required
                disabled={saving}
              />
              <small>Use a unique code for each fee group.</small>
            </div>

            <div className="fg-field">
              <label htmlFor="fg-status">Status</label>
              <select
                id="fg-status"
                name="status"
                value={form.status}
                onChange={handleFormChange}
                disabled={saving}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="fg-field fg-full">
              <label htmlFor="fg-description">Description</label>
              <textarea
                id="fg-description"
                name="description"
                rows="3"
                maxLength="500"
                placeholder="Describe the purpose of this fee group..."
                value={form.description}
                onChange={handleFormChange}
                disabled={saving}
              />
            </div>

            <div className="fg-field fg-full">
              <div className="fg-fee-heading">
                <div>
                  <label>Included Fee Types <span>*</span></label>
                  <p>Select one or more existing fee types.</p>
                </div>
                <span className="fg-selected-count">
                  {form.feeTypes.length} selected
                </span>
              </div>

              {feeTypes.length === 0 ? (
                <div className="fg-empty-types">
                  <ReceiptText size={22} />
                  <p>
                    No fee types found. Add fee types on the Fee Type page
                    first, then return here.
                  </p>
                </div>
              ) : (
                <div className="fg-fee-type-grid">
                  {feeTypes.map((item) => {
                    const id = String(item._id || item.id);
                    const checked = form.feeTypes.includes(id);

                    return (
                      <label
                        className={`fg-fee-type-option ${
                          checked ? "fg-fee-type-selected" : ""
                        }`}
                        key={id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFeeType(id)}
                          disabled={saving}
                        />

                        <span className="fg-checkbox-mark">
                          {checked && <CheckCircle2 size={17} />}
                        </span>

                        <span className="fg-type-info">
                          <strong>{item.name}</strong>
                          <small>
                            {item.code || "No code"}
                            {Number(item.defaultAmount) > 0
                              ? ` · Rs. ${Number(
                                  item.defaultAmount
                                ).toLocaleString("en-PK")}`
                              : ""}
                          </small>
                        </span>

                        <span
                          className={`fg-type-status ${
                            item.status === "Inactive"
                              ? "fg-type-inactive"
                              : ""
                          }`}
                        >
                          {item.status || "Active"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="fg-form-footer">
            <p>
              <AlertCircle size={15} />
              A fee group organizes fee types. It does not itself collect
              or assign fees to students.
            </p>

            <div className="fg-form-actions">
              {editingId && (
                <button
                  type="button"
                  className="fg-button fg-button-light"
                  onClick={resetForm}
                  disabled={saving}
                >
                  <X size={16} />
                  Cancel Edit
                </button>
              )}

              {!editingId && (
                <button
                  type="button"
                  className="fg-button fg-button-light"
                  onClick={resetForm}
                  disabled={saving}
                >
                  <X size={16} />
                  Clear Form
                </button>
              )}

              <button
                type="submit"
                className="fg-button fg-button-primary"
                disabled={saving || loading || feeTypes.length === 0}
              >
                {saving ? (
                  <RefreshCw size={16} />
                ) : editingId ? (
                  <Save size={16} />
                ) : (
                  <Plus size={17} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Fee Group"
                    : "Create Fee Group"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="fg-panel fg-list-panel">
        <div className="fg-panel-heading">
          <div>
            <h2>Saved Fee Groups</h2>
            <p>Search, review, edit or delete existing groups.</p>
          </div>

          <span className="fg-record-count">
            {loading ? "Loading..." : `${filteredGroups.length} records`}
          </span>
        </div>

        <div className="fg-list-filters">
          <div className="fg-search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search group, code or fee type..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Filter groups by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="fg-state">
            <RefreshCw size={26} />
            <p>Loading fee groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="fg-state">
            <Layers3 size={32} />
            <h3>No fee groups found</h3>
            <p>Create a fee group using the form above.</p>
          </div>
        ) : (
          <div className="fg-table-wrap">
            <table className="fg-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Code</th>
                  <th>Included Fee Types</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredGroups.map((group) => {
                  const id = group._id || group.id;
                  const typeNames = getFeeTypeNames(group);

                  return (
                    <tr key={id}>
                      <td>
                        <div className="fg-group-cell">
                          <div className="fg-group-avatar">
                            <Layers3 size={18} />
                          </div>
                          <strong>{group.name}</strong>
                        </div>
                      </td>

                      <td>
                        <span className="fg-code">{group.code}</span>
                      </td>

                      <td>
                        {typeNames.length ? (
                          <div className="fg-type-tags">
                            {typeNames.map((name, index) => (
                              <span
                                className="fg-type-tag"
                                key={`${name}-${index}`}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="fg-muted">No fee types</span>
                        )}
                      </td>

                      <td>
                        <span className="fg-description-cell">
                          {group.description || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`fg-status ${
                            group.status === "Active"
                              ? "fg-status-active"
                              : "fg-status-inactive"
                          }`}
                        >
                          {group.status || "Active"}
                        </span>
                      </td>

                      <td>{formatDate(group.createdAt)}</td>

                      <td>
                        <div className="fg-row-actions">
                          <button
                            type="button"
                            className="fg-icon-button fg-edit-button"
                            title="Edit fee group"
                            aria-label={`Edit ${group.name}`}
                            onClick={() => handleEdit(group)}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            className="fg-icon-button fg-delete-button"
                            title="Delete fee group"
                            aria-label={`Delete ${group.name}`}
                            onClick={() => handleDelete(group)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

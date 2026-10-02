import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, User } from "../context/AuthContext.js";
import { apiClient } from "../lib/apiClient.js";
import { RoleBadge } from "./RoleBadge.js";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
}

function validatePasswordClient(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one numeric digit.";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Drawer / Modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("IT_STAFF");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formInitialPassword, setFormInitialPassword] = useState("");

  const [conflictEmailError, setConflictEmailError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password reset inline section
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetPasswordErr, setResetPasswordErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter) params.append("role", roleFilter);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get<{ users: AdminUserItem[] }>(`/api/admin/users${queryString}`);
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMINISTRATOR") {
      fetchUsers();
    }
  }, [search, roleFilter, currentUser]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="loading-spinner">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Role Guard: Forbidden screen if not ADMINISTRATOR
  if (!currentUser || currentUser.role !== "ADMINISTRATOR") {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" data-testid="forbidden-screen">
        <div className="text-center p-5 surface-card rounded shadow-sm" style={{ maxWidth: "480px" }}>
          <div className="mb-3" style={{ fontSize: "3rem", color: "#DC2626" }}>⚠️</div>
          <h2 className="h4 font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-muted mb-4">You do not have permission to view this page</p>
          <Link to="/tickets" className="btn text-white" style={{ backgroundColor: "#1B4D3E" }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const openCreateDrawer = () => {
    setDrawerMode("create");
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormRole("IT_STAFF");
    setFormIsActive(true);
    setFormInitialPassword("");
    setConflictEmailError(null);
    setRoleError(null);
    setPasswordValidationError(null);
    setNameError(null);
    setResetPasswordMode(false);
    setResetPasswordValue("");
    setResetPasswordErr(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (user: AdminUserItem) => {
    setDrawerMode("edit");
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setFormInitialPassword("");
    setConflictEmailError(null);
    setRoleError(null);
    setPasswordValidationError(null);
    setNameError(null);
    setResetPasswordMode(false);
    setResetPasswordValue("");
    setResetPasswordErr(null);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingUser(null);
  };

  // Compute safety guard for active toggle switch
  const activeAdminsCount = users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
  const isEditingSelf = editingUser ? editingUser.id === currentUser.id : false;
  const isTargetActiveAdmin = editingUser ? editingUser.role === "ADMINISTRATOR" && editingUser.isActive : false;
  const isLastActiveAdmin = isTargetActiveAdmin && activeAdminsCount <= 1;
  const isDeactivateDisabled = drawerMode === "edit" && (isEditingSelf || isLastActiveAdmin);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictEmailError(null);
    setRoleError(null);
    setPasswordValidationError(null);
    setNameError(null);

    let hasError = false;

    if (!formName.trim()) {
      setNameError("Full name is required.");
      hasError = true;
    }

    if (!formEmail.trim()) {
      setConflictEmailError("Email address is required.");
      hasError = true;
    }

    if (drawerMode === "create") {
      const passErr = validatePasswordClient(formInitialPassword);
      if (passErr) {
        setPasswordValidationError(passErr);
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      setSaving(true);
      if (drawerMode === "create") {
        const payload = {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          isActive: formIsActive,
          initialPassword: formInitialPassword,
        };

        await apiClient.post<{ user: AdminUserItem }>("/api/admin/users", payload);
        showToast("User created successfully");
        closeDrawer();
        fetchUsers();
      } else if (editingUser) {
        const payload = {
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          isActive: isDeactivateDisabled ? editingUser.isActive : formIsActive,
        };

        await apiClient.patch<{ user: AdminUserItem }>(`/api/admin/users/${editingUser.id}`, payload);
        showToast("User updated successfully");
        closeDrawer();
        fetchUsers();
      }
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.toLowerCase().includes("already in use") || errMsg.toLowerCase().includes("duplicate") || errMsg.includes("409")) {
        setConflictEmailError("This email is already in use by another account.");
      } else if (errMsg.toLowerCase().includes("role") || errMsg.includes("400")) {
        setRoleError("Please select a valid role from the list.");
      } else {
        setConflictEmailError(errMsg || "An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordErr(null);

    const passErr = validatePasswordClient(resetPasswordValue);
    if (passErr) {
      setResetPasswordErr(passErr);
      return;
    }

    if (!editingUser) return;

    try {
      setSaving(true);
      await apiClient.post(`/api/admin/users/${editingUser.id}/reset-password`, {
        newInitialPassword: resetPasswordValue,
      });
      showToast("Password reset successfully");
      setResetPasswordMode(false);
      setResetPasswordValue("");
      fetchUsers();
    } catch (err: any) {
      setResetPasswordErr(err.message || "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      {/* Toast Notification */}
      {toast && (
        <div
          data-testid="toast-success"
          className="position-fixed top-0 end-0 m-4 p-3 rounded shadow text-white z-50 d-flex align-items-center gap-2"
          style={{ backgroundColor: toast.type === "success" ? "#16A34A" : "#DC2626", zIndex: 1055 }}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="btn-close btn-close-white ms-auto"
            aria-label="Close"
            onClick={() => setToast(null)}
          />
        </div>
      )}

      {/* Header Controls */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 font-bold text-gray-900 m-0">Users</h1>
          <p className="text-muted small m-0">Manage system user accounts, roles, and status</p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Search Input */}
          <div className="position-relative" style={{ minWidth: "220px" }}>
            <input
              type="text"
              className="form-control form-control-sm pe-4"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-input"
              style={{ borderColor: "#E2E8F0" }}
            />
          </div>

          {/* Role Filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: "auto", borderColor: "#E2E8F0" }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            data-testid="role-filter"
          >
            <option value="">All Roles</option>
            <option value="REQUESTER">Requester</option>
            <option value="IT_STAFF">IT Staff</option>
            <option value="ADMINISTRATOR">Administrator</option>
          </select>

          {/* Create User Button */}
          <button
            type="button"
            className="btn btn-sm text-white font-medium d-flex align-items-center gap-1"
            style={{ backgroundColor: "#1B4D3E", borderRadius: "6px" }}
            onClick={openCreateDrawer}
            data-testid="create-user-btn"
          >
            <span>+ Create User</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Main Table / Cards View */}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5" data-testid="users-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="surface-card p-5 text-center rounded border text-muted" data-testid="no-users">
          No users found matching your criteria.
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="surface-card rounded shadow-sm overflow-hidden d-none d-md-block" style={{ border: "1px solid #E2E8F0" }}>
            <table className="table table-hover align-middle mb-0" data-testid="desktop-users-table">
              <thead style={{ backgroundColor: "#F1F3F2", color: "#475569", fontSize: "0.8125rem", fontWeight: 600 }}>
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.875rem" }}>
                {users.map((user) => (
                  <tr key={user.id} data-testid={`user-row-${user.id}`}>
                    <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                    <td className="py-3 px-4 text-muted truncate" style={{ maxWidth: "240px" }}>{user.email}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="py-3 px-4">
                      {user.isActive ? (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}
                          data-testid={`user-status-badge-${user.id}`}
                        >
                          Active
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}
                          data-testid={`user-status-badge-${user.id}`}
                        >
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-3"
                        style={{ borderRadius: "4px", fontSize: "0.8125rem" }}
                        onClick={() => openEditDrawer(user)}
                        data-testid={`edit-user-${user.id}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View (< 768px) */}
          <div className="d-block d-md-none space-y-3" data-testid="mobile-user-list">
            {users.map((user) => (
              <div
                key={user.id}
                className="surface-card p-3 mb-3 border rounded shadow-sm"
                style={{ borderColor: "#E2E8F0" }}
                data-testid="mobile-user-card"
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h2 className="h6 font-bold text-gray-900 m-0">{user.name}</h2>
                    <p className="text-muted small m-0 text-truncate" style={{ maxWidth: "200px" }}>{user.email}</p>
                  </div>
                  {user.isActive ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}
                      data-testid={`mobile-user-status-badge-${user.id}`}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}
                      data-testid={`mobile-user-status-badge-${user.id}`}
                    >
                      Inactive
                    </span>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                  <RoleBadge role={user.role} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={() => openEditDrawer(user)}
                    data-testid={`mobile-edit-user-${user.id}`}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Slide-over Drawer / Modal Component */}
      {isDrawerOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="user-drawer"
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable drawer-modal-dialog">
            <div className="modal-content surface-card border-0 shadow-lg rounded-lg">
              <div className="modal-header border-bottom px-4 py-3">
                <h5 className="modal-title font-bold text-gray-900" data-testid="drawer-title">
                  {drawerMode === "create" ? "Create New User" : "Edit User"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeDrawer}
                  data-testid="btn-close-drawer"
                />
              </div>

              <div className="modal-body px-4 py-3">
                <form onSubmit={handleSaveUser} id="user-form">
                  {/* Name Field */}
                  <div className="mb-3">
                    <label className="form-label font-medium text-gray-700 small">Full Name *</label>
                    <input
                      type="text"
                      className={`form-control ${nameError ? "is-invalid" : ""}`}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Jane Doe"
                      data-testid="input-name"
                      style={{ borderColor: nameError ? "#DC2626" : "#E2E8F0" }}
                    />
                    {nameError && <div className="invalid-feedback">{nameError}</div>}
                  </div>

                  {/* Email Field */}
                  <div className="mb-3">
                    <label className="form-label font-medium text-gray-700 small">Email Address *</label>
                    <input
                      type="email"
                      className={`form-control ${conflictEmailError ? "is-invalid" : ""}`}
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="jane.doe@toktickit.com"
                      data-testid="input-email"
                      style={{ borderColor: conflictEmailError ? "#DC2626" : "#E2E8F0" }}
                    />
                    {conflictEmailError && (
                      <div className="text-danger small mt-1 font-medium" data-testid="email-error">
                        {conflictEmailError}
                      </div>
                    )}
                  </div>

                  {/* Role Field */}
                  <div className="mb-3">
                    <label className="form-label font-medium text-gray-700 small">Role *</label>
                    <select
                      className={`form-select ${roleError ? "is-invalid" : ""}`}
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as any)}
                      data-testid="select-role"
                      style={{ borderColor: roleError ? "#DC2626" : "#E2E8F0" }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    {roleError && (
                      <div className="text-danger small mt-1 font-medium" data-testid="role-error">
                        {roleError}
                      </div>
                    )}
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="mb-3">
                    <div className="form-check form-switch d-flex align-items-center gap-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="activeSwitch"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        disabled={isDeactivateDisabled}
                        data-testid="toggle-active"
                        style={{ cursor: isDeactivateDisabled ? "not-allowed" : "pointer" }}
                      />
                      <label className="form-check-label font-medium text-gray-700 small" htmlFor="activeSwitch">
                        Active Account ({formIsActive ? "Yes" : "No"})
                      </label>
                    </div>

                    {isDeactivateDisabled && (
                      <p className="text-danger small mt-1 m-0 font-medium" data-testid="deactivate-warning">
                        Cannot deactivate your own account or the last active administrator.
                      </p>
                    )}
                  </div>

                  {/* Create Mode: Initial Password */}
                  {drawerMode === "create" && (
                    <div className="mb-3 border-top pt-3">
                      <label className="form-label font-medium text-gray-700 small">Initial Password *</label>
                      <input
                        type="password"
                        className={`form-control ${passwordValidationError ? "is-invalid" : ""}`}
                        value={formInitialPassword}
                        onChange={(e) => setFormInitialPassword(e.target.value)}
                        placeholder="InitialPassword123!"
                        data-testid="input-password"
                        style={{ borderColor: passwordValidationError ? "#DC2626" : "#E2E8F0" }}
                      />
                      <p className="text-muted small mt-1 m-0">
                        User will be forced to change this password on first login.
                      </p>
                      {passwordValidationError && (
                        <div className="text-danger small mt-1 font-medium" data-testid="password-error">
                          {passwordValidationError}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Mode: Reset Initial Password inline */}
                  {drawerMode === "edit" && (
                    <div className="mb-3 border-top pt-3">
                      {!resetPasswordMode ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning text-dark font-medium"
                          onClick={() => setResetPasswordMode(true)}
                          data-testid="btn-reset-password"
                        >
                          Reset Initial Password
                        </button>
                      ) : (
                        <div className="p-3 bg-light rounded border">
                          <label className="form-label font-medium text-gray-700 small">New Initial Password *</label>
                          <input
                            type="password"
                            className={`form-control form-control-sm mb-2 ${resetPasswordErr ? "is-invalid" : ""}`}
                            value={resetPasswordValue}
                            onChange={(e) => setResetPasswordValue(e.target.value)}
                            placeholder="NewInitialPass123!"
                            data-testid="input-reset-password"
                          />
                          {resetPasswordErr && (
                            <div className="text-danger small mb-2 font-medium" data-testid="reset-password-error">
                              {resetPasswordErr}
                            </div>
                          )}
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm text-white"
                              style={{ backgroundColor: "#1B4D3E" }}
                              onClick={handleConfirmResetPassword}
                              disabled={saving}
                              data-testid="btn-confirm-reset-password"
                            >
                              Confirm Reset
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setResetPasswordMode(false);
                                setResetPasswordValue("");
                                setResetPasswordErr(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>

              <div className="modal-footer border-top px-4 py-3 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeDrawer}
                  data-testid="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="user-form"
                  className="btn text-white font-medium px-4"
                  style={{ backgroundColor: "#1B4D3E" }}
                  disabled={saving}
                  data-testid="btn-save-user"
                >
                  {saving ? "Saving..." : "Save User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

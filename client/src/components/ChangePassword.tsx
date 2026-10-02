import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/apiClient.js";
import { getRoleHomePath } from "./Login.js";

export const ChangePassword: React.FC = () => {
  const { user, setUser, fetchUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorAlert, setErrorAlert] = useState("");

  // Complexity rules check
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const isChecklistComplete = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isDifferentFromCurrent = newPassword !== currentPassword;
  
  const canSubmit =
    Boolean(currentPassword) &&
    isChecklistComplete &&
    passwordsMatch &&
    isDifferentFromCurrent &&
    !isSubmitting;

  useEffect(() => {
    // If user doesn't need to change password, bounce to role home
    if (user && !user.mustChangePassword) {
      navigate(getRoleHomePath(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert("");

    if (!currentPassword) {
      setErrorAlert("Current password is required");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorAlert("New password must not be identical to current password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorAlert("Passwords do not match");
      return;
    }

    if (!isChecklistComplete) {
      setErrorAlert("Password does not meet all complexity requirements");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      await fetchUser();
      const targetPath = getRoleHomePath(user?.role);
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      const errMsg = err?.message || err?.error?.message || "";
      if (errMsg.includes("Current password is incorrect") || err?.code === "INVALID_CURRENT_PASSWORD") {
        setErrorAlert("Current password is incorrect. Please try again.");
      } else if (errMsg.includes("identical")) {
        setErrorAlert("New password must not be identical to current password");
      } else {
        setErrorAlert(errMsg || "Current password is incorrect. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-5" style={{ backgroundColor: "#F8F9FA" }}>
      <div className="w-100 card shadow-md rounded-3 border-0" style={{ maxWidth: "440px", backgroundColor: "#FFFFFF" }}>
        <div className="card-body p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{ color: "#1B4D3E" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="h4 fw-bold text-dark mb-1">You must change your password to continue</h1>
            <p className="text-muted small">Please set a new secure password for your account.</p>
          </div>

          {/* Error Alert Banner */}
          {errorAlert && (
            <div
              className="alert d-flex align-items-center mb-4 p-3 rounded-2"
              role="alert"
              style={{
                backgroundColor: "#FEF2F2",
                borderColor: "#FECACA",
                color: "#DC2626",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
              data-testid="change-password-error-alert"
            >
              <svg className="me-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="small fw-medium">{errorAlert}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Current Password Field */}
            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label small fw-semibold text-secondary">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorAlert) setErrorAlert("");
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* New Password Field */}
            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label small fw-semibold text-secondary">
                New Password
              </label>
              <div className="input-group">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorAlert) setErrorAlert("");
                  }}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Real-Time Password Checklist */}
            <div className="p-3 mb-3 rounded-2" style={{ backgroundColor: "#F8F9FA", border: "1px solid #E2E8F0" }} data-testid="password-checklist">
              <span className="d-block small fw-semibold text-secondary mb-2">Password Requirements:</span>
              <ul className="list-unstyled mb-0 small" style={{ fontSize: "0.8125rem" }}>
                <li className={`d-flex align-items-center mb-1 ${hasMinLength ? "text-success fw-medium" : "text-muted"}`} data-testid="rule-min-length">
                  <span className="me-2">{hasMinLength ? "✓" : "○"}</span>
                  <span>Be at least 8 characters long</span>
                </li>
                <li className={`d-flex align-items-center mb-1 ${hasUpper ? "text-success fw-medium" : "text-muted"}`} data-testid="rule-uppercase">
                  <span className="me-2">{hasUpper ? "✓" : "○"}</span>
                  <span>Include an uppercase letter (A-Z)</span>
                </li>
                <li className={`d-flex align-items-center mb-1 ${hasLower ? "text-success fw-medium" : "text-muted"}`} data-testid="rule-lowercase">
                  <span className="me-2">{hasLower ? "✓" : "○"}</span>
                  <span>Include a lowercase letter (a-z)</span>
                </li>
                <li className={`d-flex align-items-center mb-1 ${hasNumber ? "text-success fw-medium" : "text-muted"}`} data-testid="rule-number">
                  <span className="me-2">{hasNumber ? "✓" : "○"}</span>
                  <span>Include a numeric digit (0-9)</span>
                </li>
                <li className={`d-flex align-items-center ${hasSpecial ? "text-success fw-medium" : "text-muted"}`} data-testid="rule-special">
                  <span className="me-2">{hasSpecial ? "✓" : "○"}</span>
                  <span>Include a special character (!@#$%^&*)</span>
                </li>
              </ul>
            </div>

            {/* Confirm Password Field */}
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label small fw-semibold text-secondary">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-control ${confirmPassword && !passwordsMatch ? "is-invalid" : ""}`}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorAlert) setErrorAlert("");
                }}
                disabled={isSubmitting}
                required
              />
              {confirmPassword && !passwordsMatch && (
                <div className="invalid-feedback small">Passwords do not match</div>
              )}
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              className="btn w-100 text-white fw-medium py-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "#1B4D3E", borderColor: "#1B4D3E" }}
              disabled={!canSubmit}
              data-testid="change-password-submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  <span>Updating Password...</span>
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

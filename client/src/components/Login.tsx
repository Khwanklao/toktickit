import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, User } from "../context/AuthContext.js";

export function getRoleHomePath(role?: string): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "/admin/users";
    case "IT_STAFF":
      return "/staff/queue";
    case "REQUESTER":
    default:
      return "/tickets";
  }
}

export const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");

  const getRedirectPath = (u: User) => {
    if (u.mustChangePassword) return "/change-password";
    
    const fromPath = (location.state as any)?.from?.pathname;
    
    if (u.role === "ADMINISTRATOR") {
      return (fromPath && fromPath.startsWith("/admin")) ? fromPath : "/admin/users";
    }
    if (u.role === "IT_STAFF") {
      return (fromPath && (fromPath.startsWith("/staff") || fromPath.startsWith("/tickets/"))) ? fromPath : "/staff/queue";
    }
    if (u.role === "REQUESTER") {
      return (fromPath && fromPath.startsWith("/tickets")) ? fromPath : "/tickets";
    }
    
    return getRoleHomePath(u.role);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const target = getRedirectPath(user);
      navigate(target, { replace: true });
    }
  }, [user, navigate, location]);

  const validateEmailFormat = (val: string) => {
    if (!val.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return "Please enter a valid email address";
    return "";
  };

  const handleEmailBlur = () => {
    if (email) {
      setEmailError(validateEmailFormat(email));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    let valid = true;
    const eErr = validateEmailFormat(email);
    if (eErr) {
      setEmailError(eErr);
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) return;

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });
      const target = getRedirectPath(loggedInUser);
      navigate(target, { replace: true });
    } catch (err: any) {
      setLoginError("Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-5" style={{ backgroundColor: "#F8F9FA" }}>
      <div className="w-100 card shadow-md rounded-3 border-0" style={{ maxWidth: "420px", backgroundColor: "#FFFFFF" }}>
        <div className="card-body p-4 p-sm-5">
          {/* Header Brand */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{ color: "#1B4D3E" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="h4 fw-bold text-dark mb-1">Sign in to TokTickIT</h1>
            <p className="text-muted small">Enter your credentials to access your account</p>
          </div>

          {/* Failure Alert Banner */}
          {loginError && (
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
              data-testid="login-error-alert"
            >
              <svg className="me-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="small fw-medium">{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label small fw-semibold text-secondary">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={`form-control ${emailError ? "is-invalid" : ""}`}
                placeholder="user@toktickit.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={handleEmailBlur}
                autoFocus
                disabled={isSubmitting}
                required
              />
              {emailError && <div className="invalid-feedback small">{emailError}</div>}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label htmlFor="password" className="form-label small fw-semibold text-secondary">
                Password
              </label>
              <div className="input-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-control ${passwordError ? "is-invalid" : ""}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
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
                {passwordError && <div className="invalid-feedback d-block small">{passwordError}</div>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn w-100 text-white fw-medium py-2 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: "#1B4D3E", borderColor: "#1B4D3E" }}
              disabled={isSubmitting}
              data-testid="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

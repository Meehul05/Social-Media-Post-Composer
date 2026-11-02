import React, { useState } from "react";

function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  sessionExpired = false,
  unauthorizedReason = null,
}) {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        await onRegister(displayName || "Studio Creator", email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign In" : "Create Account"}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>
              {mode === "login"
                ? "Sign In to PostComposer"
                : "Create Studio Account"}
            </h3>
            <p className="page-subtitle">
              JWT authentication with automatic refresh token rotation
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        {sessionExpired && (
          <div className="notice-banner warning" role="alert">
            Your session has expired. Please sign in again to continue.
          </div>
        )}

        {unauthorizedReason && (
          <div className="notice-banner error" role="alert">
            {unauthorizedReason}
          </div>
        )}

        {error && (
          <div className="notice-banner error" role="alert">
            {error}
          </div>
        )}

        <div
          className="segmented-control"
          style={{ width: "100%", marginBottom: "14px" }}
        >
          <button
            type="button"
            style={{ flex: 1 }}
            className={`segment-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            style={{ flex: 1 }}
            className={`segment-btn ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label" htmlFor="auth-display-name">
                Display Name
              </label>
              <input
                id="auth-display-name"
                type="text"
                className="form-input"
                placeholder="Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <label className="form-label" htmlFor="auth-email">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Authenticating..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(AuthModal);

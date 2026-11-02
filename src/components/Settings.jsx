import React, { useState } from "react";

function Settings({
  userProfile,
  onUpdateProfile,
  onChangePassword,
  platformAccounts = [],
  onTogglePlatformConnection,
  theme = "light",
  onToggleTheme,
  onOpenAuthModal,
  onLogout,
}) {
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || "Admin"
  );
  const [email, setEmail] = useState(
    userProfile?.email || "admin@example.com"
  );
  const [timezone, setTimezone] = useState(
    userProfile?.timezone || "UTC-05:00 (Eastern Time)"
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const instagramAccount = platformAccounts.find(
    (a) => a.platform === "INSTAGRAM"
  ) || { platform: "INSTAGRAM", handle: "@yourhandle", connected: true };

  const linkedinAccount = platformAccounts.find(
    (a) => a.platform === "LINKEDIN"
  ) || { platform: "LINKEDIN", handle: "Not connected", connected: false };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile({ displayName, email, timezone });
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (onChangePassword) {
      onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  return (
    <div className="settings-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>Account Settings</h2>
          <p className="page-subtitle">
            Manage your operator profile, timezone preferences, password
            credentials, theme appearance, and connected social accounts.
          </p>
        </div>
      </div>

      <div className="composer-workspace-grid" style={{ marginBottom: "20px" }}>
        {/* Profile & Timezone Form */}
        <form className="card-panel" onSubmit={handleSaveProfile}>
          <div className="card-header-bar">
            <h3>Profile Information</h3>
            <span className="status-tag status-published">
              {userProfile?.role || "ROLE_ADMIN"}
            </span>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label className="form-label" htmlFor="settings-display-name">
              Display Name
            </label>
            <input
              id="settings-display-name"
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label className="form-label" htmlFor="settings-email">
              Email Address
            </label>
            <input
              id="settings-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="form-label" htmlFor="settings-timezone">
              Publishing Timezone
            </label>
            <select
              id="settings-timezone"
              className="select-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC-08:00 (Pacific Time)">
                UTC-08:00 (Pacific Time)
              </option>
              <option value="UTC-05:00 (Eastern Time)">
                UTC-05:00 (Eastern Time)
              </option>
              <option value="UTC+00:00 (GMT / London)">
                UTC+00:00 (GMT / London)
              </option>
              <option value="UTC+01:00 (Central European Time)">
                UTC+01:00 (Central European Time)
              </option>
              <option value="UTC+05:30 (India Standard Time)">
                UTC+05:30 (India Standard Time)
              </option>
            </select>
          </div>

          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </form>

        {/* Security & Password Change + Theme Preference */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <form className="card-panel" onSubmit={handlePasswordSubmit}>
            <div className="card-header-bar">
              <h3>Security & Password</h3>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label className="form-label" htmlFor="current-password">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label className="form-label" htmlFor="new-password">
                New Password (min 6 chars)
              </label>
              <input
                id="new-password"
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-secondary">
              Update Password
            </button>
          </form>

          {/* Appearance & Session */}
          <div className="card-panel">
            <div className="card-header-bar">
              <h3>Interface & Session</h3>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                  Theme Preference
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Current mode: {theme === "dark" ? "Dark Slate" : "High-Craft Light"}
                </div>
              </div>
              {onToggleTheme && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={onToggleTheme}
                >
                  Toggle {theme === "dark" ? "Light" : "Dark"} Mode
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border-hairline)",
              }}
            >
              {onOpenAuthModal && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={onOpenAuthModal}
                >
                  Switch Account / Login
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={onLogout}
                >
                  Log Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Quick Section */}
      <div className="card-panel">
        <div className="card-header-bar">
          <h3>Connected Accounts</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[instagramAccount, linkedinAccount].map((acc) => (
            <div
              key={acc.platform}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-hairline)",
                background: "var(--bg-subtle)",
              }}
            >
              <div>
                <strong style={{ color: "var(--text-primary)" }}>
                  {acc.platform === "INSTAGRAM" ? "📸 Instagram" : "💼 LinkedIn"}
                </strong>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {acc.connected ? `Connected as ${acc.handle}` : "Not connected"}
                </div>
              </div>
              {onTogglePlatformConnection && (
                <button
                  type="button"
                  className={
                    acc.connected ? "btn-danger btn-sm" : "btn-primary btn-sm"
                  }
                  onClick={() =>
                    onTogglePlatformConnection(acc.platform, acc.connected)
                  }
                >
                  {acc.connected ? "Disconnect" : "Connect"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Settings);
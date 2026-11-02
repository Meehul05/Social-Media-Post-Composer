import React, { useState } from "react";

const TAB_TITLES = {
  overview: { section: "Workspace", title: "Dashboard Overview" },
  compose: { section: "Workspace", title: "Create Post" },
  drafts: { section: "Publishing", title: "Saved Drafts" },
  scheduled: { section: "Publishing", title: "Scheduled Posts" },
  calendar: { section: "Publishing", title: "Publishing Calendar" },
  published: { section: "Publishing", title: "Published Posts" },
  analytics: { section: "Insights", title: "Performance Analytics" },
  integrations: { section: "Configuration", title: "Platform Integrations" },
  settings: { section: "Configuration", title: "Account Settings" },
};

function Header({
  activeTab,
  setActiveTab,
  userProfile,
  isAuthenticated = true,
  theme = "light",
  onToggleTheme,
  searchQuery = "",
  onSearchChange,
  notifications = [],
  onOpenAuthModal,
  onLogout,
  onToggleMobileMenu,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const meta = TAB_TITLES[activeTab] || {
    section: "Workspace",
    title: "PostComposer",
  };

  const displayName = userProfile?.displayName || "Admin";
  const email = userProfile?.email || "admin@example.com";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="top-header">
      <div className="header-left">
        {onToggleMobileMenu && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        )}

        <div className="breadcrumb-bar" aria-label="Breadcrumb">
          <span className="breadcrumb-root">{meta.section}</span>
          <span className="breadcrumb-sep">/</span>
          <h2 className="header-title">{meta.title}</h2>
        </div>
      </div>

      <div className="header-actions">
        {onSearchChange && (
          <div className="header-search-wrap">
            <span className="header-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              className="header-search-input"
              placeholder="Search posts, drafts, handles..."
              aria-label="Global search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <span>{theme === "dark" ? "☀ Light" : "☾ Dark"}</span>
        </button>

        {/* Notifications Popover */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
          >
            <span>Notifications</span>
            {notifications.length > 0 && <span className="notification-dot" />}
          </button>

          {notifOpen && (
            <div className="popover-dropdown" role="dialog" aria-label="Notifications list">
              <div className="popover-header">
                <h4>Recent Activity & Events</h4>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setNotifOpen(false)}
                >
                  Close
                </button>
              </div>
              {notifications.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  No recent notifications.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                  {notifications.slice(0, 6).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        fontSize: "12px",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-hairline)",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.action || item.title}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        {item.details || item.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Dropdown / Auth Controls */}
        {isAuthenticated ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="user-profile-trigger"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              aria-label="User account menu"
            >
              <span className="user-avatar-sm">{initials}</span>
              <span className="user-name-sm">{displayName}</span>
            </button>

            {profileOpen && (
              <div className="popover-dropdown" role="menu" aria-label="User profile dropdown">
                <div className="popover-header">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{email}</div>
                  </div>
                  <span className="status-tag status-published">Active</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {setActiveTab && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => {
                        setActiveTab("settings");
                        setProfileOpen(false);
                      }}
                    >
                      Account Settings
                    </button>
                  )}
                  {setActiveTab && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      style={{ justifyContent: "flex-start" }}
                      onClick={() => {
                        setActiveTab("integrations");
                        setProfileOpen(false);
                      }}
                    >
                      Connected Platforms
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onOpenAuthModal}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

export default React.memo(Header);
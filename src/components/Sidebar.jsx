import React from "react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "◈", group: "Workspace" },
  { id: "compose", label: "Create Post", icon: "✦", group: "Workspace" },
  { id: "drafts", label: "Drafts", icon: "▤", group: "Publishing", badgeKey: "drafts" },
  {
    id: "scheduled",
    label: "Scheduled Posts",
    ariaLabel: "Publishing Queue",
    icon: "◷",
    group: "Publishing",
    badgeKey: "scheduled",
  },
  { id: "calendar", label: "Calendar", icon: "▦", group: "Publishing" },
  {
    id: "published",
    label: "Published Posts",
    icon: "✓",
    group: "Publishing",
    badgeKey: "published",
  },
  { id: "analytics", label: "Analytics", icon: "◩", group: "Insights" },
  { id: "integrations", label: "Integrations", icon: "⇄", group: "Configuration" },
  { id: "settings", label: "Settings", icon: "⚙", group: "Configuration" },
];

function Sidebar({
  activeTab,
  setActiveTab,
  drafts = [],
  scheduledCount = 0,
  publishedCount = 0,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  renderSidebarContent,
}) {
  const counts = {
    drafts: drafts.length,
    scheduled: scheduledCount,
    published: publishedCount,
  };

  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`sidebar-vertical ${collapsed ? "collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
      aria-label="Primary Sidebar Navigation"
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-left">
          <div className="brand-icon" aria-hidden="true">
            PC
          </div>
          {!collapsed && (
            <div className="brand-title-wrap">
              <h1>PostComposer</h1>
              <p>Social Media Studio</p>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Main Menu">
        {NAV_ITEMS.map((item, idx) => {
          const prevGroup = idx > 0 ? NAV_ITEMS[idx - 1].group : null;
          const showGroupHeader = !collapsed && item.group !== prevGroup;
          const badgeVal = item.badgeKey ? counts[item.badgeKey] : 0;

          return (
            <React.Fragment key={item.id}>
              {showGroupHeader && (
                <div className="sidebar-section-label">{item.group}</div>
              )}
              <button
                type="button"
                aria-label={item.ariaLabel || item.label}
                aria-current={activeTab === item.id ? "page" : undefined}
                className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => handleSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="nav-label-text">{item.label}</span>
                    {badgeVal > 0 && (
                      <span className="nav-badge">{badgeVal}</span>
                    )}
                  </>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {!collapsed && renderSidebarContent && (
        <div className="sidebar-context-controls">{renderSidebarContent()}</div>
      )}
    </aside>
  );
}

export default React.memo(Sidebar);
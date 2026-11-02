import React from "react";

function Overview({
  analyticsData,
  timeSeriesData = [],
  drafts = [],
  scheduledPosts = [],
  publishedPosts = [],
  platformAccounts = [],
  setActiveTab,
}) {
  const publishedCount =
    publishedPosts.length || analyticsData?.totalPosts || 0;
  const scheduledCount = scheduledPosts.length;
  const draftCount = drafts.length;
  const totalPostsCount = publishedCount + scheduledCount + draftCount;

  const avgEngagement = analyticsData?.avgEngagement ?? "0.0%";
  const topPlatform = analyticsData?.topPlatform ?? "Instagram";
  const bestTime = analyticsData?.bestTimeToPost ?? "Tue & Thu, 10 AM";

  const maxBarPosts = Math.max(
    1,
    ...timeSeriesData.map((pt) => Number(pt.posts || 0))
  );

  return (
    <div className="overview-container">
      <div className="page-header-row">
        <div>
          <h2>Executive Publishing Overview</h2>
          <p className="page-subtitle">
            Real-time pipeline telemetry across drafts, scheduled queue, published
            dispatch, and platform engagement.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("calendar")}
          >
            View Calendar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setActiveTab("compose")}
          >
            + Create Post
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-label">Total Pipeline Posts</span>
          <span className="kpi-value">{totalPostsCount}</span>
          <span className="kpi-meta">Across all lifecycle stages</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Published Posts</span>
          <span className="kpi-value">{publishedCount}</span>
          <span className="kpi-meta">Dispatched to connected channels</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Scheduled Queue</span>
          <span className="kpi-value">{scheduledCount}</span>
          <span className="kpi-meta">Awaiting scheduled dispatch</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Saved Drafts</span>
          <span className="kpi-value">{draftCount}</span>
          <span className="kpi-meta">Work-in-progress items</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Engagement Rate</span>
          <span className="kpi-value">{avgEngagement}</span>
          <span className="kpi-meta">Best Platform: {topPlatform}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Optimal Window</span>
          <span className="kpi-value" style={{ fontSize: "17px" }}>
            {bestTime}
          </span>
          <span className="kpi-meta">Peak audience activity window</span>
        </div>
      </div>

      {/* Two-Column Activity & Performance Section */}
      <div className="composer-workspace-grid" style={{ marginBottom: "20px" }}>
        {/* Performance Chart Card */}
        <div className="card-panel">
          <div className="card-header-bar">
            <div>
              <h3>Publishing & Engagement Velocity</h3>
              <p className="page-subtitle">
                Daily post volume and simulated sandbox impressions from{" "}
                <code>/api/v1/analytics/time-series</code>
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setActiveTab("analytics")}
            >
              Explore Insights →
            </button>
          </div>

          {timeSeriesData.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              No time-series points recorded yet. Publish a post to populate
              telemetry.
            </p>
          ) : (
            <div className="bar-chart-grid" aria-label="Performance bar chart">
              {timeSeriesData.map((point) => {
                const heightPct = Math.max(
                  14,
                  Math.round(((point.posts || 0) / maxBarPosts) * 100)
                );
                return (
                  <div key={point.date} className="bar-column-item">
                    <span
                      className="tabular-nums"
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      {point.posts}
                    </span>
                    <div
                      className="bar-fill-rect"
                      style={{ height: `${heightPct}%` }}
                      title={`${point.date}: ${point.posts} posts (${point.engagementRate}% engagement)`}
                    />
                    <span className="bar-label-bottom">
                      {point.date ? point.date.slice(5) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Connected Channels & Quick Status */}
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Channel Readiness</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setActiveTab("integrations")}
            >
              Manage
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {platformAccounts.map((acc) => (
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
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                    {acc.platform}
                  </div>
                  <div className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {acc.handle || "Not connected"}
                  </div>
                </div>
                <span
                  className={`status-tag ${
                    acc.connected ? "status-connected" : "status-disconnected"
                  }`}
                >
                  {acc.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Posts & Recent Publishing Activity */}
      <div className="composer-workspace-grid">
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Upcoming Scheduled Posts</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setActiveTab("scheduled")}
            >
              View Queue ({scheduledPosts.length})
            </button>
          </div>

          {scheduledPosts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              No upcoming scheduled posts. Schedule content from the composer.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {scheduledPosts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "6px",
                    background: "var(--bg-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px" }}>
                      {item.instagram && (
                        <span className="platform-chip ig">Instagram</span>
                      )}
                      {item.linkedin && (
                        <span className="platform-chip li">LinkedIn</span>
                      )}
                    </div>
                    <span className="tabular-nums" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {item.date} {item.time}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                    {item.post?.slice(0, 110)}
                    {item.post?.length > 110 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Recent Publishing Activity</h3>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setActiveTab("published")}
            >
              History ({publishedPosts.length})
            </button>
          </div>

          {publishedPosts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              No published posts recorded yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {publishedPosts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "6px",
                    background: "var(--bg-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px" }}>
                      {item.instagram && (
                        <span className="platform-chip ig">Instagram</span>
                      )}
                      {item.linkedin && (
                        <span className="platform-chip li">LinkedIn</span>
                      )}
                    </div>
                    <span className="status-tag status-published">
                      {item.status || "PUBLISHED"}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                    {item.post?.slice(0, 110)}
                    {item.post?.length > 110 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Overview);

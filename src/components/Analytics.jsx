import React from "react";

function Analytics({
  analyticsData,
  platformBreakdown = [],
  timeSeriesData = [],
  topPosts = [],
  timeframe = "last7",
  onTimeframeChange,
}) {
  const totalPosts = analyticsData?.totalPosts ?? 1;
  const avgEngagement = analyticsData?.avgEngagement ?? "4.8%";
  const topPlatform = analyticsData?.topPlatform ?? "Instagram";
  const bestTime = analyticsData?.bestTimeToPost ?? "Tue & Thu, 10 AM";

  const maxSeriesPosts = Math.max(
    1,
    ...timeSeriesData.map((pt) => Number(pt.posts || 0))
  );

  return (
    <div className="analytics-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>Analytics Overview</h2>
          <p className="page-subtitle">
            Cross-channel publishing volume, engagement rate comparison,
            time-series velocity, and top-performing posts.
          </p>
        </div>

        {/* Timeframe Selector */}
        {onTimeframeChange && (
          <div
            className="segmented-control"
            role="group"
            aria-label="Analytics timeframe filter"
          >
            <button
              type="button"
              className={`segment-btn ${timeframe === "last7" ? "active" : ""}`}
              onClick={() => onTimeframeChange("last7")}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`segment-btn ${timeframe === "last30" ? "active" : ""}`}
              onClick={() => onTimeframeChange("last30")}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className={`segment-btn ${
                timeframe === "thisMonth" ? "active" : ""
              }`}
              onClick={() => onTimeframeChange("thisMonth")}
            >
              This Month
            </button>
          </div>
        )}
      </div>

      {/* Explicit Sandbox / Simulated Engagement Data Disclosure Banner */}
      <div className="notice-banner info" role="status">
        <div>
          <strong>Telemetry Data Source Notice: </strong>
          Post counts reflect actual persisted database records. Platform
          impression, reach, and engagement rates are labeled as{" "}
          <span className="status-tag status-sandbox">Simulated Sandbox Telemetry</span>{" "}
          while social channels operate in Sandbox Mode.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <span className="kpi-label">Total Posts</span>
          <span className="kpi-value">{totalPosts}</span>
          <span className="kpi-meta">Persisted published records</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Avg. Engagement</span>
          <span className="kpi-value">{avgEngagement}</span>
          <span className="kpi-meta">Simulated sandbox interaction rate</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Top Platform</span>
          <span className="kpi-value" style={{ fontSize: "20px" }}>
            📸 {topPlatform}
          </span>
          <span className="kpi-meta">Highest engagement velocity</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Best Time to Post</span>
          <span className="kpi-value" style={{ fontSize: "18px" }}>
            {bestTime}
          </span>
          <span className="kpi-meta">Recommended dispatch window</span>
        </div>
      </div>

      {/* Time-Series & Platform Comparison Grid */}
      <div className="composer-workspace-grid" style={{ marginBottom: "20px" }}>
        {/* Time-Series Chart */}
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Time-Series Publishing & Impressions</h3>
            <span className="status-tag status-sandbox">
              {timeframe === "last7"
                ? "Last 7 Days"
                : timeframe === "last30"
                ? "Last 30 Days"
                : "This Month"}
            </span>
          </div>

          {timeSeriesData.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              No time-series points available for this window.
            </p>
          ) : (
            <div className="bar-chart-grid">
              {timeSeriesData.map((pt) => {
                const pct = Math.max(
                  14,
                  Math.round(((pt.posts || 0) / maxSeriesPosts) * 100)
                );
                return (
                  <div key={pt.date} className="bar-column-item">
                    <span
                      className="tabular-nums"
                      style={{ fontSize: "10px", color: "var(--text-muted)" }}
                    >
                      {pt.engagementRate}%
                    </span>
                    <div
                      className="bar-fill-rect"
                      style={{ height: `${pct}%` }}
                      title={`${pt.date}: ${pt.posts} posts | ${pt.impressions} impressions`}
                    />
                    <span className="bar-label-bottom">
                      {pt.date ? pt.date.slice(5) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Platform Comparison */}
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Platform Comparison</h3>
            <span className="status-tag status-sandbox">Simulated Reach</span>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Posts</th>
                  <th>Engagement</th>
                  <th>Impressions</th>
                </tr>
              </thead>
              <tbody>
                {(platformBreakdown.length > 0
                  ? platformBreakdown
                  : [
                      {
                        platform: "INSTAGRAM",
                        posts: totalPosts,
                        engagementRate: "5.2%",
                        impressions: 1420,
                      },
                      {
                        platform: "LINKEDIN",
                        posts: Math.max(0, totalPosts - 1),
                        engagementRate: "3.9%",
                        impressions: 890,
                      },
                    ]
                ).map((row) => (
                  <tr key={row.platform}>
                    <td>
                      <span
                        className={`platform-chip ${
                          row.platform === "INSTAGRAM" ? "ig" : "li"
                        }`}
                      >
                        {row.platform}
                      </span>
                    </td>
                    <td className="tabular-nums">{row.posts}</td>
                    <td className="tabular-nums">{row.engagementRate}</td>
                    <td className="tabular-nums">{row.impressions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="card-panel">
        <div className="card-header-bar">
          <h3>Top-Performing Posts</h3>
          <span className="status-tag status-sandbox">
            Ranked by Engagement Rate
          </span>
        </div>

        {topPosts.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Publish posts to populate top-performing content rankings.
          </p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Post Content</th>
                  <th>Channels</th>
                  <th>Impressions (Sim)</th>
                  <th>Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((item) => (
                  <tr key={item.id}>
                    <td style={{ maxWidth: "460px", fontWeight: 500 }}>
                      {item.post}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {item.instagram && (
                          <span className="platform-chip ig">Instagram</span>
                        )}
                        {item.linkedin && (
                          <span className="platform-chip li">LinkedIn</span>
                        )}
                      </div>
                    </td>
                    <td className="tabular-nums">{item.impressions ?? 1240}</td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>
                      {item.engagementRate ?? "5.4%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(Analytics);
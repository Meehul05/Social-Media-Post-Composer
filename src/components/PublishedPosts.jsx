import React, { useState, useMemo } from "react";

function PublishedPosts({ publishedPosts = [], setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [previewPost, setPreviewPost] = useState(null);

  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (p.post || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform =
        platformFilter === "ALL" ||
        (platformFilter === "INSTAGRAM" && p.instagram) ||
        (platformFilter === "LINKEDIN" && p.linkedin);
      return matchesSearch && matchesPlatform;
    });
  }, [publishedPosts, searchTerm, platformFilter]);

  return (
    <div className="published-posts-view">
      <div className="page-header-row">
        <div>
          <h2>Published Posts ({publishedPosts.length})</h2>
          <p className="page-subtitle">
            Complete audit history of published dispatches, platform delivery
            confirmations, and sandbox transaction identifiers.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setActiveTab("compose")}
        >
          + Publish New Post
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card-panel" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            className="form-input"
            style={{ maxWidth: "340px" }}
            placeholder="Search published history..."
            aria-label="Search published posts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="segmented-control" role="group" aria-label="Filter published by platform">
            {["ALL", "INSTAGRAM", "LINKEDIN"].map((pf) => (
              <button
                key={pf}
                type="button"
                className={`segment-btn ${platformFilter === pf ? "active" : ""}`}
                onClick={() => setPlatformFilter(pf)}
              >
                {pf === "ALL" ? "All Channels" : pf === "INSTAGRAM" ? "Instagram" : "LinkedIn"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Published History Table */}
      <div className="card-panel">
        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "12px" }}>
              No published posts match your filter.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab("compose")}
            >
              Publish a Post
            </button>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Platforms</th>
                  <th>Post Content</th>
                  <th>Publication Date</th>
                  <th>External Platform IDs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((item) => {
                  const status = item.status || "PUBLISHED";
                  const isFailed = status === "FAILED";
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          className={`status-tag ${
                            isFailed ? "status-failed" : "status-published"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {item.instagram && (
                            <span className="platform-chip ig">Instagram</span>
                          )}
                          {item.linkedin && (
                            <span className="platform-chip li">LinkedIn</span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: "380px" }}>
                        <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {item.post}
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {item.publishedAt || item.timestamp
                          ? new Date(
                              item.publishedAt || item.timestamp
                            ).toLocaleString()
                          : item.date || "Published"}
                      </td>
                      <td className="tabular-nums" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {item.externalInstagramId && (
                          <div>IG: {item.externalInstagramId}</div>
                        )}
                        {item.externalLinkedinId && (
                          <div>LI: {item.externalLinkedinId}</div>
                        )}
                        {!item.externalInstagramId && !item.externalLinkedinId && (
                          <span>sandbox_ack_{item.id}</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setPreviewPost(item)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Published Post Modal */}
      {previewPost && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Published Post Details"
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Published Dispatch Details</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPreviewPost(null)}
              >
                ✕
              </button>
            </div>

            <div className="preview-feed-card" style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  {previewPost.instagram && (
                    <span className="platform-chip ig">Instagram</span>
                  )}
                  {previewPost.linkedin && (
                    <span className="platform-chip li">LinkedIn</span>
                  )}
                </div>
                <span className="status-tag status-published">
                  {previewPost.status || "PUBLISHED"}
                </span>
              </div>
              <div className="preview-body-copy">{previewPost.post}</div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              <div>
                <strong>Published At:</strong>{" "}
                <span className="tabular-nums">
                  {previewPost.publishedAt || previewPost.timestamp || "N/A"}
                </span>
              </div>
              {previewPost.externalInstagramId && (
                <div>
                  <strong>Instagram Dispatch ID:</strong>{" "}
                  <code>{previewPost.externalInstagramId}</code>
                </div>
              )}
              {previewPost.externalLinkedinId && (
                <div>
                  <strong>LinkedIn Dispatch ID:</strong>{" "}
                  <code>{previewPost.externalLinkedinId}</code>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setPreviewPost(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(PublishedPosts);

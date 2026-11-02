import React, { useState, useMemo } from "react";

function ScheduledPosts({
  scheduledPosts = [],
  onUpdateScheduledPost,
  onCancelScheduledPost,
  setActiveTab,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPost, setEditingPost] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const filteredPosts = useMemo(() => {
    return scheduledPosts.filter((p) => {
      if (!searchTerm.trim()) return true;
      return (p.post || "").toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [scheduledPosts, searchTerm]);

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingPost) return;
    if (onUpdateScheduledPost) {
      onUpdateScheduledPost(editingPost.id, {
        post: editingPost.post,
        instagram: editingPost.instagram,
        linkedin: editingPost.linkedin,
        date: editingPost.date,
        time: editingPost.time,
      });
    }
    setEditingPost(null);
  };

  return (
    <div className="scheduled-posts-view">
      <div className="page-header-row">
        <div>
          <h2>Scheduled Posts ({scheduledPosts.length})</h2>
          <p className="page-subtitle">
            Review queued social dispatches, adjust scheduled timestamps, or
            cancel pending jobs before execution.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("calendar")}
          >
            Monthly Grid
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setActiveTab("compose")}
          >
            + Schedule Post
          </button>
        </div>
      </div>

      <div className="card-panel" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <input
          type="search"
          className="form-input"
          style={{ maxWidth: "360px" }}
          placeholder="Search scheduled posts..."
          aria-label="Search scheduled posts"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="card-panel">
        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "12px" }}>
              No scheduled posts in the queue.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab("compose")}
            >
              Schedule Your First Post
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
                  <th>Scheduled Date & Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="status-tag status-scheduled">
                        {item.status || "SCHEDULED"}
                      </span>
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
                    <td style={{ maxWidth: "420px" }}>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {item.post}
                      </div>
                    </td>
                    <td className="tabular-nums" style={{ fontSize: "12px" }}>
                      <strong>{item.date}</strong> at {item.time || "10:00"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setEditingPost({ ...item })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => setConfirmCancelId(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Scheduled Post Modal */}
      {editingPost && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Scheduled Post"
        >
          <form className="modal-card" onSubmit={handleSaveEdit}>
            <div className="modal-header">
              <h3>Edit Scheduled Post</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setEditingPost(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Post Content</label>
              <textarea
                className="textarea-field"
                rows={4}
                value={editingPost.post}
                onChange={(e) =>
                  setEditingPost((prev) => ({ ...prev, post: e.target.value }))
                }
                required
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={editingPost.date || ""}
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, date: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="form-label">Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={editingPost.time || "10:00"}
                  onChange={(e) =>
                    setEditingPost((prev) => ({ ...prev, time: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingPost(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Update Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel / Delete Confirmation Modal */}
      {confirmCancelId !== null && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Cancel Scheduled Post"
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Cancel Scheduled Post?</h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              This post will be removed from the publishing queue and will not
              be dispatched.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmCancelId(null)}
              >
                Keep Scheduled
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onCancelScheduledPost(confirmCancelId);
                  setConfirmCancelId(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ScheduledPosts);

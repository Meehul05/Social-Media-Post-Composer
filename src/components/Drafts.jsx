import React, { useState, useMemo } from "react";

function Drafts({
  drafts = [],
  loadDraft,
  deleteDraft,
  onUpdateDraft,
  setActiveTab,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [previewDraft, setPreviewDraft] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (d.post || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform =
        platformFilter === "ALL" ||
        (platformFilter === "INSTAGRAM" && d.instagram) ||
        (platformFilter === "LINKEDIN" && d.linkedin);
      return matchesSearch && matchesPlatform;
    });
  }, [drafts, searchTerm, platformFilter]);

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingDraft) return;
    if (onUpdateDraft) {
      onUpdateDraft(editingDraft.id, {
        post: editingDraft.post,
        instagramContent: editingDraft.instagramContent || "",
        linkedinContent: editingDraft.linkedinContent || "",
        instagram: editingDraft.instagram,
        linkedin: editingDraft.linkedin,
        date: editingDraft.date || "",
        time: editingDraft.time || "",
      });
    }
    setEditingDraft(null);
  };

  return (
    <div className="drafts-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>Saved Drafts ({drafts.length})</h2>
          <p className="page-subtitle">
            Manage work-in-progress posts, preview channel formatting, or load a
            draft directly into the composer.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setActiveTab("compose")}
        >
          + New Draft
        </button>
      </div>

      {/* Search & Platform Filter Bar */}
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
            placeholder="Search draft content..."
            aria-label="Search drafts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="segmented-control" role="group" aria-label="Filter drafts by platform">
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

      {/* Drafts List */}
      <div className="card-panel">
        {filteredDrafts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "12px" }}>
              {drafts.length === 0
                ? "No drafts saved yet. Start composing a post to save your first draft."
                : "No drafts match your current filter criteria."}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab("compose")}
            >
              Create Post
            </button>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Platforms</th>
                  <th>Draft Content</th>
                  <th>Target Schedule</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {draft.instagram && (
                          <span className="platform-chip ig">Instagram</span>
                        )}
                        {draft.linkedin && (
                          <span className="platform-chip li">LinkedIn</span>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: "420px" }}>
                      <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                        {draft.post}
                      </div>
                      {draft.hasImages && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          📷 Has media attachment
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {draft.date ? `${draft.date} ${draft.time || ""}` : "Unscheduled"}
                    </td>
                    <td className="tabular-nums" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {draft.timestamp
                        ? new Date(draft.timestamp).toLocaleDateString()
                        : "Just now"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => {
                            loadDraft(draft.id);
                            setActiveTab("compose");
                          }}
                        >
                          Use Draft
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setPreviewDraft(draft)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setEditingDraft({ ...draft })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => setConfirmDeleteId(draft.id)}
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

      {/* Preview Draft Modal */}
      {previewDraft && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Draft Preview">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Draft Preview</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPreviewDraft(null)}
              >
                ✕
              </button>
            </div>
            <div className="preview-feed-card">
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                {previewDraft.instagram && (
                  <span className="platform-chip ig">Instagram</span>
                )}
                {previewDraft.linkedin && (
                  <span className="platform-chip li">LinkedIn</span>
                )}
              </div>
              <div className="preview-body-copy">{previewDraft.post}</div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreviewDraft(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const id = previewDraft.id;
                  setPreviewDraft(null);
                  loadDraft(id);
                  setActiveTab("compose");
                }}
              >
                Open in Composer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Draft Modal */}
      {editingDraft && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit Draft">
          <form className="modal-card" onSubmit={handleSaveEdit}>
            <div className="modal-header">
              <h3>Edit Draft</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setEditingDraft(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Channels</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(editingDraft.instagram)}
                    onChange={(e) =>
                      setEditingDraft((prev) => ({
                        ...prev,
                        instagram: e.target.checked,
                      }))
                    }
                  />
                  Instagram
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(editingDraft.linkedin)}
                    onChange={(e) =>
                      setEditingDraft((prev) => ({
                        ...prev,
                        linkedin: e.target.checked,
                      }))
                    }
                  />
                  LinkedIn
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Post Content</label>
              <textarea
                className="textarea-field"
                rows={5}
                value={editingDraft.post}
                onChange={(e) =>
                  setEditingDraft((prev) => ({ ...prev, post: e.target.value }))
                }
                required
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingDraft(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {confirmDeleteId !== null && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete Draft"
        >
          <div className="modal-card">
            <div className="modal-header">
              <h3>Delete Draft?</h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Are you sure you want to permanently delete this draft from your
              workspace? This action cannot be undone.
            </p>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  deleteDraft(confirmDeleteId);
                  setConfirmDeleteId(null);
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

export default React.memo(Drafts);
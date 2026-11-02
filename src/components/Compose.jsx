import React, { useState } from "react";
import { apiClient } from "../services/api";

function Compose({
  instagram,
  setInstagram,
  linkedin,
  setLinkedin,
  post,
  setPost,
  instagramContent = "",
  setInstagramContent,
  linkedinContent = "",
  setLinkedinContent,
  images,
  handleImages,
  removeImage,
  date,
  setDate,
  time,
  setTime,
  saveDraft,
  schedulePost,
  publishPost,
  isLoading,
}) {
  const [editorMode, setEditorMode] = useState("shared");
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiNote, setAiNote] = useState("");

  // Effective platform content
  const effectiveIgText =
    instagramContent && instagramContent.trim() ? instagramContent : post;
  const effectiveLiText =
    linkedinContent && linkedinContent.trim() ? linkedinContent : post;

  const igLength = effectiveIgText.length;
  const liLength = effectiveLiText.length;

  const igOverChar = instagram && igLength > 2200;
  const igOverImg = instagram && images.length > 10;
  const liOverChar = linkedin && liLength > 3000;

  const partialSkipWarning =
    (instagram && linkedin && (igOverChar || igOverImg) && !liOverChar)
      ? "Instagram limits exceeded (2,200 chars / 10 images). Publishing will skip Instagram and continue with LinkedIn."
      : (instagram && linkedin && liOverChar && !igOverChar && !igOverImg)
      ? "LinkedIn 3,000 character limit exceeded. Publishing will skip LinkedIn and continue with Instagram."
      : null;

  const handleGenerateAiCaption = async () => {
    const seedPrompt = aiPrompt.trim() || post.trim() || "Product launch update";
    setIsGeneratingAi(true);
    setAiNote("");
    try {
      const res = await apiClient.generateAiCaption(
        seedPrompt,
        instagram || true,
        linkedin
      );
      if (res && res.caption) {
        if (editorMode === "instagram" && setInstagramContent) {
          setInstagramContent(res.caption);
        } else if (editorMode === "linkedin" && setLinkedinContent) {
          setLinkedinContent(res.caption);
        } else {
          setPost(res.caption);
        }
        setAiNote(`Generated via ${res.provider || "AI Assistant"}`);
      }
    } catch (err) {
      setAiNote(`AI generation error: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const activePreviewText =
    previewPlatform === "instagram" ? effectiveIgText : effectiveLiText;

  return (
    <div className="compose-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>Create & Schedule Post</h2>
          <p className="page-subtitle">
            Craft shared or channel-tailored copy with real-time character
            validation, media attachments, and AI caption assistance.
          </p>
        </div>
      </div>

      {/* Platform Partial-Skip or Limit Validation Warnings */}
      {(igOverChar || igOverImg || liOverChar) && (
        <div
          className={`notice-banner ${
            partialSkipWarning ? "warning" : "error"
          }`}
          role="alert"
        >
          <div>
            <strong>Platform Validation Notice: </strong>
            {partialSkipWarning ||
              (igOverChar && "Instagram content exceeds 2,200 characters. ") ||
              (igOverImg && "Instagram allows a maximum of 10 images. ") ||
              (liOverChar && "LinkedIn content exceeds 3,000 characters.")}
          </div>
        </div>
      )}

      <div className="composer-workspace-grid">
        {/* Left Column: Composer Card */}
        <div className="card-panel">
          {/* 1. Target Platforms */}
          <div style={{ marginBottom: "16px" }}>
            <label className="form-label">1. Select Target Channels</label>
            <div className="platform-selector-group">
              <button
                type="button"
                className={`platform-pill pill instagram ${
                  instagram ? "active" : ""
                }`}
                onClick={() => setInstagram(!instagram)}
                aria-pressed={instagram}
              >
                <span>📸 Instagram</span>
                <span className="tabular-nums" style={{ fontSize: "11px", opacity: 0.85 }}>
                  ({igLength}/2200)
                </span>
              </button>

              <button
                type="button"
                className={`platform-pill pill linkedin ${
                  linkedin ? "active" : ""
                }`}
                onClick={() => setLinkedin(!linkedin)}
                aria-pressed={linkedin}
              >
                <span>💼 LinkedIn</span>
                <span className="tabular-nums" style={{ fontSize: "11px", opacity: 0.85 }}>
                  ({liLength}/3000)
                </span>
              </button>
            </div>
          </div>

          {/* 2. Content Editor Mode Selector (Shared vs Platform-Specific) */}
          <div className="editor-tabs-bar">
            <label className="form-label" style={{ margin: 0 }}>
              2. Post Content
            </label>
            <div className="segmented-control" role="tablist" aria-label="Content editor mode">
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === "shared"}
                className={`segment-btn ${editorMode === "shared" ? "active" : ""}`}
                onClick={() => setEditorMode("shared")}
              >
                Shared Content
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === "instagram"}
                className={`segment-btn ${editorMode === "instagram" ? "active" : ""}`}
                onClick={() => setEditorMode("instagram")}
              >
                Instagram Custom {instagramContent ? "•" : ""}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === "linkedin"}
                className={`segment-btn ${editorMode === "linkedin" ? "active" : ""}`}
                onClick={() => setEditorMode("linkedin")}
              >
                LinkedIn Custom {linkedinContent ? "•" : ""}
              </button>
            </div>
          </div>

          {/* Shared Editor kept mounted or active for immediate editing */}
          {editorMode === "shared" && (
            <textarea
              className="textarea-field"
              rows={6}
              placeholder="What do you want to share with your audience?"
              value={post}
              onChange={(e) => setPost(e.target.value)}
            />
          )}

          {editorMode === "instagram" && (
            <div>
              <textarea
                className="textarea-field"
                rows={6}
                placeholder="Optional custom Instagram caption (falls back to shared content when empty)..."
                value={instagramContent}
                onChange={(e) =>
                  setInstagramContent && setInstagramContent(e.target.value)
                }
              />
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Leave blank to use shared post content automatically.
              </div>
            </div>
          )}

          {editorMode === "linkedin" && (
            <div>
              <textarea
                className="textarea-field"
                rows={6}
                placeholder="Optional custom LinkedIn post copy (falls back to shared content when empty)..."
                value={linkedinContent}
                onChange={(e) =>
                  setLinkedinContent && setLinkedinContent(e.target.value)
                }
              />
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                Leave blank to use shared post content automatically.
              </div>
            </div>
          )}

          {/* Character Counters Row */}
          <div className="char-limits-row">
            <span className={`limit-meter ${igOverChar ? "over-limit" : ""}`}>
              IG: {igLength} / 2,200 chars
            </span>
            <span className={`limit-meter ${liOverChar ? "over-limit" : ""}`}>
              LI: {liLength} / 3,000 chars
            </span>
            <span className={`limit-meter ${igOverImg ? "over-limit" : ""}`}>
              Media: {images.length} / 10 files
            </span>
          </div>

          {/* AI Caption Generator Bar */}
          <div className="ai-assistant-bar">
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: "180px" }}
              placeholder="Describe topic for AI caption generation..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              aria-label="AI caption topic prompt"
            />
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleGenerateAiCaption}
              disabled={isGeneratingAi}
            >
              {isGeneratingAi ? "Generating..." : "✨ Generate AI Caption"}
            </button>
            {aiNote && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)", width: "100%" }}>
                {aiNote}
              </span>
            )}
          </div>

          {/* 3. Media Upload */}
          <div style={{ marginTop: "14px" }}>
            <label className="form-label">3. Media Attachments (JPEG / PNG)</label>
            <label className="media-dropzone-label">
              <span>+ Upload images (up to 10 for Instagram)</span>
              <span className="tabular-nums" style={{ fontSize: "11px" }}>
                {images.length} selected
              </span>
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImages}
                style={{ display: "none" }}
                aria-label="Upload media files"
              />
            </label>

            {images.length > 0 && (
              <div className="image-preview-strip">
                {images.map((img, index) => {
                  const previewSrc =
                    typeof img === "string"
                      ? img
                      : typeof URL.createObjectURL === "function"
                      ? URL.createObjectURL(img)
                      : "";
                  return (
                    <div key={index} className="preview-thumb-card">
                      {previewSrc && (
                        <img src={previewSrc} alt={`Attachment ${index + 1}`} />
                      )}
                      <button
                        type="button"
                        className="remove-img-btn"
                        onClick={() => removeImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Schedule & Action Footer */}
          <div className="composer-footer-bar">
            <div className="schedule-inputs-group">
              <input
                type="date"
                className="form-input"
                style={{ width: "auto" }}
                aria-label="Schedule Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="form-input"
                style={{ width: "auto" }}
                aria-label="Schedule Time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <div className="action-buttons-group">
              <button
                type="button"
                className="btn-secondary"
                onClick={saveDraft}
                disabled={isLoading}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={schedulePost}
                disabled={isLoading}
              >
                📅 Schedule
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={publishPost}
                disabled={isLoading}
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Multi-Platform Preview */}
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>Live Channel Preview</h3>
            <div className="segmented-control" role="tablist" aria-label="Preview channel selector">
              <button
                type="button"
                role="tab"
                aria-selected={previewPlatform === "instagram"}
                className={`segment-btn ${
                  previewPlatform === "instagram" ? "active" : ""
                }`}
                onClick={() => setPreviewPlatform("instagram")}
              >
                Instagram
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewPlatform === "linkedin"}
                className={`segment-btn ${
                  previewPlatform === "linkedin" ? "active" : ""
                }`}
                onClick={() => setPreviewPlatform("linkedin")}
              >
                LinkedIn
              </button>
            </div>
          </div>

          <div className="preview-feed-card">
            <div className="preview-author-row">
              <div className="user-avatar-sm">PC</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                  {previewPlatform === "instagram"
                    ? "@yourhandle"
                    : "PostComposer Studio"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {previewPlatform === "instagram"
                    ? "Instagram Feed Preview"
                    : "LinkedIn Company Update"}
                </div>
              </div>
            </div>

            <div className="preview-body-copy">
              {activePreviewText || (
                <span style={{ color: "var(--text-muted)" }}>
                  Start typing your post to preview how it renders on{" "}
                  {previewPlatform === "instagram" ? "Instagram" : "LinkedIn"}...
                </span>
              )}
            </div>

            {images.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "var(--bg-elevated)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                📷 {images.length} media attachment(s) ready
              </div>
            )}

            <div
              style={{
                marginTop: "14px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border-hairline)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span>
                {instagram || linkedin
                  ? `Active: ${[
                      instagram ? "Instagram" : null,
                      linkedin ? "LinkedIn" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}`
                  : "No channel selected"}
              </span>
              <span className="tabular-nums">
                {date && time ? `Scheduled: ${date} ${time}` : "Immediate dispatch"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Compose);

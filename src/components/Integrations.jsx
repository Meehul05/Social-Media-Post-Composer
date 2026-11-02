import React, { useState } from "react";

function Integrations({
  platformAccounts = [],
  onConnectPlatform,
  onDisconnectPlatform,
}) {
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [customHandle, setCustomHandle] = useState("");

  const instagramAccount = platformAccounts.find(
    (a) => a.platform === "INSTAGRAM"
  ) || {
    platform: "INSTAGRAM",
    handle: "@yourhandle",
    connected: true,
  };

  const linkedinAccount = platformAccounts.find(
    (a) => a.platform === "LINKEDIN"
  ) || {
    platform: "LINKEDIN",
    handle: "Not connected",
    connected: false,
  };

  const openConnectDialog = (platform) => {
    setConnectingPlatform(platform);
    setCustomHandle(
      platform === "INSTAGRAM" ? "@studio_brand" : "PostComposer Enterprise"
    );
  };

  const handleConfirmConnect = (e) => {
    e.preventDefault();
    if (!connectingPlatform) return;
    onConnectPlatform(connectingPlatform, customHandle.trim());
    setConnectingPlatform(null);
  };

  const cards = [
    {
      platform: "INSTAGRAM",
      title: "Instagram Business Graph API",
      description:
        "Publish single-image and carousel posts up to 10 images with 2,200 character captions.",
      account: instagramAccount,
      badgeClass: "ig",
    },
    {
      platform: "LINKEDIN",
      title: "LinkedIn Marketing Developer Platform",
      description:
        "Publish professional company updates and articles up to 3,000 characters.",
      account: linkedinAccount,
      badgeClass: "li",
    },
  ];

  return (
    <div className="integrations-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>Social Platform Integrations</h2>
          <p className="page-subtitle">
            Configure OAuth channel bindings for Instagram and LinkedIn. Access
            and refresh tokens are encrypted at rest via AES-256-GCM and never
            exposed to the browser.
          </p>
        </div>
        <span className="status-tag status-sandbox">
          Sandbox Mode Active
        </span>
      </div>

      <div className="notice-banner warning" role="status">
        <div>
          <strong>Sandbox Execution Mode: </strong>
          Platform adapters are currently operating in deterministic Sandbox
          Mode (`SOCIAL_SANDBOX_MODE=true`). Dispatches validate all platform
          constraints and record simulated delivery receipts without requiring
          external live OAuth secrets.
        </div>
      </div>

      <div className="composer-workspace-grid">
        {cards.map(({ platform, title, description, account, badgeClass }) => (
          <div key={platform} className="card-panel">
            <div className="card-header-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={`platform-chip ${badgeClass}`}>{platform}</span>
                <h3>{title}</h3>
              </div>
              <span
                className={`status-tag ${
                  account.connected ? "status-connected" : "status-disconnected"
                }`}
              >
                {account.connected ? "Connected" : "Disconnected"}
              </span>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              {description}
            </p>

            <div
              style={{
                padding: "12px",
                borderRadius: "6px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-hairline)",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Account Handle
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}
                >
                  {account.connected ? account.handle : "Not connected"}
                </div>
              </div>
              <div>
                <span className="status-tag status-sandbox">
                  AES-GCM Vault
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              {account.connected ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => onDisconnectPlatform(platform)}
                >
                  Disconnect {platform === "INSTAGRAM" ? "Instagram" : "LinkedIn"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => openConnectDialog(platform)}
                >
                  Connect {platform === "INSTAGRAM" ? "Instagram" : "LinkedIn"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connect Platform Authorization Modal */}
      {connectingPlatform && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Connect ${connectingPlatform}`}
        >
          <form className="modal-card" onSubmit={handleConfirmConnect}>
            <div className="modal-header">
              <h3>Authorize {connectingPlatform} Account</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConnectingPlatform(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px" }}>
              Enter the account handle to bind in Sandbox Mode. OAuth tokens are
              generated and encrypted server-side.
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">Account Handle / Organization Name</label>
              <input
                type="text"
                className="form-input"
                value={customHandle}
                onChange={(e) => setCustomHandle(e.target.value)}
                required
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConnectingPlatform(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Authorize & Connect
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default React.memo(Integrations);

import React, { useState, useMemo } from "react";

function Calendar({
  monthName,
  currentYear,
  currentMonth = 0,
  days,
  selectedDate,
  setSelectedDate,
  getPostsForDate,
  onMovePost,
  onPrevMonth,
  onNextMonth,
  onUpdateScheduledPost,
  onCancelScheduledPost,
}) {
  const [viewMode, setViewMode] = useState("month");
  const [editingPost, setEditingPost] = useState(null);

  const formatDateStr = (day) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

  // Compute weekly slice when viewMode === "week"
  const displayedDays = useMemo(() => {
    if (viewMode === "month") return days;
    const nonNullDays = days.filter((d) => d !== null);
    return nonNullDays.slice(0, 7);
  }, [days, viewMode]);

  const handleDragStart = (e, postId) => {
    e.dataTransfer.setData("text/plain", postId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetDay) => {
    e.preventDefault();
    if (!targetDay) return;
    const postIdStr = e.dataTransfer.getData("text/plain");
    if (!postIdStr) return;

    const postId = Number(postIdStr);
    const newDateStr = formatDateStr(targetDay);
    onMovePost(postId, newDateStr);
    setSelectedDate(targetDay);
  };

  const selectedDateStr = selectedDate ? formatDateStr(selectedDate) : null;
  const selectedDayPosts = selectedDateStr
    ? getPostsForDate(selectedDateStr)
    : [];

  return (
    <div className="calendar-view-wrapper">
      <div className="page-header-row">
        <div>
          <h2>
            {monthName} {currentYear}
          </h2>
          <p className="page-subtitle">
            Drag and drop scheduled posts across dates to reschedule while
            preserving time of day.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="segmented-control" role="group" aria-label="Calendar view mode">
            <button
              type="button"
              className={`segment-btn ${viewMode === "month" ? "active" : ""}`}
              onClick={() => setViewMode("month")}
            >
              Monthly View
            </button>
            <button
              type="button"
              className={`segment-btn ${viewMode === "week" ? "active" : ""}`}
              onClick={() => setViewMode("week")}
            >
              Weekly View
            </button>
          </div>

          {onPrevMonth && onNextMonth && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onPrevMonth}
                aria-label="Previous Month"
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onNextMonth}
                aria-label="Next Month"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="calendar-layout-grid">
        {/* Calendar Grid Card */}
        <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="calendar-weekdays-header">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="weekday-cell">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-days-matrix">
            {displayedDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="calendar-day-cell empty"
                  />
                );
              }

              const dateStr = formatDateStr(day);
              const postsForDay = getPostsForDate(dateStr);

              return (
                <div
                  key={day}
                  className={`calendar-day-cell ${
                    selectedDate === day ? "selected" : ""
                  }`}
                  onClick={() => setSelectedDate(day)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  data-testid={`calendar-day-${day}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="day-number-label">{day}</span>
                    {postsForDay.length > 0 && (
                      <span className="nav-badge">{postsForDay.length}</span>
                    )}
                  </div>

                  {postsForDay.map((p) => (
                    <div
                      key={p.id}
                      className="calendar-event-pill"
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(day);
                      }}
                      title={`${p.time || "10:00"} — ${p.post}`}
                    >
                      {p.instagram ? "📸 " : ""}
                      {p.linkedin ? "💼 " : ""}
                      {p.time ? `${p.time} ` : ""}
                      {p.post.slice(0, 18)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Inspector Panel */}
        <div className="card-panel">
          <div className="card-header-bar">
            <h3>
              {selectedDate
                ? `${monthName} ${selectedDate}, ${currentYear}`
                : "Select a Date"}
            </h3>
          </div>

          {!selectedDate ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Click any date cell in the calendar to inspect, preview, edit, or
              remove scheduled posts.
            </p>
          ) : selectedDayPosts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              No posts scheduled for {selectedDateStr}. Drag an existing post
              onto this date to reschedule it.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {selectedDayPosts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-hairline)",
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
                      {p.instagram && (
                        <span className="platform-chip ig">Instagram</span>
                      )}
                      {p.linkedin && (
                        <span className="platform-chip li">LinkedIn</span>
                      )}
                    </div>
                    <span className="tabular-nums" style={{ fontSize: "12px", fontWeight: 600 }}>
                      {p.time ||
                        (p.scheduledAt && p.scheduledAt.includes("T")
                          ? p.scheduledAt.split("T")[1].slice(0, 5)
                          : "10:00")}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      margin: "6px 0 10px",
                    }}
                  >
                    {p.post}
                  </p>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {onUpdateScheduledPost && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setEditingPost({ ...p })}
                      >
                        Edit
                      </button>
                    )}
                    {onCancelScheduledPost && (
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => onCancelScheduledPost(p.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline Edit Modal from Calendar */}
      {editingPost && onUpdateScheduledPost && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Scheduled Post from Calendar"
        >
          <form
            className="modal-card"
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateScheduledPost(editingPost.id, {
                post: editingPost.post,
                instagram: editingPost.instagram,
                linkedin: editingPost.linkedin,
                date: editingPost.date,
                time: editingPost.time,
              });
              setEditingPost(null);
            }}
          >
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
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingPost(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default React.memo(Calendar);
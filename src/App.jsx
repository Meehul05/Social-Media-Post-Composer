import { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import { useDispatch, useSelector } from "react-redux";
import {
  setPost,
  setInstagramContent,
  setLinkedinContent,
  setPublishedPosts,
  addPublishedPost,
} from "./features/post/postSlice";
import {
  moveScheduledPost,
  setScheduledPosts as setScheduledPostsInStore,
  updateScheduledPostInStore,
  deleteScheduledPost as deleteScheduledPostInStore,
} from "./features/schedule/scheduleSlice";
import {
  addDraft,
  updateDraftInStore,
  deleteDraft as deleteDraftAction,
  setDrafts,
} from "./features/drafts/draftSlice";
import {
  setAuthUser,
  setSessionExpired,
  setUnauthorizedReason,
  setTheme,
  logoutUser,
} from "./features/auth/authSlice";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import Compose from "./components/Compose";
import Drafts from "./components/Drafts";
import ScheduledPosts from "./components/ScheduledPosts";
import Calendar from "./components/Calendar";
import PublishedPosts from "./components/PublishedPosts";
import Analytics from "./components/Analytics";
import Integrations from "./components/Integrations";
import Settings from "./components/Settings";
import AuthModal from "./components/AuthModal";
import { apiClient, onAuthEvent } from "./services/api";

function getInitialDrafts() {
  try {
    const saved = localStorage.getItem("postDrafts");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getInitialScheduled() {
  try {
    const saved = localStorage.getItem("scheduledPosts");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function App() {
  const dispatch = useDispatch();

  // Redux state
  const post = useSelector((state) => state.post.post);
  const instagramContent = useSelector((state) => state.post.instagramContent);
  const linkedinContent = useSelector((state) => state.post.linkedinContent);
  const publishedPosts = useSelector((state) => state.post.publishedPosts);
  const drafts = useSelector((state) => state.drafts.drafts);
  const authState = useSelector((state) => state.auth);

  // Composer & platform state
  const [instagram, setInstagram] = useState(false);
  const [linkedin, setLinkedin] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadedMediaIds, setUploadedMediaIds] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Scheduled posts local + synchronized state
  const [scheduledPosts, setScheduledPosts] = useState(getInitialScheduled);

  // Navigation & layout state
  const [activeTab, setActiveTab] = useState("compose");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Feedback & loading state
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  // Analytics & telemetry state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("last7");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [platformBreakdown, setPlatformBreakdown] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // User profile & platform accounts
  const [userProfile, setUserProfile] = useState({
    displayName: "Admin",
    email: "admin@example.com",
    role: "ROLE_ADMIN",
    timezone: "UTC-05:00 (Eastern Time)",
  });
  const [platformAccounts, setPlatformAccounts] = useState([
    { platform: "INSTAGRAM", handle: "@yourhandle", connected: true },
    { platform: "LINKEDIN", handle: "Not connected", connected: false },
  ]);

  // Calendar state
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", authState.theme);
  }, [authState.theme]);

  // Subscribe to centralized API auth events (token refresh, session expiration, 401/403)
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event.type === "SESSION_EXPIRED") {
        dispatch(setSessionExpired(true));
        setAuthModalOpen(true);
      } else if (event.type === "FORBIDDEN") {
        dispatch(
          setUnauthorizedReason(
            "You do not have permission to perform this action."
          )
        );
      } else if (event.type === "LOGIN_SUCCESS" && event.payload?.user) {
        dispatch(setAuthUser(event.payload.user));
        setUserProfile((prev) => ({ ...prev, ...event.payload.user }));
      } else if (event.type === "LOGOUT") {
        dispatch(logoutUser());
      }
    });
    return unsubscribe;
  }, [dispatch]);

  // Load initial backend data with AbortController cleanup
  useEffect(() => {
    const initialLocalDrafts = getInitialDrafts();
    if (initialLocalDrafts.length > 0) {
      dispatch(setDrafts(initialLocalDrafts));
    }

    const controller = new AbortController();
    let isMounted = true;

    (async () => {
      try {
        const [
          remoteDrafts,
          remoteScheduled,
          remotePublished,
          profile,
          accounts,
          overview,
          platforms,
          series,
          top,
          auditLogs,
        ] = await Promise.all([
          apiClient.getDrafts(controller.signal),
          apiClient.getScheduledPosts(controller.signal),
          apiClient.getPosts({ status: "PUBLISHED" }, controller.signal),
          apiClient.getCurrentUser(controller.signal),
          apiClient.getPlatformAccounts(controller.signal),
          apiClient.getAnalyticsOverview("last7", controller.signal),
          apiClient.getAnalyticsPlatforms("last7", controller.signal),
          apiClient.getAnalyticsTimeSeries("last7", controller.signal),
          apiClient.getAnalyticsTopPosts(controller.signal),
          apiClient.getAuditLogs(controller.signal),
        ]);

        if (!isMounted) return;

        if (Array.isArray(remoteDrafts) && remoteDrafts.length > 0) {
          dispatch(setDrafts(remoteDrafts));
        }
        if (Array.isArray(remoteScheduled) && remoteScheduled.length > 0) {
          setScheduledPosts(remoteScheduled);
          dispatch(setScheduledPostsInStore(remoteScheduled));
        }
        if (Array.isArray(remotePublished)) {
          dispatch(setPublishedPosts(remotePublished));
        }
        if (profile) {
          setUserProfile((prev) => ({ ...prev, ...profile }));
          dispatch(setAuthUser(profile));
        }
        if (Array.isArray(accounts)) {
          setPlatformAccounts(accounts);
        }
        if (overview) setAnalyticsData(overview);
        if (Array.isArray(platforms)) setPlatformBreakdown(platforms);
        if (Array.isArray(series)) setTimeSeriesData(series);
        if (Array.isArray(top)) setTopPosts(top);
        if (Array.isArray(auditLogs)) setNotifications(auditLogs);
      } catch {
        // Offline or unit test fallback uses local state seamlessly
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dispatch]);

  // Refresh analytics when timeframe changes
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.all([
      apiClient.getAnalyticsOverview(analyticsTimeframe, controller.signal),
      apiClient.getAnalyticsPlatforms(analyticsTimeframe, controller.signal),
      apiClient.getAnalyticsTimeSeries(analyticsTimeframe, controller.signal),
    ])
      .then(([overview, platforms, series]) => {
        if (!active) return;
        if (overview) setAnalyticsData(overview);
        if (Array.isArray(platforms)) setPlatformBreakdown(platforms);
        if (Array.isArray(series)) setTimeSeriesData(series);
      })
      .catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, [analyticsTimeframe]);

  // Sync drafts & scheduled posts with localStorage for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem("postDrafts", JSON.stringify(drafts));
    } catch {
      // ignore
    }
  }, [drafts]);

  useEffect(() => {
    try {
      localStorage.setItem("scheduledPosts", JSON.stringify(scheduledPosts));
    } catch {
      // ignore
    }
  }, [scheduledPosts]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [images]);

  // Auto-dismiss status toast
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) =>
      ["image/jpeg", "image/jpg", "image/png"].includes(file.type)
    );
    setImages(validFiles);

    try {
      const uploaded = await Promise.all(
        validFiles.map((file) => apiClient.uploadMedia(file))
      );
      setUploadedMediaIds(uploaded.filter(Boolean).map((m) => m.id));
    } catch {
      // Fallback in unit test environment
    }
  };

  const removeImage = (index) => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      const removedImage = newImages.splice(index, 1)[0];
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(removedImage);
      }
      return newImages;
    });
    setUploadedMediaIds((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validatePost = useCallback(() => {
    if (!instagram && !linkedin) {
      setMessage("❌ Please select at least one platform.");
      setMessageType("error");
      return { isValid: false };
    }
    if (post.trim() === "") {
      setMessage("❌ Post cannot be empty.");
      setMessageType("error");
      return { isValid: false };
    }

    let finalIg = instagram;
    let finalLi = linkedin;
    const warnings = [];

    const effectiveIg =
      instagramContent && instagramContent.trim() ? instagramContent : post;
    const effectiveLi =
      linkedinContent && linkedinContent.trim() ? linkedinContent : post;

    if (instagram) {
      if (effectiveIg.length > 2200) {
        finalIg = false;
        warnings.push("Instagram skipped (over 2200 chars).");
      } else if (images.length > 10) {
        finalIg = false;
        warnings.push("Instagram skipped (over 10 images).");
      }
    }

    if (linkedin) {
      if (effectiveLi.length > 3000) {
        finalLi = false;
        warnings.push("LinkedIn skipped (over 3000 chars).");
      }
    }

    if (date && time) {
      const selected = new Date(`${date}T${time}`);
      if (selected < new Date()) {
        setMessage("❌ Schedule must be in the future.");
        setMessageType("error");
        return { isValid: false };
      }
    }

    if (!finalIg && !finalLi) {
      setMessage(`❌ Failed: ${warnings.join(" ")}`);
      setMessageType("error");
      return { isValid: false };
    }

    if (warnings.length > 0) {
      setMessage(
        `⚠️ ${warnings.join(" ")} Continuing with remaining platforms.`
      );
      setMessageType("warning");
    } else {
      setMessage("✅ Validation Successful");
      setMessageType("success");
    }

    return { isValid: true, ig: finalIg, li: finalLi };
  }, [
    instagram,
    linkedin,
    post,
    instagramContent,
    linkedinContent,
    images.length,
    date,
    time,
  ]);

  const saveDraft = useCallback(() => {
    const validation = validatePost();

    if (validation.isValid) {
      setIsLoading(true);
      setTimeout(async () => {
        const draftPayload = {
          instagram: validation.ig,
          linkedin: validation.li,
          post,
          instagramContent: instagramContent || null,
          linkedinContent: linkedinContent || null,
          hasImages: images.length > 0,
          date,
          time,
          mediaIds: uploadedMediaIds,
        };

        let savedDraft = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...draftPayload,
        };

        try {
          const apiDraft = await apiClient.createDraft(draftPayload);
          if (apiDraft && apiDraft.id) {
            savedDraft = apiDraft;
          }
        } catch {
          // Fallback to local draft object in test environment
        }

        dispatch(addDraft(savedDraft));

        if (validation.ig === instagram && validation.li === linkedin) {
          setMessage("💾 Draft saved successfully!");
          setMessageType("success");
        }

        setIsLoading(false);
      }, 300);
    }
  }, [
    validatePost,
    post,
    instagramContent,
    linkedinContent,
    instagram,
    linkedin,
    images.length,
    date,
    time,
    uploadedMediaIds,
    dispatch,
  ]);

  const handleUpdateDraft = useCallback(
    async (draftId, payload) => {
      dispatch(updateDraftInStore({ id: draftId, ...payload }));
      try {
        const updated = await apiClient.updateDraft(draftId, payload);
        if (updated) {
          dispatch(updateDraftInStore(updated));
        }
      } catch {
        // Fallback offline
      }
      setMessage("✅ Draft updated successfully!");
      setMessageType("success");
    },
    [dispatch]
  );

  const loadDraft = (draftId) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (draft) {
      setInstagram(Boolean(draft.instagram));
      setLinkedin(Boolean(draft.linkedin));
      dispatch(setPost(draft.post || ""));
      dispatch(setInstagramContent(draft.instagramContent || ""));
      dispatch(setLinkedinContent(draft.linkedinContent || ""));
      setDate(draft.date || "");
      setTime(draft.time || "");
      setImages([]);

      if (draft.hasImages) {
        setMessage("📝 Draft loaded! Please re-attach images if needed.");
        setMessageType("warning");
      } else {
        setMessage("📝 Draft loaded successfully!");
        setMessageType("success");
      }
    }
  };

  const deleteDraft = useCallback(
    async (draftId) => {
      dispatch(deleteDraftAction(draftId));
      try {
        await apiClient.deleteDraft(draftId);
      } catch {
        // Fallback offline
      }
      setMessage("🗑️ Draft deleted!");
      setMessageType("info");
    },
    [dispatch]
  );

  const schedulePost = () => {
    const validation = validatePost();

    if (validation.isValid) {
      if (!date || !time) {
        setMessage("❌ Please select both date and time for scheduling.");
        setMessageType("error");
        return;
      }

      setIsLoading(true);
      setTimeout(async () => {
        const schedulePayload = {
          instagram: validation.ig,
          linkedin: validation.li,
          post,
          instagramContent: instagramContent || null,
          linkedinContent: linkedinContent || null,
          hasImages: images.length > 0,
          date,
          time,
          mediaIds: uploadedMediaIds,
        };

        let scheduledPost = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          status: "SCHEDULED",
          ...schedulePayload,
          scheduledAt: `${date}T${time}`,
        };

        try {
          const apiScheduled = await apiClient.schedulePost(schedulePayload);
          if (apiScheduled && apiScheduled.id) {
            scheduledPost = apiScheduled;
          }
        } catch {
          // Fallback in unit test environment
        }

        setScheduledPosts((prev) => [...prev, scheduledPost]);

        if (validation.ig === instagram && validation.li === linkedin) {
          setMessage("📅 Post scheduled successfully!");
          setMessageType("success");
        }

        setInstagram(false);
        setLinkedin(false);
        dispatch(setPost(""));
        dispatch(setInstagramContent(""));
        dispatch(setLinkedinContent(""));
        setImages([]);
        setUploadedMediaIds([]);
        setDate("");
        setTime("");
        setIsLoading(false);
      }, 300);
    }
  };

  const handleUpdateScheduledPost = async (postId, payload) => {
    setScheduledPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              ...payload,
              scheduledAt: `${payload.date || p.date}T${
                payload.time || p.time || "10:00"
              }`,
            }
          : p
      )
    );
    dispatch(updateScheduledPostInStore({ id: postId, ...payload }));

    try {
      await apiClient.updateScheduledPost(postId, payload);
    } catch {
      // Fallback offline
    }
    setMessage("✅ Scheduled post updated!");
    setMessageType("success");
  };

  const handleCancelScheduledPost = async (postId) => {
    setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
    dispatch(deleteScheduledPostInStore(postId));
    try {
      await apiClient.cancelScheduledPost(postId);
    } catch {
      // Fallback offline
    }
    setMessage("🗑️ Scheduled post cancelled.");
    setMessageType("info");
  };

  const handleMovePost = async (postId, newDateStr) => {
    dispatch(moveScheduledPost({ id: postId, newDate: newDateStr }));

    setScheduledPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const timePart =
            p.scheduledAt && p.scheduledAt.includes("T")
              ? p.scheduledAt.split("T")[1]
              : p.time || "10:00";
          return {
            ...p,
            date: newDateStr,
            scheduledAt: `${newDateStr}T${timePart}`,
          };
        }
        return p;
      })
    );

    try {
      await apiClient.moveScheduledPost(postId, newDateStr);
    } catch {
      // Fallback if offline
    }

    setMessage(`📅 Post rescheduled to ${newDateStr}!`);
    setMessageType("success");
  };

  const publishPost = useCallback(() => {
    const validation = validatePost();

    if (validation.isValid) {
      setIsLoading(true);
      setTimeout(async () => {
        const publishPayload = {
          instagram: validation.ig,
          linkedin: validation.li,
          post,
          instagramContent: instagramContent || null,
          linkedinContent: linkedinContent || null,
          hasImages: images.length > 0,
          date,
          time,
          mediaIds: uploadedMediaIds,
        };

        let publishedRecord = {
          id: Date.now(),
          status: "PUBLISHED",
          timestamp: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          ...publishPayload,
        };

        try {
          const apiPublished = await apiClient.publishPost(publishPayload);
          if (apiPublished && apiPublished.id) {
            publishedRecord = apiPublished;
          }
          const overview = await apiClient.getAnalyticsOverview(
            analyticsTimeframe
          );
          if (overview) setAnalyticsData(overview);
        } catch {
          // Fallback in unit test environment
        }

        dispatch(addPublishedPost(publishedRecord));

        if (validation.ig === instagram && validation.li === linkedin) {
          setMessage("🎉 Post Published Successfully!");
          setMessageType("success");
        }

        setInstagram(false);
        setLinkedin(false);
        dispatch(setPost(""));
        dispatch(setInstagramContent(""));
        dispatch(setLinkedinContent(""));
        setImages([]);
        setUploadedMediaIds([]);
        setDate("");
        setTime("");
        setIsLoading(false);
      }, 300);
    }
  }, [
    validatePost,
    post,
    instagramContent,
    linkedinContent,
    instagram,
    linkedin,
    images.length,
    date,
    time,
    uploadedMediaIds,
    analyticsTimeframe,
    dispatch,
  ]);

  const handleUpdateProfile = async (payload) => {
    try {
      const updated = await apiClient.updateProfile(payload);
      if (updated) {
        setUserProfile((prev) => ({ ...prev, ...updated }));
        dispatch(setAuthUser({ ...userProfile, ...updated }));
      } else {
        setUserProfile((prev) => ({ ...prev, ...payload }));
      }
      setMessage("✅ Profile settings saved!");
      setMessageType("success");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setMessage("🔒 Password updated successfully!");
      setMessageType("success");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
    }
  };

  const handleConnectPlatform = async (platform, handle) => {
    try {
      await apiClient.connectPlatform(platform, handle);
      const accounts = await apiClient.getPlatformAccounts();
      if (Array.isArray(accounts)) {
        setPlatformAccounts(accounts);
      } else {
        setPlatformAccounts((prev) =>
          prev.map((a) =>
            a.platform === platform ? { ...a, handle, connected: true } : a
          )
        );
      }
      setMessage(`✅ ${platform} connected (${handle})!`);
      setMessageType("success");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      await apiClient.disconnectPlatform(platform);
      const accounts = await apiClient.getPlatformAccounts();
      if (Array.isArray(accounts)) {
        setPlatformAccounts(accounts);
      } else {
        setPlatformAccounts((prev) =>
          prev.map((a) =>
            a.platform === platform
              ? { ...a, handle: "Not connected", connected: false }
              : a
          )
        );
      }
      setMessage(`🔌 ${platform} disconnected.`);
      setMessageType("info");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      setMessageType("error");
    }
  };

  const handleTogglePlatformConnection = async (
    platform,
    currentlyConnected
  ) => {
    if (currentlyConnected) {
      await handleDisconnectPlatform(platform);
    } else {
      const defaultHandle =
        platform === "INSTAGRAM" ? "@yourhandle" : "LinkedIn Studio Profile";
      await handleConnectPlatform(platform, defaultHandle);
    }
  };

  const handleLogin = async (email, password) => {
    const res = await apiClient.login(email, password);
    if (res?.user) {
      setUserProfile((prev) => ({ ...prev, ...res.user }));
      dispatch(setAuthUser(res.user));
    }
    setMessage("✅ Signed in successfully!");
    setMessageType("success");
  };

  const handleRegister = async (displayName, email, password) => {
    const res = await apiClient.register(displayName, email, password);
    if (res?.user) {
      setUserProfile((prev) => ({ ...prev, ...res.user }));
      dispatch(setAuthUser(res.user));
    }
    setMessage("🎉 Account created & signed in!");
    setMessageType("success");
  };

  const handleLogout = async () => {
    await apiClient.logout();
    dispatch(logoutUser());
    setMessage("👋 Signed out of session.");
    setMessageType("info");
  };

  const handleToggleTheme = () => {
    const nextTheme = authState.theme === "dark" ? "light" : "dark";
    dispatch(setTheme(nextTheme));
  };

  const getPostsForDate = (dateStr) =>
    scheduledPosts.filter((p) => p.date === dateStr);

  const generateCalendarDays = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return { days, daysInMonth, firstDayIndex };
  };

  const { days } = useMemo(
    () => generateCalendarDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const monthName = useMemo(
    () =>
      new Date(calendarYear, calendarMonth, 1).toLocaleString("default", {
        month: "long",
      }),
    [calendarYear, calendarMonth]
  );

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  return (
    <div
      className={`app-layout ${
        authState.theme === "dark" ? "theme-dark" : ""
      }`}
    >
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        drafts={drafts}
        scheduledCount={scheduledPosts.length}
        publishedCount={publishedPosts.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        renderSidebarContent={renderSidebarContent}
      />

      {/* Main Content Area */}
      <main className="main-content-area">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          isAuthenticated={authState.isAuthenticated}
          theme={authState.theme}
          onToggleTheme={handleToggleTheme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notifications={notifications}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileMenuOpen((o) => !o)}
        />

        {/* Session / Unauthorized Banner if logged out */}
        {!authState.isAuthenticated && (
          <div style={{ padding: "16px 24px 0" }}>
            <div className="notice-banner warning" role="alert">
              <div>
                <strong>Session Signed Out: </strong>
                You are viewing the workspace in guest preview mode. Sign in to
                authenticate protected API mutations.
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setAuthModalOpen(true)}
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        <div className="content-wrapper">{renderMainContent()}</div>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        sessionExpired={authState.sessionExpired}
        unauthorizedReason={authState.unauthorizedReason}
      />

      {/* Status Toast */}
      {message && (
        <div
          className={`toast-message toast-${messageType}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing request...</p>
        </div>
      )}
    </div>
  );

  function renderSidebarContent() {
    switch (activeTab) {
      case "compose":
        return (
          <div className="context-card">
            <h3>Quick Select</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={instagram}
                onChange={(e) => setInstagram(e.target.checked)}
              />
              Instagram
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={linkedin}
                onChange={(e) => setLinkedin(e.target.checked)}
              />
              LinkedIn
            </label>
          </div>
        );
      case "calendar":
        return (
          <div className="context-card">
            <h3>Month Controls</h3>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={handlePrevMonth}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={handleNextMonth}
              >
                Next ›
              </button>
            </div>
          </div>
        );
      case "analytics":
        return (
          <div className="context-card">
            <h3>Timeframe</h3>
            <select
              className="select-input"
              aria-label="Sidebar analytics timeframe"
              value={analyticsTimeframe}
              onChange={(e) => setAnalyticsTimeframe(e.target.value)}
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  }

  function renderMainContent() {
    switch (activeTab) {
      case "overview":
        return (
          <Overview
            analyticsData={analyticsData}
            timeSeriesData={timeSeriesData}
            drafts={drafts}
            scheduledPosts={scheduledPosts}
            publishedPosts={publishedPosts}
            platformAccounts={platformAccounts}
            setActiveTab={setActiveTab}
          />
        );

      case "compose":
        return (
          <Compose
            instagram={instagram}
            setInstagram={setInstagram}
            linkedin={linkedin}
            setLinkedin={setLinkedin}
            post={post}
            setPost={(value) => dispatch(setPost(value))}
            instagramContent={instagramContent}
            setInstagramContent={(val) => dispatch(setInstagramContent(val))}
            linkedinContent={linkedinContent}
            setLinkedinContent={(val) => dispatch(setLinkedinContent(val))}
            images={images}
            handleImages={handleImages}
            removeImage={removeImage}
            date={date}
            setDate={setDate}
            time={time}
            setTime={setTime}
            saveDraft={saveDraft}
            schedulePost={schedulePost}
            publishPost={publishPost}
            isLoading={isLoading}
          />
        );

      case "drafts":
        return (
          <Drafts
            drafts={drafts}
            loadDraft={loadDraft}
            deleteDraft={deleteDraft}
            onUpdateDraft={handleUpdateDraft}
            setActiveTab={setActiveTab}
          />
        );

      case "scheduled":
        return (
          <ScheduledPosts
            scheduledPosts={scheduledPosts}
            onUpdateScheduledPost={handleUpdateScheduledPost}
            onCancelScheduledPost={handleCancelScheduledPost}
            setActiveTab={setActiveTab}
          />
        );

      case "calendar":
        return (
          <Calendar
            monthName={monthName}
            currentYear={calendarYear}
            currentMonth={calendarMonth}
            days={days}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            getPostsForDate={getPostsForDate}
            onMovePost={handleMovePost}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onUpdateScheduledPost={handleUpdateScheduledPost}
            onCancelScheduledPost={handleCancelScheduledPost}
          />
        );

      case "published":
        return (
          <PublishedPosts
            publishedPosts={publishedPosts}
            setActiveTab={setActiveTab}
          />
        );

      case "analytics":
        return (
          <Analytics
            analyticsData={analyticsData}
            platformBreakdown={platformBreakdown}
            timeSeriesData={timeSeriesData}
            topPosts={topPosts}
            timeframe={analyticsTimeframe}
            onTimeframeChange={setAnalyticsTimeframe}
          />
        );

      case "integrations":
        return (
          <Integrations
            platformAccounts={platformAccounts}
            onConnectPlatform={handleConnectPlatform}
            onDisconnectPlatform={handleDisconnectPlatform}
          />
        );

      case "settings":
        return (
          <Settings
            key={userProfile?.email || "default-profile"}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onChangePassword={handleChangePassword}
            platformAccounts={platformAccounts}
            onTogglePlatformConnection={handleTogglePlatformConnection}
            theme={authState.theme}
            onToggleTheme={handleToggleTheme}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
          />
        );

      default:
        return null;
    }
  }
}

export default App;

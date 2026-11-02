const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// In-memory token store (avoids exposing sensitive access tokens in plain DOM storage)
let inMemoryTokens = null;
const authListeners = new Set();

export function onAuthEvent(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function notifyAuthEvent(event) {
  authListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  });
}

export function getStoredTokens() {
  if (inMemoryTokens) return inMemoryTokens;
  try {
    const raw = sessionStorage.getItem("pc_session_meta");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens) {
  inMemoryTokens = tokens || null;
  try {
    if (!tokens) {
      sessionStorage.removeItem("pc_session_meta");
    } else {
      sessionStorage.setItem(
        "pc_session_meta",
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user || null,
        })
      );
    }
  } catch {
    // ignore storage errors in restricted environments
  }
}

async function apiRequest(endpoint, options = {}) {
  const tokens = getStoredTokens();
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    signal: options.signal,
  });

  if (response.status === 401 && tokens?.refreshToken && !options._retried) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (refreshRes.ok) {
        const newTokens = await refreshRes.json();
        setStoredTokens(newTokens);
        notifyAuthEvent({ type: "TOKEN_REFRESHED", payload: newTokens });
        return apiRequest(endpoint, { ...options, _retried: true });
      } else {
        setStoredTokens(null);
        notifyAuthEvent({ type: "SESSION_EXPIRED" });
      }
    } catch {
      setStoredTokens(null);
      notifyAuthEvent({ type: "SESSION_EXPIRED" });
    }
  } else if (response.status === 401 && !options._skipAuthEvent) {
    notifyAuthEvent({ type: "UNAUTHORIZED" });
  } else if (response.status === 403) {
    notifyAuthEvent({ type: "FORBIDDEN" });
  }

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch {
      // ignore non-json error response
    }
    const error = new Error(errData.message || `API request failed (${response.status})`);
    error.status = response.status;
    error.details = errData;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

export const apiClient = {
  // Authentication & User Profile
  login: async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      _skipAuthEvent: true,
    });
    setStoredTokens(data);
    notifyAuthEvent({ type: "LOGIN_SUCCESS", payload: data });
    return data;
  },

  register: async (displayName, email, password) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ displayName, email, password }),
      _skipAuthEvent: true,
    });
    setStoredTokens(data);
    notifyAuthEvent({ type: "LOGIN_SUCCESS", payload: data });
    return data;
  },

  refresh: async (refreshToken) => {
    const data = await apiRequest("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      _skipAuthEvent: true,
    });
    setStoredTokens(data);
    return data;
  },

  logout: async () => {
    const tokens = getStoredTokens();
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: tokens?.refreshToken || null }),
        _skipAuthEvent: true,
      });
    } catch {
      // ignore network failure during logout
    } finally {
      setStoredTokens(null);
      notifyAuthEvent({ type: "LOGOUT" });
    }
  },

  getCurrentUser: (signal) => apiRequest("/auth/me", { signal }),

  updateProfile: (payload) =>
    apiRequest("/auth/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  changePassword: (currentPassword, newPassword) =>
    apiRequest("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Posts (Published & All Posts)
  getPosts: (params = {}, signal) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.platform) search.set("platform", params.platform);
    const qs = search.toString();
    return apiRequest(`/posts${qs ? `?${qs}` : ""}`, { signal });
  },

  getPostById: (id, signal) => apiRequest(`/posts/${id}`, { signal }),

  publishPost: (payload) =>
    apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deletePost: (id) =>
    apiRequest(`/posts/${id}`, {
      method: "DELETE",
    }),

  // Drafts
  getDrafts: (signal) => apiRequest("/drafts", { signal }),

  createDraft: (payload) =>
    apiRequest("/drafts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateDraft: (id, payload) =>
    apiRequest(`/drafts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteDraft: (id) =>
    apiRequest(`/drafts/${id}`, {
      method: "DELETE",
    }),

  // Scheduled Posts
  getScheduledPosts: (signal) => apiRequest("/scheduled-posts", { signal }),

  schedulePost: (payload) =>
    apiRequest("/scheduled-posts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateScheduledPost: (id, payload) =>
    apiRequest(`/scheduled-posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  moveScheduledPost: (id, newDate, newTime) =>
    apiRequest(`/scheduled-posts/${id}/move`, {
      method: "PUT",
      body: JSON.stringify({ newDate, ...(newTime ? { newTime } : {}) }),
    }),

  cancelScheduledPost: (id) =>
    apiRequest(`/scheduled-posts/${id}`, {
      method: "DELETE",
    }),

  // Media Management
  getMedia: (signal) => apiRequest("/media", { signal }),

  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest("/media/upload", {
      method: "POST",
      body: formData,
    });
  },

  deleteMedia: (id) =>
    apiRequest(`/media/${id}`, {
      method: "DELETE",
    }),

  // Platform Accounts & Integrations
  getPlatformAccounts: (signal) => apiRequest("/platform-accounts", { signal }),

  connectPlatform: (platform, handle) =>
    apiRequest(`/platform-accounts/${platform}/connect`, {
      method: "POST",
      body: JSON.stringify({ handle }),
    }),

  disconnectPlatform: (platformOrId) =>
    apiRequest(`/platform-accounts/${platformOrId}`, {
      method: "DELETE",
    }),

  // Analytics
  getAnalyticsOverview: (timeframe = "last7", signal) =>
    apiRequest(`/analytics/overview?timeframe=${encodeURIComponent(timeframe)}`, { signal }),

  getAnalyticsPlatforms: (timeframe = "last7", signal) =>
    apiRequest(`/analytics/platforms?timeframe=${encodeURIComponent(timeframe)}`, { signal }),

  getAnalyticsTimeSeries: (timeframe = "last7", signal) =>
    apiRequest(`/analytics/time-series?timeframe=${encodeURIComponent(timeframe)}`, { signal }),

  getAnalyticsTopPosts: (signal) => apiRequest("/analytics/top-posts", { signal }),

  // AI Caption Generation
  generateAiCaption: (prompt, instagram, linkedin) =>
    apiRequest("/ai/caption", {
      method: "POST",
      body: JSON.stringify({ prompt, instagram, linkedin }),
    }),

  // System & Audit Logs
  getSystemVersion: (signal) => apiRequest("/system/version", { signal }),
  getAuditLogs: (signal) => apiRequest("/audit-logs", { signal }),
};

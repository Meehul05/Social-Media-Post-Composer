import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: {
    id: 1,
    displayName: "Admin",
    email: "admin@example.com",
    role: "ROLE_ADMIN",
    timezone: "UTC-05:00 (Eastern Time)",
  },
  isAuthenticated: true,
  sessionExpired: false,
  unauthorizedReason: null,
  theme: "light",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
      state.sessionExpired = false;
      state.unauthorizedReason = null;
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setSessionExpired: (state, action) => {
      state.sessionExpired = action.payload;
      if (action.payload) {
        state.isAuthenticated = false;
      }
    },
    setUnauthorizedReason: (state, action) => {
      state.unauthorizedReason = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    logoutUser: (state) => {
      state.isAuthenticated = false;
      state.sessionExpired = false;
      state.unauthorizedReason = null;
    },
  },
});

export const {
  setAuthUser,
  setAuthenticated,
  setSessionExpired,
  setUnauthorizedReason,
  setTheme,
  logoutUser,
} = authSlice.actions;

export default authSlice.reducer;

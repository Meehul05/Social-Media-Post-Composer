import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  scheduledPosts: [],
};

const scheduleSlice = createSlice({
  name: "schedule",
  initialState,
  reducers: {
    addScheduledPost: (state, action) => {
      state.scheduledPosts.push(action.payload);
    },
    updateScheduledPostInStore: (state, action) => {
      const idx = state.scheduledPosts.findIndex((p) => p.id === action.payload.id);
      if (idx !== -1) {
        state.scheduledPosts[idx] = { ...state.scheduledPosts[idx], ...action.payload };
      }
    },
    deleteScheduledPost: (state, action) => {
      state.scheduledPosts = state.scheduledPosts.filter(
        (post) => post.id !== action.payload
      );
    },
    setScheduledPosts: (state, action) => {
      state.scheduledPosts = action.payload;
    },
    moveScheduledPost: (state, action) => {
      const { id, newDate, newTime } = action.payload;
      const post = state.scheduledPosts.find((p) => p.id === id);

      if (post) {
        post.date = newDate;
        const timePart =
          newTime ||
          (post.scheduledAt && post.scheduledAt.includes("T")
            ? post.scheduledAt.split("T")[1]
            : post.time || "10:00");
        post.time = timePart.slice(0, 5);
        post.scheduledAt = `${newDate}T${timePart}`;
      }
    },
  },
});

export const {
  addScheduledPost,
  updateScheduledPostInStore,
  deleteScheduledPost,
  setScheduledPosts,
  moveScheduledPost,
} = scheduleSlice.actions;

export default scheduleSlice.reducer;
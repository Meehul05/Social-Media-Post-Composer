import { configureStore } from "@reduxjs/toolkit";

import postReducer from "../features/post/postSlice";
import draftReducer from "../features/drafts/draftSlice";
import scheduleReducer from "../features/schedule/scheduleSlice";
import platformReducer from "../features/platform/platformSlice";
import authReducer from "../features/auth/authSlice";

export const store = configureStore({
  reducer: {
    post: postReducer,
    drafts: draftReducer,
    schedule: scheduleReducer,
    platform: platformReducer,
    auth: authReducer,
  },
});
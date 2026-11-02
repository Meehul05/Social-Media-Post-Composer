import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  drafts: [],
};

const draftSlice = createSlice({
  name: "drafts",
  initialState,
  reducers: {
    addDraft: (state, action) => {
      state.drafts.unshift(action.payload);
    },
    updateDraftInStore: (state, action) => {
      const idx = state.drafts.findIndex((d) => d.id === action.payload.id);
      if (idx !== -1) {
        state.drafts[idx] = { ...state.drafts[idx], ...action.payload };
      }
    },
    deleteDraft: (state, action) => {
      state.drafts = state.drafts.filter((draft) => draft.id !== action.payload);
    },
    setDrafts: (state, action) => {
      state.drafts = action.payload;
    },
  },
});

export const { addDraft, updateDraftInStore, deleteDraft, setDrafts } =
  draftSlice.actions;

export default draftSlice.reducer;
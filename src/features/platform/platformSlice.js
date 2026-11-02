import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  instagram: false,
  linkedin: false,
};

const platformSlice = createSlice({
  name: "platform",

  initialState,

  reducers: {
    toggleInstagram: (state) => {
      state.instagram = !state.instagram;
    },

    toggleLinkedin: (state) => {
      state.linkedin = !state.linkedin;
    },

    setInstagram: (state, action) => {
      state.instagram = action.payload;
    },

    setLinkedin: (state, action) => {
      state.linkedin = action.payload;
    },

    resetPlatforms: (state) => {
      state.instagram = false;
      state.linkedin = false;
    },
  },
});

export const {
  toggleInstagram,
  toggleLinkedin,
  setInstagram,
  setLinkedin,
  resetPlatforms,
} = platformSlice.actions;

export default platformSlice.reducer;
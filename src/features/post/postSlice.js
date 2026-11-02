import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  post: "",
  instagramContent: "",
  linkedinContent: "",
  images: [],
  publishedPosts: [],
};

const postSlice = createSlice({
  name: "post",
  initialState,
  reducers: {
    setPost: (state, action) => {
      state.post = action.payload;
    },
    setInstagramContent: (state, action) => {
      state.instagramContent = action.payload;
    },
    setLinkedinContent: (state, action) => {
      state.linkedinContent = action.payload;
    },
    setImages: (state, action) => {
      state.images = action.payload;
    },
    setPublishedPosts: (state, action) => {
      state.publishedPosts = action.payload;
    },
    addPublishedPost: (state, action) => {
      state.publishedPosts.unshift(action.payload);
    },
    clearPost: (state) => {
      state.post = "";
      state.instagramContent = "";
      state.linkedinContent = "";
      state.images = [];
    },
  },
});

export const {
  setPost,
  setInstagramContent,
  setLinkedinContent,
  setImages,
  setPublishedPosts,
  addPublishedPost,
  clearPost,
} = postSlice.actions;

export default postSlice.reducer;
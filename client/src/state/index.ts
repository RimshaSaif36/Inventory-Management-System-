import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface InitialStateTypes {
  isSidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  language: string;
}

const initialState: InitialStateTypes = {
  isSidebarCollapsed: false,
  notificationsEnabled: true,
  language: "English",
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
  },
});

export const {
  setIsSidebarCollapsed,
  setNotificationsEnabled,
  setLanguage,
} = globalSlice.actions;

export default globalSlice.reducer;

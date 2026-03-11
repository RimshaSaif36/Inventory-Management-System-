import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT" | "SALESMAN";
  storeId?: string;
}

export interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
    },
    updateUserRole: (state, action: PayloadAction<"ADMIN" | "ACCOUNTANT" | "SALESMAN">) => {
      if (state.currentUser) {
        state.currentUser.role = action.payload;
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
  },
});

export const { setUser, clearUser, updateUserRole, updateUserProfile } = userSlice.actions;

export default userSlice.reducer;

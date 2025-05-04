// src/redux/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  token: string | null;
  fullName: string | null;
  serial: string | null;
  password?: string | null;
  role?:string |null;
  userInfo?:string |null;
  company?:string |null;
}

const initialState: UserState = {
  token: null,
  fullName: null,
  serial: null,
  password: null,
  role: null,
  userInfo:null,
  company:null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      state.token = action.payload.token;
      state.fullName = action.payload.fullName;
      state.serial = action.payload.serial;
      state.password = action.payload.password;
      state.role = action.payload.role;
      state.userInfo=action.payload.userInfo;
      state.company=action.payload.company;
    },
    clearUser: (state) => {
      state.token = null;
      state.fullName = null;
      state.serial = null;
      state.password = null;
      state.role = null;
      state.userInfo=null;

      state.company=null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;

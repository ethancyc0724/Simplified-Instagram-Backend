// ==========================================
// Type definitions corresponding to backend schemas/user.py
// ==========================================

export interface User {
  user_id: string;
  email: string;
  name?: string | null;
  username: string;
  is_public: boolean;
  metadata?: Record<string, any> | null;
}

export interface UserListPagination {
  page: number;
  limit: number;
  total: number;
}

export interface UserListData {
  users: User[];
  pagination: UserListPagination;
}

export interface UserListResponse {
  data: UserListData;
}

export interface UserDetailData {
  user: User;
  is_following: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
}

export interface UserDetailResponse {
  data: UserDetailData;
}

// Login related types
export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserLoginOutput {
  user_id: string;
  email: string;
  username: string;
  role: string;
  metadata?: Record<string, any> | null;
}

export interface UserLoginData {
  token: string;
  user: UserLoginOutput;
}

export interface UserLoginResponse {
  data: UserLoginData;
  message: string;
}

// Register related types
export interface UserRegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface UserRegisterOutput {
  user_id: string;
  email: string;
  username: string;
  metadata?: Record<string, any> | null;
}

export interface UserRegisterData {
  token: string;
  user: UserRegisterOutput;
}

export interface UserRegisterResponse {
  data: UserRegisterData;
  message: string;
}

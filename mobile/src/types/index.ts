export interface User {
  id: string;
  email: string;
  first_name: string;
  national_id?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  user_type: 'driver' | 'passenger';
  email_verified: boolean;
  phone_verified: boolean;
  profile_photo?: string;
  google_id?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  national_id: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  user_type?: string;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  user?: User;
  token?: string;
}
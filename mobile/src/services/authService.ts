import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginCredentials, RegisterData, User, ApiResponse } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post<ApiResponse>('/auth/login', credentials);
      const { user, token } = response.data;
      
      if (user && token) {
        await this.storeAuthData(user, token);
        return { user, token };
      }
      
      throw new Error('Invalid login response');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(userData: RegisterData): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['token', 'user']);
  }

  async getStoredAuthData(): Promise<{ user: User | null; token: string | null }> {
    try {
      const [token, userJson] = await AsyncStorage.multiGet(['token', 'user']);
      const user = userJson[1] ? JSON.parse(userJson[1]) : null;
      return { user, token: token[1] };
    } catch (error) {
      return { user: null, token: null };
    }
  }

  async storeAuthData(user: User, token: string): Promise<void> {
    await AsyncStorage.multiSet([
      ['token', token],
      ['user', JSON.stringify(user)]
    ]);
  }

  async getProfile(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch profile');
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put<ApiResponse>('/profile', userData);
      const updatedUser = response.data.user || response.data;
      
      // Update stored user data
      const storedUser = await this.getStoredAuthData();
      if (storedUser.user) {
        const newUserData = { ...storedUser.user, ...updatedUser };
        await AsyncStorage.setItem('user', JSON.stringify(newUserData));
      }
      
      return updatedUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>('/auth/verify-email', { token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Email verification failed');
    }
  }

  async verifyPhone(phone: string, code: string): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>('/auth/verify-phone', { phone, code });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Phone verification failed');
    }
  }

  async resendEmailVerification(email: string): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>('/auth/resend-email-verification', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend verification email');
    }
  }

  async resendPhoneVerification(phone: string): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>('/auth/resend-phone-verification', { phone });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend verification code');
    }
  }
}

export default new AuthService();
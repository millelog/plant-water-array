import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Separate axios instance to avoid circular dependency with interceptors
const authClient = axios.create({ baseURL: API_URL });

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
}

export const loginApi = async (password: string): Promise<TokenResponse> => {
  const response = await authClient.post('/auth/login', { password });
  return response.data;
};

export const loginDemoApi = async (): Promise<TokenResponse> => {
  const response = await authClient.post('/auth/demo');
  return response.data;
};

export const refreshTokenApi = async (refreshToken: string): Promise<AccessTokenResponse> => {
  const response = await authClient.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
};

export const checkAuthApi = async (token: string): Promise<{ username: string; role: string }> => {
  const response = await authClient.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

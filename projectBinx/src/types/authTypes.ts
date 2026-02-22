export interface AuthUser {
  id?: number | string;
  phoneNumber?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  success?: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

export interface CreateAccountResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

export interface ForgotPasswordResponse {
  success?: boolean;
  message?: string;
  deliveryChannel?: string;
  [key: string]: unknown;
}

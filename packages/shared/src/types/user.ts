import { Role } from './roles';

export interface User {
  id: string;
  rut: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  companyId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
  companyId: string | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: Omit<User, 'createdAt'>;
}

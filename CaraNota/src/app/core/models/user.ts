


// user.ts
export type UserRole = 'doctor' | 'patient' | 'receptionist' | 'admin';
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface RawLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  patientId:      number | null;
  doctorId:       number | null;
  receptionistId: number | null;
  adminId:        number | null;   // ← added
}

export interface RegisterResponse {
  message?: string;
}

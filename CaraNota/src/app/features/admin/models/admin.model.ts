import { Doctor } from '../../../core/models/appointment.model';

// ── Admin self ─────────────────────────────────────────────────────────────

// In your admin.model.ts — replace the ChangePasswordDto interface:

export interface ChangePasswordDto {
  currentPassword:    string;
  newPassword:        string;
  confirmNewPassword: string;  // ← was missing — required by Swagger
}

export interface UpdateAdminProfileDto {
  fullName?:    string;  // all optional per Swagger (nullable: true)
  phoneNumber?: string;
  gender?:      string;
}

export interface AdminProfile {
  fullName:    string;
  email:       string;
  phoneNumber: string;
  gender?:     string;
}
// ── Staff creation ─────────────────────────────────────────────────────────

export type AdminManagedRole = 'doctor' | 'receptionist';

export interface CreateDoctorRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  specialty: string;
}
export interface CreateReceptionistRequest {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface CreateStaffResponse {
  userId: number;          // ← confirmed: number
  fullName: string;
  email: string;
  role: AdminManagedRole;
  message: string;
}

// ── Profiles ───────────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: number;
  fullName: string;
  email: string;
  specialty: string;        // ← Correct
  phoneNumber?: string;
}

export interface ReceptionistProfile {
  id: number;              // ← confirmed: number
  fullName: string;
  email: string;
  phoneNumber?: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalDoctors: number;
  totalReceptionists: number;
  totalPatients: number;
}

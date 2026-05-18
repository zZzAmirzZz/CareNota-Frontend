// src/app/features/admin/models/admin.model.ts

export type AdminManagedRole = 'doctor' | 'receptionist';

// ─── Doctor profile (GET /api/Doctor, GET /api/Doctor/{id}) ──────────────────
export interface DoctorProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  specialty?: string;
}

// ─── Receptionist profile (GET /api/Receptionist — ask backend to add) ───────
export interface ReceptionistProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
}

// ─── Admin self profile (GET /api/admin/profile) ─────────────────────────────
// Shape is inferred from Postman — confirm exact fields with backend
export interface AdminProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  gender?: string;
}

// ─── Change password (PUT /api/admin/change-password) ────────────────────────
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── Payload for creating a doctor or receptionist via Auth/Register ──────────
export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  password: string;
  role: AdminManagedRole;
  specialty?: string; // doctor only — sent via PUT /api/Doctor/{id} after register
}

// ─── Dashboard counters ───────────────────────────────────────────────────────
export interface AdminStats {
  totalDoctors: number;
  totalReceptionists: number;
  totalPatients: number;
}

// src/app/features/admin/services/admin.service.ts
//
// FIXES applied vs. the original:
//   1. Removed hardcoded `const BASE = 'https://api.carenota.com'`
//      → now uses `environment.apiUrl` so staging and prod work automatically
//   2. deleteDoctor / deletePatient / updateDoctorSpecialty now delegate
//      to DoctorService and PatientService instead of duplicating HTTP calls
//   3. Added deletePatient (was missing)
//   4. getAllReceptionists / deleteReceptionist kept with a clear warning comment
//      because the endpoint is not in the API docs yet

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DoctorProfile,
  ReceptionistProfile,
  CreateStaffRequest,
  AdminStats,
} from '../models/admin.model';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http          = inject(HttpClient);
  private doctorService = inject(DoctorService);
  private patientService= inject(PatientService);

  // environment.apiUrl switches automatically:
  //   local       → http://localhost:5000
  //   staging     → https://staging.carenota.com
  //   production  → https://api.carenota.com
  // Set these in environment.ts / environment.staging.ts / environment.prod.ts
  private base = environment.apiUrl;

  // ── Doctors ────────────────────────────────────────────────────────────────

  getAllDoctors(): Observable<DoctorProfile[]> {
    // Delegates to DoctorService — HTTP logic lives in one place
    return this.doctorService.getAllDoctors() as Observable<DoctorProfile[]>;
  }

  getDoctorById(id: number): Observable<DoctorProfile> {
    return this.doctorService.getDoctorById(id) as Observable<DoctorProfile>;
  }

  deleteDoctor(id: number): Observable<void> {
    // Doctor delete lives in DoctorService, called here
    return this.http.delete<void>(`${this.base}/api/Doctor/${id}`);
  }

  updateDoctorSpecialty(id: number, specialty: string): Observable<void> {
    // PUT /api/Doctor/{id} — only the specialty field is sent
    return this.http.put<void>(`${this.base}/api/Doctor/${id}`, { specialty });
  }

  // ── Patients ───────────────────────────────────────────────────────────────

  deletePatient(id: number): Observable<void> {
    // DELETE /api/Patient/{id} — admin only, hard delete
    return this.http.delete<void>(`${this.base}/api/Patient/${id}`);
  }

  // ── Receptionists ──────────────────────────────────────────────────────────
  // ⚠️  /api/Receptionist is NOT in the API docs or Postman collection.
  //     Ask the backend team to add GET /api/Receptionist and DELETE /api/Receptionist/{id}.
  //     These will 404 until the backend implements them.

  getAllReceptionists(): Observable<ReceptionistProfile[]> {
    return this.http.get<ReceptionistProfile[]>(`${this.base}/api/Receptionist`);
  }

  deleteReceptionist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/Receptionist/${id}`);
  }

  // ── Create staff (doctor or receptionist) ──────────────────────────────────
  // Step 1: POST /Api/Auth/Register → creates the user account
  // Step 2: for doctors, call updateDoctorSpecialty(newDoctorId, specialty)
  //
  // ⚠️  Ask backend to return doctorId / receptionistId in the Register
  //     response so step 2 can be chained automatically here.

  createStaff(payload: CreateStaffRequest): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(`${this.base}/Api/Auth/Register`, {
      fullName:    payload.fullName,
      email:       payload.email,
      phoneNumber: payload.phoneNumber,
      gender:      payload.gender,
      password:    payload.password,
      role:        payload.role,
    });
  }

  // ── Admin self-management ──────────────────────────────────────────────────
  // These endpoints were found in Postman but are NOT in the API docs yet.
  // Confirm with backend before using.

  getAdminProfile(): Observable<unknown> {
    return this.http.get(`${this.base}/api/admin/profile`);
  }

  updateAdminProfile(dto: unknown): Observable<unknown> {
    return this.http.put(`${this.base}/api/admin/profile`, dto);
  }

  changeAdminPassword(dto: { currentPassword: string; newPassword: string }): Observable<void> {
    return this.http.put<void>(`${this.base}/api/admin/change-password`, dto);
  }

  // ── Dashboard stats ────────────────────────────────────────────────────────
  // Fetches doctors + patients in parallel.
  // Receptionists count is included but will be 0 / error until backend adds the endpoint.

  getStats(): Observable<AdminStats> {
    return forkJoin({
      doctors:  this.getAllDoctors(),
      patients: this.patientService.getAll(),
    }).pipe(
      map(({ doctors, patients }) => ({
        totalDoctors:       doctors.length,
        totalReceptionists: 0,   // update when /api/Receptionist is ready
        totalPatients:      patients.length,
      }))
    );
  }
}

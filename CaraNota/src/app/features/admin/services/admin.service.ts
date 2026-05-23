// src/app/features/admin/services/admin.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AdminProfile,           // ← was missing
  ChangePasswordDto,      // ← was missing
  DoctorProfile,
  ReceptionistProfile,
  CreateDoctorRequest,
  CreateReceptionistRequest,
  CreateStaffResponse,
  AdminStats,
} from '../models/admin.model';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { Doctor } from '../../../core/models/appointment.model';


@Injectable({ providedIn: 'root' })
export class AdminService {
  private http           = inject(HttpClient);
  private doctorService  = inject(DoctorService);
  private patientService = inject(PatientService);

  private base = environment.apiUrl;


  // ── Doctors ────────────────────────────────────────────────────────────────


  // ── Unified Create Staff (called by CreateUserComponent) ─────────────────
  createStaff(payload: any): Observable<CreateStaffResponse> {
    if (payload.role === 'doctor') {
      return this.createDoctor({
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        phoneNumber: payload.phoneNumber,
        specialty: payload.specialty,        // ← map from form
        licenseNumber: payload.licenseNumber || undefined,
      });
    } else {
      return this.createReceptionist({
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        phoneNumber: payload.phoneNumber,
      });
    }
  }

getAllDoctors(): Observable<DoctorProfile[]> {
  return this.doctorService.getAllDoctors().pipe(
    map(doctors => doctors.map(d => ({
      id: d.id,
      fullName: d.fullName,
      email: d.email,
      specialty: d.specialty,
      phoneNumber: d.phoneNumber
    })))
  );
}

getDoctorById(id: number): Observable<DoctorProfile> {
  return this.doctorService.getDoctorById(id).pipe(
    map((doctor: Doctor) => ({
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,        // ← important
      phoneNumber: doctor.phoneNumber
    }))
  );
}

deleteDoctor(id: number): Observable<void> {   // ← back to number
  return this.http.delete<void>(`${this.base}/api/Doctor/${id}`);
}

  // ── Receptionists ──────────────────────────────────────────────────────────
  // ⚠️  GET and DELETE receptionist endpoints are NOT in the PDF docs.
  //     Ask the backend team for the correct URLs before using these.

  getAllReceptionists(): Observable<ReceptionistProfile[]> {
    return this.http.get<ReceptionistProfile[]>(`${this.base}/api/admin/receptionists`);
  }

deleteReceptionist(id: number): Observable<void> {
  return this.http.delete<void>(`${this.base}/api/admin/receptionists/${id}`);
}

  // ── Create staff ───────────────────────────────────────────────────────────
  // Per the Admin API PDF (v1.0), doctors and receptionists are created through
  // dedicated endpoints under /api/admin — NOT via /Api/Auth/Register.
  // These endpoints immediately activate the account with no email confirmation.

  createDoctor(payload: CreateDoctorRequest): Observable<CreateStaffResponse> {
    return this.http.post<CreateStaffResponse>(
      `${this.base}/api/admin/create-doctor`,
      {
        fullName:        payload.fullName,
        email:           payload.email,
        password:        payload.password,
        phoneNumber:     payload.phoneNumber,
        specialty:  payload.specialty,  // ← PDF field name, not "specialty"
        licenseNumber:   payload.licenseNumber,   // optional
      }
    );
  }

  createReceptionist(payload: CreateReceptionistRequest): Observable<CreateStaffResponse> {
    return this.http.post<CreateStaffResponse>(
      `${this.base}/api/admin/create-receptionist`,
      {
        fullName:    payload.fullName,
        email:       payload.email,
        password:    payload.password,
        phoneNumber: payload.phoneNumber,
      }
    );
  }

  // ── Patients ───────────────────────────────────────────────────────────────

  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/Patient/${id}`);
  }

  // ── Admin self-management ──────────────────────────────────────────────────

  getAdminProfile(): Observable<AdminProfile> {
    return this.http.get<AdminProfile>(`${this.base}/api/admin/profile`);
  }

  updateAdminProfile(dto: unknown): Observable<unknown> {
    return this.http.put(`${this.base}/api/admin/profile`, dto);
  }
// admin.service.ts
changeAdminPassword(dto: ChangePasswordDto): Observable<void> {
  return this.http.put<void>(`${this.base}/api/admin/change-password`, dto);
}

  // ── Dashboard stats ────────────────────────────────────────────────────────

  getStats(): Observable<AdminStats> {
    return forkJoin({
      doctors:  this.getAllDoctors(),
      patients: this.patientService.getAll(),
    }).pipe(
      map(({ doctors, patients }) => ({
        totalDoctors:       doctors.length,
        totalReceptionists: 0,   // update when backend exposes the list endpoint
        totalPatients:      patients.length,
      }))
    );
  }
}

// src/app/core/services/doctor.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Doctor } from '../models/appointment.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);
  private baseUrl = `${environment.apiUrl}/api/Doctor`;

  // ── Read ──────────────────────────────────────────────────────────────

  getAllDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl);
  }

  getDoctorById(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/${id}`);
  }

  getDoctorsBySpecialty(specialty: string): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.baseUrl}/specialty/${specialty}`);
  }

  // ── Update ────────────────────────────────────────────────────────────

  // PUT /api/Doctor/{id} — only the specialty field is accepted by the backend
  updateSpecialty(id: number, specialty: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, { specialty });
  }

  // ── Delete ────────────────────────────────────────────────────────────

  // DELETE /api/Doctor/{id} — admin only, hard delete
  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── ID resolution ─────────────────────────────────────────────────────

  // Call once after login to store the integer doctorId in localStorage.
  // The backend accepts the userId (string from JWT) and returns the doctor profile.
  resolveDoctorId(): Observable<Doctor> {
    const userId = this.auth.getUserId();
    if (!userId) throw new Error('No userId found — user must be logged in');
    return this.http.get<Doctor>(`${this.baseUrl}/${userId}`).pipe(
      tap(doctor => this.auth.saveDoctorId(doctor.id))
    );
  }
}

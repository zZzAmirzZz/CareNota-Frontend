// src/app/core/services/patient.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PatientViewModel,
  PatientVisit,
  PatientAppointment,
  FAKE_PATIENTS,
} from '../models/patient.model';

const USE_FAKE_DATA = true; // ← flip to false when backend is ready

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/Patient`;

  // ── Read ──────────────────────────────────────────────────────────────

  // GET /api/Patient
  getAll(): Observable<PatientViewModel[]> {
    if (USE_FAKE_DATA) return of(FAKE_PATIENTS).pipe(delay(300));
    return this.http
      .get<any[]>(this.base)
      .pipe(map(list => list.map(p => new PatientViewModel(p))));
  }

  // GET /api/Patient/{id}
  getById(id: number): Observable<PatientViewModel> {
    if (USE_FAKE_DATA) {
      const p = FAKE_PATIENTS.find(x => x.id === id) ?? FAKE_PATIENTS[0];
      return of(p).pipe(delay(200));
    }
    return this.http
      .get<any>(`${this.base}/${id}`)
      .pipe(map(p => new PatientViewModel(p)));
  }

  // GET /api/Patient/{id}/details
  getDetails(id: number): Observable<PatientViewModel> {
    if (USE_FAKE_DATA) return this.getById(id);
    return this.http
      .get<any>(`${this.base}/${id}/details`)
      .pipe(map(p => new PatientViewModel(p)));
  }

  // GET /api/Patient/search?name={name}
  search(name: string): Observable<PatientViewModel[]> {
    if (USE_FAKE_DATA) {
      const q = name.toLowerCase();
      return of(FAKE_PATIENTS.filter(p => p.fullName.toLowerCase().includes(q))).pipe(delay(150));
    }
    return this.http
      .get<any[]>(`${this.base}/search`, { params: { name } })
      .pipe(map(list => list.map(p => new PatientViewModel(p))));
  }

  // ── Update ────────────────────────────────────────────────────────────

  // PUT /api/Patient/{id}
  // Fields accepted by the backend: gender, bloodType, allergies, insuranceInfo
  update(id: number, dto: {
    gender?:       string;
    bloodType?:    string;
    allergies?:    string;
    insuranceInfo?: string;
  }): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, dto);
  }

  // ── Delete ────────────────────────────────────────────────────────────

  // DELETE /api/Patient/{id} — admin only, hard delete
  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Related data ──────────────────────────────────────────────────────

  // GET /api/Appointment/patient/{patientId}
  getAppointments(patientId: number): Observable<PatientAppointment[]> {
    if (USE_FAKE_DATA) return of([]);
    return this.http.get<PatientAppointment[]>(
      `${environment.apiUrl}/api/Appointment/patient/${patientId}`
    );
  }

  // GET /Api/Visit/Patient/{patientId}
  getVisits(patientId: number): Observable<PatientVisit[]> {
    if (USE_FAKE_DATA) return of([]);
    return this.http.get<PatientVisit[]>(
      `${environment.apiUrl}/Api/Visit/Patient/${patientId}`
    );
  }
}

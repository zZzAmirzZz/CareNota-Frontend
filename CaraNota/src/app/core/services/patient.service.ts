// core/services/patient.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version:
//   ✅ Uses API constants
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  PatientViewModel,
  PatientVisit,
  PatientAppointment,
} from '../models/patient.model';
import { API } from '../constants/api';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private http = inject(HttpClient);

  // GET /api/Patient
  getAll(): Observable<PatientViewModel[]> {
    return this.http
      .get<any[]>(API.PATIENT.LIST)
      .pipe(map(list => list.map(p => new PatientViewModel(p))));
  }

  // GET /api/Patient/{id}
  getById(id: number): Observable<PatientViewModel> {
    return this.http
      .get<any>(API.PATIENT.BY_ID(id))
      .pipe(map(p => new PatientViewModel(p)));
  }

  // GET /api/Patient/{id}/details
  getDetails(id: number): Observable<PatientViewModel> {
    return this.http
      .get<any>(API.PATIENT.DETAILS(id))
      .pipe(map(p => new PatientViewModel(p)));
  }

  // GET /api/Patient/search?name=
  search(name: string): Observable<PatientViewModel[]> {
    return this.http
      .get<any[]>(API.PATIENT.SEARCH, { params: { name } })
      .pipe(map(list => list.map(p => new PatientViewModel(p))));
  }

  // PUT /api/Patient/{id}
  update(id: number, dto: {
    gender?:       string;
    bloodType?:    string;
    allergies?:    string;
    insuranceInfo?: string;
  }): Observable<void> {
    return this.http.put<void>(API.PATIENT.BY_ID(id), dto);
  }

  // DELETE /api/Patient/{id}
  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(API.PATIENT.BY_ID(id));
  }

  // GET /api/Appointment/patient/{patientId}
  getAppointments(patientId: number): Observable<PatientAppointment[]> {
    return this.http.get<PatientAppointment[]>(API.APPOINTMENT.BY_PATIENT(patientId));
  }

  // GET /Api/Visit/Patient/{patientId}
  getVisits(patientId: number): Observable<PatientVisit[]> {
    return this.http.get<PatientVisit[]>(API.VISIT.BY_PATIENT(patientId));
  }
}

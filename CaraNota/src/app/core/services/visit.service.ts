// src/app/core/services/visit.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers all endpoints under /Api/Visit  (capital A — backend is case-sensitive)
//
// API used:
//   POST   /Api/Visit                           → createVisit()
//   GET    /Api/Visit/{Id}                      → getVisitById()
//   GET    /Api/Visit/{Id}/Details              → getVisitDetails()
//   GET    /Api/Visit/Patient/{PatientId}       → getVisitsByPatient()
//   GET    /Api/Visit/Appointment/{AppointmentId} → getVisitByAppointment()
//   PUT    /Api/Visit/{Id}                      → updateSoapNotes()
//   DELETE /Api/Visit/{Id}                      → deleteVisit()
//
// ⚠️ Missing endpoint noted in API docs:
//   GET /Api/Visit/Doctor/{DoctorId}  — does NOT exist yet.
//   Ask backend team to add it if you need to list all visits for a doctor.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Visit,
  CreateVisitDto,
  UpdateVisitDto,
} from '../models/appointment.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VisitService {
  private http    = inject(HttpClient);
  // ⚠️ Capital A — backend is case-sensitive
  private baseUrl = `${environment.apiUrl}/Api/Visit`;

  // ── Create ────────────────────────────────────────────────────────────────
  // Called by today-visit.ts when doctor clicks "Start Visit".
  // Returns Visit with the real visitId used for audio upload + recording route.
  createVisit(dto: CreateVisitDto): Observable<Visit> {
    return this.http.post<Visit>(this.baseUrl, dto);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  getVisitById(id: number): Observable<Visit> {
    return this.http.get<Visit>(`${this.baseUrl}/${id}`);
  }

  // Returns full SOAP notes + linked diagnoses/prescriptions/lab tests
  getVisitDetails(id: number): Observable<Visit> {
    return this.http.get<Visit>(`${this.baseUrl}/${id}/Details`);
  }

  getVisitsByPatient(patientId: number): Observable<Visit[]> {
    return this.http.get<Visit[]>(`${this.baseUrl}/Patient/${patientId}`);
  }

  // Used after creating a visit to verify it was created correctly
  getVisitByAppointment(appointmentId: number): Observable<Visit> {
    return this.http.get<Visit>(`${this.baseUrl}/Appointment/${appointmentId}`);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  // Only SOAP fields — visitDate and appointmentID are immutable after creation
  updateSoapNotes(id: number, dto: UpdateVisitDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, dto);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteVisit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

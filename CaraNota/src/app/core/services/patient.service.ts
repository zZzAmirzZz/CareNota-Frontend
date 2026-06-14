// core/services/patient.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version:
//   ✅ getDetails() REMOVED — /api/Patient/{id}/details does not exist in Swagger.
//      Use getById() instead.
//   ✅ update() now typed with UpdatePatientDto interface (not inline type)
//   ✅ getVisits() normalizes whenToSeekHelp and followUp from PatientVisit
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  PatientViewModel,
  PatientVisit,
  PatientAppointment,
  UpdatePatientDto,
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

  // GET /api/Patient/search?name=
  search(name: string): Observable<PatientViewModel[]> {
    return this.http
      .get<any[]>(API.PATIENT.SEARCH, { params: { name } })
      .pipe(map(list => list.map(p => new PatientViewModel(p))));
  }

  // PUT /api/Patient/{id}
  // ⚠️ Only { gender, bloodType, allergies, insuranceInfo } are accepted — Swagger confirmed.
  update(id: number, dto: UpdatePatientDto): Observable<void> {
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

  // GET /Api/Visit/Patient/{PatientId}
  // ⚠️ Backend returns visitID (capital ID) — normalize to `id`.
  // ⚠️ /Details endpoint includes doctorName, specialty, appointmentType — list endpoint may also.
  getVisits(patientId: number): Observable<PatientVisit[]> {
    return this.http
      .get<any[]>(API.VISIT.BY_PATIENT(patientId))
      .pipe(
        map(list =>
          list.map(v => ({
            id:              v.visitID ?? v.visitId ?? v.id ?? 0,
            visitDate:       v.visitDate       ?? '',
            subjective:      v.subjective      ?? null,
            objective:       v.objective       ?? null,
            assessment:      v.assessment      ?? null,
            plan:            v.plan            ?? null,
            symptoms:        v.symptoms        ?? null,
            whenToSeekHelp:  v.whenToSeekHelp  ?? null,
            followUp:        v.followUp        ?? null,
            appointmentID:   v.appointmentID   ?? v.appointmentId ?? undefined,
            // Doctor/appointment info — present when backend embeds them
            doctorName:      v.doctorName      ?? v.doctor?.fullName ?? null,
            specialty:       v.specialty       ?? v.doctor?.specialty ?? null,
            appointmentType: v.appointmentType ?? null,
          } as PatientVisit))
        )
      );
  }
}

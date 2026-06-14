// core/services/visit.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers /Api/Visit endpoints (capital A — .NET routing).
//
// CHANGES vs previous version:
//   ✅ Imports from visit.model.ts (not appointment.model)
//   ✅ UpdateVisitDto now includes `whenToSeekHelp` and `followUp`
//      (field was wrongly named `followUpDate` in old comment — corrected)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Visit, CreateVisitDto, UpdateVisitDto } from '../models/visit.model';
import { API } from '../constants/api';

@Injectable({ providedIn: 'root' })
export class VisitService {
  private http = inject(HttpClient);

  // POST /Api/Visit
  // Body: CreateVisitDto { appointmentID, visitDate, subjective?, objective?, assessment?, plan?, symptoms? }
  // ⚠️ Response returns visitId (or visitID) — normalize in the component with:
  //    const id = (res as any).visitID ?? (res as any).visitId ?? res.visitId;
  createVisit(dto: CreateVisitDto): Observable<Visit> {
    return this.http.post<Visit>(API.VISIT.LIST, dto);
  }

  // GET /Api/Visit
  getAllVisits(): Observable<Visit[]> {
    return this.http.get<Visit[]>(API.VISIT.LIST);
  }

  // GET /Api/Visit/{Id}
  getVisitById(id: number): Observable<Visit> {
    return this.http.get<Visit>(API.VISIT.BY_ID(id));
  }

  // GET /Api/Visit/{Id}/Details
  getVisitDetails(id: number): Observable<Visit> {
    return this.http.get<Visit>(API.VISIT.DETAILS(id));
  }

  // GET /Api/Visit/Patient/{PatientId}
  getVisitsByPatient(patientId: number): Observable<Visit[]> {
    return this.http.get<Visit[]>(API.VISIT.BY_PATIENT(patientId));
  }

  // GET /Api/Visit/Appointment/{AppointmentId}
  getVisitByAppointment(appointmentId: number): Observable<Visit> {
    return this.http.get<Visit>(API.VISIT.BY_APPOINTMENT(appointmentId));
  }

  // PUT /Api/Visit/{Id}
  // Body: UpdateVisitDto — includes whenToSeekHelp and followUp (new Swagger fields).
updateVisit(id: number, dto: UpdateVisitDto): Observable<any> {
  return this.http.put<any>(API.VISIT.BY_ID(id), dto);
}

  // DELETE /Api/Visit/{Id}
  deleteVisit(id: number): Observable<void> {
    return this.http.delete<void>(API.VISIT.BY_ID(id));
  }
}

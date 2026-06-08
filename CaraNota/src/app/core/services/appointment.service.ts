// core/services/appointment.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers all endpoints under /api/Appointment (lowercase api, capital A in path)
//
// FIXES vs previous version:
//   ✅ baseUrl now correctly set to /api/Appointment (was just apiUrl — caused 404s)
//   ✅ getByDateRange — removed double-prefix bug
//   ✅ cancelAppointment — removed double-prefix bug
//   ✅ All methods now use API constants instead of raw strings
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Appointment,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentStatus,
  TimeSlot,
} from '../models/appointment.model';
import { API } from '../constants/api';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);

  // ── Create ────────────────────────────────────────────────────────────────
  createAppointment(dto: CreateAppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>(API.APPOINTMENT.LIST, dto);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  getAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API.APPOINTMENT.LIST);
  }

  getAppointmentById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(API.APPOINTMENT.BY_ID(id));
  }

  getAppointmentDetails(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(API.APPOINTMENT.DETAILS(id));
  }

  getByPatient(patientId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API.APPOINTMENT.BY_PATIENT(patientId));
  }

  getByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API.APPOINTMENT.BY_DOCTOR(doctorId));
  }

  getByStatus(status: AppointmentStatus): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API.APPOINTMENT.BY_STATUS(status));
  }

  // GET /api/Appointment/date-range?from=&to=
  getByDateRange(from: Date, to: Date): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API.APPOINTMENT.DATE_RANGE, {
      params: {
        from: from.toISOString(),
        to:   to.toISOString(),
      },
    });
  }

  // GET /api/Appointment/doctor/{id}/weekly?startOfWeek=
  getDoctorWeekly(doctorId: number, startOfWeek: Date): Observable<Appointment[]> {
    const params = new HttpParams().set('startOfWeek', startOfWeek.toISOString());
    return this.http.get<Appointment[]>(API.APPOINTMENT.DOCTOR_WEEKLY(doctorId), { params });
  }

  // GET /api/Appointment/doctor/{id}/available-slots?date=YYYY-MM-DD
getAvailableSlots(
  doctorId: number,
  dateString: string
): Observable<TimeSlot[]> {

  return this.http.get<TimeSlot[]>(
    API.APPOINTMENT.AVAILABLE_SLOTS(doctorId),
    {
      params: { date: dateString },
    }
  );
}

  // ── Update ────────────────────────────────────────────────────────────────
  updateAppointment(id: number, dto: UpdateAppointmentDto): Observable<Appointment> {
    return this.http.put<Appointment>(API.APPOINTMENT.BY_ID(id), dto);
  }

  // PUT /api/Appointment/{id}/cancel  (no body needed)
  cancelAppointment(id: number): Observable<void> {
    return this.http.put<void>(API.APPOINTMENT.CANCEL(id), {});
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(API.APPOINTMENT.BY_ID(id));
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  getTodayRange(): { from: Date; to: Date } {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to   = new Date(); to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  toLocalTime(utcString: string): string {
    return new Date(utcString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  toLocalDate(utcString: string): string {
    return new Date(utcString).toLocaleDateString([], {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

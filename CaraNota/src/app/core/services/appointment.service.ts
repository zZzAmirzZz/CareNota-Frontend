// core/services/appointment.service.ts


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
import { formatLocalTime, formatLocalDate } from '../utils/date-time.util';

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

  // GET /api/Appointment/date-range?from=&to=
  // ⚠️ from/to are now sent as naive local strings (no .toISOString()), matching backend convention
  getByDateRange(from: Date, to: Date): Observable<Appointment[]> {
    const toNaiveLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}:${s}`;
    };

    return this.http.get<Appointment[]>(API.APPOINTMENT.DATE_RANGE, {
      params: {
        from: toNaiveLocal(from),
        to:   toNaiveLocal(to),
      },
    });
  }

  // GET /api/Appointment/doctor/{id}/weekly?startOfWeek=
   getDoctorWeekly(doctorId: number, startOfWeek: Date): Observable<Appointment[]> {
    const y = startOfWeek.getFullYear();
    const m = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const d = String(startOfWeek.getDate()).padStart(2, '0');
    const params = new HttpParams().set('startOfWeek', `${y}-${m}-${d}T00:00:00`);
    return this.http.get<Appointment[]>(API.APPOINTMENT.DOCTOR_WEEKLY(doctorId), { params });
  }


  // GET /api/Appointment/doctor/{id}/available-slots?date=YYYY-MM-DD
getAvailableSlots(
  doctorId: number,
  date: string
): Observable<TimeSlot[]> {

  return this.http.get<TimeSlot[]>(
    API.APPOINTMENT.AVAILABLE_SLOTS(doctorId),
    {
      params: { date }
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

  toLocalTime(localString: string): string {
    return formatLocalTime(localString);
  }

  toLocalDate(localString: string): string {
    return formatLocalDate(localString);
  }
}




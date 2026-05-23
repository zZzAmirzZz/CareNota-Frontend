// src/app/core/services/appointment.service.ts
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
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);

  // NOTE: capital A in Appointment — backend is case-sensitive
private baseUrl = environment.apiUrl;
  // ── Create ────────────────────────────────────────────────────────────

// ── Create ────────────────────────────────────────────────────────────

createAppointment(dto: CreateAppointmentDto): Observable<Appointment> {
  const url = `${environment.apiUrl}/api/Appointment`;

  console.log('[CreateAppointment] Sending to URL:', url);
  console.log('[CreateAppointment] Payload:', dto);

  return this.http.post<Appointment>(url, dto);
}

  // ── Read ──────────────────────────────────────────────────────────────

  getAppointmentById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/${id}`);
  }

  getAppointmentDetails(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/${id}/details`);
  }

  getByPatient(patientId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/${patientId}`);
  }

  getByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  getByStatus(status: AppointmentStatus): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/status/${status}`);
  }

  // Used for today's visits: pass today 00:00 → 23:59 in ISO UTC
getByDateRange(from: Date, to: Date) {
  return this.http.get<Appointment[]>(
    `${this.baseUrl}/api/Appointment/date-range`,
    {
      params: {
        from: from.toISOString(),
        to: to.toISOString()
      },

    }
  );
}

  // Doctor weekly schedule — used in scheduling page
  getDoctorWeekly(doctorId: number, startOfWeek: Date): Observable<Appointment[]> {
    const params = new HttpParams().set('startOfWeek', startOfWeek.toISOString());
    return this.http.get<Appointment[]>(
      `${this.baseUrl}/doctor/${doctorId}/weekly`, { params }
    );
  }

  // Available booking slots — used in Create Appointment modal
// Available booking slots — used in Create Appointment modal
getAvailableSlots(doctorId: number, date: Date): Observable<TimeSlot[]> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  return this.http.get<TimeSlot[]>(
    `${environment.apiUrl}/api/Appointment/doctor/${doctorId}/available-slots`,
    {
      params: { date: dateStr }
    }
  );
}

  // ── Update ────────────────────────────────────────────────────────────

  updateAppointment(id: number, dto: UpdateAppointmentDto): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}/${id}`, dto);
  }

  cancelAppointment(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/Appointment/${id}/cancel`, {});
  }

  // ── Delete ────────────────────────────────────────────────────────────

  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ── Utility ───────────────────────────────────────────────────────────

  // Returns today's date range [start, end] in UTC — used by today-visits page
  getTodayRange(): { from: Date; to: Date } {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // Converts UTC ISO string to local display string
  toLocalTime(utcString: string): string {
    return new Date(utcString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toLocalDate(utcString: string): string {
    return new Date(utcString).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

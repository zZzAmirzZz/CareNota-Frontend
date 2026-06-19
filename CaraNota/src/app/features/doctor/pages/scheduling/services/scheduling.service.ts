// scheduling/services/scheduling.service.ts
//
// Uses endpoints from appointment_api_guide.docx:
//
//   GET /api/Appointment/doctor/{doctorId}/weekly?startOfWeek=   → weekly calendar
//   GET /api/Appointment/doctor/{doctorId}                       → upcoming sidebar
//   PUT /api/Appointment/{id}/cancel                             → cancel action
//
// The Appointment shape used here comes from core/models/appointment.model.ts
// Fields used from AppointmentDto:
//   appointmentID, startTime, endTime, status,
//   appointmentType, patientName, doctorID, doctorName

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, delay } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/services/auth.service';
import { Appointment } from '../../../../../core/models/appointment.model';
import { CalendarEvent, SchedulingData } from '../models/scheduling.models';

// ─── Flip to false when backend is ready ─────────────────────────────────────
const USE_FAKE_DATA = false;
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // capital A — backend is case-sensitive (appointment_api_guide §2)
  private base = `${environment.apiUrl}/api/Appointment`;

  // ─── Public entry point ──────────────────────────────────────────────────

  getSchedulingData(weekStart: Date = this.currentWeekStart()): Observable<SchedulingData> {
    if (USE_FAKE_DATA) return this.getFakeData(weekStart);
    return this.getRealData(weekStart);
  }

  cancelAppointment(id: number): Observable<void> {
    // PUT /api/Appointment/{id}/cancel  (appointment_api_guide §4 row 12)
    return this.http.put<void>(`${this.base}/${id}/cancel`, {});
  }

  // ─── Real API ────────────────────────────────────────────────────────────

  private getRealData(weekStart: Date): Observable<SchedulingData> {
    const doctorId = this.auth.getDoctorId();
    if (!doctorId) throw new Error('DoctorId not found — call resolveDoctorId() after login');

    // Two parallel calls:
    //   1. Weekly appointments → calendar grid
    //   2. All doctor appointments → upcoming sidebar (filter to today + Scheduled)
    return forkJoin({
      weekly: this.getWeekly(doctorId, weekStart),
      all: this.getByDoctor(doctorId),
    }).pipe(
      map(({ weekly, all }) => this.buildSchedulingData(weekly, all))
    );
  }

  // GET /api/Appointment/doctor/{doctorId}/weekly?startOfWeek=
  private getWeekly(doctorId: number, weekStart: Date): Observable<Appointment[]> {
    const params = new HttpParams().set('startOfWeek', weekStart.toISOString());
    return this.http.get<Appointment[]>(
      `${this.base}/doctor/${doctorId}/weekly`, { params }
    );
  }

  // GET /api/Appointment/doctor/{doctorId}
  private getByDoctor(doctorId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/doctor/${doctorId}`);
  }

  // ─── Build SchedulingData from API responses ─────────────────────────────

  private buildSchedulingData(
    weekly: Appointment[],
    all: Appointment[]
  ): SchedulingData {
    // Upcoming sidebar — today's Scheduled appointments sorted by startTime
    const todayScheduled = all
      .filter(a => this.isToday(a.startTime) && a.status === 'Scheduled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // ✅ Calendar grid — only TODAY's non-cancelled appointments
    // The weekly endpoint returns the full week, but we only display today's column.
    const calendarEvents: CalendarEvent[] = weekly
      .filter(a => a.status !== 'Cancelled' && this.isToday(a.startTime))
      .map(a => this.toCalendarEvent(a));

    const doctorName = weekly[0]?.doctorName ?? all[0]?.doctorName ?? 'Doctor';

    return {
      doctorName,
      greeting: this.getGreeting(),
      nextAppointment: todayScheduled[0] ?? null,
      upcomingList: todayScheduled.slice(1),
      calendarEvents,
    };
  }

  // ─── Fake data (mirrors real AppointmentDto shape exactly) ───────────────

  private getFakeData(weekStart: Date): Observable<SchedulingData> {
    // Use startTime / endTime — matches AppointmentDto from appointment_api_guide §3
    const today = new Date();
    const fmt = (h: number, m = 0) => {
      const d = new Date(today);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    const fakeAppointments: Appointment[] = [
      { appointmentID: 1, startTime: fmt(9, 0),  endTime: fmt(9, 30),  status: 'Scheduled',  appointmentType: 'General check-up', patientID: 101, patientName: 'Khaled Youssef',    doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
      { appointmentID: 2, startTime: fmt(10, 0), endTime: fmt(10, 30), status: 'Scheduled',  appointmentType: 'Follow-up',        patientID: 102, patientName: 'Mariam Tarek',      doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
      { appointmentID: 3, startTime: fmt(11, 0), endTime: fmt(11, 30), status: 'Scheduled',  appointmentType: 'Consultation',     patientID: 103, patientName: 'Ahmed Samir',       doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
      { appointmentID: 4, startTime: fmt(12, 0), endTime: fmt(12, 30), status: 'Scheduled',  appointmentType: 'General check-up', patientID: 104, patientName: 'Tarek Mansour',     doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
      { appointmentID: 5, startTime: fmt(13, 0), endTime: fmt(13, 30), status: 'Scheduled',  appointmentType: 'Follow-up',        patientID: 105, patientName: 'Eman Khalil',       doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
      { appointmentID: 6, startTime: fmt(14, 0), endTime: fmt(14, 30), status: 'Cancelled',  appointmentType: 'General check-up', patientID: 106, patientName: 'Abdelrhman Nabil',  doctorID: 1, doctorName: 'Dr. Hassan', createdAt: today.toISOString() },
    ];

    const data = this.buildSchedulingData(fakeAppointments, fakeAppointments);
    return of(data).pipe(delay(300));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private toCalendarEvent(a: Appointment): CalendarEvent {
    const start = new Date(a.startTime);
    const end   = new Date(a.endTime);
    return {
      id:          a.appointmentID,
      patientName: a.patientName,
      startHour:   start.getHours() + start.getMinutes() / 60,
      endHour:     end.getHours()   + end.getMinutes()   / 60,
      dayIndex:    this.toDayIndex(start),   // 0=Sat … 5=Thu
      color:       'pink',
    };
  }

  // Egyptian work week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5
  private toDayIndex(date: Date): number {
    const map: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 };
    return map[date.getDay()] ?? 0;
  }

  private isToday(utcString: string): boolean {
    const d = new Date(utcString);
    const t = new Date();
    return d.getFullYear() === t.getFullYear()
        && d.getMonth()    === t.getMonth()
        && d.getDate()     === t.getDate();
  }

  // Returns the most recent Saturday (start of Egyptian work week)
  currentWeekStart(): Date {
    const d = new Date();
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = day === 6 ? 0 : day + 1; // days since last Saturday
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
}

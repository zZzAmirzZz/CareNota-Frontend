// src/app/features/receptionist/pages/dashboard/receptionist-dashboard.ts

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Appointment } from '../../../../../core/models/appointment.model';
import { AppointmentService } from '../../../../../core/services/appointment.service';
import { ReceptionistNavbar } from '../../../receptionist-layout/receptionist-navbar/receptionist-navbar';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceptionistNavbar],
  templateUrl: './receptionist-dashboard.html',
})
export class ReceptionistDashboard implements OnInit, OnDestroy {
  private svc    = inject(AppointmentService);
  private router = inject(Router);

  // ── Calendar ──────────────────────────────────────────────────────────
  calendarMonth = new Date();
  selectedDate  = signal(new Date());
  calendarDays  = signal<(Date | null)[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────
  allAppointments      = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading            = signal(false);
  error                = signal<string | null>(null);
  searchQuery          = signal('');

  // ── Time ──────────────────────────────────────────────────────────────
  currentTime = signal(this.nowTime());
  private timer?: ReturnType<typeof setInterval>;

  // ── Computed labels ───────────────────────────────────────────────────
  totalAppointments = computed(() => this.allAppointments().length);

  todayLabel = computed(() =>
    this.selectedDate().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  );

  monthLabel = computed(() =>
    this.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  readonly weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildCalendar();
    this.loadForDate(this.selectedDate());
    this.timer = setInterval(() => this.currentTime.set(this.nowTime()), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  // ── Calendar ──────────────────────────────────────────────────────────

  buildCalendar(): void {
    const y = this.calendarMonth.getFullYear();
    const m = this.calendarMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const last  = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= last; d++) days.push(new Date(y, m, d));
    this.calendarDays.set(days);
  }

  prevMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.calendarMonth = new Date(
      this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1
    );
    this.buildCalendar();
  }

  selectDay(day: Date | null): void {
    if (!day) return;
    this.selectedDate.set(new Date(day));
    this.loadForDate(day);
  }

  isToday(day: Date | null): boolean {
    if (!day) return false;
    const t = new Date();
    return day.getDate() === t.getDate() &&
           day.getMonth() === t.getMonth() &&
           day.getFullYear() === t.getFullYear();
  }

  isSelected(day: Date | null): boolean {
    if (!day) return false;
    const s = this.selectedDate();
    return day.getDate() === s.getDate() &&
           day.getMonth() === s.getMonth() &&
           day.getFullYear() === s.getFullYear();
  }

  // ── Load ──────────────────────────────────────────────────────────────

  loadForDate(date: Date): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.searchQuery.set('');

    const from = new Date(date); from.setHours(0, 0, 0, 0);
    const to   = new Date(date); to.setHours(23, 59, 59, 999);

    this.svc.getByDateRange(from, to).subscribe({
      next:  appts => { this.setAppointments(appts); this.isLoading.set(false); },
      error: ()    => { this.error.set('Failed to load appointments.'); this.isLoading.set(false); },
    });
  }

  private setAppointments(appts: Appointment[]): void {
    const sorted = [...appts].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    this.allAppointments.set(sorted);
    this.filteredAppointments.set(sorted);
  }

  // ── Search ────────────────────────────────────────────────────────────

  onSearch(q: string): void {
    this.searchQuery.set(q);
    const lq = q.toLowerCase().trim();
    this.filteredAppointments.set(
      !lq ? this.allAppointments()
          : this.allAppointments().filter(a =>
              a.patientName.toLowerCase().includes(lq) ||
              String(a.patientID).includes(lq) ||
              a.appointmentType.toLowerCase().includes(lq)
            )
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────

  cancelAppointment(id: number): void {
    if (!confirm('Cancel this appointment?')) return;
    this.svc.cancelAppointment(id).subscribe({
      next:  () => this.loadForDate(this.selectedDate()),
      error: () => this.error.set('Failed to cancel appointment.'),
    });
  }

  goToNewAppointment(): void {
    this.router.navigate(['/receptionist/new-appointment']);
  }

  goToCreateAccount(): void {
    this.router.navigate(['/receptionist/create-account']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  formatTime(utcString: string): string {
    return this.svc.toLocalTime(utcString);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      Scheduled: 'bg-orange-50 text-orange-500 border border-orange-200',
      Completed: 'bg-green-50 text-green-600 border border-green-200',
      Cancelled: 'bg-red-50 text-red-500 border border-red-200',
    };
    return map[status] ?? 'bg-gray-100 text-gray-500';
  }

  private nowTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// src/app/features/doctor/pages/today-visit/today-visit.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { VisitService } from '../../../../core/services/visit.service';
import { Appointment } from '../../../../core/models/appointment.model';
import { Visit } from '../../../../core/models/visit.model';

// Which appointment the modal is open for, and which mode was chosen
type VisitMode = 'recording' | 'manual';

interface ModeSelection {
  appointment: Appointment;
  mode: VisitMode | null; // null = modal open but no mode picked yet
}

@Component({
  selector: 'app-today-visit',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorNavbar],
  templateUrl: './today-visit.html',
  styleUrl: './today-visit.css',
})
export class TodayVisit implements OnInit {
  private appointmentService  = inject(AppointmentService);
  private visitService        = inject(VisitService);
  private router              = inject(Router);

  appointments         = signal<Appointment[]>([]);
  isLoading            = signal(true);
  error                = signal<string | null>(null);
  loadingAppointmentId = signal<number | null>(null);

  // Modal state — set when the doctor clicks "Start Visit" on a card
  modeSelection = signal<ModeSelection | null>(null);

  todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

loadAppointments(): void {
  this.isLoading.set(true);
  this.error.set(null);

  const { from, to } = this.appointmentService.getTodayRange();

  this.appointmentService.getByDateRange(from, to).subscribe({
    next: (list: Appointment[]) => {
      this.appointments.set(
        list
          // .filter((a: Appointment) => a.status === 'Scheduled')
          .sort((a: Appointment, b: Appointment) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
      );
      this.isLoading.set(false);
    },
    error: (err: any) => {
      this.error.set(err?.message ?? 'Failed to load today\'s appointments.');
      this.isLoading.set(false);
    },
  });
}

  // ── Step 1: open the mode-selection modal ──────────────────────────────────
  openModeModal(appt: Appointment): void {
    this.modeSelection.set({ appointment: appt, mode: null });
  }

  closeModeModal(): void {
    this.modeSelection.set(null);
  }

  // ── Step 2: doctor picks a mode → create visit → navigate ─────────────────
  confirmMode(mode: VisitMode): void {
    const selection = this.modeSelection();
    if (!selection) return;

    const appt = selection.appointment;
    this.loadingAppointmentId.set(appt.appointmentID);
    this.error.set(null);

    this.visitService.createVisit({
      visitDate:     new Date().toISOString(),
      appointmentID: appt.appointmentID,
    }).subscribe({
      next: (visit: Visit) => {
        this.loadingAppointmentId.set(null);
        this.modeSelection.set(null);

        const patientState = {
          name:      appt.patientName,
          id:        appt.patientID,
          age:       0,
          gender:    'N/A',
          visitType: appt.appointmentType,
        };

        // visit.model Visit uses visitId (camelCase); normalize in case backend returns either casing
        const resolvedVisitId = (visit as any).visitID ?? (visit as any).visitId ?? visit.visitId;

        if (mode === 'recording') {
          this.router.navigate(
            [`/doctor/recording/${resolvedVisitId}`],
            { state: { patient: patientState } }
          );
        } else {
          this.router.navigate(
            ['/doctor/visit-note', resolvedVisitId],
            { state: { patient: { name: appt.patientName, id: appt.patientID } } }
          );
        }
      },
      error: (err: any) => {
        this.loadingAppointmentId.set(null);
        this.modeSelection.set(null);
        this.error.set(err?.error?.message ?? 'Could not start visit. Please try again.');
      },
    });
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }


  // Returns tailwind classes for the status badge
statusClass(status: string): string {
  switch (status) {
    case 'Completed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Cancelled': return 'bg-red-50 text-red-600 border-red-200';
    default:          return 'bg-green-50 text-green-700 border-green-200'; // Scheduled
  }
}
}

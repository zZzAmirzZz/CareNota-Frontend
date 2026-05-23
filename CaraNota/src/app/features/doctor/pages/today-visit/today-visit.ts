// src/app/features/doctor/pages/today-visit/today-visit.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { VisitService } from '../../../../core/services/visit.service';
import { Appointment, Visit } from '../../../../core/models/appointment.model';

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
            .filter((a: Appointment) => a.status === 'Scheduled')
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

  startVisit(appt: Appointment): void {
    this.loadingAppointmentId.set(appt.appointmentID);
    this.error.set(null);

    this.visitService.createVisit({
      visitDate:     new Date().toISOString(),
      appointmentID: appt.appointmentID,
    }).subscribe({
      next: (visit: Visit) => {
        this.loadingAppointmentId.set(null);

        const patientState = {
          name:      appt.patientName,
          id:        appt.patientID,
          age:       0,
          gender:    'N/A',
          visitType: appt.appointmentType,
        };

        this.router.navigate(
          [`/doctor/recording/${visit.visitId}`],
          { state: { patient: patientState } }
        );
      },
      error: (err: any) => {
        this.loadingAppointmentId.set(null);
        this.error.set(err?.error?.message ?? 'Could not start visit. Please try again.');
      },
    });
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

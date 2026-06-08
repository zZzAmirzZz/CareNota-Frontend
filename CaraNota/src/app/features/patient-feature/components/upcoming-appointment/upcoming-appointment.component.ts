// src/app/features/patient/components/upcoming-appointment/upcoming-appointment.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UpcomingAppointmentData {
  appointmentID: number;
  doctorName: string;
  appointmentType: string;
  startTime: string;   // ISO UTC
}

@Component({
  selector: 'app-upcoming-appointment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-appointment.component.html',
})
export class UpcomingAppointmentComponent {
  @Input({ required: true }) appointment!: UpcomingAppointmentData;

  formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA') +
           ' at ' +
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

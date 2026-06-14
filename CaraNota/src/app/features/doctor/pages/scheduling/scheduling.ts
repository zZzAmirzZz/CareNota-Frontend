// scheduling/scheduling.ts
import { Router } from '@angular/router';

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Upcoming } from './components/upcoming/upcoming';
import { Weekcalendar } from './components/weekcalendar/weekcalendar';
import { SchedulingService } from './services/scheduling.service';
import { SchedulingData } from './models/scheduling.models';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [CommonModule, Upcoming, Weekcalendar, DoctorNavbar],
  templateUrl: './scheduling.html',
})
export class Scheduling implements OnInit {
  private schedulingService = inject(SchedulingService);
  private router = inject(Router);


  data      = signal<SchedulingData | null>(null);
  isLoading = signal(true);
  error     = signal<string | null>(null);

  // Track current week start so Weekcalendar can navigate and re-fetch
  weekStart = signal<Date>(this.schedulingService.currentWeekStart());

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.schedulingService.getSchedulingData(this.weekStart()).subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load schedule.');
        this.isLoading.set(false);
      },
    });
  }

  // Called by Weekcalendar when doctor navigates prev/next week
  onWeekChange(newStart: Date): void {
    this.weekStart.set(newStart);
    this.loadData();
  }

  // Called by Upcoming when doctor cancels an appointment
  onCancelAppointment(appointmentId: number): void {
    this.schedulingService.cancelAppointment(appointmentId).subscribe({
      next: () => this.loadData(),   // refresh after cancel
      error: () => this.error.set('Could not cancel appointment. Please try again.'),
    });
  }


}

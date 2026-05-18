// src/app/features/patient/pages/home/home.component.ts
//
// Data sources (all from core services):
//   GET /Api/Visit/Patient/{patientId}           → total visits + recent visit
//   GET /api/Appointment/patient/{patientId}     → upcoming (Scheduled) appointments
//   GET /Api/Prescription/Visit/{visitId} +
//       /Api/Prescription/{id}/Medications       → active medication count
//
// The page extracts what it needs from those calls without dedicated endpoints.

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of, catchError, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { PatientService }     from '../../../../core/services/patient.service';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { AuthService }        from '../../../../core/services/auth.service';
import { NavbarComponent }    from '../../components/navbar/navbar.component';
import { FooterComponent }    from '../../components/footer/footer.component';
import { StatCardComponent }  from '../../components/stat-card/stat-card.component';
import { VisitCardComponent, VisitCardData } from '../../components/visit-card/visit-card.component';
import { UpcomingAppointmentComponent, UpcomingAppointmentData }
  from '../../components/upcoming-appointment/upcoming-appointment.component';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    NavbarComponent, FooterComponent,
    StatCardComponent, VisitCardComponent, UpcomingAppointmentComponent,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private patientService     = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private authService        = inject(AuthService);
  private http               = inject(HttpClient);
  private router             = inject(Router);

  // ── Signals ───────────────────────────────────────────────────────────────
  patientName         = signal('');
  totalVisits         = signal(0);
  activeMedications   = signal(0);
  upcomingCount       = signal(0);
  lastVisitDate       = signal('');

  recentVisit         = signal<VisitCardData | null>(null);
  upcomingAppointments = signal<UpcomingAppointmentData[]>([]);

  isLoading = signal(true);
  error     = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  greeting = computed(() => `Welcome back , ${this.patientName()}!`);

ngOnInit(): void {
  const patientId = this.authService.getPatientId();
  if (!patientId) { this.error.set('Could not identify patient.'); this.isLoading.set(false); return; }
  this.loadData(patientId);
}

  private loadData(patientId: number): void {
    const visits$       = this.patientService.getVisits(patientId).pipe(catchError(() => of([])));
    const appointments$ = this.appointmentService.getByPatient(patientId).pipe(catchError(() => of([])));
    const patient$      = this.patientService.getById(patientId).pipe(catchError(() => of(null)));

    forkJoin({ visits: visits$, appointments: appointments$, patient: patient$ }).subscribe({
      next: ({ visits, appointments, patient }) => {
        // Patient name
        if (patient) this.patientName.set((patient as any).fullName ?? '');

        // Visits stats
        const visitList = visits as any[];
        this.totalVisits.set(visitList.length);

        // Last visit date
        const sorted = [...visitList].sort(
          (a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)
        );
        if (sorted.length) {
          this.lastVisitDate.set(
            new Date(sorted[0].visitDate).toLocaleDateString('en-CA')
          );
        }

        // Recent visit card — most recent visit
        if (sorted.length) {
          const latest = sorted[0];
          this.buildVisitCard(patientId, latest);
        }

        // Upcoming appointments (Scheduled only)
        const apptList = appointments as any[];
        const upcoming = apptList.filter((a: any) => a.status === 'Scheduled');
        this.upcomingCount.set(upcoming.length);
        this.upcomingAppointments.set(
          upcoming.slice(0, 3).map((a: any) => ({
            appointmentID:   a.appointmentID,
            doctorName:      a.doctorName ?? 'Doctor',
            appointmentType: a.appointmentType,
            startTime:       a.startTime,
          }))
        );

        // Active medications: fetch prescription for most recent visit
        if (sorted.length) {
          this.loadActiveMeds(sorted[0].id);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load your data.');
        this.isLoading.set(false);
      },
    });
  }

  private buildVisitCard(patientId: number, visit: any): void {
    // Fetch prescription for this visit to get medication names
    this.http
      .get<any>(`${environment.apiUrl}/Api/Prescription/Visit/${visit.id}`)
      .pipe(
        switchMap(p =>
          this.http.get<any[]>(`${environment.apiUrl}/Api/Prescription/${p.id}/Medications`)
        ),
        catchError(() => of([]))
      )
      .subscribe(meds => {
        this.recentVisit.set({
          id:              visit.id,
          doctorName:      visit.doctorName ?? 'Dr. Unknown',
          specialty:       visit.specialty  ?? 'General Medicine',
          visitDate:       visit.visitDate,
          visitTime:       visit.visitDate,
          appointmentType: visit.appointmentType ?? 'Follow-up',
          summary:         visit.subjective ?? '',
          medications:     meds.map((m: any) => m.medicationName ?? ''),
        });
      });
  }

  private loadActiveMeds(visitId: number): void {
    this.http
      .get<any>(`${environment.apiUrl}/Api/Prescription/Visit/${visitId}`)
      .pipe(
        switchMap(p =>
          this.http.get<any[]>(`${environment.apiUrl}/Api/Prescription/${p.id}/Medications`)
        ),
        catchError(() => of([]))
      )
      .subscribe(meds => this.activeMedications.set((meds as any[]).length));
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onCancelAppointment(id: number): void {
    if (!confirm('Cancel this appointment?')) return;
    // PUT /api/Appointment/{id}/cancel
    this.appointmentService.cancelAppointment(id).subscribe({
      next: () => {
        this.upcomingAppointments.update(list =>
          list.filter(a => a.appointmentID !== id)
        );
        this.upcomingCount.update(n => Math.max(0, n - 1));
      },
      error: () => alert('Failed to cancel. Please try again.'),
    });
  }

  onViewVisitDetails(visitId: number): void {
    this.router.navigate(['/patient/visit-detail', visitId]);
  }

  goToVisits():     void { this.router.navigate(['/patient/visits']); }
  goToReminders():  void { this.router.navigate(['/patient/reminders']); }
  requestAppt():    void { this.router.navigate(['/patient/reminders']); } // placeholder
}

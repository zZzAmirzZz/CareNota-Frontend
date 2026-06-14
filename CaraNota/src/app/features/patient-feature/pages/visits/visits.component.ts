// src/app/features/patient/pages/visits/visits.component.ts
//
// Calls:
//   GET /Api/Visit/Patient/{patientId}               → all visits
//   GET /api/Appointment/{appointmentId}             → doctor name/specialty/type (fallback)
//   GET /Api/Prescription/Visit/{visitId}            → prescription per visit
//   GET /Api/Prescription/{id}/Medications           → medication names
//   GET /Api/LabTest/Visit/{visitId}                 → lab test names
//
// Builds VisitCardData[] for display.

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PatientService }  from '../../../../core/services/patient.service';
import { AuthService }     from '../../../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { VisitCardComponent, VisitCardData }
  from '../../components/visit-card/visit-card.component';

@Component({
  selector: 'app-patient-visits',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, VisitCardComponent],
  templateUrl: './visits.component.html',
})
export class VisitsComponent implements OnInit {
  private patientService = inject(PatientService);
  private authService    = inject(AuthService);
  private http           = inject(HttpClient);
  private router         = inject(Router);

  visits    = signal<VisitCardData[]>([]);
  isLoading = signal(true);
  error     = signal<string | null>(null);

  ngOnInit(): void {
    const patientId = this.authService.getPatientId();
    if (!patientId) { this.error.set('Could not identify patient.'); this.isLoading.set(false); return; }
    this.loadVisits(patientId);
  }

  private loadVisits(patientId: number): void {
    this.patientService.getVisits(patientId).pipe(
      catchError(() => of([]))
    ).subscribe((rawVisits: any[]) => {
      if (!rawVisits.length) { this.isLoading.set(false); return; }

      const sorted = [...rawVisits].sort(
        (a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)
      );

      forkJoin(sorted.map(v => this.enrichVisit(v))).subscribe({
        next: cards => { this.visits.set(cards); this.isLoading.set(false); },
        error: ()   => { this.error.set('Failed to load visits.'); this.isLoading.set(false); },
      });
    });
  }

  private enrichVisit(visit: any) {
    const base = environment.apiUrl;

    // GET /Api/Prescription/Visit/{visitId} — 404 is normal (no prescription yet)
    const meds$ = this.http.get<any>(`${base}/Api/Prescription/Visit/${visit.id}`).pipe(
      switchMap(p => {
        const prescriptionId = Array.isArray(p) ? p[0]?.id : p?.id;
        if (!prescriptionId) return of([]);
        return this.http.get<any[]>(`${base}/Api/Prescription/${prescriptionId}/Medications`);
      }),
      catchError(() => of([]))
    );

    // GET /Api/LabTest/Visit/{visitId}
    const labs$ = this.http.get<any[]>(`${base}/Api/LabTest/Visit/${visit.id}`).pipe(
      catchError(() => of([]))
    );

    // Doctor info: use fields already embedded by backend, or fetch the appointment as fallback.
    // /Api/Visit/Patient/{id} may not embed doctorName — /api/Appointment/{id} always has it.
    const hasDoctorInfo = !!(visit.doctorName || visit.specialty);
    const appt$ = hasDoctorInfo
      ? of(null)
      : (visit.appointmentID
          ? this.http.get<any>(`${base}/api/Appointment/${visit.appointmentID}`)
                     .pipe(catchError(() => of(null)))
          : of(null));

    return forkJoin({ meds: meds$, labs: labs$, appt: appt$ }).pipe(
      catchError(() => of({ meds: [], labs: [], appt: null })),
      switchMap(({ meds, labs, appt }) => {
        const card: VisitCardData = {
          id:              visit.id,
          doctorName:      visit.doctorName      ?? appt?.doctorName                        ?? 'Unknown Doctor',
          specialty:       visit.specialty       ?? appt?.doctorSpecialty ?? appt?.specialty ?? 'General Medicine',
          visitDate:       visit.visitDate,
          visitTime:       visit.visitDate,
          appointmentType: visit.appointmentType ?? appt?.appointmentType                   ?? 'Consultation',
          summary:         visit.subjective      ?? '',
          medications:     (meds as any[]).map(m => m.medicationName ?? '').filter(Boolean),
          labTests:        (labs as any[]).map(l => l.labTestName    ?? '').filter(Boolean),
          followUpDate:    this.extractFollowUp(visit.plan ?? ''),
        };
        return of(card);
      })
    );
  }

  private extractFollowUp(plan: string): string | undefined {
    const match = plan.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : undefined;
  }

  onViewDetails(visitId: number): void {
    this.router.navigate(['/patient/visit-detail', visitId]);
  }
}

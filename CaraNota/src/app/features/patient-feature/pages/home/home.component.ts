// src/app/features/patient/pages/home/home.component.ts
//
// Data sources:
//   GET /Api/Visit/Patient/{patientId}           → total visits + recent visit
//   GET /api/Appointment/patient/{patientId}     → upcoming (Scheduled) appointments
//   GET /Api/Prescription/Visit/{visitId}        → prescription (medications embedded inside)
//
// ⚠️  FIX: There is NO separate GET /Api/Prescription/{id}/Medications endpoint.
//     Medications are embedded in the prescription object itself under
//     raw.medications or raw.prescriptionMedications.

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of, catchError, switchMap, map } from 'rxjs';
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
    RouterModule,
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
  patientName          = signal('');
  totalVisits          = signal(0);
  activeMedications    = signal(0);
  upcomingCount        = signal(0);
  lastVisitDate        = signal('');

  recentVisit          = signal<VisitCardData | null>(null);
  upcomingAppointments = signal<UpcomingAppointmentData[]>([]);

  isLoading = signal(true);
  error     = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  greeting = computed(() => `Welcome back, ${this.patientName()}!`);

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
        if (patient) this.patientName.set((patient as any).fullName ?? '');

        const visitList = visits as any[];
        this.totalVisits.set(visitList.length);

        const sorted = [...visitList].sort(
          (a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)
        );
        if (sorted.length) {
          this.lastVisitDate.set(
            new Date(sorted[0].visitDate).toLocaleDateString('en-CA')
          );
          this.buildVisitCard(patientId, sorted[0]);
        }

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

        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load your data.');
        this.isLoading.set(false);
      },
    });
  }

  private buildVisitCard(patientId: number, visit: any): void {
    const base = environment.apiUrl;

    // ✅ FIX: GET /Api/Prescription/Visit/{visitId} returns the prescription object
    //    with medications EMBEDDED inside it — there is no separate /Medications GET.
    //    Extract from raw.medications or raw.prescriptionMedications array.
    const prescription$ = this.http
      .get<any>(`${base}/Api/Prescription/Visit/${visit.id}`)
      .pipe(catchError(() => of(null)));

    // Fetch appointment → doctor for specialty/name if not already embedded in visit
    const hasDoctorInfo = !!(visit.doctorName || visit.specialty);
    const appt$ = hasDoctorInfo
      ? of(null)
      : (visit.appointmentID
          ? this.http.get<any>(`${base}/api/Appointment/${visit.appointmentID}`).pipe(
              switchMap(appt => {
                if (!appt?.doctorID) return of(appt);
                return this.http.get<any>(`${base}/api/Doctor/${appt.doctorID}`).pipe(
                  map(doc => ({ ...appt, doctorSpecialty: doc?.specialty, doctorName: doc?.fullName })),
                  catchError(() => of(appt))
                );
              }),
              catchError(() => of(null))
            )
          : of(null));

    forkJoin({ prescription: prescription$, appt: appt$ }).subscribe(({ prescription, appt }) => {
      // ✅ Medications are embedded in the prescription response — not a separate call
      const rawPrescription = Array.isArray(prescription) ? prescription[0] : prescription;
      const medLines: any[] = rawPrescription?.medications
        ?? rawPrescription?.prescriptionMedications
        ?? [];

      // Each item may be { medicationName, dosage, ... } or { medication: { medicationName } }
      const medicationNames = medLines
        .map((m: any) => m.medicationName ?? m.medication?.medicationName ?? m.name ?? '')
        .filter(Boolean);

      // ✅ Set activeMedications count from the same data — no second HTTP call needed
      this.activeMedications.set(medicationNames.length);

      this.recentVisit.set({
        id:              visit.id,
        doctorName:      visit.doctorName      ?? appt?.doctorName                        ?? 'Unknown Doctor',
        specialty:       visit.specialty       ?? appt?.doctorSpecialty ?? appt?.specialty ?? 'Unknown Specialty',
        visitDate:       visit.visitDate,
        visitTime:       visit.visitDate,
        appointmentType: visit.appointmentType ?? appt?.appointmentType                   ?? 'Consultation',
        summary:         visit.subjective ?? '',
        medications:     medicationNames,
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onViewVisitDetails(visitId: number): void {
    this.router.navigate(['/patient/visit-detail', visitId]);
  }

  goToVisits(): void { this.router.navigate(['/patient/visits']); }
}

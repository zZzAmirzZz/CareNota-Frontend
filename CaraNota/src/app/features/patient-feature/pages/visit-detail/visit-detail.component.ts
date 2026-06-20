// src/app/features/patient/pages/visit-detail/visit-detail.component.ts
//
// Calls:
//   GET /Api/Visit/{Id}/Details                      → visit header (date, doctor, status)
//   GET /api/visits/{visitId}/patient-summary        → patient-facing summary (diagnosis, symptoms, etc.)
//   GET /Api/Prescription/Visit/{visitId}            → prescription
//   GET /Api/Prescription/{id}/Medications           → medication lines
//   GET /Api/LabTest/Visit/{visitId}                 → ordered lab tests
//   POST /Api/LabTest/{Id}/UploadResult              → upload result file
//   GET /api/Appointment/{id}  +  GET /api/Doctor/{id} → doctor name/specialty fallback

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, switchMap, map, catchError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { VisitSummaryService } from '../../../../core/services/visitsummary.service';
import { SummaryService } from '../../../../core/services/summary.service';
import { PatientSummaryViewDto } from '../../../../core/models/visit.model';

interface MedicationLine {
  medicationID: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  notes?: string;
}

interface LabTest {
  id: number;
  labTestName: string;
}

interface VisitDetail {
  id: number;
  visitDate: string;
  appointmentType?: string;
  doctorName?: string;
  specialty?: string;
  status?: string;
}

@Component({
  selector: 'app-visit-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './visit-detail.component.html',
})
export class VisitDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private visitSvc   = inject(VisitSummaryService);
  private summarySvc = inject(SummaryService);
  private base       = environment.apiUrl;

  visit          = signal<VisitDetail | null>(null);
  patientSummary = signal<PatientSummaryViewDto | null>(null);
  medications    = signal<MedicationLine[]>([]);
  labTests       = signal<LabTest[]>([]);

  isLoading     = signal(true);
  isUploading   = signal(false);
  uploadSuccess = signal<string | null>(null);
  error         = signal<string | null>(null);

  ngOnInit(): void {
    const visitId = Number(this.route.snapshot.paramMap.get('id'));
    if (!visitId) {
      this.error.set('Invalid visit ID.');
      this.isLoading.set(false);
      return;
    }
    this.loadAll(visitId);
  }

  private loadAll(visitId: number): void {
    // Visit header: date, doctor name, specialty, status
    const visit$ = this.http
      .get<VisitDetail>(`${this.base}/Api/Visit/${visitId}/Details`)
      .pipe(catchError(() => this.http.get<VisitDetail>(`${this.base}/Api/Visit/${visitId}`)));

    // Patient-facing summary: diagnosis, symptoms, treatmentPlan, whenToSeekHelp, followUp
    const patientSummary$ = this.summarySvc
      .getPatientSummary(visitId)
      .pipe(catchError(() => of(null)));

    // Medications via prescription
    const meds$ = this.visitSvc.getPrescriptionByVisit(visitId).pipe(
      switchMap((p) => (p ? this.visitSvc.getMedicationLines(p.id) : of([]))),
      catchError(() => of([])),
    );

    // Lab tests
    const labs$ = this.http
      .get<LabTest[]>(`${this.base}/Api/LabTest/Visit/${visitId}`)
      .pipe(catchError(() => of([])));

    forkJoin({ visit: visit$, patientSummary: patientSummary$, meds: meds$, labs: labs$ })
      .pipe(
        switchMap(({ visit, patientSummary, meds, labs }) => {
          const hasDoctorInfo = !!(visit?.doctorName || visit?.specialty);
          const appointmentID = (visit as any)?.appointmentID;

          if (hasDoctorInfo || !appointmentID) {
            return of({ visit, patientSummary, meds, labs });
          }

          // Fallback: resolve doctor name/specialty from appointment → doctor chain
          return this.http.get<any>(`${this.base}/api/Appointment/${appointmentID}`).pipe(
            switchMap((appt) => {
              if (!appt?.doctorID) return of(appt);
              return this.http.get<any>(`${this.base}/api/Doctor/${appt.doctorID}`).pipe(
                map((doc) => ({
                  ...appt,
                  doctorSpecialty: doc?.specialty,
                  doctorName: doc?.fullName,
                })),
                catchError(() => of(appt)),
              );
            }),
            map((appt) => ({
              visit: {
                ...visit,
                doctorName:      visit?.doctorName ?? appt?.doctorName ?? 'Unknown Doctor',
                specialty:       visit?.specialty  ?? appt?.doctorSpecialty ?? appt?.specialty ?? 'Unknown Specialty',
                appointmentType: visit?.appointmentType ?? appt?.appointmentType ?? 'Consultation',
              },
              patientSummary,
              meds,
              labs,
            })),
            catchError(() => of({ visit, patientSummary, meds, labs })),
          );
        }),
      )
      .subscribe({
        next: ({ visit, patientSummary, meds, labs }) => {
          this.visit.set(visit as VisitDetail);
          this.patientSummary.set(patientSummary as PatientSummaryViewDto | null);
          this.medications.set(meds as MedicationLine[]);
          this.labTests.set(labs as LabTest[]);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Failed to load visit details.');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * POST /Api/LabTest/{Id}/UploadResult  (multipart/form-data)
   */
  onUploadResult(labTestId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('ResultFile', file);

    this.isUploading.set(true);
    this.uploadSuccess.set(null);

    this.http.post(`${this.base}/Api/LabTest/${labTestId}/UploadResult`, form).subscribe({
      next:  () => { this.isUploading.set(false); this.uploadSuccess.set('Result uploaded successfully!'); },
      error: () => { this.isUploading.set(false); this.error.set('Upload failed. Please try again.'); },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA');
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  goBack(): void {
    this.router.navigate(['/patient/visits']);
  }
}

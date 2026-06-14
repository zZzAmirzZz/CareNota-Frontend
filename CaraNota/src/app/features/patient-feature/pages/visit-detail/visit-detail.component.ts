// src/app/features/patient/pages/visit-detail/visit-detail.component.ts
//
// Calls (all via core services / HttpClient):
//   GET /Api/Visit/{Id}/Details                      → full SOAP note
//   GET /Api/Prescription/Visit/{visitId}            → prescription
//   GET /Api/Prescription/{id}/Medications           → medication lines (section 9.3)
//   GET /Api/LabTest/Visit/{visitId}                 → ordered lab tests (section 10.1)
//   POST /Api/LabTest/{Id}/UploadResult              → "Upload your results" button

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { VisitSummaryService } from '../../../../core/services/visitsummary.service';

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
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private visitSvc = inject(VisitSummaryService);
  private base = environment.apiUrl;

  visit = signal<VisitDetail | null>(null);
  medications = signal<MedicationLine[]>([]);
  labTests = signal<LabTest[]>([]);

  isLoading = signal(true);
  isUploading = signal(false);
  uploadSuccess = signal<string | null>(null);
  error = signal<string | null>(null);

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
    // GET /Api/Visit/{Id}/Details
    const visit$ = this.http
      .get<VisitDetail>(`${this.base}/Api/Visit/${visitId}/Details`)
      .pipe(catchError(() => this.http.get<VisitDetail>(`${this.base}/Api/Visit/${visitId}`)));

    // GET /Api/Prescription/Visit/{visitId} → then medications via service
    // (service reads medications from embedded data in GET /Api/Prescription/{Id})
    const meds$ = this.visitSvc.getPrescriptionByVisit(visitId).pipe(
      switchMap((p) => (p ? this.visitSvc.getMedicationLines(p.id) : of([]))),
      catchError(() => of([])),
    );

    // GET /Api/LabTest/Visit/{visitId}
    const labs$ = this.http
      .get<LabTest[]>(`${this.base}/Api/LabTest/Visit/${visitId}`)
      .pipe(catchError(() => of([])));

    forkJoin({ visit: visit$, meds: meds$, labs: labs$ }).subscribe({
      next: ({ visit, meds, labs }) => {
        this.visit.set(visit);
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
   * Called when user selects a file via the "Upload your results" button.
   */
  onUploadResult(labTestId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('ResultFile', file);

    this.isUploading.set(true);
    this.uploadSuccess.set(null);

    this.http.post(`${this.base}/Api/LabTest/${labTestId}/UploadResult`, form).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.uploadSuccess.set('Result uploaded successfully!');
      },
      error: () => {
        this.isUploading.set(false);
        this.error.set('Upload failed. Please try again.');
      },
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

  /** Build a readable AI-style summary from SOAP fields */
  get soapSummaryLines(): string[] {
    const v = this.visit();
    if (!v) return [];
    const lines: string[] = [];
    if (v.subjective)
      lines.push(
        'You visited the doctor because of:',
        ...v.subjective
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
    if (v.objective)
      lines.push(
        'Doctor measured:',
        ...v.objective
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
    if (v.assessment)
      lines.push(
        'What the doctor explained to you:',
        ...v.assessment
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
    if (v.plan)
      lines.push(
        'The doctor discussed:',
        ...v.plan
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      );
    return lines;
  }
}

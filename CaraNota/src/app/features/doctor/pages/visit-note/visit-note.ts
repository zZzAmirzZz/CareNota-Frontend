// src/app/features/doctor/pages/visit-note/visit-note.ts
// ─────────────────────────────────────────────────────────────────────────────
// Manual visit note page.
//
// CORRECT FLOW (per backend team):
//   • VisitId already exists — created by today-visit.ts before navigating here.
//   • SOAP fields → PUT /Api/Visit/{Id}  (only on "Finalize Visit" button)
//   • "+ Add Diagnosis" → POST /Api/Diagnosis  immediately
//   • "Create Prescription" → POST /Api/Prescription  immediately (once)
//   • Medication search → GET /Api/Medication/Search?Name=
//   • "+ Add to Prescription" → POST /Api/Prescription/{Id}/Medications  immediately
//   • "+ Add Lab Test" → POST /Api/LabTest  immediately
//   • "Finalize Visit" → PUT /Api/Visit/{Id} with SOAP, then done
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, inject, signal, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormsModule
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API } from '../../../../core/constants/api';
import { UpdateVisitDto } from '../../../../core/models/visit.model';
import { VisitService   } from '../../../../core/services/visit.service';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap , tap} from 'rxjs';

import { DoctorNavbar }        from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { VisitSummaryService } from '../../../../core/services/visitsummary.service';
import { Medication }          from '../../../../core/models/patient.model';

interface SavedDiagnosis  { id: number; name: string; }
interface SavedLabTest    { id: number; name: string; }
interface SavedMedLine    { medicationId: number; name: string; dosage: string; frequency: string; }

@Component({
  selector: 'app-visit-note',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DoctorNavbar],
  templateUrl: './visit-note.html',
  styleUrl: './visit-note.css',
})
export class VisitNote implements OnInit {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private visitService   = inject(VisitService);
  private summaryService = inject(VisitSummaryService);
  private fb             = inject(FormBuilder);
  private cdr            = inject(ChangeDetectorRef);

  // ── Route / state ──────────────────────────────────────────────────────────
  visitId     = signal<number>(0);
  patientName = signal<string>('');

  // ── SOAP form ──────────────────────────────────────────────────────────────
soapForm: FormGroup = this.fb.group({
  subjective:     [''],
  objective:      [''],
  assessment:     [''],
  plan:           [''],
  symptoms:       [''],
  followUp:       [''],   // ← ADD — backend requires this
  whenToSeekHelp: [''],   // ← ADD — send it too to be safe
});
  isFinalizing = signal(false);
  finalizeError = signal<string | null>(null);
  finalizeSuccess = signal(false);

  // ── Diagnosis ──────────────────────────────────────────────────────────────
  diagnosisInput   = '';
  diagnosisLoading = signal(false);
  diagnosisError   = signal<string | null>(null);
  savedDiagnoses   = signal<SavedDiagnosis[]>([]);

  // ── Prescription ───────────────────────────────────────────────────────────
  prescriptionId        = signal<number | null>(null);
  prescriptionInstructions = '';
  prescriptionLoading   = signal(false);
  prescriptionError     = signal<string | null>(null);

  // ── Medication search ──────────────────────────────────────────────────────
  medSearchQuery    = '';
  medSearchResults  = signal<Medication[]>([]);
  medSearchLoading  = signal(false);
  selectedMed       = signal<Medication | null>(null);
  medDosage         = '';
  medFrequency      = '';
  medRoute          = '';
  medDuration       = '';
  medNotes          = '';
  medAddLoading     = signal(false);
  medAddError       = signal<string | null>(null);
  savedMedLines     = signal<SavedMedLine[]>([]);

  private medSearch$ = new Subject<string>();

  // ── Lab test ───────────────────────────────────────────────────────────────
  labTestInput   = '';
  labTestLoading = signal(false);
  labTestError   = signal<string | null>(null);
  savedLabTests  = signal<SavedLabTest[]>([]);

  // ──────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('visitId'));
    this.visitId.set(id);
    const state = history.state as any;
    if (state?.patient?.name) this.patientName.set(state.patient.name);

    // Load existing clinical data (doctor may have navigated back / refreshed)
    this.summaryService.getDiagnosesByVisit(id).pipe(catchError(() => of([]))).subscribe(list => {
      this.savedDiagnoses.set(list.map(d => ({ id: d.id, name: d.diagnosisName })));
    });

    this.summaryService.getLabTestsByVisit(id).pipe(catchError(() => of([]))).subscribe(list => {
      this.savedLabTests.set(list.map(t => ({ id: t.id, name: t.labTestName })));
    });
this.summaryService.getPrescriptionByVisit(id)
  .pipe(
    catchError(() => of(null))
  )
  .subscribe(p => {
    if (p && p.id) {
      this.prescriptionId.set(p.id);
      this.prescriptionInstructions = p.instructions ?? '';
      this.summaryService.getMedicationLines(p.id)
        .pipe(catchError(() => of([])))
        .subscribe(lines => {
          this.savedMedLines.set(lines.map(l => ({
            medicationId: l.medicationID,
            name:         l.medicationName ?? String(l.medicationID),
            dosage:       l.dosage ?? '',
            frequency:    l.frequency ?? '',
          })));
        });
    }
  });

    // Wire up medication search with debounce
    this.medSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (!q.trim()) { this.medSearchResults.set([]); return of([]); }
        this.medSearchLoading.set(true);
return this.summaryService.searchMedications(q).pipe(
  catchError(() => of([]))
);
      })
    ).subscribe(results => {
      this.medSearchResults.set(results as Medication[]);
      this.medSearchLoading.set(false);
      this.cdr.detectChanges();
    });
  }

  // ── Diagnosis ──────────────────────────────────────────────────────────────
  addDiagnosis(): void {
    const name = this.diagnosisInput.trim();
    if (!name) return;
    this.diagnosisLoading.set(true);
    this.diagnosisError.set(null);

    this.summaryService.createDiagnosis({ diagnosisName: name, visitID: this.visitId() })
      .pipe(catchError(err => {
        this.diagnosisError.set(err?.error?.message ?? 'Failed to add diagnosis.');
        this.diagnosisLoading.set(false);
        this.cdr.detectChanges();
        return of(null);
      }))
      .subscribe((res: any) => {
        if (res) {
          this.savedDiagnoses.update(d => [
            ...d,
            { id: res.id ?? res.diagnosisID ?? Date.now(), name },
          ]);
          this.diagnosisInput = '';
        }
        this.diagnosisLoading.set(false);
        this.cdr.detectChanges();
      });
  }

  removeDiagnosis(id: number): void {
    this.summaryService.deleteDiagnosisById(id)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.savedDiagnoses.update(d => d.filter(x => x.id !== id));
        this.cdr.detectChanges();
      });
  }

  // ── Prescription ───────────────────────────────────────────────────────────
createPrescription(): void {
  if (this.prescriptionId()) return; // already created

  const visitId = this.visitId();
  if (!visitId) {
    this.prescriptionError.set('Visit ID not found. Please refresh the page.');
    return;
  }

  const instructions = this.prescriptionInstructions.trim();
  if (!instructions) {
    this.prescriptionError.set('Instructions are required to create a prescription.');
    return;
  }

  this.prescriptionLoading.set(true);
  this.prescriptionError.set(null);

  this.summaryService.createPrescription({
    instructions,
    visitID: visitId,
  }).pipe(catchError(err => {
    const msg = err?.error?.errors
      ? Object.values(err.error.errors).flat().join(', ')
      : err?.error?.title ?? `Failed to create prescription (${err.status}).`;
    this.prescriptionError.set(msg);
    this.prescriptionLoading.set(false);
    this.cdr.detectChanges();
    return of(null);
  })).subscribe(res => {
    if (res && res.id) {
      this.prescriptionId.set(res.id);
    } else if (res) {
      this.summaryService.getPrescriptionByVisit(visitId)
        .pipe(catchError(() => of(null)))
        .subscribe(p => { if (p?.id) this.prescriptionId.set(p.id); });
    }
    this.prescriptionLoading.set(false);
    this.cdr.detectChanges();
  });
}

  // ── Medication search ──────────────────────────────────────────────────────
  updateInstructions(): void {
    const id = this.prescriptionId();
    if (!id) return;
    this.prescriptionLoading.set(true);
    this.summaryService.updatePrescription(id, { instructions: this.prescriptionInstructions })
      .pipe(catchError(err => {
        this.prescriptionError.set(err?.error?.message ?? 'Failed to update instructions.');
        this.prescriptionLoading.set(false);
        this.cdr.detectChanges();
        return of(null);
      }))
      .subscribe(() => {
        this.prescriptionLoading.set(false);
        this.cdr.detectChanges();
      });
  }

  onMedSearchInput(): void {
    this.medSearch$.next(this.medSearchQuery);
  }

  selectMed(med: Medication): void {
    this.selectedMed.set(med);
    this.medSearchQuery  = med.medicationName ?? '';
    this.medSearchResults.set([]);
    this.cdr.detectChanges();
  }

  clearSelectedMed(): void {
    this.selectedMed.set(null);
    this.medSearchQuery = '';
    this.medSearchResults.set([]);
  }

  addMedToPrescription(): void {
    const med    = this.selectedMed();
    const prescId = this.prescriptionId();
    if (!med || !prescId) return;

    this.medAddLoading.set(true);
    this.medAddError.set(null);

    this.summaryService.addMedicationToPrescription(prescId, {
      medicationID: med.id,
      dosage:    this.medDosage    || undefined,
      frequency: this.medFrequency || undefined,
      route:     this.medRoute     || undefined,
      duration:  this.medDuration  || undefined,
      notes:     this.medNotes     || undefined,
    }).pipe(catchError(err => {
        console.error('AddMedication 400 body:', JSON.stringify(err.error?.errors ?? err.error, null, 2));

      this.medAddError.set(err?.error?.message ?? 'Failed to add medication.');
      this.medAddLoading.set(false);
      this.cdr.detectChanges();
      return of(null);
    })).subscribe(res => {
      if (res !== null) {
        this.savedMedLines.update(l => [...l, {
          medicationId: med.id,
          name:      med.medicationName ?? '',
          dosage:    this.medDosage,
          frequency: this.medFrequency,
        }]);
        this.clearSelectedMed();
        this.medDosage = this.medFrequency = this.medRoute = this.medDuration = this.medNotes = '';
      }
      this.medAddLoading.set(false);
      this.cdr.detectChanges();
    });
  }

  removeMedLine(medicationId: number): void {
    const prescId = this.prescriptionId();
    if (!prescId) return;
    this.summaryService.removeMedicationFromPrescription(prescId, medicationId)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.savedMedLines.update(l => l.filter(x => x.medicationId !== medicationId));
        this.cdr.detectChanges();
      });
  }

  // ── Lab test ───────────────────────────────────────────────────────────────
  addLabTest(): void {
    const name = this.labTestInput.trim();
    if (!name) return;
    this.labTestLoading.set(true);
    this.labTestError.set(null);

    this.summaryService.orderLabTest({ labTestName: name, visitID: this.visitId() })
      .pipe(catchError(err => {
        this.labTestError.set(err?.error?.message ?? 'Failed to add lab test.');
        this.labTestLoading.set(false);
        this.cdr.detectChanges();
        return of(null);
      }))
      .subscribe(res => {
        if (res) {
          this.savedLabTests.update(l => [...l, { id: (res as any).id ?? (res as any).labTestID ?? Date.now(), name }]);
          this.labTestInput = '';
        }
        this.labTestLoading.set(false);
        this.cdr.detectChanges();
      });
  }

  removeLabTest(id: number): void {
    this.summaryService.deleteLabTest(id)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.savedLabTests.update(l => l.filter(x => x.id !== id));
        this.cdr.detectChanges();
      });
  }

  // ── Finalize (PUT SOAP only) ───────────────────────────────────────────────
finalize(): void {
  if (this.isFinalizing()) return;
  this.isFinalizing.set(true);
  this.finalizeError.set(null);
  this.finalizeSuccess.set(false);

  const v = this.soapForm.value;

  // FollowUp is REQUIRED by backend — always include it, even as empty string
  const dto: UpdateVisitDto = {
    followUp:       v.followUp      ?? '',
    whenToSeekHelp: v.whenToSeekHelp ?? '',
  };

  // Optional fields — only add if filled
  if (v.subjective?.trim())  dto.subjective  = v.subjective.trim();
  if (v.objective?.trim())   dto.objective   = v.objective.trim();
  if (v.assessment?.trim())  dto.assessment  = v.assessment.trim();
  if (v.plan?.trim())        dto.plan        = v.plan.trim();
  if (v.symptoms?.trim())    dto.symptoms    = v.symptoms.trim();

  this.visitService.updateVisit(this.visitId(), dto)
    .pipe(catchError(err => {
      console.error('Full error body:', JSON.stringify(err.error, null, 2));
      this.finalizeError.set(
        err?.error?.errors
          ? Object.values(err.error.errors).flat().join(', ')
          : err?.error?.title ?? err?.error?.message ?? 'Failed to save SOAP notes.'
      );
      this.isFinalizing.set(false);
      this.cdr.detectChanges();
      return of(null);
    }))
    .subscribe(res => {
      if (res !== null) {
        this.finalizeSuccess.set(true);
      }
      this.isFinalizing.set(false);
      this.cdr.detectChanges();
    });
}
  goBack(): void {
    this.router.navigate(['/doctor/today-visits']);
  }
}

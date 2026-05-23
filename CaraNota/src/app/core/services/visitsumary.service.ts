// src/app/core/services/visit-summary.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers §9 Diagnosis, §10 Medication, §11 Prescription, §12 Lab Test
// All interfaces imported from appointment.model.ts — no local redeclarations.
//
// ⚠️  MISSING ENDPOINTS (confirmed against CareNota_API_Docs.md):
//   - GET  /Api/Prescription/{Id}/Medications  → getMedicationLines()
//     NOT in the API docs. Confirm with backend before using.
//     If it doesn't exist, fetch prescription by ID and medication lines
//     will need to come from a separate backend endpoint.
//   - PUT  /Api/LabTest/{Id}
//     NOT in the API docs — no way to update lab test name or status.
//   - GET  /Api/Prescription
//     NOT in the API docs — no way to list ALL prescriptions globally.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Diagnosis,
  AssignDiagnosisDto,
  Prescription,
  CreatePrescriptionDto,
  AddMedicationToPrescriptionDto,
  LabTest,
  CreateLabTestDto,
} from '../models/appointment.model';
import { Medication } from '../models/patient.model';

// ── Types unique to this service (not in any model file) ──────────────────────

// A single medication line inside a prescription
// ⚠️ GET /Api/Prescription/{Id}/Medications is NOT in the API docs —
// confirm this endpoint exists with your backend team before using getMedicationLines()
export interface MedicationLine {
  medicationID: number;
  medicationName?: string;
  dosage?: string;       // e.g. "500mg"
  frequency?: string;    // e.g. "Twice daily"
  route?: string;        // e.g. "Oral", "IV", "Topical"
  duration?: string;     // e.g. "7 days"
  notes?: string;
}

export interface CreateMedicationDto {
  medicationName: string;
  medicationType: string;
  description?: string;
  strength?: string;
}

export interface UpdateMedicationDto {
  medicationType?: string;
  description?: string;
  strength?: string;
}

// Everything needed to render a completed visit detail page
export interface VisitClinicalData {
  diagnoses:       Diagnosis[];
  prescription:    Prescription | null;
  medicationLines: MedicationLine[];
  labTests:        LabTest[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VisitSummaryService {
  private http = inject(HttpClient);

  // ⚠️ Capital /Api/ — backend is case-sensitive for these routes
  private diagBase = `${environment.apiUrl}/Api/Diagnosis`;
  private rxBase   = `${environment.apiUrl}/Api/Prescription`;
  private medBase  = `${environment.apiUrl}/Api/Medication`;
  private labBase  = `${environment.apiUrl}/Api/LabTest`;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE — load all clinical data for a visit in one call
  // Use this when opening a visit detail / summary page
  // ═══════════════════════════════════════════════════════════════════════════

  loadVisitClinicalData(visitId: number): Observable<VisitClinicalData> {
    return new Observable<VisitClinicalData>(observer => {
      // Diagnoses and lab tests are independent — fetch in parallel
      forkJoin({
        diagnoses: this.getDiagnosesByVisit(visitId),
        labTests:  this.getLabTestsByVisit(visitId),
      }).subscribe({
        next: ({ diagnoses, labTests }) => {
          // Prescription must come first to get its id for medication lines
          this.getPrescriptionByVisit(visitId).subscribe({
            next: (prescription) => {
              this.getMedicationLines(prescription.id).subscribe({
                next: (medicationLines) => {
                  observer.next({ diagnoses, prescription, medicationLines, labTests });
                  observer.complete();
                },
                error: () => {
                  // Medication lines endpoint may not exist yet — degrade gracefully
                  observer.next({ diagnoses, prescription, medicationLines: [], labTests });
                  observer.complete();
                },
              });
            },
            error: () => {
              // No prescription yet for this visit — that is fine
              observer.next({ diagnoses, prescription: null, medicationLines: [], labTests });
              observer.complete();
            },
          });
        },
        error: (err) => observer.error(err),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §9 DIAGNOSIS  —  /Api/Diagnosis
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /Api/Diagnosis
  getAllDiagnoses(): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(this.diagBase);
  }

  // GET /Api/Diagnosis/Search?Query={q}
  searchDiagnoses(query: string): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.diagBase}/Search`, {
      params: { Query: query },
    });
  }

  // GET /Api/Diagnosis/{IcdCode}
  getDiagnosisByCode(icdCode: string): Observable<Diagnosis> {
    return this.http.get<Diagnosis>(`${this.diagBase}/${icdCode}`);
  }

  // POST /Api/Diagnosis
  // Body: { icD10Code, diagnosisName }
  createDiagnosis(dto: Diagnosis): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(this.diagBase, dto);
  }

  // DELETE /Api/Diagnosis/{IcdCode}
  deleteDiagnosis(icdCode: string): Observable<void> {
    return this.http.delete<void>(`${this.diagBase}/${icdCode}`);
  }

  // GET /Api/Diagnosis/Visit/{VisitId}
  getDiagnosesByVisit(visitId: number): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.diagBase}/Visit/${visitId}`);
  }

  // POST /Api/Diagnosis/Visit/{VisitId}/Assign
  // Body: { icD10Code }  ⚠️ odd casing — must match backend exactly
  assignDiagnosisToVisit(visitId: number, icdCode: string): Observable<void> {
    const dto: AssignDiagnosisDto = { icD10Code: icdCode };
    return this.http.post<void>(`${this.diagBase}/Visit/${visitId}/Assign`, dto);
  }

  // DELETE /Api/Diagnosis/Visit/{VisitId}/{IcdCode}
  removeDiagnosisFromVisit(visitId: number, icdCode: string): Observable<void> {
    return this.http.delete<void>(`${this.diagBase}/Visit/${visitId}/${icdCode}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §10 MEDICATION CATALOG  —  /Api/Medication
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /Api/Medication
  getAllMedications(): Observable<Medication[]> {
    return this.http.get<Medication[]>(this.medBase);
  }

  // GET /Api/Medication/Search?Name={n}
  searchMedications(name: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.medBase}/Search`, {
      params: { Name: name },
    });
  }

  // GET /Api/Medication/Type/{Type}
  getMedicationsByType(type: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.medBase}/Type/${type}`);
  }

  // GET /Api/Medication/{Id}
  getMedicationById(id: number): Observable<Medication> {
    return this.http.get<Medication>(`${this.medBase}/${id}`);
  }

  // POST /Api/Medication
  createMedication(dto: CreateMedicationDto): Observable<Medication> {
    return this.http.post<Medication>(this.medBase, dto);
  }

  // PUT /Api/Medication/{Id}
  // Body: { medicationType, description, strength }
  updateMedication(id: number, dto: UpdateMedicationDto): Observable<Medication> {
    return this.http.put<Medication>(`${this.medBase}/${id}`, dto);
  }

  // DELETE /Api/Medication/{Id}
  deleteMedication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.medBase}/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §11 PRESCRIPTION  —  /Api/Prescription
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /Api/Prescription
  // Body: { instructions, visitID }
  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(this.rxBase, dto);
  }

  // GET /Api/Prescription/{Id}
  getPrescriptionById(id: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.rxBase}/${id}`);
  }

  // GET /Api/Prescription/Visit/{VisitId}
  getPrescriptionByVisit(visitId: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.rxBase}/Visit/${visitId}`);
  }

  // PUT /Api/Prescription/{Id}
  // Body: { instructions }
  updatePrescription(id: number, instructions: string): Observable<void> {
    return this.http.put<void>(`${this.rxBase}/${id}`, { instructions });
  }

  // DELETE /Api/Prescription/{Id}
  deletePrescription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.rxBase}/${id}`);
  }

  // POST /Api/Prescription/{Id}/Medications
  // Body: { medicationID, dosage, frequency, route, duration, notes }
  addMedicationToPrescription(
    prescriptionId: number,
    dto: AddMedicationToPrescriptionDto
  ): Observable<void> {
    return this.http.post<void>(`${this.rxBase}/${prescriptionId}/Medications`, dto);
  }

  // DELETE /Api/Prescription/{Id}/Medications/{MedicationId}
  removeMedicationFromPrescription(
    prescriptionId: number,
    medicationId: number
  ): Observable<void> {
    return this.http.delete<void>(`${this.rxBase}/${prescriptionId}/Medications/${medicationId}`);
  }

  // ⚠️ NOT IN API DOCS — confirm with backend before using
  // GET /Api/Prescription/{Id}/Medications
  getMedicationLines(prescriptionId: number): Observable<MedicationLine[]> {
    return this.http.get<MedicationLine[]>(`${this.rxBase}/${prescriptionId}/Medications`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // §12 LAB TESTS  —  /Api/LabTest
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /Api/LabTest
  // Body: { labTestName, visitID }
  orderLabTest(dto: CreateLabTestDto): Observable<LabTest> {
    return this.http.post<LabTest>(this.labBase, dto);
  }

  // GET /Api/LabTest/{Id}
  getLabTestById(id: number): Observable<LabTest> {
    return this.http.get<LabTest>(`${this.labBase}/${id}`);
  }

  // GET /Api/LabTest/Visit/{VisitId}
  getLabTestsByVisit(visitId: number): Observable<LabTest[]> {
    return this.http.get<LabTest[]>(`${this.labBase}/Visit/${visitId}`);
  }

  // DELETE /Api/LabTest/{Id}
  deleteLabTest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.labBase}/${id}`);
  }

  // POST /Api/LabTest/{Id}/UploadResult  — multipart/form-data
  // Usage:
  //   const file = event.target.files[0];
  //   this.visitSummaryService.uploadLabResult(labTestId, file).subscribe(...)
  uploadLabResult(labTestId: number, file: File): Observable<void> {
    const form = new FormData();
    form.append('ResultFile', file, file.name);
    return this.http.post<void>(`${this.labBase}/${labTestId}/UploadResult`, form);
  }

  // GET /Api/LabTest/{Id}/Download  — returns a file blob
  // Usage:
  //   this.visitSummaryService.downloadLabResult(id).subscribe(blob => {
  //     const url = URL.createObjectURL(blob);
  //     window.open(url);
  //   });
  downloadLabResult(labTestId: number): Observable<Blob> {
    return this.http.get(`${this.labBase}/${labTestId}/Download`, {
      responseType: 'blob',
    });
  }
}

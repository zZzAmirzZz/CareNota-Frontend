// src/app/core/services/visit-summary.service.ts
//
// Covers all four clinical-data modules for a single visit:
//   • Diagnosis    — ICD-10 coded diagnoses on a visit
//   • Prescription — prescription header + medication lines
//   • Medication   — searchable medication catalog
//   • LabTest      — lab test orders + result file upload/download
//
// API reference: CareNota_API_Documentation.docx §7, §8, §9, §10

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── Diagnosis ────────────────────────────────────────────────────────────────

export interface Diagnosis {
  icD10Code: string;        // e.g. "J18.9"
  diagnosisName: string;    // e.g. "Pneumonia, unspecified"
}

export interface CreateDiagnosisDto {
  icD10Code: string;
  diagnosisName: string;
}

export interface AssignDiagnosisDto {
  icD10Code: string;
}

// ─── Medication (catalog) ─────────────────────────────────────────────────────

export interface Medication {
  id: number;
  medicationName: string;
  medicationType: string;   // e.g. "Antibiotic", "Analgesic"
  description?: string;
  strength?: string;        // e.g. "500mg"
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

// ─── Prescription ─────────────────────────────────────────────────────────────

export interface Prescription {
  id: number;
  instructions?: string;
  visitID: number;
}

export interface CreatePrescriptionDto {
  instructions?: string;
  visitID: number;
}

export interface MedicationLine {
  medicationID: number;
  medicationName?: string;
  dosage?: string;          // e.g. "500mg"
  frequency?: string;       // e.g. "Twice daily"
  route?: string;           // e.g. "Oral", "IV", "Topical"
  duration?: string;        // e.g. "7 days"
  notes?: string;
}

export interface AddMedicationToPrescriptionDto {
  medicationID: number;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  notes?: string;
}

// ─── Lab Test ─────────────────────────────────────────────────────────────────

export interface LabTest {
  id: number;
  labTestName: string;      // e.g. "CBC", "LFT"
  visitID: number;
  resultFileUrl?: string;   // present after UploadResult
}

export interface CreateLabTestDto {
  labTestName: string;
  visitID: number;
}

// ─── Full visit summary (what you load when opening a completed visit) ────────

export interface VisitSummary {
  diagnoses: Diagnosis[];
  prescription: Prescription | null;
  medicationLines: MedicationLine[];
  labTests: LabTest[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class VisitSummaryService {
  private http = inject(HttpClient);

  // Base URLs — capital letters matter, .NET routing is case-sensitive
  private diagBase  = `${environment.apiUrl}/Api/Diagnosis`;
  private rxBase    = `${environment.apiUrl}/Api/Prescription`;
  private medBase   = `${environment.apiUrl}/Api/Medication`;
  private labBase   = `${environment.apiUrl}/Api/LabTest`;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE — load everything for a visit in one call
  // Use this when opening a visit detail / summary page
  // ═══════════════════════════════════════════════════════════════════════════

  loadVisitSummary(visitId: number): Observable<VisitSummary> {
    // Diagnosis and LabTest are independent — fetch in parallel.
    // Prescription must be fetched first to get its id, then fetch its medication lines.
    return new Observable<VisitSummary>(observer => {
      forkJoin({
        diagnoses: this.getDiagnosesByVisit(visitId),
        labTests:  this.getLabTestsByVisit(visitId),
      }).subscribe({
        next: ({ diagnoses, labTests }) => {
          this.getPrescriptionByVisit(visitId).subscribe({
            next: (prescription) => {
              this.getMedicationLines(prescription.id).subscribe({
                next: (medicationLines) => {
                  observer.next({ diagnoses, prescription, medicationLines, labTests });
                  observer.complete();
                },
                error: () => {
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
  // DIAGNOSIS  — /Api/Diagnosis
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /Api/Diagnosis — full catalog (use for admin/search fallback)
  getAllDiagnoses(): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(this.diagBase);
  }

  // GET /Api/Diagnosis/Search?Query={q} — search while doctor types
  searchDiagnoses(query: string): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.diagBase}/Search`, {
      params: { Query: query },
    });
  }

  // GET /Api/Diagnosis/{IcdCode}
  getDiagnosisByCode(icdCode: string): Observable<Diagnosis> {
    return this.http.get<Diagnosis>(`${this.diagBase}/${icdCode}`);
  }

  // POST /Api/Diagnosis — create a new diagnosis entry in the catalog
  createDiagnosis(dto: CreateDiagnosisDto): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(this.diagBase, dto);
  }

  // DELETE /Api/Diagnosis/{IcdCode} — remove from catalog (admin only)
  deleteDiagnosis(icdCode: string): Observable<void> {
    return this.http.delete<void>(`${this.diagBase}/${icdCode}`);
  }

  // GET /Api/Diagnosis/Visit/{VisitId} — diagnoses assigned to a visit
  getDiagnosesByVisit(visitId: number): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.diagBase}/Visit/${visitId}`);
  }

  // POST /Api/Diagnosis/Visit/{VisitId}/Assign — assign an existing diagnosis to a visit
  assignDiagnosisToVisit(visitId: number, icdCode: string): Observable<void> {
    const dto: AssignDiagnosisDto = { icD10Code: icdCode };
    return this.http.post<void>(`${this.diagBase}/Visit/${visitId}/Assign`, dto);
  }

  // DELETE /Api/Diagnosis/Visit/{VisitId}/{IcdCode} — remove diagnosis from a visit
  removeDiagnosisFromVisit(visitId: number, icdCode: string): Observable<void> {
    return this.http.delete<void>(`${this.diagBase}/Visit/${visitId}/${icdCode}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTION  — /Api/Prescription
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /Api/Prescription — create prescription header for a visit
  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(this.rxBase, dto);
  }

  // GET /Api/Prescription/{Id}
  getPrescriptionById(id: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.rxBase}/${id}`);
  }

  // GET /Api/Prescription/Visit/{VisitId} — get the prescription for a visit
  getPrescriptionByVisit(visitId: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.rxBase}/Visit/${visitId}`);
  }

  // PUT /Api/Prescription/{Id} — update general instructions
  updatePrescription(id: number, instructions: string): Observable<Prescription> {
    return this.http.put<Prescription>(`${this.rxBase}/${id}`, { instructions });
  }

  // DELETE /Api/Prescription/{Id}
  deletePrescription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.rxBase}/${id}`);
  }

  // POST /Api/Prescription/{Id}/Medications — add a medication line to a prescription
  addMedicationToPrescription(
    prescriptionId: number,
    dto: AddMedicationToPrescriptionDto
  ): Observable<void> {
    return this.http.post<void>(`${this.rxBase}/${prescriptionId}/Medications`, dto);
  }

  // GET /Api/Prescription/{Id}/Medications — list medication lines
  // NOTE: not in the written docs but IS in Postman — confirm with backend
  getMedicationLines(prescriptionId: number): Observable<MedicationLine[]> {
    return this.http.get<MedicationLine[]>(`${this.rxBase}/${prescriptionId}/Medications`);
  }

  // DELETE /Api/Prescription/{Id}/Medications/{MedId}
  removeMedicationFromPrescription(prescriptionId: number, medId: number): Observable<void> {
    return this.http.delete<void>(`${this.rxBase}/${prescriptionId}/Medications/${medId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICATION CATALOG  — /Api/Medication
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /Api/Medication — full list
  getAllMedications(): Observable<Medication[]> {
    return this.http.get<Medication[]>(this.medBase);
  }

  // GET /Api/Medication/Search?Name={n} — search by name while doctor types
  searchMedications(name: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.medBase}/Search`, {
      params: { Name: name },
    });
  }

  // GET /Api/Medication/Type/{Type} — filter by type e.g. "Antibiotic"
  getMedicationsByType(type: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(`${this.medBase}/Type/${type}`);
  }

  // GET /Api/Medication/{Id}
  getMedicationById(id: number): Observable<Medication> {
    return this.http.get<Medication>(`${this.medBase}/${id}`);
  }

  // POST /Api/Medication — add new medication to catalog (admin only)
  createMedication(dto: CreateMedicationDto): Observable<Medication> {
    return this.http.post<Medication>(this.medBase, dto);
  }

  // PUT /Api/Medication/{Id}
  updateMedication(id: number, dto: UpdateMedicationDto): Observable<Medication> {
    return this.http.put<Medication>(`${this.medBase}/${id}`, dto);
  }

  // DELETE /Api/Medication/{Id}
  deleteMedication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.medBase}/${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAB TESTS  — /Api/LabTest
  // ═══════════════════════════════════════════════════════════════════════════

  // POST /Api/LabTest — order a new lab test for a visit
  orderLabTest(dto: CreateLabTestDto): Observable<LabTest> {
    return this.http.post<LabTest>(this.labBase, dto);
  }

  // GET /Api/LabTest/{Id}
  getLabTestById(id: number): Observable<LabTest> {
    return this.http.get<LabTest>(`${this.labBase}/${id}`);
  }

  // GET /Api/LabTest/Visit/{VisitId} — all lab tests for a visit
  getLabTestsByVisit(visitId: number): Observable<LabTest[]> {
    return this.http.get<LabTest[]>(`${this.labBase}/Visit/${visitId}`);
  }

  // DELETE /Api/LabTest/{Id}
  deleteLabTest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.labBase}/${id}`);
  }

  // POST /Api/LabTest/{Id}/UploadResult — multipart/form-data file upload
  // Usage: pass a File object from an <input type="file">
  // Example:
  //   const file = event.target.files[0];
  //   this.visitSummary.uploadLabResult(labTestId, file).subscribe(...)
  uploadLabResult(labTestId: number, file: File): Observable<void> {
    const form = new FormData();
    form.append('ResultFile', file, file.name);
    return this.http.post<void>(`${this.labBase}/${labTestId}/UploadResult`, form);
  }

  // GET /Api/LabTest/{Id}/Download — returns a file blob
  // Usage: subscribe and create a download link from the blob
  // Example:
  //   this.visitSummary.downloadLabResult(id).subscribe(blob => {
  //     const url = URL.createObjectURL(blob);
  //     window.open(url);
  //   });
  downloadLabResult(labTestId: number): Observable<Blob> {
    return this.http.get(`${this.labBase}/${labTestId}/Download`, {
      responseType: 'blob',
    });
  }
}

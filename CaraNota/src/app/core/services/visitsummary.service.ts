// core/services/visitsummary.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Covers §9 Diagnosis, §10 Medication, §11 Prescription, §12 Lab Test
//
// CHANGES vs previous version:
//   ✅ DIAGNOSIS — completely rewritten to match new Swagger:
//      - getAllDiagnoses() REMOVED — no list-all endpoint
//      - searchDiagnoses() REMOVED — no search endpoint
//      - getDiagnosisByCode() REMOVED — no ICD lookup endpoint
//      - deleteDiagnosis(icdCode) REMOVED — delete now takes integer Id, not ICD string
//      - removeDiagnosisFromVisit() REMOVED — no such endpoint
//      - createDiagnosis() fixed → uses API.DIAGNOSIS.CREATE
//      - deleteDiagnosisById(id: number) ADDED → uses API.DIAGNOSIS.DELETE(id)
//   ✅ PRESCRIPTION — API keys renamed (LIST → CREATE, MEDICATIONS → ADD_MEDICATION etc.)
//   ✅ LAB TEST — LIST → CREATE
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap, catchError, map } from 'rxjs';
import { API } from '../constants/api';
import { Medication } from '../models/patient.model';

// ── Local interfaces ──────────────────────────────────────────────────────────

export interface Diagnosis {
  id:            number;
  diagnosisName: string;
  visitID?:      number;
}

export interface CreateDiagnosisDto {
  diagnosisName: string;
  visitID:       number;    // ⚠️ capital ID — matches Swagger exactly
}

export interface Prescription {
  id:           number;
  instructions?: string | null;
  visitID?:     number;
}

export interface CreatePrescriptionDto {
  instructions?: string | null;
  visitID:       number;    // ⚠️ capital ID
}

export interface UpdatePrescriptionDto {
  instructions?: string | null;
}

export interface AddMedicationToPrescriptionDto {
  medicationID: number;    // ⚠️ capital ID
  dosage?:      string | null;
  frequency?:   string | null;
  route?:       string | null;
  duration?:    string | null;
  notes?:       string | null;
}

export interface MedicationLine {
  medicationID:    number;
  medicationName?: string;
  dosage?:         string | null;
  frequency?:      string | null;
  route?:          string | null;
  duration?:       string | null;
  notes?:          string | null;
}

export interface CreateMedicationDto {
  medicationName:  string;
  medicationType:  string;
  description?:    string | null;
  strength?:       string | null;
}

export interface UpdateMedicationDto {
  medicationType?: string | null;
  description?:    string | null;
  strength?:       string | null;
}

export interface LabTest {
  id:           number;
  labTestName:  string;
  visitID?:     number;
  resultFileUrl?: string | null;
}

export interface CreateLabTestDto {
  labTestName: string;
  visitID:     number;    // ⚠️ capital ID
}

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

  // ── Convenience: load all clinical data for a visit in one stream ──────────
  loadVisitClinicalData(visitId: number): Observable<VisitClinicalData> {
    return forkJoin({
      diagnoses: this.getDiagnosesByVisit(visitId),
      labTests:  this.getLabTestsByVisit(visitId),
    }).pipe(
      switchMap(({ diagnoses, labTests }) =>
        this.getPrescriptionByVisit(visitId).pipe(
          catchError(() => of(null)),
          switchMap(prescription =>
            prescription
              ? this.getMedicationLines(prescription.id).pipe(
                  catchError(() => of([])),
                  map(medicationLines => ({ diagnoses, labTests, prescription, medicationLines }))
                )
              : of({ diagnoses, labTests, prescription: null, medicationLines: [] })
          )
        )
      )
    );
  }

  // ── §9 DIAGNOSIS ──────────────────────────────────────────────────────────
  // ⚠️ New Swagger only has 3 diagnosis endpoints — see api.ts §9 comments.

  // GET /Api/Diagnosis/Visit/{VisitId}
  getDiagnosesByVisit(visitId: number): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(API.DIAGNOSIS.BY_VISIT(visitId));
  }

  // POST /Api/Diagnosis  — body: { diagnosisName, visitID }
  createDiagnosis(dto: CreateDiagnosisDto): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(API.DIAGNOSIS.CREATE, dto);
  }

  // DELETE /Api/Diagnosis/{Id}  — integer Id, NOT an ICD string
  deleteDiagnosisById(id: number): Observable<void> {
    return this.http.delete<void>(API.DIAGNOSIS.DELETE(id));
  }

  // ── §10 MEDICATION ────────────────────────────────────────────────────────

  // GET /Api/Medication
  getAllMedications(): Observable<Medication[]> {
    return this.http.get<Medication[]>(API.MEDICATION.LIST);
  }

 // GET /Api/Medication/Search?Name=
searchMedications(name: string): Observable<Medication[]> {
  return this.http.get<any[]>(API.MEDICATION.SEARCH, { params: { Name: name } }).pipe(
    map(list => (list ?? []).map(m => this.normalizeMedication(m)))
  );
}

  // GET /Api/Medication/Type/{Type}
  getMedicationsByType(type: string): Observable<Medication[]> {
    return this.http.get<Medication[]>(API.MEDICATION.BY_TYPE(type));
  }

  // GET /Api/Medication/{Id}
  getMedicationById(id: number): Observable<Medication> {
    return this.http.get<Medication>(API.MEDICATION.BY_ID(id));
  }

  // POST /Api/Medication
  createMedication(dto: CreateMedicationDto): Observable<Medication> {
    return this.http.post<Medication>(API.MEDICATION.LIST, dto);
  }

  // PUT /Api/Medication/{Id}
  updateMedication(id: number, dto: UpdateMedicationDto): Observable<Medication> {
    return this.http.put<Medication>(API.MEDICATION.BY_ID(id), dto);
  }

  // DELETE /Api/Medication/{Id}
  deleteMedication(id: number): Observable<void> {
    return this.http.delete<void>(API.MEDICATION.BY_ID(id));
  }

  // ── §11 PRESCRIPTION ──────────────────────────────────────────────────────

  // POST /Api/Prescription
  createPrescription(dto: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<any>(API.PRESCRIPTION.CREATE, dto).pipe(
      map(raw => this.normalizePrescription(raw))
    );
  }

  // GET /Api/Prescription/{Id}
  getPrescriptionById(id: number): Observable<Prescription> {
    return this.http.get<any>(API.PRESCRIPTION.BY_ID(id)).pipe(
      map(raw => this.normalizePrescription(raw))
    );
  }

  // GET /Api/Prescription/Visit/{VisitId}
  // Returns null (not an error) when the visit has no prescription yet (404).
  getPrescriptionByVisit(visitId: number): Observable<Prescription | null> {
    return this.http.get<any>(API.PRESCRIPTION.BY_VISIT(visitId)).pipe(
      map(raw => {
        if (!raw) return null;
        // Backend may return a single object or a single-element array
        const obj = Array.isArray(raw) ? raw[0] : raw;
        if (!obj) return null;
        return this.normalizePrescription(obj);
      }),
      catchError(err => {
        // 404 = no prescription yet — this is normal, not an error
        if (err.status === 404 || err.status === 400) return of(null);
        throw err; // re-throw unexpected errors
      })
    );
  }

  // PUT /Api/Prescription/{Id}
  updatePrescription(id: number, dto: UpdatePrescriptionDto): Observable<void> {
    return this.http.put<void>(API.PRESCRIPTION.BY_ID(id), dto);
  }

  // DELETE /Api/Prescription/{Id}
  deletePrescription(id: number): Observable<void> {
    return this.http.delete<void>(API.PRESCRIPTION.BY_ID(id));
  }

  // POST /Api/Prescription/{Id}/Medications
  addMedicationToPrescription(
    prescriptionId: number,
    dto: AddMedicationToPrescriptionDto
  ): Observable<void> {
    return this.http.post<void>(API.PRESCRIPTION.ADD_MEDICATION(prescriptionId), dto);
  }

  // DELETE /Api/Prescription/{Id}/Medications/{MedicationId}
  removeMedicationFromPrescription(
    prescriptionId: number,
    medicationId: number
  ): Observable<void> {
    return this.http.delete<void>(
      API.PRESCRIPTION.REMOVE_MEDICATION(prescriptionId, medicationId)
    );
  }

  // GET /Api/Prescription/{Id}/Medications
  // ⚠️ No separate GET /Medications endpoint in Swagger.
  //    Medications are embedded in GET /Api/Prescription/{Id} response.
  //    Fetch the prescription and extract the medications array from it.
  getMedicationLines(prescriptionId: number): Observable<MedicationLine[]> {
    return this.http.get<any>(API.PRESCRIPTION.BY_ID(prescriptionId)).pipe(
      map(raw => {
        // Backend embeds medications as raw.medications or raw.prescriptionMedications
        const lines: any[] = raw.medications ?? raw.prescriptionMedications ?? [];
        return lines.map(l => ({
          medicationID:   l.medicationID   ?? l.medicationId   ?? l.id ?? 0,
          medicationName: l.medicationName ?? l.name           ?? '',
          dosage:         l.dosage         ?? null,
          frequency:      l.frequency      ?? null,
          route:          l.route          ?? null,
          duration:       l.duration       ?? null,
          notes:          l.notes          ?? null,
        } as MedicationLine));
      })
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  // ⚠️ Backend returns prescriptionID (capital ID) not `id` — normalize defensively
  private normalizePrescription(raw: any): Prescription {
    if (!raw) return { id: 0, instructions: null, visitID: undefined };
    return {
      id:           raw.id ?? raw.prescriptionID ?? raw.prescriptionId ?? 0,
      instructions: raw.instructions ?? null,
      visitID:      raw.visitID ?? raw.visitId ?? undefined,
    };
  }
  private normalizeMedication(raw: any): Medication {
  return {
    id:             raw.id ?? raw.medicationID ?? raw.medicationId ?? 0,
    medicationName: raw.medicationName ?? raw.name ?? '',
    medicationType: raw.medicationType ?? '',
    description:    raw.description ?? null,
    strength:       raw.strength ?? null,
  };
}

  // ── §12 LAB TEST ──────────────────────────────────────────────────────────

  // POST /Api/LabTest  — body: { labTestName, visitID }
  orderLabTest(dto: CreateLabTestDto): Observable<LabTest> {
    return this.http.post<LabTest>(API.LAB_TEST.CREATE, dto);
  }

  // GET /Api/LabTest/{Id}
  getLabTestById(id: number): Observable<LabTest> {
    return this.http.get<LabTest>(API.LAB_TEST.BY_ID(id));
  }

  // GET /Api/LabTest/Visit/{VisitId}
  getLabTestsByVisit(visitId: number): Observable<LabTest[]> {
    return this.http.get<LabTest[]>(API.LAB_TEST.BY_VISIT(visitId));
  }

  // DELETE /Api/LabTest/{Id}
  deleteLabTest(id: number): Observable<void> {
    return this.http.delete<void>(API.LAB_TEST.BY_ID(id));
  }

  // POST /Api/LabTest/{Id}/UploadResult  — multipart/form-data { ResultFile }
  uploadLabResult(labTestId: number, file: File): Observable<void> {
    const form = new FormData();
    form.append('ResultFile', file, file.name);
    return this.http.post<void>(API.LAB_TEST.UPLOAD_RESULT(labTestId), form);
  }

  // GET /Api/LabTest/{Id}/Download → Blob
  downloadLabResult(labTestId: number): Observable<Blob> {
    return this.http.get(API.LAB_TEST.DOWNLOAD(labTestId), { responseType: 'blob' });
  }
}

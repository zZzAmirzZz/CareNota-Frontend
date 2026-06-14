// core/models/visit.model.ts
// Source of truth: swagger_new.json → CreateVisitDto, UpdateVisitDto, VisitSummaryResponseDto

// ── Visit (response shape) ────────────────────────────────────────────────────
// ⚠️ Backend returns visitId (camelCase) from GET endpoints.
//    Use normalization guard (v.visitId ?? v.visitID) when mapping raw responses.
export interface Visit {
  visitId:       number;
  visitDate:     string;
  subjective?:   string;
  objective?:    string;
  assessment?:   string;
  plan?:         string;
  symptoms?:     string;
  appointmentID: number;
}

// ── POST /Api/Visit ───────────────────────────────────────────────────────────
// ⚠️ `appointmentID` is capital ID — matches Swagger CreateVisitDto exactly.
// ⚠️ `symptoms` added — was missing in old model.
export interface CreateVisitDto {
  appointmentID: number;
  visitDate:     string;       // ISO 8601 UTC e.g. new Date().toISOString()
  subjective?:   string | null;
  objective?:    string | null;
  assessment?:   string | null;
  plan?:         string | null;
  symptoms?:     string | null;
}

// ── PUT /Api/Visit/{Id} ───────────────────────────────────────────────────────
export interface UpdateVisitDto {
  subjective?:      string | null;
  objective?:       string | null;
  assessment?:      string | null;
  plan?:            string | null;
  symptoms?:        string | null;
  whenToSeekHelp?:  string | null;
  followUp?:        string | null;
}

// ── Summary DTOs  /api/visits/{visitId}/summary ───────────────────────────────

// Nested inside VisitSummaryResponseDto — doctor-facing SOAP note
export interface DoctorSummaryDto {
  aiSummaryId:                  number;
  subjective?:                  string | null;
  objective?:                   string | null;
  assessment?:                  string | null;
  plan?:                        string | null;
  comparisonWithPreviousVisit?: string | null;
}

// Nested inside VisitSummaryResponseDto — patient-facing summary
export interface PatientSummaryDto {
  aiSummaryId:     number;
  diagnosis?:      string | null;
  symptoms?:       string | null;
  treatmentPlan?:  string | null;
  whenToSeekHelp?: string | null;   // ← NEW field
  followUp?:       string | null;
}

// GET /api/visits/{visitId}/summary
export interface VisitSummaryResponseDto {
  visitId:        number;
  isApproved:     boolean;
  doctorSummary:  DoctorSummaryDto;
  patientSummary: PatientSummaryDto;
}

// PUT /api/visits/{visitId}/summary  — doctor edits before approving
// ⚠️ `whenToSeekHelp` is new. `diagnosis`, `symptoms`, `treatmentPlan`, `followUp`
//    are patient-summary fields also editable here.
export interface EditSummaryDto {
  subjective?:                  string | null;
  objective?:                   string | null;
  assessment?:                  string | null;
  plan?:                        string | null;
  comparisonWithPreviousVisit?: string | null;
  diagnosis?:                   string | null;
  symptoms?:                    string | null;
  treatmentPlan?:               string | null;
  whenToSeekHelp?:              string | null;   // ← NEW
  followUp?:                    string | null;
}

// Alias used by summary.service.ts
export type UpdateSummaryDto = EditSummaryDto;

// POST /api/visits/{visitId}/summary/approve
// ⚠️ Swagger shows NO request body on this endpoint — send null.
//    Kept as empty interface so call sites compile: http.post(url, null)
export interface ApproveSummaryDto {}

// POST /api/visits/{visitId}/summary/rating
export interface RateSummaryDto {
  rating:    number;
  feedback?: string | null;
}

export interface RateSummaryResponseDto {
  aiSummaryID: number;    // ⚠️ capital ID — backend inconsistency
  rating:      number;
  feedback?:   string | null;
  message?:    string | null;
}

// GET /api/visits/{visitId}/patient-summary — standalone patient portal endpoint
export interface PatientSummaryViewDto {
  visitId:         number;
  visitDate:       string;
  diagnosis?:      string | null;
  symptoms?:       string | null;
  treatmentPlan?:  string | null;
  whenToSeekHelp?: string | null;   // ← NEW
  followUp?:       string | null;
}

// ── Audio ─────────────────────────────────────────────────────────────────────

export type AudioProcessingStatus = 'Processing' | 'Completed' | 'Failed';

export interface AudioStatusDto {
  visitId: number;
  status:  AudioProcessingStatus;
}

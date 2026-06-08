// core/models/appointment.model.ts
// Aligned with swagger__2_.json (current source of truth)

// ── Appointment ───────────────────────────────────────────────────────────────
export interface Appointment {
  appointmentID:   number;
  startTime:       string;
  endTime:         string;
  status:          AppointmentStatus;
  appointmentType: string;
  createdAt:       string;
  patientID:       number;
  patientName:     string;
  doctorID:        number;
  doctorName:      string;
  receptionistID?: number;
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface CreateAppointmentDto {
  startTime:      string;   // ISO 8601
  endTime:        string;
  appointmentType: string;
  patientID:      number;
  doctorID:       number;
  receptionistID: number;   // required in swagger — no ?
}

export interface UpdateAppointmentDto {
  startTime?:       string;
  endTime?:         string;
  status?:          AppointmentStatus;
  appointmentType?: string;
}

export interface TimeSlot {
  start: string;
  end:   string;
}

// ── Visit ─────────────────────────────────────────────────────────────────────
export interface Visit {
  visitID: number;  // was visitId  visitDate:     string;
  subjective?:   string;
  objective?:    string;
  assessment?:   string;
  plan?:         string;
  appointmentID: number;
}

export interface CreateVisitDto {
  appointmentID: number;
  visitDate:     string;   // ISO 8601
  subjective?:   string;
  objective?:    string;
  assessment?:   string;
  plan?:         string;
  symptoms?:     string;   // swagger includes this in CreateVisitDto
}

// Matches swagger UpdateVisitDto exactly
export interface UpdateVisitDto {
  subjective?:     string;
  objective?:      string;
  assessment?:     string;
  plan?:           string;
  symptoms?:       string;
  whenToSeekHelp?: string;
  followUp?:       string; // swagger field name is `followUp`, not `followUpDate`
}

// ── Audio ─────────────────────────────────────────────────────────────────────
export interface AudioRecordResponseDto {
  audioId:      number;
  audioFileUrl: string;
  createdAt:    string;
  deletionAt:   string;
  visitId:      number;
  message:      string;
}

export type AudioProcessingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface AudioStatusDto {
  visitId:        number;
  status:         AudioProcessingStatus;
  transcription?: string;
}

// ── Summary ───────────────────────────────────────────────────────────────────

// Doctor-facing SOAP summary — `doctorRating` not in swagger, correctly excluded
export interface DoctorSummaryDto {
  aiSummaryId: number;
  subjective:  string;
  objective:   string;
  assessment:  string;
  plan:        string;
}

// Matches swagger PatientSummaryDto exactly — `followUp` IS in the schema
export interface PatientSummaryDto {
  aiSummaryId:     number;
  diagnosis:       string;
  symptoms:        string;
  treatmentPlan:   string;
  whenToSeekHelp:  string;
  followUp:        string; // present in swagger — was incorrectly removed before
}

export interface VisitSummaryResponseDto {
  visitId:        number;
  isApproved:     boolean;
  doctorSummary:  DoctorSummaryDto;
  patientSummary: PatientSummaryDto;
}

// Matches swagger EditSummaryDto — all 9 fields included
export interface UpdateSummaryDto {
  subjective?:     string;
  objective?:      string;
  assessment?:     string;
  plan?:           string;
  diagnosis?:      string; // ← was missing
  symptoms?:       string; // ← was missing
  treatmentPlan?:  string; // ← was missing
  whenToSeekHelp?: string;
  followUp?:       string; // ← was missing; field name is `followUp` not `followUpDate`
}

// POST /api/visits/{id}/summary/approve — no request body in swagger
export interface ApproveSummaryDto {
  // intentionally empty — endpoint takes no body
}

// POST /api/visits/{id}/summary/rating — RateSummaryDto
export interface RateSummaryDto {
  rating:    number; // integer
  feedback?: string;
}

export interface RateSummaryResponseDto {
  aiSummaryID: number;
  rating:      number;
  feedback?:   string;
  message?:    string;
}

// GET /api/visits/{id}/patient-summary — PatientSummaryViewDto
// Field is `followUp`, not `followUpDate` — consistent with rest of swagger
export interface PatientSummaryViewDto {
  visitId:         number;
  visitDate:       string;
  diagnosis?:      string;
  symptoms?:       string;
  treatmentPlan?:  string;
  whenToSeekHelp?: string;
  followUp?:       string; // was `followUpDate` — corrected to match swagger
}

// ── Doctor ────────────────────────────────────────────────────────────────────
// phoneNumber is required — confirmed by CreateDoctorDto (required, minLength:1)
export interface Doctor {
  id:          number;
  fullName:    string;
  email:       string;
  phoneNumber: string; // required — no ?
  specialty:   string;
}

// Only `specialty` is updatable — matches swagger UpdateDoctorDto exactly
export interface UpdateDoctorDto {
  specialty: string;
}

// ── Prescription ──────────────────────────────────────────────────────────────
export interface Prescription {
  id:           number;
  instructions: string;
  visitID:      number;
}

export interface CreatePrescriptionDto {
  instructions: string;
  visitID:      number;
}

export interface UpdatePrescriptionDto {
  instructions: string;
}

export interface AddMedicationToPrescriptionDto {
  medicationID: number;
  dosage?:      string;
  frequency?:   string;
  route?:       string;
  duration?:    string;
  notes?:       string;
}

// ── Lab Test ──────────────────────────────────────────────────────────────────
export interface LabTest {
  id:          number;
  labTestName: string;
  visitID:     number;
}

export interface CreateLabTestDto {
  labTestName: string;
  visitID:     number;
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────
// ⚠️ `icD10Code` — exact casing from .NET backend, do not normalize
export interface Diagnosis {
  icD10Code:     string;
  diagnosisName: string;
}

export interface CreateDiagnosisDto {
  diagnosisName: string;
  visitID:       number;
}

export interface AssignDiagnosisDto {
  icD10Code: string;
}

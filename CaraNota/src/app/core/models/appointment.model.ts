// src/app/core/models/appointment.model.ts
// ─────────────────────────────────────────────────────────────────────────────
// Owns only what is NOT already in patient.model.ts.
//
// patient.model.ts already owns:
//   ✅ Patient interface         → use from patient.model.ts
//   ✅ Appointment interface     → use from patient.model.ts  (named PatientAppointment there)
//   ✅ Medication interface      → use from patient.model.ts
//
// This file owns everything else: Visit, Audio, Summary, Doctor, DTOs, etc.
// ─────────────────────────────────────────────────────────────────────────────

// ── Appointment (doctor-facing, full shape from /api/Appointment) ─────────────
// patient.model.ts has a lighter PatientAppointment used in the patient UI.
// This one is the full shape used by scheduling, today-visits, recording flow.
export interface Appointment {
  appointmentID: number;
  startTime: string;          // UTC ISO string — always convert before display
  endTime: string;
  status: AppointmentStatus;
  appointmentType: string;
  createdAt: string;
  patientID: number;
  patientName: string;
  doctorID: number;
  doctorName: string;
  receptionistID?: number;
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface CreateAppointmentDto {
  startTime: string;
  endTime: string;
  appointmentType: string;
  patientID: number;
  doctorID: number;
  receptionistID?: number;
}

export interface UpdateAppointmentDto {
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  appointmentType?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

// ── Visit ─────────────────────────────────────────────────────────────────────
export interface Visit {
  visitId: number;
  visitDate: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  appointmentID: number;
}

export interface CreateVisitDto {
  visitDate: string;          // ISO 8601 UTC — pass new Date().toISOString()
  appointmentID: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface UpdateVisitDto {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

// ── Audio ─────────────────────────────────────────────────────────────────────
export interface AudioRecordResponseDto {
  audioId: number;
  audioFileUrl: string;
  createdAt: string;
  deletionAt: string;
  visitId: number;
  message: string;
}

export type AudioProcessingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface AudioStatusDto {
  visitId: number;
  status: AudioProcessingStatus;
  transcription?: string;
}

// ── Summary ───────────────────────────────────────────────────────────────────
export interface DoctorSummaryDto {
  aiSummaryId: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  doctorRating: number;
}

export interface PatientSummaryDto {
  aiSummaryId: number;
  diagnosis: string;
  symptoms: string;
  treatmentPlan: string;
  whenToSeekHelp: string;
  followUp: string;
}

export interface VisitSummaryResponseDto {
  visitId: number;
  isApproved: boolean;
  doctorSummary: DoctorSummaryDto;
  patientSummary: PatientSummaryDto;
}

export interface UpdateSummaryDto {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ApproveSummaryDto {
  rating: number;             // 0–5 float
}


// ── Doctor ────────────────────────────────────────────────────────────────────
export interface Doctor {
  id: number;
  fullName: string;
  email: string;
  specialty: string;
  phoneNumber?: string;
}

// ── Prescription ──────────────────────────────────────────────────────────────
export interface Prescription {
  id: number;
  instructions: string;
  visitID: number;
}

export interface CreatePrescriptionDto {
  instructions: string;
  visitID: number;
}

export interface AddMedicationToPrescriptionDto {
  medicationID: number;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  notes?: string;
}

// ── Lab Test ──────────────────────────────────────────────────────────────────
export interface LabTest {
  id: number;
  labTestName: string;
  visitID: number;
}

export interface CreateLabTestDto {
  labTestName: string;
  visitID: number;
}

// ── Diagnosis ─────────────────────────────────────────────────────────────────
export interface Diagnosis {
  icD10Code: string;          // ⚠️ Odd casing from backend — keep as-is to match JSON
  diagnosisName: string;
}

export interface AssignDiagnosisDto {
  icD10Code: string;
}

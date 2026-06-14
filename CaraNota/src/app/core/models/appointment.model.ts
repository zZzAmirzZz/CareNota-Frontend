// core/models/appointment.model.ts
// Aligned with swagger__3_.json (latest source of truth)

// - Appointment -
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
  startTime:       string;   // ISO 8601
  endTime:         string;
  appointmentType: string;
  patientID:       number;
  doctorID:        number;
  receptionistID:  number;   // required in swagger — no ?
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

// - Visit -
export interface Visit {
  visitID:       number;
  visitDate?:    string;
  subjective?:   string;
  objective?:    string;
  assessment?:   string;
  plan?:         string;
  symptoms?:     string;
  appointmentID: number;
}

export interface CreateVisitDto {
  appointmentID: number;
  visitDate:     string;   // ISO 8601
  subjective?:   string;
  objective?:    string;
  assessment?:   string;
  plan?:         string;
  symptoms?:     string;
}

// Matches swagger UpdateVisitDto exactly
export interface UpdateVisitDto {
  subjective?:     string;
  objective?:      string;
  assessment?:     string;
  plan?:           string;
  symptoms?:       string;
  whenToSeekHelp?: string;
  followUp?:       string;  // swagger field name is `followUp`, not `followUpDate`
}

// - Audio -
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

// - Summary -

// Doctor-facing SOAP summary — matches swagger DoctorSummaryDto
// ✅ comparisonWithPreviousVisit added (was missing from old model)
export interface DoctorSummaryDto {
  aiSummaryId:                number;
  subjective?:                string;
  objective?:                 string;
  assessment?:                string;
  plan?:                      string;
  comparisonWithPreviousVisit?: string;  // ← nullable in swagger
}

// Matches swagger PatientSummaryDto exactly
export interface PatientSummaryDto {
  aiSummaryId:     number;
  diagnosis?:      string;
  symptoms?:       string;
  treatmentPlan?:  string;
  whenToSeekHelp?: string;
  followUp?:       string;
}

export interface VisitSummaryResponseDto {
  visitId:        number;
  isApproved:     boolean;
  doctorSummary:  DoctorSummaryDto;
  patientSummary: PatientSummaryDto;
}

// Matches swagger EditSummaryDto — all 10 fields (doctor + patient combined)
export interface UpdateSummaryDto {
  // Doctor summary fields
  subjective?:                  string;
  objective?:                   string;
  assessment?:                  string;
  plan?:                        string;
  comparisonWithPreviousVisit?: string;
  // Patient summary fields
  diagnosis?:                   string;
  symptoms?:                    string;
  treatmentPlan?:               string;
  whenToSeekHelp?:              string;
  followUp?:                    string;
}

// POST /api/visits/{id}/summary/approve — no request body
export interface ApproveSummaryDto {
  // intentionally empty — endpoint takes no body
}

// POST /api/visits/{id}/summary/rating — RateSummaryDto
export interface RateSummaryDto {
  rating:    number;
  feedback?: string;
}

export interface RateSummaryResponseDto {
  aiSummaryID: number;
  rating:      number;
  feedback?:   string;
  message?:    string;
}

// GET /api/visits/{id}/patient-summary — PatientSummaryViewDto
export interface PatientSummaryViewDto {
  visitId:         number;
  visitDate:       string;
  diagnosis?:      string;
  symptoms?:       string;
  treatmentPlan?:  string;
  whenToSeekHelp?: string;
  followUp?:       string;
}

// - Doctor -
export interface Doctor {
  id:          number;
  fullName:    string;
  email:       string;
  phoneNumber?: string;
  specialty:   string;
}

// Only `specialty` is updatable — matches swagger UpdateDoctorDto exactly
export interface UpdateDoctorDto {
  specialty: string;
}

// - Prescription -
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

// - Lab Test -
export interface LabTest {
  id:          number;
  labTestName: string;
  visitID:     number;
}

export interface CreateLabTestDto {
  labTestName: string;
  visitID:     number;
}

// - Diagnosis -
// ⚠️ Using integer Id now (swagger uses int32, not ICD string code)
export interface Diagnosis {
  id:            number;
  diagnosisName: string;
}

export interface CreateDiagnosisDto {
  diagnosisName: string;
  visitID:       number;
}


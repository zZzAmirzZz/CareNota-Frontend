// src/app/core/models/appointment.model.ts

export interface Appointment {
  appointmentID: number;
  startTime: string;        // UTC ISO string — always convert before display
  endTime: string;          // UTC ISO string
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
  startTime: string;         // ISO 8601 UTC
  endTime: string;           // ISO 8601 UTC
  appointmentType: string;
  patientID: number;
  doctorID: number;
  receptionistID?: number;
}

// Add to appointment.model.ts
export interface UpdateAppointmentDto {
  startTime?: string;
  endTime?: string;
  appointmentType?: string;
  patientID?: number;
  doctorID?: number;
  receptionistID?: number;
}

export interface TimeSlot {
  start: string;             // UTC ISO string
  end: string;               // UTC ISO string
}
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
  visitDate: string;          // ISO 8601 UTC — send current time
  appointmentID: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}


export interface Doctor {
  id: number;
  fullName: string;
  email: string;
  specialty?: string;
}

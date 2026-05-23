// src/app/core/models/patient.model.ts

export interface Patient {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  insuranceInfo?: string;
}

// PUT /api/Patient/{id} body
export interface UpdatePatientDto {
  gender?: string;
  bloodType?: string;
  allergies?: string;
  insuranceInfo?: string;
}

export interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentType: string;
  status: string;
  patientID: number;
  receptionistID?: number;
}

export interface Medication {
  id: number;
  medicationName: string;
  medicationType: string;
  description?: string;
  strength?: string;
}

export class PatientViewModel {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;
  insuranceInfo?: string;

  constructor(data: any) {
    // The backend may return the id as any of these field names.
    // We try all of them so a casing mismatch never gives us 0.
    this.id =
      data.id ??
      data.patientId ??      // ← some .NET responses use patientId
      data.patientID ??      // ← or patientID
      data.userId ??
      0;

    this.fullName      = data.fullName ?? data.name ?? '';
    this.email         = data.email ?? '';
    this.phoneNumber   = data.phoneNumber ?? '';
    this.gender        = data.gender;
    this.bloodType     = data.bloodType;
    this.allergies     = data.allergies;
    this.insuranceInfo = data.insuranceInfo;
  }

  get initials(): string {
    return this.fullName
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get age(): number { return 0; }

  get allergyList(): string[] {
    return this.allergies
      ? this.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
      : [];
  }
}

export interface PatientVisit {
  id: number;
  visitDate: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  appointmentID?: number;
}

export interface PatientAppointment {
  id: number;
  appointmentDate: string;
  appointmentType: string;
  status: string;
}

export interface PrescriptionMedication {
  medicationID: number;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  notes?: string;
}

export const FAKE_PATIENTS: PatientViewModel[] = [
  new PatientViewModel({
    id: 101,
    fullName: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    phoneNumber: '+20-100-000-0001',
    gender: 'Male',
    bloodType: 'A+',
    allergies: 'Penicillin, Dust',
    insuranceInfo: 'AllianzCare - Policy #12345',
  }),
  new PatientViewModel({
    id: 102,
    fullName: 'Mariam Youssef',
    email: 'mariam@example.com',
    phoneNumber: '+20-100-000-0002',
    gender: 'Female',
    bloodType: 'O-',
    allergies: '',
    insuranceInfo: 'MetLife - Policy #67890',
  }),
  new PatientViewModel({
    id: 103,
    fullName: 'Tarek Mostafa',
    email: 'tarek@example.com',
    phoneNumber: '+20-100-000-0003',
    gender: 'Male',
    bloodType: 'B+',
    allergies: 'Aspirin',
  }),
];

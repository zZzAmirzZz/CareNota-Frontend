// core/models/patient.model.ts
// Source of truth: swagger_new.json → Patient, UpdatePatientDto, RegisterDto

// ── Raw patient shape — GET /api/Patient and GET /api/Patient/{id} ────────────
export interface Patient {
  id:             number;
  fullName:       string;
  email:          string;
  phoneNumber:    string;
  gender?:        string | null;
  dateOfBirth?:   string | null;    // ISO 8601 — from RegisterDto, may appear in profile
  bloodType?:     string | null;
  allergies?:     string | null;
  insuranceInfo?: string | null;
  chronicConditions?: string | null;
}

// ── PUT /api/Patient/{id} ─────────────────────────────────────────────────────
// ⚠️ Swagger UpdatePatientDto only accepts these 4 fields — nothing else.
export interface UpdatePatientDto {
  gender?:        string | null;
  bloodType?:     string | null;
  allergies?:     string | null;
  insuranceInfo?: string | null;
}

// ── Medication catalog item ───────────────────────────────────────────────────
// GET /Api/Medication and GET /Api/Medication/{Id}
export interface Medication {
  id:             number;
  medicationName: string;
  medicationType: string;
  description?:   string | null;
  strength?:      string | null;
}

// ── Rich view model used by doctor patient pages and patient profile ───────────
export class PatientViewModel {
  id:               number;
  fullName:         string;
  email:            string;
  phoneNumber:      string;
  gender?:          string | null;
  dateOfBirth?:     string | null;
  bloodType?:       string | null;
  allergies?:       string | null;
  insuranceInfo?:   string | null;
  chronicConditions?: string | null;

  constructor(data: any) {
    // ⚠️ .NET may return id under several casing variants
    this.id =
      data.id        ??
      data.patientId ??
      data.patientID ??
      data.userId    ??
      0;

    this.fullName         = data.fullName    ?? data.name ?? '';
    this.email            = data.email       ?? '';
    this.phoneNumber      = data.phoneNumber ?? '';
    this.gender           = data.gender      ?? null;
    this.dateOfBirth      = data.dateOfBirth ?? null;
    this.bloodType        = data.bloodType   ?? null;
    this.allergies        = data.allergies   ?? null;
    this.insuranceInfo    = data.insuranceInfo ?? null;
    this.chronicConditions = data.chronicConditions ?? null;
  }

  get age(): number | null {
    if (!this.dateOfBirth) return null;
    const birth = new Date(this.dateOfBirth);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  get initials(): string {
    return this.fullName
      .split(' ')
      .map((w: string) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get allergyList(): string[] {
    return this.allergies
      ? this.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
      : [];
  }

  get conditionList(): string[] {
    return this.chronicConditions
      ? this.chronicConditions.split(',').map((c: string) => c.trim()).filter(Boolean)
      : [];
  }
}

// ── Used by GET /Api/Visit/Patient/{PatientId} ────────────────────────────────
// ⚠️ Backend returns visitID (capital ID). Service normalizes to `id`.
export interface PatientVisit {
  id:             number;
  visitDate:      string;
  subjective?:    string | null;
  objective?:     string | null;
  assessment?:    string | null;
  plan?:          string | null;
  symptoms?:      string | null;
  whenToSeekHelp?: string | null;  // ← NEW — part of UpdateVisitDto now
  followUp?:       string | null;  // ← NEW
  appointmentID?: number;
  // Doctor/appointment info — may be embedded by backend
  doctorName?:     string | null;
  specialty?:      string | null;
  appointmentType?: string | null;
}

// ── Used by GET /api/Appointment/patient/{patientId} ─────────────────────────
export interface PatientAppointment {
  id:              number;
  startTime:       string;
  endTime:         string;
  appointmentType: string;
  status:          string;
}

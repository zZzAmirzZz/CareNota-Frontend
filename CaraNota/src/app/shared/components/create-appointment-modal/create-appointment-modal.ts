// src/app/shared/components/create-appointment-modal/create-appointment-modal.ts

import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { buildLocalDateTime } from '../../../core/utils/date-time.util';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService, Doctor } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreateAppointmentDto, TimeSlot } from '../../../core/models/appointment.model';
import { PatientViewModel } from '../../../core/models/patient.model';

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-appointment-modal.html',
})
export class CreateAppointmentModal implements OnInit, OnDestroy {
  @Input() preselectedPatientId?: number;

  @Output() created = new EventEmitter<void>();
  @Output() closed  = new EventEmitter<void>();

  private appointmentService = inject(AppointmentService);
  private doctorService      = inject(DoctorService);
  private patientService     = inject(PatientService);
  private authService        = inject(AuthService);
  private destroy$           = new Subject<void>();

  // ── Patient search ────────────────────────────────────────────────────
  patientSearchQuery   = signal('');
  patientSearchResults = signal<PatientViewModel[]>([]);
  selectedPatient      = signal<PatientViewModel | null>(null);
  isSearchingPatients  = signal(false);
  showPatientDropdown  = signal(false);
  private search$      = new Subject<string>();

  // ── Doctor ────────────────────────────────────────────────────────────
  selectedDoctorId = signal<number | null>(null);
  doctors          = signal<Doctor[]>([]);
  isLoadingDoctors = signal(false);

  // ── Slot ──────────────────────────────────────────────────────────────
  // Stores the raw YYYY-MM-DD string from the date input
  selectedDate   = signal('');
  selectedSlot   = signal<TimeSlot | null>(null);
  availableSlots = signal<TimeSlot[]>([]);
  isLoadingSlots = signal(false);

  // ── Type ──────────────────────────────────────────────────────────────
  appointmentType = signal('Consultation');

  // ── UI ────────────────────────────────────────────────────────────────
  isSubmitting = signal(false);
  error        = signal<string | null>(null);

  readonly appointmentTypes = [
    'Consultation', 'Follow-up', 'Check-up', 'Emergency', 'Procedure',
  ];

  get todayIso(): string {
    // Returns YYYY-MM-DD in local time (not UTC) — avoids off-by-one day in UTC+2
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnInit(): void {
    this.selectedDate.set(this.todayIso);
    this.loadDoctors();

    if (this.preselectedPatientId) {
      this.patientService.getById(this.preselectedPatientId).subscribe({
        next: p => this.selectedPatient.set(p),
      });
    }

    // Debounced patient search
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) {
          this.patientSearchResults.set([]);
          this.isSearchingPatients.set(false);
          return of([]);
        }
        this.isSearchingPatients.set(true);
        return this.patientService.search(q);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: results => {
        // ── DEBUG: open browser console to verify what the API returns ──
        console.log('[PatientSearch] raw results:', results);
        results.forEach(p => console.log(`  → fullName: "${p.fullName}"  id: ${p.id}`));
        // ────────────────────────────────────────────────────────────────
        this.patientSearchResults.set(results);
        this.isSearchingPatients.set(false);
        this.showPatientDropdown.set(results.length > 0);
      },
      error: () => this.isSearchingPatients.set(false),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Patient handlers ──────────────────────────────────────────────────

  onPatientSearchInput(value: string): void {
    this.patientSearchQuery.set(value);
    this.selectedPatient.set(null);
    this.showPatientDropdown.set(false);
    this.search$.next(value);
  }

  selectPatient(patient: PatientViewModel): void {
    this.selectedPatient.set(patient);
    this.patientSearchQuery.set(patient.fullName);
    this.showPatientDropdown.set(false);
    this.patientSearchResults.set([]);
  }

  clearPatient(): void {
    this.selectedPatient.set(null);
    this.patientSearchQuery.set('');
    this.patientSearchResults.set([]);
    this.showPatientDropdown.set(false);
  }

  // ── Doctor handlers ───────────────────────────────────────────────────

  private loadDoctors(): void {
    this.isLoadingDoctors.set(true);
    this.doctorService.getAllDoctors().subscribe({
      next: doctors => {
        console.log('[Doctors] loaded:', doctors);
        this.doctors.set(doctors);
        this.isLoadingDoctors.set(false);
      },
      error: () => {
        this.error.set('Could not load doctors.');
        this.isLoadingDoctors.set(false);
      },
    });
  }

  onDoctorChange(value: string): void {
    console.log('[DoctorChange] raw value from <select>:', value);

    const id = value ? parseInt(value, 10) : null;

    if (id && id > 0) {
      console.log('[DoctorChange] ✅ parsed doctorId:', id);
      this.selectedDoctorId.set(id);
      this.resetSlots();
      this.fetchSlotsIfReady();
    } else {
      console.log('[DoctorChange] ❌ invalid id');
      this.selectedDoctorId.set(null);
      this.resetSlots();
    }
  }

  onDateChange(value: string): void {
    // value is already YYYY-MM-DD from the date input
    console.log('[DateChange] value:', value);
    this.selectedDate.set(value);
    this.resetSlots();
    this.fetchSlotsIfReady();
  }

  private resetSlots(): void {
    this.selectedSlot.set(null);
    this.availableSlots.set([]);
  }

  private fetchSlotsIfReady(): void {
    const doctorId = this.selectedDoctorId();
    const dateStr  = this.selectedDate();

    if (!doctorId || !dateStr) {
      return;
    }

    this.isLoadingSlots.set(true);
    this.error.set(null);

    this.appointmentService.getAvailableSlots(
      doctorId,
      dateStr
    ).subscribe({
      next: (slots) => {
        console.log('[AvailableSlots] raw:', slots);
        this.availableSlots.set(slots || []);
        this.isLoadingSlots.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Could not load available slots.');
        this.isLoadingSlots.set(false);
      }
    });
  }

  selectSlot(slot: TimeSlot): void {
    this.selectedSlot.set(slot);
  }

  // ── Submit ────────────────────────────────────────────────────────────

  submit(): void {
    const slot           = this.selectedSlot();
    const doctorId       = this.selectedDoctorId();
    const patient        = this.selectedPatient();
    const patientId      = this.preselectedPatientId ?? patient?.id ?? null;
    const receptionistId = this.authService.getReceptionistId();

    if (!slot || !doctorId || !patientId) {
      this.error.set('Please select a patient, doctor, date and time slot.');
      return;
    }

    // slot.start / slot.end are assumed to be "HH:mm" or "HH:mm:ss" time-only strings
    // from /available-slots. buildLocalDateTime combines them with the selected
    // date into a naive local datetime string, e.g. "2026-06-15T13:00:00" (no 'Z').
const dto: CreateAppointmentDto = {
  startTime: slot.start,
  endTime:   slot.end,
  appointmentType: this.appointmentType(),
  patientID:       patientId,
  doctorID:        doctorId,
  receptionistID:  receptionistId || 1,
};

    console.log('[Submit] DTO being sent:', dto);

    this.isSubmitting.set(true);
    this.error.set(null);

    this.appointmentService.createAppointment(dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.created.emit();
        // Optional: show success message
      },
      error: (err) => {
        this.isSubmitting.set(false);
        console.error('[CreateAppointment] Error:', err);
        this.error.set(err?.error?.message || 'Failed to create appointment. Please try again.');
      },
    });
  }

  formatSlotTime(localString: string): string {
    return this.appointmentService.toLocalTime(localString);
  }

  close(): void {
    this.closed.emit();
  }
}

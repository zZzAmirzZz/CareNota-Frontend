import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PatientsSidebar } from './components/patients-sidebar/patients-sidebar';
import { PatientHeader } from './components/patient-header/patient-header';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { PatientTabs } from './components/patient-tabs/patient-tabs';
import { Medication, PatientViewModel, PatientAppointment } from '../../../../core/models/patient.model';
import { PatientService } from '../../../../core/services/patient.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PatientsSidebar,
    PatientHeader,
    DoctorNavbar,
    PatientTabs,
  ],
  templateUrl: './patients.html',
  styleUrl: './patients.css',
})
export class Patients implements OnInit {
  private patientService = inject(PatientService);

  patients      = signal<PatientViewModel[]>([]);
  selectedPatient = signal<PatientViewModel | null>(null);
  isLoading     = signal(true);
  error         = signal<string | null>(null);
  appointments  = signal<PatientAppointment[]>([]);
  medications   = signal<Medication[]>([]);

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.patientService.getAll().subscribe({
      next: (list) => {
        this.patients.set(list);
        if (list.length > 0) this.selectedPatient.set(list[0]);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load patients');
        this.isLoading.set(false);
      }
    });
  }

  onPatientSelected(patient: PatientViewModel): void {
    this.selectedPatient.set(patient);
    this.patientService.getAppointments(patient.id).subscribe(a => this.appointments.set(a));
  }
}

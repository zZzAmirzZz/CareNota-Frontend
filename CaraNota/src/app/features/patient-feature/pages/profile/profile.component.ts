// src/app/features/patient/pages/profile/profile.component.ts
//
// Calls:
//   GET /api/Patient/{id}         → load profile
//   PUT /api/Patient/{id}         → save health info (bloodType, allergies, insuranceInfo, gender)
//
// Personal info (fullName, email, phone) comes from the auth token / register data.
// The API's PUT /api/Patient/{id} only accepts: gender, bloodType, allergies, insuranceInfo.

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService }  from '../../../../core/services/patient.service';
import { AuthService }     from '../../../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PatientViewModel } from '../../../../core/models/patient.model';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { bloodType, gender, maxLength, noWhitespace } from '../../../../core/validators/app.validators';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {

  private fb = inject(FormBuilder);

healthForm = this.fb.group({
  gender:        [''],
  bloodType:     ['', [bloodType]],
  allergies:     ['', [maxLength(500)]],
  insuranceInfo: ['', [maxLength(300)]],
});

  private patientService = inject(PatientService);
  private authService    = inject(AuthService);

  patient        = signal<PatientViewModel | null>(null);
  isLoading      = signal(true);
  isEditingHealth = signal(false);
  isSaving       = signal(false);
  error          = signal<string | null>(null);
  successMsg     = signal<string | null>(null);

  // Health edit form values
  editBloodType    = signal('');
  editAllergies    = signal('');
  editInsurance    = signal('');
  editGender       = signal('');

  ngOnInit(): void {
    const id = this.authService.getPatientId();
    if (!id) { this.error.set('Could not identify patient.'); this.isLoading.set(false); return; }

    // GET /api/Patient/{id}
    this.patientService.getById(id).subscribe({
      next: p => {
        this.patient.set(p as PatientViewModel);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile.');
        this.isLoading.set(false);
      },
    });
  }

openEditHealth(): void {
  const p = this.patient();
  if (!p) return;
  this.healthForm.patchValue({
    gender:        p.gender        ?? '',
    bloodType:     p.bloodType     ?? '',
    allergies:     p.allergies     ?? '',
    insuranceInfo: p.insuranceInfo ?? '',
  });
  this.isEditingHealth.set(true);
}

  cancelEditHealth(): void { this.isEditingHealth.set(false); }

  saveHealth(): void {
    const id = this.authService.getPatientId();
    if (!id) return;

    this.isSaving.set(true);
    this.error.set(null);

    // PUT /api/Patient/{id}  — only these 4 fields accepted by API
    const dto = {
      gender:        this.editGender(),
      bloodType:     this.editBloodType(),
      allergies:     this.editAllergies(),
      insuranceInfo: this.editInsurance(),
    };

    this.patientService.update(id, dto).subscribe({
      next: () => {
        // Update local view
        this.patient.update(p => p
          ? new PatientViewModel({ ...p, ...dto })
          : p
        );
        this.isSaving.set(false);
        this.isEditingHealth.set(false);
        this.successMsg.set('Health information updated.');
        setTimeout(() => this.successMsg.set(null), 3000);
      },
      error: () => {
        this.isSaving.set(false);
        this.error.set('Failed to save changes.');
      },
    });
  }

  get allergyList(): string[] {
    return this.patient()?.allergyList ?? [];
  }
}

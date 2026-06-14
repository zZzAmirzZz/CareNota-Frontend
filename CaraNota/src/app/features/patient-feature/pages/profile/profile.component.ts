// profile.component.ts — AFTER (fixed)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';   // ← only FormsModule needed
import { PatientService }  from '../../../../core/services/patient.service';
import { AuthService }     from '../../../../core/services/auth.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PatientViewModel } from '../../../../core/models/patient.model';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {

  private patientService = inject(PatientService);
  private authService    = inject(AuthService);

  patient         = signal<PatientViewModel | null>(null);
  isLoading       = signal(true);
  isEditingHealth = signal(false);
  isSaving        = signal(false);
  error           = signal<string | null>(null);
  successMsg      = signal<string | null>(null);

  // Health edit signals — bound directly via [ngModel] in the template
  editBloodType = signal('');
  editAllergies = signal('');
  editInsurance = signal('');
  editGender    = signal('');

  ngOnInit(): void {
    const id = this.authService.getPatientId();
    if (!id) { this.error.set('Could not identify patient.'); this.isLoading.set(false); return; }

    this.patientService.getById(id).subscribe({
      next:  p => { this.patient.set(p); this.isLoading.set(false); },
      error: () => { this.error.set('Failed to load profile.'); this.isLoading.set(false); },
    });
  }

  openEditHealth(): void {
    const p = this.patient();
    if (!p) return;
    // ✅ Seed the signals the template is bound to
    this.editGender.set(p.gender        ?? '');
    this.editBloodType.set(p.bloodType  ?? '');
    this.editAllergies.set(p.allergies  ?? '');
    this.editInsurance.set(p.insuranceInfo ?? '');
    this.isEditingHealth.set(true);
  }

  cancelEditHealth(): void { this.isEditingHealth.set(false); this.error.set(null); }

  saveHealth(): void {
    const id = this.authService.getPatientId();
    if (!id) return;

    this.isSaving.set(true);
    this.error.set(null);

    // PUT /api/Patient/{id} — UpdatePatientDto: { gender, bloodType, allergies, insuranceInfo }
    const dto = {
      gender:        this.editGender()    || null,
      bloodType:     this.editBloodType() || null,
      allergies:     this.editAllergies() || null,
      insuranceInfo: this.editInsurance() || null,
    };

    this.patientService.update(id, dto).subscribe({
      next: () => {
        this.patient.update(p => p ? new PatientViewModel({ ...p, ...dto }) : p);
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
